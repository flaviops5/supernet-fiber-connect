# 🧠 Atlas Analyzer v2.0 - Sistema de Análise Preditiva de Falhas

## 📋 Visão Geral

O Atlas Analyzer é um sistema avançado de análise preditiva que monitora a saúde da infraestrutura de rede, detecta padrões de falhas e envia alertas automáticos para a equipe técnica.

### Características Principais

- **Análise Multi-Sinal**: Correlaciona dados de logs, eventos de massa outage e status do IXC
- **Deduplicação Inteligente**: Evita alertas duplicados em janela de 15 minutos
- **Thresholds Dinâmicos**: Configuração ajustável via banco de dados
- **Agrupamento Geográfico**: Identifica padrões por PON/CTO/Região
- **Notificações Automáticas**: WhatsApp para alertas críticos (HIGH)
- **Análise de Tendências**: Compara com insights anteriores (worsening/stable/improving)

## 🗄️ Estrutura de Dados

### Tabela: `atlas_insights`

Armazena os insights gerados pelo analisador.

```sql
CREATE TABLE public.atlas_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeframe_minutes INTEGER NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  probable_cause TEXT NOT NULL,
  kpis JSONB DEFAULT '{}'::jsonb,
  groups TEXT[] DEFAULT '{}',
  recommendation TEXT NOT NULL,
  notifications JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Campos:**
- `severity`: Nível de severidade (LOW, MEDIUM, HIGH)
- `probable_cause`: Causa provável (power_outage, bgp, backbone_break, integration_instability, unknown)
- `kpis`: Métricas coletadas (errors_per_min, active_events, dying_gasp_hints, etc.)
- `groups`: Grupos afetados (PON:X, CTO:Y, REGION:Z)
- `notifications`: Histórico de notificações enviadas

### Tabela: `atlas_config`

Configurações dinâmicas do sistema.

```sql
CREATE TABLE public.atlas_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thresholds JSONB NOT NULL DEFAULT '{"errors_per_min":{"LOW":2,"MEDIUM":5,"HIGH":10}}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);
```

**Exemplo de thresholds:**
```json
{
  "errors_per_min": {
    "LOW": 2,
    "MEDIUM": 5,
    "HIGH": 10
  }
}
```

### Tabela: `responsaveis_alerta`

Cadastro de responsáveis para receber alertas.

```sql
CREATE TABLE public.responsaveis_alerta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  funcao TEXT NOT NULL,
  tipo_evento TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Tipos de evento suportados:**
- `mass_outage`: Eventos de queda em massa
- `atlas_critical`: Alertas críticos do Atlas

## 🔧 Edge Function: `atlas-analyzer`

### Endpoint
```
POST https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/atlas-analyzer
```

### Request Body
```json
{
  "windowMinutes": 90
}
```

**Parâmetros:**
- `windowMinutes` (opcional): Janela de análise em minutos (padrão: 90, min: 15, max: 240)

### Response (Sucesso)
```json
{
  "success": true,
  "insight_id": "uuid",
  "severity": "HIGH",
  "probable_cause": "power_outage",
  "kpis": {
    "window_minutes": 90,
    "total_logs": 1523,
    "errors": 87,
    "errors_per_min": 0.97,
    "active_events": 12,
    "critical_outages": 3,
    "dying_gasp_hints": 5,
    "ixc_timeouts": 2,
    "evo_timeouts": 0,
    "ixc_offline_count": 45,
    "trend": "worsening"
  },
  "groups": ["PON:1/1/5", "CTO:Centro", "REGION:Norte"],
  "notified": true,
  "notification_details": [
    {
      "recipient": "Carlos Mendes",
      "phone": "5561912345678",
      "status": "sent"
    }
  ]
}
```

### Response (Deduplicação)
```json
{
  "success": true,
  "skipped": true,
  "reason": "duplicate_within_15min",
  "severity": "HIGH",
  "probableCause": "power_outage"
}
```

## 🎯 Lógica de Inferência

### 1. Classificação de Severidade

```typescript
if (errorsPerMin >= THRESH_HIGH || criticalOutages >= 1) {
  severity = "HIGH"
} else if (errorsPerMin >= THRESH_MED) {
  severity = "MEDIUM"
} else {
  severity = "LOW"
}
```

### 2. Determinação de Causa Provável

```typescript
function inferCause({ dyingGaspHints, bgpHints, ixcTimeouts, evoTimeouts, criticalOutagesCount }) {
  if (dyingGaspHints >= 2 || criticalOutagesCount > 0) return "power_outage"
  if (bgpHints > 0) return "bgp"
  if (criticalOutagesCount >= 2) return "backbone_break"
  if (ixcTimeouts + evoTimeouts >= 4) return "integration_instability"
  return "unknown"
}
```

