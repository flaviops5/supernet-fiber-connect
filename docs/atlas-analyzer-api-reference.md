# 🔌 Atlas Analyzer - API Reference

## Edge Function Endpoint

```
POST https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/atlas-analyzer
```

**Authentication**: Bearer token (Supabase Anon Key ou Service Role Key)

**CORS**: Habilitado (`Access-Control-Allow-Origin: *`)

## Request

### Headers

```http
Content-Type: application/json
Authorization: Bearer eyJhbGc...
```

### Body (JSON)

```json
{
  "windowMinutes": 90
}
```

**Parâmetros:**

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| `windowMinutes` | `number` | Não | `90` | Janela de tempo para análise em minutos (min: 15, max: 240) |

## Response

### Success (200)

#### Novo Insight Criado

```json
{
  "success": true,
  "insight_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "severity": "HIGH",
  "probable_cause": "power_outage",
  "kpis": {
    "window_minutes": 90,
    "total_logs": 1523,
    "warns": 234,
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
  "groups": [
    "PON:1/1/5",
    "PON:1/1/3",
    "CTO:Centro",
    "REGION:Norte"
  ],
  "notified": true,
  "notification_details": [
    {
      "recipient": "Carlos Mendes",
      "phone": "5561912345678",
      "status": "sent"
    },
    {
      "recipient": "Juliana Silva",
      "phone": "5561988888888",
      "status": "sent"
    }
  ]
}
```

#### Insight Duplicado (Skipped)

```json
{
  "success": true,
  "skipped": true,
  "reason": "duplicate_within_15min",
  "severity": "HIGH",
  "probableCause": "power_outage"
}
```

### Error (500)

```json
{
  "success": false,
  "error": "Missing Supabase environment variables"
}
```

## Data Types

### Severity

```typescript
type Severity = "LOW" | "MEDIUM" | "HIGH";
```

**Classificação:**
- `LOW`: < threshold_LOW erros/min (padrão: 2)
- `MEDIUM`: >= threshold_MED erros/min (padrão: 5)
- `HIGH`: >= threshold_HIGH erros/min (padrão: 10) OU critical_outages >= 1

### Probable Cause

```typescript
type Cause =
  | "power_outage"        // Falta de energia (dying gasp + outages críticos)
  | "bgp"                 // Problemas BGP detectados nos logs
  | "backbone_break"      // Rompimento de backbone (múltiplos outages)
  | "integration_instability" // Timeouts IXC/Evolution
  | "unknown";            // Sem padrão claro
```

### KPIs Object

```typescript
interface KPIs {
  window_minutes: number;        // Janela de análise usada
  total_logs: number;            // Total de logs processados
  warns: number;                 // Logs de warning
  errors: number;                // Logs de error
  errors_per_min: number;        // Taxa de erros por minuto
  active_events: number;         // Eventos de outage ativos
  critical_outages: number;      // Outages com >= 10 afetados
  dying_gasp_hints: number;      // Menções a "dying gasp"
  ixc_timeouts: number;          // Timeouts do IXC
  evo_timeouts: number;          // Timeouts do Evolution
  ixc_offline_count: number;     // Clientes offline no IXC
  trend: "worsening" | "stable" | "improving"; // Tendência
}
```

### Groups Array

```typescript
type Groups = string[]; // Ex: ["PON:1/1/5", "CTO:Centro", "REGION:Norte"]
```

**Formato:**
- `PON:<porta>` - Porta PON específica
- `CTO:<nome>` - CTO específica
- `REGION:<nome>` - Região específica
- `UNKNOWN` - Sem agrupamento identificado

### Notification Details

```typescript
interface NotificationDetail {
  recipient: string;  // Nome do responsável
  phone: string;      // Telefone (formato: 5561912345678)
  status: "sent" | "failed";
  error?: string;     // Presente apenas se status = "failed"
}
```

## Database Schema Reference

### Table: atlas_insights

```sql
CREATE TABLE atlas_insights (
  id UUID PRIMARY KEY,
  timeframe_minutes INTEGER NOT NULL,
  severity TEXT NOT NULL,
  probable_cause TEXT NOT NULL,
  kpis JSONB DEFAULT '{}'::jsonb,
  groups TEXT[] DEFAULT '{}',
  recommendation TEXT NOT NULL,
  notifications JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_atlas_insights_created_at` (created_at DESC)
