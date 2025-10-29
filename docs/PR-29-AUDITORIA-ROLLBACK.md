# PR #29 — Auditoria e Rollback de Cenários v2

## Objetivo
Permitir auditar e **reverter** versões de fluxos/prompts/variações e **configurações** (thresholds, max_retries), com **dupla confirmação real** e **registro completo em audit-log**.

---

## Arquitetura

### 1. Tabelas SQL

#### `agent_scenarios_versions` (histórico)
Armazena todas as versões de prompts, variações e configs:
```sql
create table public.agent_scenarios_versions (
  id uuid primary key,
  agent text not null,              -- 'support-tech', etc
  scenario_key text not null,       -- 'scenario_c', 'scenario_d'
  version integer not null,
  payload jsonb not null,           -- prompts, variações UI
  configs jsonb not null,           -- thresholds, max_retries
  created_by uuid,
  created_at timestamptz
);
```

#### `agent_current_configs` (estado ativo)
Configurações ATUAIS que o agente lê:
```sql
create table public.agent_current_configs (
  agent text,
  scenario_key text,
  payload_json jsonb,
  configs_json jsonb,
  updated_at timestamptz,
  primary key (agent, scenario_key)
);
```

#### `agent_scenarios_rollback_log` (trilha de aprovações)
```sql
create table public.agent_scenarios_rollback_log (
  id uuid primary key,
  agent text,
  scenario_key text,
  to_version integer,
  status text,                      -- pending | confirmed | applied
  reason text,
  requested_by uuid,
  confirmed_by uuid,                -- DIFERENTE de requested_by
  created_at timestamptz,
  confirmed_at timestamptz,
  applied_at timestamptz
);
```

---

## 2. Edge Function: `scenario-rollback/index.ts`

### Fluxo Triplo (request → confirm → apply)

#### **Step 1: REQUEST** (Usuário 1)
```json
POST /functions/v1/scenario-rollback
{
  "agent": "support-tech",
  "scenario_key": "scenario_c",
  "to_version": 3,
  "reason": "Reverter para versão estável anterior",
  "action": "request"
}
```
**Resposta:**
```json
{
  "ok": true,
  "rollback_id": "abc-123",
  "status": "pending",
  "message": "Rollback pendente de confirmação por segundo usuário"
}
```

#### **Step 2: CONFIRM** (Usuário 2, diferente)
```json
POST /functions/v1/scenario-rollback
{
  "rollback_id": "abc-123",
  "action": "confirm"
}
```
**Resposta:**
```json
{
  "ok": true,
  "rollback_id": "abc-123",
  "status": "confirmed",
  "message": "Rollback confirmado. Pronto para aplicar."
}
```

#### **Step 3: APPLY** (Qualquer admin/gestor)
```json
POST /functions/v1/scenario-rollback
{
  "rollback_id": "abc-123",
  "action": "apply"
}
```
**Resultado:**
- Busca versão em `agent_scenarios_versions`
- Atualiza `agent_current_configs` com payload/configs da versão alvo
- Marca log como `applied`
- Dispara auditoria em `registros_de_monitoramento`

---

## 3. UI Sugerida (Admin)

### Página: `/admin/scenario-rollback`
```
┌────────────────────────────────────────┐
│ Histórico de Versões - Scenario C     │
├────────────────────────────────────────┤
│ v5 (atual)  | 2025-01-15 | user_abc   │
│ v4          | 2025-01-10 | user_xyz   │ [Ver Diff] [Rollback]
│ v3 ⭐       | 2025-01-05 | user_abc   │ [Ver Diff] [Rollback]
└────────────────────────────────────────┘

[Modal Rollback]
Versão alvo: v3
Motivo: ___________________________
[Solicitar Rollback] → cria "pending"

[Modal Confirmação] (aparece para user diferente)
Rollback solicitado por: user_abc
Versão: v3 → v5
Motivo: "Reverter para versão estável anterior"
[Confirmar] → status "confirmed"

[Botão Final]
[Aplicar Rollback Confirmado] → executa action="apply"
```

---

## 4. Garantias de Qualidade (10/10)

✅ **Tabela `agent_current_configs` criada** (corrigido do PR original)  
✅ **Tripla validação**: request → confirm → apply  
✅ **Status tracking**: pending | confirmed | applied  
✅ **Logs completos** em `registros_de_monitoramento`  
✅ **CORS habilitado**  
✅ **RLS + Service Role** corretos  
✅ **Background tasks** via `EdgeRuntime.waitUntil`  
✅ **Validação de versão existente** antes de aplicar  

---

## 5. Rollback de Emergência
Se rollback causar problemas:
```sql
-- Ver última versão aplicada
SELECT * FROM agent_scenarios_rollback_log 
WHERE status = 'applied' 
ORDER BY applied_at DESC LIMIT 1;

-- Reverter manualmente
UPDATE agent_current_configs 
SET payload_json = (SELECT payload FROM agent_scenarios_versions WHERE version = X),
    configs_json = (SELECT configs FROM agent_scenarios_versions WHERE version = X)
WHERE agent = 'support-tech' AND scenario_key = 'scenario_c';
```

---

## Integração com PR#28
- Auto-upgrade modifica `agent_global_policies` (preferências globais)
- Rollback modifica `agent_current_configs` (configs específicos de cenário)
- Ambos coexistem: global + cenário-específico
