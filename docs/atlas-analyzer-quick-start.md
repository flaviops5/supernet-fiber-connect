# 🚀 Atlas Analyzer - Guia Rápido

## 📋 O que é?

Sistema inteligente que analisa logs e eventos de rede para **detectar falhas antes que se tornem críticas** e envia alertas automáticos para a equipe técnica.

## ⚡ Início Rápido

### 1. Acessar o Dashboard

```
https://seu-projeto.lovable.app/admin/atlas-insights
```

**Acesso**: Apenas Admin e Editor

### 2. Primeiros Passos

#### a) Configurar Responsáveis de Alerta

```sql
-- Via SQL Editor no Supabase
INSERT INTO responsaveis_alerta (nome, telefone, funcao, tipo_evento)
VALUES 
  ('João Silva', '5561912345678', 'Gerente NOC', 'mass_outage'),
  ('Maria Santos', '5561987654321', 'Coordenadora Técnica', 'mass_outage');
```

#### b) Ajustar Thresholds (opcional)

```sql
-- Valores padrão já estão configurados
-- Ajuste apenas se necessário

UPDATE atlas_config
SET thresholds = '{
  "errors_per_min": {
    "LOW": 2,
    "MEDIUM": 5,
    "HIGH": 10
  }
}'::jsonb;
```

#### c) Ativar Análise Automática (Cron Job)

**No SQL Editor do Supabase:**

```sql
-- 1. Habilitar pg_cron (se não estiver habilitado)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Agendar análise a cada 15 minutos
SELECT cron.schedule(
  'atlas-analyzer-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/atlas-analyzer',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body:='{"windowMinutes":90}'::jsonb
  );
  $$
);
```

**⚠️ Importante**: Substitua `<SERVICE_ROLE_KEY>` pela chave real:
1. Vá em Settings > API
2. Copie o `service_role` (secret)

### 3. Testar Manualmente

#### Via Interface
1. Acesse `/admin/atlas-insights`
2. Clique em "Executar análise"
3. Aguarde 5-10 segundos
4. Verifique os novos insights nos cards

#### Via API (cURL)
```bash
curl -X POST \
  https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/atlas-analyzer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{"windowMinutes":90}'
```

## 📊 Entendendo os Resultados

### Níveis de Severidade

| Severidade | Cor | Quando aparece | Ação |
|------------|-----|----------------|------|
| **LOW** 🟢 | Verde | < 2 erros/min | Monitorar |
| **MEDIUM** 🟠 | Laranja | 2-5 erros/min | Investigar |
| **HIGH** 🔴 | Vermelho | > 5 erros/min OU outages críticos | **Alerta automático + ação imediata** |

### Causas Prováveis

| Causa | Indicador | Recomendação |
|-------|-----------|--------------|
| **power_outage** | Dying Gasp detectado + outages críticos | Despachar equipe para verificar energia |
| **bgp** | Logs de BGP down/flap | Auditar sessões BGP na CCR1036 |
| **backbone_break** | Múltiplos outages simultâneos | Verificar rompimento físico |
| **integration_instability** | Timeouts do IXC/Evolution | Checar saúde das integrações |
| **unknown** | Sem padrão claro | Monitorar e reavaliar |

### KPIs Principais

```
📈 Erros/min: Taxa de erros nos logs
🚨 Eventos ativos: Outages em andamento
✅ Uptime estimado: Saúde geral da rede (calculado)
🕐 Última análise: Timestamp da última execução
```

## 🔔 Notificações Automáticas

### Quando são enviadas?

**Apenas em severidade HIGH** 🔴

### Formato da Mensagem WhatsApp

```
🚨 Atlas: Severidade ALTA
Causa provável: power_outage
Erros/min: 1.2
Eventos ativos: 15
Grupos: PON:1/1/5, CTO:Centro
IXC offline (amostra): 45
Ação: Despachar equipe para checar energia nas CTOs/PONs afetadas
```

### Destinatários

Todos os responsáveis **ativos** com `tipo_evento = 'mass_outage'`

## 🛠️ Tarefas Comuns

### Adicionar Novo Responsável

