# PR #19 — Análise de Qualidade (Aging + ONU + Retests)

**Meta:** 9.9/10 ou superior  
**Status Atual:** ⚠️ **7.8/10** — Requer correções críticas antes do merge

---

## 📊 Avaliação por Critério

### 1️⃣ Clareza e Objetividade (8.5/10) ✅
- ✅ Objetivo claro: Aging, ONU tracking, Retests
- ✅ Estrutura bem organizada (migrations → helpers → integração → dashboard)
- ✅ Nomenclatura consistente com sistema existente
- ⚠️ Falta documentação sobre **quando** marcar cada aging event
- ⚠️ Falta exemplo de como interpretar p50/p90 de aging

### 2️⃣ Coerência com Identidade (9.0/10) ✅
- ✅ Mantém fluxos técnicos existentes intactos
- ✅ Não altera comunicação do Luan
- ✅ Tracking é transparente para o cliente
- ✅ Dashboard focado em dados, não em comunicação

### 3️⃣ Redução de Verborragia (9.5/10) ✅
- ✅ Nenhuma nova mensagem ao cliente
- ✅ Helpers são silenciosos (fire-and-forget)
- ✅ Dashboard conciso e objetivo

### 4️⃣ Impacto em Fluxos Técnicos (6.0/10) ⚠️ **CRÍTICO**
- ❌ **BLOQUEANTE**: Helpers usam `await` que pode bloquear fluxo principal
- ❌ **PERFORMANCE**: Queries sem LIMIT podem travar em produção
- ⚠️ Falta validação de inputs (null/undefined)
- ⚠️ RPCs sem `SECURITY INVOKER` podem expor dados sensíveis

### 5️⃣ Sem Regressão (7.5/10) ⚠️
- ✅ Não altera variáveis ou contextos existentes
- ✅ Usa tabelas novas (sem modificar existentes)
- ⚠️ Faltam tipos TypeScript (pode quebrar type-safety)
- ⚠️ Sem cleanup de dados antigos (crescimento infinito)
- ⚠️ Dashboard pode causar re-renders excessivos

---

## 🔴 PROBLEMAS CRÍTICOS (Impedem 10/10)

### **C1: Helpers NÃO são Fire-and-Forget** ❌ (Impacto: -1.0)

**Problema:**
```typescript
// ❌ ERRADO — await bloqueia o fluxo principal
export async function markAgingEvent(supabaseAdmin: any, ...) {
  try {
    await supabaseAdmin.from('support_aging_events').insert(...);
  } catch (e) {
    console.error('Aging insert failed:', e);
  }
}
```

**Solução:**
```typescript
// ✅ CORRETO — 100% fire-and-forget
export function markAgingEvent(supabaseAdmin: any, ...) {
  Promise.resolve().then(async () => {
    try {
      await supabaseAdmin.from('support_aging_events').insert(...);
    } catch (e) {
      console.error('⚠️ Aging insert failed (non-blocking):', e);
    }
  });
}
```

**Aplicar para:** `aging.ts`, `onu-tracker.ts`, `retests.ts`

---

### **C2: Falta SECURITY INVOKER nos RPCs** ❌ (Impacto: -0.5)

**Problema:**
```sql
-- ❌ Expõe dados de TODOS os clientes via RLS bypass
CREATE OR REPLACE FUNCTION calc_support_aging_p50_p90_14d()
...
SECURITY DEFINER  -- ⚠️ Roda como owner, ignora RLS
```

**Solução:**
```sql
-- ✅ Respeita RLS e permissões do usuário
CREATE OR REPLACE FUNCTION calc_support_aging_p50_p90_14d()
...
SECURITY INVOKER  -- ✅ Roda como caller
AS $$
  -- adicionar WHERE que respeita RLS se necessário
  ...
$$;
```

**Aplicar para:** `calc_support_aging_p50_p90_14d`, `calc_onu_instability_top_14d`

---

### **C3: Validação de Inputs Ausente** ❌ (Impacto: -0.4)

