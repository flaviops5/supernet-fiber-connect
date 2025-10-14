# 🔄 Sistema de Auto-Reboot de Equipamentos Congelados

## 📋 Visão Geral

Sistema automatizado que detecta e reinicia equipamentos de clientes com conectividade degradada (baixa largura de banda), prevenindo interrupções prolongadas de serviço.

## 🎯 Funcionalidades

### Detecção Inteligente
- Monitora largura de banda de todos os clientes online
- Identifica equipamentos com throughput abaixo do limite configurado
- Verifica múltiplas vezes antes de agir (evita falsos positivos)

### Reboot Automatizado
- Envia comando de reinício via API IXC
- Aguarda equipamento voltar online
- Valida se bandwidth voltou ao normal
- Registra resultado (sucesso/falha)

### Proteções
- **Cooldown**: Evita reboots repetidos no mesmo equipamento
- **Blacklist**: Permite excluir clientes específicos
- **Janela de Exclusão**: Não executa em horários específicos (ex: madrugada)
- **Limit Concurrency**: Controla carga no servidor IXC

## 🗄️ Estrutura do Banco de Dados

### Tabela: `equipment_reboots`
Registra todos os reboots executados:

```sql
- id: UUID
- ixc_client_id: TEXT (ID do cliente no IXC)
- client_name: TEXT
- client_login: TEXT
- client_ip: TEXT
- detection_timestamp: TIMESTAMPTZ (quando problema foi detectado)
- bandwidth_before_kbps: NUMERIC (bandwidth antes do reboot)
- bandwidth_after_kbps: NUMERIC (bandwidth depois do reboot)
- verification_count: INTEGER (quantas vezes foi verificado)
- status: TEXT (pending, processing, success, failed)
- reboot_timestamp: TIMESTAMPTZ (quando reboot foi enviado)
- reboot_completed_at: TIMESTAMPTZ (quando reboot foi concluído)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

**Status:**
- `pending`: Detectado problema, aguardando verificações
- `processing`: Reboot enviado, aguardando equipamento voltar
- `success`: Equipamento voltou com bandwidth normal
- `failed`: Reboot falhou ou bandwidth continua baixa

### Tabela: `equipment_reboot_blacklist`
Clientes que NÃO devem ser reiniciados automaticamente:

```sql
- id: UUID
- ixc_client_id: TEXT UNIQUE
- reason: TEXT (motivo da exclusão)
- added_by: UUID (admin que adicionou)
- created_at: TIMESTAMPTZ
```

### Tabela: `auto_reboot_settings`
Configurações globais do sistema:

```sql
- id: UUID
- enabled: BOOLEAN (ativar/desativar sistema)
- bandwidth_threshold_kbps: INTEGER (limite de bandwidth, padrão: 900)
- verification_count: INTEGER (quantas verificações antes de rebootar, padrão: 3)
- verification_interval_seconds: INTEGER (intervalo entre verificações, padrão: 60)
- cooldown_hours: INTEGER (tempo mínimo entre reboots do mesmo equipamento, padrão: 24)
- exclude_hours_start: INTEGER (início da janela de exclusão, padrão: 1)
- exclude_hours_end: INTEGER (fim da janela de exclusão, padrão: 6)
- cron_interval_minutes: INTEGER (frequência de execução, padrão: 30)
- updated_by: UUID
- updated_at: TIMESTAMPTZ
```

## 🔧 Edge Function: `auto-reboot-frozen-equipment`

### Fluxo de Execução

1. **Verificações Iniciais**
   - Sistema está habilitado?
   - Estamos fora da janela de exclusão?

2. **Finalizar Reboots em Andamento**
   - Busca reboots com status `processing` (mais de 2 minutos)
   - Verifica se equipamento voltou online
   - Atualiza status para `success` ou `failed`

3. **Buscar Clientes Online**
   - Consulta `/webservice/v1/radius_online` no IXC
   - Carrega blacklist do Supabase

4. **Identificar Suspeitos**
   - Filtra clientes com bandwidth < threshold
   - Remove clientes blacklistados

5. **Processar Cada Suspeito**
   - Verifica cooldown (último reboot < X horas)
   - Busca/cria registro `pending`
   - Incrementa `verification_count`
   - Se atingiu limite de verificações:
     - Envia comando `/fn_acessos_rebootar`
     - Atualiza status para `processing`

6. **Retorna Resultados**
   - Lista de ações executadas por cliente

### Configuração

**Variáveis de Ambiente:**
- `SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço

**Secrets Necessários:**
- `CRON_SECRET`: Para autenticação do cron job