```sql
INSERT INTO responsaveis_alerta (nome, telefone, funcao, tipo_evento)
VALUES ('Carlos Mendes', '5561900000000', 'Técnico Plantão', 'mass_outage');
```

### Desativar Responsável (sem deletar)

```sql
UPDATE responsaveis_alerta 
SET ativo = false 
WHERE telefone = '5561900000000';
```

### Verificar Últimos Insights

```sql
SELECT 
  severity,
  probable_cause,
  kpis->>'errors_per_min' as errors_per_min,
  created_at
FROM atlas_insights
ORDER BY created_at DESC
LIMIT 10;
```

### Ver Status do Cron Job

```sql
SELECT * FROM cron.job WHERE jobname = 'atlas-analyzer-15min';
```

### Pausar Análise Automática

```sql
SELECT cron.unschedule('atlas-analyzer-15min');
```

### Reativar Análise Automática

```sql
-- Rode o comando SELECT cron.schedule(...) novamente
```

## 🎯 Boas Práticas

### 1. Ajuste os Thresholds Conforme sua Rede

**Rede pequena (<500 clientes)**
```json
{
  "errors_per_min": {
    "LOW": 1,
    "MEDIUM": 3,
    "HIGH": 5
  }
}
```

**Rede média (500-2000 clientes)**
```json
{
  "errors_per_min": {
    "LOW": 2,
    "MEDIUM": 5,
    "HIGH": 10
  }
}
```

**Rede grande (>2000 clientes)**
```json
{
  "errors_per_min": {
    "LOW": 5,
    "MEDIUM": 10,
    "HIGH": 20
  }
}
```

### 2. Mantenha Telefones Atualizados

Revise mensalmente os responsáveis:

```sql
SELECT nome, telefone, funcao 
FROM responsaveis_alerta 
WHERE ativo = true;
```

### 3. Monitore Notificações Enviadas

```sql
SELECT 
  severity,
  created_at,
  notifications->0->>'overall_status' as status,
  jsonb_array_length(notifications->0->'recipients') as enviados
FROM atlas_insights
WHERE severity = 'HIGH'
  AND created_at > now() - interval '7 days'
ORDER BY created_at DESC;
```

### 4. Limpeza Periódica (opcional)

```sql
-- Manter apenas últimos 90 dias
DELETE FROM atlas_insights 
WHERE created_at < now() - interval '90 days';
```

## 🐛 Troubleshooting

### Problema: Nenhum insight aparece

**Verificar:**
```sql
-- Há logs recentes?
SELECT count(*) FROM monitoring_logs 
WHERE created_at > now() - interval '1 hour';

-- Há eventos ativos?
SELECT count(*) FROM mass_outage_events 
WHERE status = 'active';
```

**Solução**: Se ambos = 0, o sistema está saudável. Nenhum alerta necessário.

### Problema: Notificações não chegam

**Verificar:**
1. Responsáveis ativos:
```sql
SELECT * FROM responsaveis_alerta WHERE ativo = true;
```

2. Logs da função `send-whatsapp-message` no Supabase

3. Variável `EVOLUTION_INSTANCE_NAME` configurada

### Problema: Muitos alertas duplicados

**Verificar deduplicação:**
```sql
-- Insights na última hora
SELECT severity, probable_cause, count(*) 
FROM atlas_insights 
WHERE created_at > now() - interval '1 hour'
GROUP BY severity, probable_cause;
```

**Solução**: Se houver duplicatas em < 15min, há um bug. Reportar no GitHub.

## 📚 Documentação Completa

Para mais detalhes, consulte:
- [Atlas Analyzer - Documentação Técnica](./atlas-analyzer-system.md)
- [Mass Outage Detection](./mass-outage-detection-flow.md)
- [Operational Guide](./operational-guide.md)

## 🆘 Suporte

- **Logs da função**: Supabase > Functions > atlas-analyzer > Logs
- **SQL Editor**: Para consultas e ajustes
- **GitHub Issues**: Para reportar bugs ou sugestões

---

**Última atualização**: 2025-01-14
**Versão**: 2.0