**Problema:**
```typescript
// ❌ Aceita valores inválidos
export async function trackOnuSnapshot(supabaseAdmin: any, {
  ixc_client_id,
  onu_serial,
  ...
}) {
  if (!ixc_client_id || !onu_serial) return;  // ⚠️ Silencioso demais
  // ...
}
```

**Solução:**
```typescript
// ✅ Valida e loga problemas
export function trackOnuSnapshot(supabaseAdmin: any, {
  ixc_client_id,
  onu_serial,
  rx_dbm,
  tx_dbm,
  ...
}) {
  // Validação básica
  if (!ixc_client_id?.trim() || !onu_serial?.trim()) {
    console.warn('⚠️ trackOnuSnapshot: client_id ou serial inválido');
    return;
  }
  
  // Validação de range (RX: -40 a 0, TX: -10 a +10)
  if (rx_dbm != null && (rx_dbm < -40 || rx_dbm > 0)) {
    console.warn(`⚠️ trackOnuSnapshot: RX fora do range: ${rx_dbm}`);
  }
  
  Promise.resolve().then(async () => {
    // ... insert
  });
}
```

---

### **C4: Queries Sem LIMIT** ❌ (Impacto: -0.3)

**Problema:**
```sql
-- ❌ Pode retornar milhões de linhas
SELECT ... FROM support_aging_events
WHERE created_at >= now() - interval '14 days'  -- pode ser 100k+ registros
GROUP BY 1;
```

**Solução:**
```sql
-- ✅ Sempre use LIMIT, mesmo em agregações
SELECT ... FROM (
  SELECT * FROM support_aging_events
  WHERE created_at >= now() - interval '14 days'
  LIMIT 50000  -- hard limit para segurança
) sub
GROUP BY 1;
```

---

### **C5: Falta Cleanup Automático** ❌ (Impacto: -0.3)

**Problema:**
- Tabelas crescem infinitamente (aging, onu, retests)
- Sem job de limpeza após 90 dias
- Indices ficam lentos com milhões de registros

**Solução:**
```sql
-- Migration adicional: pr19_cleanup_job.sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job diário: limpar dados > 90 dias
SELECT cron.schedule(
  'pr19-cleanup-aging-90d',
  '0 3 * * *',  -- 3AM diariamente
  $$
  DELETE FROM support_aging_events WHERE created_at < now() - interval '90 days';
  DELETE FROM onu_tracking_events WHERE created_at < now() - interval '90 days';
  DELETE FROM support_retests WHERE created_at < now() - interval '90 days';
  $$
);
```

---

## ⚠️ MELHORIAS RECOMENDADAS (Para 9.5+)

### **M1: Error Handling no Dashboard** (Impacto: +0.2)

**Adicionar:**
```typescript
async function fetchExtra() {
  try {
    const [aging, onu, rt] = await Promise.all([
      supabase.rpc("calc_support_aging_p50_p90_14d"),
      supabase.rpc("calc_onu_instability_top_14d", { limit_n: 20 }),
      supabase.from("dashboard_retests_7d").select("*")
    ]);

    if (aging.error) {
      console.error('Aging RPC failed:', aging.error);
      toast({ title: "⚠️ Erro ao carregar aging", variant: "destructive" });
    } else if (aging.data?.length) {
      setAgingSummary(aging.data[0]);
    }
    
    // Similar para onu e retests...
  } catch (e) {
    console.error('fetchExtra failed:', e);
  }
}
```

---

### **M2: Memo para Performance** (Impacto: +0.1)

**Adicionar:**
```typescript
const retestsTable = useMemo(() => (
  <Table>
    {/* ... renderização da tabela */}
  </Table>
), [retests]);
```

---

### **M3: Tipos TypeScript** (Impacto: +0.2)