### 3. Análise de Tendência

Compara os últimos 3 insights:
- **Worsening**: Média de crescimento > 0.5 erros/min
- **Improving**: Média de decrescimento < -0.5 erros/min
- **Stable**: Variação entre -0.5 e 0.5 erros/min

### 4. Agrupamento Geográfico

Prioridade: **PON** > **CTO** > **REGION**

```typescript
// Exemplo de grupos retornados
["PON:1/1/5", "PON:1/1/3", "CTO:Centro", "REGION:Norte"]
```

## 📱 Sistema de Notificações

### Fluxo de Notificação (severity = HIGH)

1. **Busca responsáveis ativos**
```sql
SELECT nome, telefone, funcao 
FROM responsaveis_alerta 
WHERE ativo = true AND tipo_evento = 'mass_outage'
```

2. **Monta mensagem**
```
🚨 Atlas: Severidade ALTA
Causa provável: power_outage
Erros/min: 1.2
Eventos ativos: 15
Grupos: PON:1/1/5, CTO:Centro
IXC offline (amostra): 45
Ação: Despachar equipe para checar energia nas CTOs/PONs afetadas
```

3. **Envia via WhatsApp** (Edge Function `send-whatsapp-message`)

4. **Atualiza registro** com status de envio

## 🔄 Execução Automática (Cron Job)

### Configuração via pg_cron

```sql
SELECT cron.schedule(
  'atlas-analyzer-15min',
  '*/15 * * * *',  -- A cada 15 minutos
  $$
  SELECT net.http_post(
    url:='https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/atlas-analyzer',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body:='{"windowMinutes":90}'::jsonb
  );
  $$
);
```

**⚠️ Importante**: Substituir `<SERVICE_ROLE_KEY>` pela chave real do Supabase.

### Verificar Jobs Agendados

```sql
SELECT * FROM cron.job WHERE jobname = 'atlas-analyzer-15min';
```

### Desagendar Job

```sql
SELECT cron.unschedule('atlas-analyzer-15min');
```

## 🖥️ Interface Frontend

### Página: `/admin/atlas-insights`

**Acesso**: Apenas Admin e Editor

**Recursos:**
- **KPIs em tempo real**: Erros/min, Eventos ativos, Uptime, Última análise
- **Gráfico de tendência**: Últimas 24h (erros/min vs eventos ativos)
- **Filtros**: Severidade, Causa provável, Busca por recomendação
- **Cards de insights**: Detalhes de cada análise com status de notificação
- **Execução manual**: Botão para executar análise sob demanda

### Componentes Principais

```tsx
// KPIs
<Card>
  <CardContent>
    <TrendingUp className="text-primary" />
    <p>Erros/min (média): {stats.avgErrors.toFixed(2)}</p>
  </CardContent>
</Card>

// Gráfico
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={chartData}>
    <Line dataKey="errors_per_min" stroke="hsl(var(--destructive))" />
    <Line dataKey="active_events" stroke="hsl(var(--primary))" />
  </LineChart>
</ResponsiveContainer>

// Cards de insights
{insights.map((i) => (
  <Card key={i.id}>
    <Badge className={getSeverityStyle(i.severity)}>{i.severity}</Badge>
    <p><strong>Causa:</strong> {i.probable_cause}</p>
    <p><strong>Recomendação:</strong> {i.recommendation}</p>
  </Card>
))}
```

## 🔒 Segurança (RLS Policies)

### atlas_insights
```sql
-- Leitura: Admins e Editores
CREATE POLICY "Admins e editores podem ver insights"
  ON atlas_insights FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));

-- Escrita: Service Role (edge functions)
CREATE POLICY "Service role pode inserir insights"
  ON atlas_insights FOR INSERT TO service_role
  WITH CHECK (true);
```

### atlas_config
```sql
-- Service role e Admins podem gerenciar
CREATE POLICY "Admins can manage atlas_config"
  ON atlas_config FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
```

### responsaveis_alerta
```sql
-- Admins podem gerenciar
CREATE POLICY "Admins can manage responsaveis_alerta"
  ON responsaveis_alerta FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Service role pode ler (para enviar notificações)
CREATE POLICY "Service role can read responsaveis"
  ON responsaveis_alerta FOR SELECT TO service_role
  USING (true);
```

## 📊 Métricas e KPIs

### KPIs Coletados