## ⏰ Agendamento (Cron Job)

### Configuração no Supabase

Execute no SQL Editor:

```sql
SELECT cron.schedule(
  'auto-reboot-frozen-equipment',
  '*/30 * * * *', -- a cada 30 minutos
  $$
  SELECT net.http_post(
    url := 'https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/auto-reboot-frozen-equipment',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SEU_ANON_KEY_AQUI'
    ),
    body := jsonb_build_object('timestamp', NOW()::TEXT)
  );
  $$
);
```

**Nota:** Substitua `SEU_ANON_KEY_AQUI` pela anon key do seu projeto.

### Ver Cron Jobs Ativos

```sql
SELECT * FROM cron.job;
```

### Remover Cron Job

```sql
SELECT cron.unschedule('auto-reboot-frozen-equipment');
```

## 📊 Função RPC: `get_reboot_stats()`

Retorna estatísticas agregadas:

```typescript
const { data } = await supabase.rpc('get_reboot_stats');

// Resultado:
{
  total: 150,
  success: 120,
  failed: 20,
  pending: 5,
  processing: 5,
  last24h: 30
}
```

## 🎨 Componente React: `RebootStats.tsx`

Exibe métricas em tempo real no dashboard admin.

**Exemplo de uso:**

```tsx
import { RebootStats } from "@/components/monitoring/RebootStats";

function AutoRebootDashboard() {
  return (
    <div>
      <h1>Auto-Reboot Monitoring</h1>
      <RebootStats />
    </div>
  );
}
```

## 🔐 Segurança (RLS)

Todas as tabelas têm Row-Level Security habilitado:

- **Admins**: Acesso total
- **Service Role**: Pode inserir/atualizar (para Edge Function)
- **Outros**: Sem acesso

## 📈 Monitoramento

### Queries Úteis

**Ver últimos reboots:**
```sql
SELECT * FROM equipment_reboots 
ORDER BY created_at DESC 
LIMIT 50;
```

**Taxa de sucesso (últimas 24h):**
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*) as success_rate
FROM equipment_reboots
WHERE created_at > NOW() - INTERVAL '24 hours';
```

**Clientes mais rebootados:**
```sql
SELECT 
  ixc_client_id, 
  client_name, 
  COUNT(*) as reboot_count
FROM equipment_reboots
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY ixc_client_id, client_name
ORDER BY reboot_count DESC
LIMIT 20;
```

## ⚙️ Configuração Recomendada

### Produção
```
bandwidth_threshold_kbps: 900
verification_count: 3
verification_interval_seconds: 60
cooldown_hours: 24
exclude_hours_start: 1  (1h AM)
exclude_hours_end: 6    (6h AM)
cron_interval_minutes: 30
```

### Testes
```
bandwidth_threshold_kbps: 500
verification_count: 2
cooldown_hours: 1
exclude_hours_start: 23
exclude_hours_end: 23  (desabilita exclusão)
cron_interval_minutes: 5
```

## 🚨 Troubleshooting

### Problema: Nenhum reboot sendo executado

**Verificar:**
1. Sistema está habilitado? (`SELECT * FROM auto_reboot_settings`)
2. Horário está fora da janela de exclusão?
3. Cron job está ativo? (`SELECT * FROM cron.job`)
4. Edge Function tem logs de erro?

### Problema: Falsos positivos (equipamentos OK sendo rebootados)

**Solução:**
- Aumentar `bandwidth_threshold_kbps`
- Aumentar `verification_count`
- Adicionar cliente à blacklist

### Problema: Reboots não finalizam (ficam em "processing")

**Causa provável:** Equipamento não voltou online ou IXC não respondeu

**Solução:**
- Verificar logs do Edge Function
- Aumentar timeout de finalização (atualmente 2 minutos)
- Verificar conectividade com IXC

## 📝 Changelog

### v1.0.0 (2025-10-14)
- ✅ Sistema inicial implementado
- ✅ Detecção multi-verificação
- ✅ Cooldown e blacklist
- ✅ RLS policies
- ✅ Dashboard de métricas
- ✅ Documentação completa

## 🔗 Referências

- **IXC API**: `/webservice/v1/radius_online`, `/webservice/v1/fn_acessos_rebootar`
- **Supabase Cron**: https://supabase.com/docs/guides/database/extensions/pg_cron
- **Edge Functions**: https://supabase.com/docs/guides/functions

---

**Última atualização:** 2025-10-14  
**Versão:** 1.0.0  
**Status:** ✅ Produção