**Criar:** `src/types/pr19.types.ts`
```typescript
export interface AgingEvent {
  id: string;
  conversation_id: string;
  fluxo: string;
  step: string;
  meta: Record<string, any>;
  created_at: string;
}

export interface OnuTrackingEvent {
  id: string;
  conversation_id?: string;
  ixc_client_id?: string;
  onu_serial?: string;
  rx_dbm?: number;
  tx_dbm?: number;
  status: 'ok' | 'weak' | 'critical' | 'unknown';
  source: 'signal_tool' | 'manual';
  created_at: string;
}

export interface SupportRetest {
  id: string;
  conversation_id?: string;
  ixc_client_id?: string;
  step: 'post_reboot' | 'post_optical' | 'post_route';
  before_ok?: boolean;
  after_ok?: boolean;
  latency_ms_before?: number;
  latency_ms_after?: number;
  created_at: string;
}
```

---

### **M4: Documentação de Aging Events** (Impacto: +0.1)

**Criar:** `docs/knowledge-base/data-sources/sistema/aging-events.md`

```markdown
# Aging Events — Marcos Temporais

## Quando Marcar Events

| Step | Quando | Meta Recomendado |
|------|--------|------------------|
| `start` | Início da conversa (1ª mensagem do cliente) | `{ agent: 'support-tech' }` |
| `scenario_a_start` | Cliente entra no Cenário A | `{ scenario: 'A', issue: 'offline' }` |
| `scenario_b_start` | Cliente entra no Cenário B | `{ scenario: 'B', issue: 'intermittent' }` |
| `reboot_requested` | Luan solicita reboot | `{ method: 'remote' }` |
| `signal_checked` | Consulta sinal ONU | `{ rx_dbm, tx_dbm }` |
| `ticket_opened` | Abre ticket IXC (Cenário D) | `{ ixc_ticket_id, reason }` |
| `resolved` | Cliente confirma resolução | `{ method: 'remote' or 'onsite' }` |

## Interpretação de p50/p90

- **p50 < 10 min**: ✅ Excelente (maioria resolvida rápido)
- **p50 10-20 min**: ⚠️ Aceitável (considerar otimizações)
- **p50 > 20 min**: ❌ Crítico (investigar gargalos)

- **p90 < 30 min**: ✅ Bom (picos controlados)
- **p90 > 60 min**: ❌ Preocupante (casos complexos demoram muito)
```

---

## 📋 CHECKLIST DE CORREÇÕES OBRIGATÓRIAS

- [ ] **C1**: Transformar helpers em fire-and-forget (aging, onu, retests)
- [ ] **C2**: Adicionar `SECURITY INVOKER` nos 2 RPCs
- [ ] **C3**: Validar inputs nos 3 helpers (client_id, serial, etc)
- [ ] **C4**: Adicionar LIMIT 50000 nas queries de aging/onu
- [ ] **C5**: Criar migration com job de cleanup (90 dias)

- [ ] **M1**: Error handling robusto no dashboard
- [ ] **M2**: Usar memo nas tabelas do dashboard
- [ ] **M3**: Criar tipos TypeScript (`pr19.types.ts`)
- [ ] **M4**: Documentar aging events (`aging-events.md`)

---

## 🎯 NOTA FINAL

| Categoria | Nota Atual | Nota com Correções |
|-----------|------------|-------------------|
| Clareza | 8.5/10 | 9.5/10 (+M4) |
| Coerência | 9.0/10 | 9.0/10 |
| Verborragia | 9.5/10 | 9.5/10 |
| Impacto Técnico | 6.0/10 | 9.5/10 (+C1,C2,C3,C4,C5) |
| Sem Regressão | 7.5/10 | 9.5/10 (+M2,M3) |

**TOTAL ATUAL:** **7.8/10** ⚠️  
**TOTAL COM CORREÇÕES:** **9.6/10** ✅ (aprovado para merge)

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Aplicar **TODAS as correções críticas (C1-C5)** antes do merge
2. ✅ Aplicar melhorias M1-M4 para atingir 9.5+
3. ⚠️ Testar em staging com **carga real** (1000+ eventos)
4. ✅ Validar que aging p50 < 15 min após rollout
5. ✅ Monitorar crescimento de tabelas (alertar se > 1M registros/mês)

---

**Conclusão:** PR #19 tem **excelente conceito** mas requer **5 correções críticas** para ser production-ready. Com as correções, pode atingir **9.6/10** e ser merged com segurança. 🎯