| Métrica | Descrição | Fonte |
|---------|-----------|-------|
| `window_minutes` | Janela de análise | Parâmetro |
| `total_logs` | Total de logs processados | monitoring_logs |
| `warns` | Logs de warning | monitoring_logs |
| `errors` | Logs de erro | monitoring_logs |
| `errors_per_min` | Taxa de erros por minuto | Calculado |
| `active_events` | Eventos de outage ativos | mass_outage_events |
| `critical_outages` | Outages com ≥10 afetados | mass_outage_events |
| `dying_gasp_hints` | Menções a "dying gasp" | monitoring_logs |
| `ixc_timeouts` | Timeouts do IXC | monitoring_logs |
| `evo_timeouts` | Timeouts do Evolution | monitoring_logs |
| `ixc_offline_count` | Clientes offline no IXC | ixc-proxy |
| `trend` | Tendência (worsening/stable/improving) | Últimos 3 insights |

## 🎨 Design Tokens Utilizados

```css
/* Severidade */
--destructive: /* HIGH */
--orange-500: /* MEDIUM */
--green-600: /* LOW */

/* Gráficos */
--primary: /* Linha de eventos ativos */
--destructive: /* Linha de erros/min */

/* KPIs */
--primary: /* Erros/min */
--orange-500: /* Eventos ativos */
--green-600: /* Uptime */
--muted-foreground: /* Última análise */
```

## 🧪 Testes e Validação

### Teste Manual via Frontend
1. Acesse `/admin/atlas-insights`
2. Clique em "Executar análise"
3. Verifique os KPIs atualizados
4. Confira novos insights nos cards

### Teste via Supabase Functions
```bash
curl -X POST \
  https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/atlas-analyzer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -d '{"windowMinutes":90}'
```

### Validar Dados no Banco
```sql
-- Últimos 5 insights
SELECT 
  severity, 
  probable_cause, 
  kpis->>'errors_per_min' as errors_per_min,
  created_at
FROM atlas_insights 
ORDER BY created_at DESC 
LIMIT 5;

-- Notificações enviadas
SELECT 
  severity,
  notifications->0->>'overall_status' as status,
  jsonb_array_length(notifications->0->'recipients') as recipients_count
FROM atlas_insights 
WHERE severity = 'HIGH'
ORDER BY created_at DESC;
```

## 🔧 Manutenção e Ajustes

### Ajustar Thresholds
```sql
UPDATE atlas_config
SET thresholds = '{
  "errors_per_min": {
    "LOW": 3,
    "MEDIUM": 7,
    "HIGH": 12
  }
}'::jsonb,
updated_at = now();
```

### Adicionar Responsável
```sql
INSERT INTO responsaveis_alerta (nome, telefone, funcao, tipo_evento)
VALUES ('João Silva', '5561987654321', 'Técnico Senior', 'mass_outage');
```

### Desativar Responsável
```sql
UPDATE responsaveis_alerta 
SET ativo = false 
WHERE telefone = '5561987654321';
```

### Limpar Insights Antigos
```sql
DELETE FROM atlas_insights 
WHERE created_at < now() - interval '90 days';
```

## 🚨 Troubleshooting

### Problema: Notificações não sendo enviadas

**Verificar:**
1. Responsáveis ativos: `SELECT * FROM responsaveis_alerta WHERE ativo = true`
2. Logs da função: Supabase > Functions > send-whatsapp-message > Logs
3. Variável `EVOLUTION_INSTANCE_NAME` configurada

### Problema: Análise não detectando outages

**Verificar:**
1. Dados em `mass_outage_events`: `SELECT * FROM mass_outage_events WHERE status = 'active'`
2. Logs em `monitoring_logs`: `SELECT count(*) FROM monitoring_logs WHERE created_at > now() - interval '1 hour'`
3. Thresholds muito altos em `atlas_config`

### Problema: IXC offline count sempre 0

**Verificar:**
1. Endpoint IXC disponível: `/cliente_equipamento`
2. Logs do `ixc-proxy` para erros
3. Variável `IXC_API_BASE_URL` correta

## 📚 Referências

- [Documentação IXC API](docs/system-complete-description.md)
- [Mass Outage Detection](docs/mass-outage-detection-flow.md)
- [Monitoring System](docs/operational-guide.md)
- [Edge Functions Guide](docs/tools-reference.md)

## 📝 Changelog

### v2.0 (2025-01-14)
- ✅ Thresholds dinâmicos via `atlas_config`
- ✅ Deduplicação de insights (15min)
- ✅ Agrupamento inteligente (PON/CTO/REGIÃO)
- ✅ Análise de tendências (últimos 3 insights)
- ✅ Integração com IXC (clientes offline)
- ✅ Notificações WhatsApp automáticas
- ✅ Interface frontend completa
- ✅ Cron job para execução automática

### v1.0 (Conceito inicial)
- Análise básica de logs
- Severidade manual
- Sem notificações automáticas