- `idx_atlas_insights_severity` (severity)
- `idx_atlas_insights_cause` (probable_cause)

### Table: atlas_config

```sql
CREATE TABLE atlas_config (
  id UUID PRIMARY KEY,
  thresholds JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);
```

**Default thresholds:**
```json
{
  "errors_per_min": {
    "LOW": 2,
    "MEDIUM": 5,
    "HIGH": 10
  }
}
```

### Table: responsaveis_alerta

```sql
CREATE TABLE responsaveis_alerta (
  id UUID PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  funcao TEXT NOT NULL,
  tipo_evento TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Index:**
- `idx_responsaveis_tipo_ativo` (tipo_evento, ativo) WHERE ativo = true

## RLS Policies

### atlas_insights

```sql
-- Leitura: Admins e Editores
CREATE POLICY "Admins e editores podem ver insights"
  ON atlas_insights FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));

-- Inserção: Service Role
CREATE POLICY "Service role pode inserir insights"
  ON atlas_insights FOR INSERT TO service_role
  WITH CHECK (true);

-- Atualização: Service Role (para notifications)
CREATE POLICY "Service role pode atualizar insights"
  ON atlas_insights FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);
```

### atlas_config

```sql
-- Service role e Admins
CREATE POLICY "Service role can manage atlas_config"
  ON atlas_config FOR ALL TO service_role
  USING (true) WITH CHECK (true);

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

-- Editores podem visualizar
CREATE POLICY "Editors can view responsaveis_alerta"
  ON responsaveis_alerta FOR SELECT
  USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));
```

## Integration Dependencies

### Required Edge Functions

- **ixc-proxy**: Para buscar clientes offline do IXC
- **send-whatsapp-message**: Para enviar notificações HIGH

### Required Tables

- **monitoring_logs**: Fonte de logs de erro/warning
- **mass_outage_events**: Fonte de eventos de outage ativos

### Environment Variables

```bash
SUPABASE_URL=https://mxdupkbpxjcfxdgrwknp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_ANON_KEY=eyJhbGc...
EVOLUTION_INSTANCE_NAME=SDR2
```

## Example Usage

### cURL

```bash
curl -X POST \
  https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/atlas-analyzer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{"windowMinutes":90}'
```

### JavaScript/TypeScript

```typescript
import { supabase } from "@/integrations/supabase/client";

const { data, error } = await supabase.functions.invoke("atlas-analyzer", {
  body: { windowMinutes: 90 }
});

if (error) {
  console.error("Erro ao executar análise:", error);
} else {
  console.log("Insight criado:", data.insight_id);
  console.log("Severidade:", data.severity);
  console.log("Causa provável:", data.probable_cause);
}
```

### SQL Query (Buscar últimos insights)

```sql
SELECT 
  id,
  severity,
  probable_cause,
  kpis->>'errors_per_min' as errors_per_min,
  kpis->>'active_events' as active_events,
  array_length(groups, 1) as groups_count,
  created_at
FROM atlas_insights
ORDER BY created_at DESC
LIMIT 10;
```

## Rate Limiting

**Não implementado** - A função pode ser chamada sem limites.

**Recomendação**: Para uso em produção via cron job, executar a cada 15 minutos é suficiente devido ao mecanismo de deduplicação.

## Troubleshooting

### Erro: "Missing Supabase environment variables"

**Causa**: Variáveis `SUPABASE_URL` ou `SUPABASE_SERVICE_ROLE_KEY` não configuradas.

**Solução**: Verificar secrets no Supabase Edge Functions.

### Erro: IXC offline count sempre retorna 0

**Causa**: Endpoint `cliente_equipamento` do IXC não disponível ou erro na consulta.

**Solução**: 
1. Verificar logs do `ixc-proxy`
2. Confirmar se endpoint `/cliente_equipamento` está disponível no IXC

### Notificações não são enviadas

**Causa**: Nenhum responsável ativo ou erro no `send-whatsapp-message`.

**Solução**:
```sql
-- Verificar responsáveis ativos
SELECT * FROM responsaveis_alerta WHERE ativo = true;

-- Verificar logs da função send-whatsapp-message no Supabase
```

## Changelog

### v2.0 (2025-01-14)
- ✅ Release inicial com todas as features

---

**Última atualização**: 2025-01-14
