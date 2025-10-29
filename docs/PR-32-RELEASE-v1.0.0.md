# PR #32 — Release v1.0.0 + Deploy Formal

## Objetivo
Empacotar entrega v1.0.0 com changelog formal, tag Git, checklist de deploy e **plano de rollback** para emergências.

---

## 📋 Checklist Pré-Release

### 1. Database & Migrations
- [ ] `PR27_async_safety.sql` aplicada
- [ ] `PR28_agent_global_policies.sql` aplicada
- [ ] `PR29_audit_rollback.sql` aplicada
- [ ] Verificar RLS habilitado em todas as novas tabelas
- [ ] Testar `has_role()` function em staging
- [ ] Backup completo do DB (snapshot Supabase)

### 2. Edge Functions
- [ ] `luan-auto-upgrade` deployada
- [ ] `scenario-rollback` deployada
- [ ] `test-runner` deployada
- [ ] `stress-runner` deployada
- [ ] Secrets configurados (IXC API, OpenAI, etc)
- [ ] CORS habilitado em todas as functions
- [ ] Logs estruturados funcionando

### 3. Frontend/Admin
- [ ] Dashboard KPIs acessível (`/admin/kpi-dashboard`)
- [ ] AuthGuard validando roles (admin, gestor)
- [ ] Tema escuro/claro funcionando
- [ ] Componente MediaGuidedMessage (PR#6) testado

### 4. Testes & Performance
- [ ] `test-runner` passing (avg < 5s)
- [ ] `stress-runner` OK (fail_rate < 10%)
- [ ] Zero erros críticos nos logs
- [ ] Latência média < 3s (ideal)

### 5. Documentação
- [ ] README.md atualizado com v1.0.0
- [ ] Todos os PRs documentados (27-32)
- [ ] Instruções de rollback claras
- [ ] Variáveis de ambiente documentadas

### 6. Cron/Jobs
- [ ] `luan-auto-upgrade` agendado (diário, 3h UTC)
- [ ] `test-runner` agendado (6 em 6h)
- [ ] `stress-runner` agendado (1x/dia, low traffic)

---

## 📝 Changelog (formal)

### [1.0.0] - 2025-01-XX

#### Added
- **PR#27**: Async Safety Helpers
  - `defer()`, `withTimeout()`, `safeCall()` em `_shared/async-utils.ts`
  - Logs não-bloqueantes (`EdgeRuntime.waitUntil`)
  - KPI fire-and-forget (< 100ms overhead)
  
- **PR#28**: Auto-Upgrade Global
  - Edge function `luan-auto-upgrade` (regras adaptativas)
  - Tabela `agent_global_policies` (RLS habilitado)
  - Leitura opcional no support-tech-agent (não-invasiva)
  - Log `auto_upgrade_applied` em auditoria
  
- **PR#29**: Auditoria & Rollback
  - Versionamento em `agent_scenarios_versions`
  - Configs atuais em `agent_current_configs`
  - Dual approval via `agent_scenarios_rollback_log`
  - Edge function `scenario-rollback` (request → confirm → apply)
  
- **PR#30**: Documentação Técnica Final
  - README consolidado com arquitetura Mermaid
  - Troubleshooting e boas práticas
  - Roadmap v1.1.0
  
- **PR#31**: Testes Automatizados
  - Edge function `test-runner` (4 cenários, threshold 3s/5s)
  - Edge function `stress-runner` (limite 50 sessões)
  - Flag `testHarness` em support-tech-agent
  - Alertas progressivos (warning → error)
  
- **PR#32**: Release Formal
  - Checklist de deploy completo
  - Plano de rollback detalhado
  - Tag Git v1.0.0

#### Changed
- Support-tech-agent: leitura opcional de `agent_global_policies`
- KPI logs: formato `kpi:action` preservado (compatibilidade dashboards)
- Audit logs: suporte dual `action`/`acao` (compatibilidade legado)

#### Security
- RLS aplicado: `agent_global_policies`, `agent_scenarios_versions`, `agent_current_configs`, `agent_scenarios_rollback_log`
- CORS habilitado em todas as novas edge functions
- Validação `has_role(auth.uid(), 'admin')` em RPCs sensíveis
- Service role usado apenas em edge functions (não exposto ao cliente)

#### Fixed
- KPI: mantidos todos os campos existentes (`scenario_completed`, `hybrid_mode`, etc)
- Audit: compatibilidade dual `action`/`acao`
- Stress test: limite seguro de 50 sessões
- Test runner: mock de IXC (sem custo real)

---

## 🚀 Deploy Steps

### 1. Backup de Segurança
```bash
# Supabase Dashboard → Settings → Database → Backup
# Ou via CLI:
supabase db dump -f backup_pre_v1.0.0.sql
```

### 2. Apply Migrations
```bash
# Via Supabase Dashboard → SQL Editor
-- Ou via CLI:
supabase db push
```

### 3. Deploy Edge Functions
```bash
# Lovable: auto-deploy on push
# Ou manual via Supabase CLI:
supabase functions deploy luan-auto-upgrade
supabase functions deploy scenario-rollback
supabase functions deploy test-runner
supabase functions deploy stress-runner
```

### 4. Configure Cron Jobs
```bash
# Via pg_cron (SQL):
SELECT cron.schedule(
  'luan-auto-upgrade-daily',
  '0 3 * * *',  -- 3h UTC
  $$
  SELECT net.http_post(
    url := 'https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/luan-auto-upgrade',
    headers := '{"Authorization": "Bearer ANON_KEY"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'test-runner-6h',
  '0 */6 * * *',  -- a cada 6h
  $$
  SELECT net.http_post(
    url := 'https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/test-runner',
    headers := '{"Authorization": "Bearer ANON_KEY"}'::jsonb
  );
  $$
);
```

### 5. Smoke Tests
```bash
# 1. Test runner
curl -X POST https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/test-runner \
  -H "Authorization: Bearer ANON_KEY"

# 2. KPI Dashboard
# Acessar: https://app.lovable.dev/admin/kpi-dashboard
# Validar: gráfico 7 dias, taxa resolução remota

# 3. Auto-upgrade manual (testar imediato)
curl -X POST https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/luan-auto-upgrade \
  -H "Authorization: Bearer ANON_KEY"

# 4. Verificar logs
SELECT * FROM registros_de_monitoramento 
WHERE acao IN ('auto_upgrade_applied', 'latency_alert')
ORDER BY created_at DESC LIMIT 10;
```

### 6. Git Tag
```bash
git checkout main
git pull origin main

# Tag anotada (obrigatório para release formal)
git tag -a v1.0.0 -m "Release v1.0.0: Sistema Multiagentes Completo

- Auto-upgrade global baseado em KPI
- Auditoria e rollback com dual approval
- Testes automatizados (funcional + stress)
- Async safety (defer, withTimeout)
- Docs técnicas completas

Ver CHANGELOG.md para detalhes."

git push origin v1.0.0
```

---

## 🆘 Plano de Rollback (EMERGÊNCIA)

### Cenário 1: Edge Function com Bug Crítico
```bash
# Desabilitar function temporariamente
# Supabase Dashboard → Edge Functions → [function] → Disable

# Ou via CLI:
supabase functions delete luan-auto-upgrade

# Reverter deploy anterior (se mantém histórico)
# Lovable: usar History → Restore
```

### Cenário 2: Migration Quebrou RLS
```sql
-- Restaurar policies antigas
-- (ter backup de policies antes do deploy)

-- Exemplo: restaurar policy original
DROP POLICY IF EXISTS "Admins e Gestores leem policies" 
  ON public.agent_global_policies;

CREATE POLICY "Old policy" 
  ON public.agent_global_policies 
  FOR SELECT 
  TO authenticated 
  USING (true);  -- temporário, aberto

-- Investigar e aplicar correção definitiva depois
```

### Cenário 3: Auto-Upgrade Causou Regressão
```sql
-- Desabilitar policy global
UPDATE agent_global_policies 
SET policy_json = '{}'::jsonb 
WHERE agent = 'support-tech';

-- Ou deletar completamente
DELETE FROM agent_global_policies WHERE agent = 'support-tech';

-- Luan volta ao comportamento hardcoded (seguro)
```

### Cenário 4: Rollback de Cenário Quebrou Fluxo
```sql
-- Identificar rollback problemático
SELECT * FROM agent_scenarios_rollback_log 
WHERE status = 'applied' 
ORDER BY applied_at DESC LIMIT 1;

-- Buscar versão anterior estável
SELECT * FROM agent_scenarios_versions 
WHERE agent = 'support-tech' 
  AND scenario_key = 'scenario_c'
ORDER BY version DESC;

-- Aplicar manualmente versão estável
UPDATE agent_current_configs
SET payload_json = (SELECT payload FROM agent_scenarios_versions WHERE version = X),
    configs_json = (SELECT configs FROM agent_scenarios_versions WHERE version = X)
WHERE agent = 'support-tech' AND scenario_key = 'scenario_c';
```

### Cenário 5: DB Completo Corrompido
```bash
# Restaurar snapshot pré-v1.0.0
# Supabase Dashboard → Settings → Database → Restore Backup
# Selecionar: backup_pre_v1.0.0 (timestamp ANTES do deploy)

# AVISO: Perde dados criados APÓS backup
# Avaliar impacto antes de executar
```

---

## 📊 Monitoramento Pós-Deploy

### Primeira Semana
```sql
-- KPIs diários
SELECT DATE(created_at), 
       COUNT(*) FILTER (WHERE acao LIKE '%scenario_%') as atendimentos,
       COUNT(*) FILTER (WHERE acao = 'auto_upgrade_applied') as upgrades,
       COUNT(*) FILTER (WHERE acao = 'latency_alert') as alertas_latencia
FROM registros_de_monitoramento
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY 1 DESC;

-- Taxa de resolução remota
SELECT * FROM calc_support_kpis_last_7_days();

-- Rollbacks aplicados
SELECT * FROM agent_scenarios_rollback_log 
WHERE status = 'applied' 
  AND applied_at >= NOW() - INTERVAL '7 days';
```

### Alertas Críticos
Monitorar `registros_de_monitoramento` para:
- `acao = 'latency_alert'` com `severity = 'error'`
- `acao = 'stress_alert'` com `fail_rate > 10%`
- `acao = 'auto_upgrade_applied'` (validar policy aplicada)
- `acao = 'scenario_rollback_applied'` (auditar mudanças)

---

## 📅 Roadmap v1.0.1 (Hotfixes)

Se surgirem problemas na primeira semana:
- Ajustar thresholds de auto-upgrade (se policy muito agressiva)
- Corrigir bugs em rollback dual approval
- Otimizar queries lentas (se latência > 5s persistir)
- Adicionar mais casos em test-runner

---

## 📅 Roadmap v1.1.0 (Features)

- [ ] Dashboard tempo real (WebSocket, sem refresh)
- [ ] A/B testing automático de variações de prompt
- [ ] WhatsApp Business API nativo (sem intermediário)
- [ ] Fine-tuning LLM com conversas anotadas
- [ ] Predição de mass outage (ML sobre histórico)
- [ ] Integração com Grafana/Prometheus
- [ ] Alertas via Slack/PagerDuty

---

**Release Manager:** [Seu Nome]  
**Data de Release:** 2025-01-XX  
**Ambiente:** Produção (Supabase + Lovable)  
**Versão:** 1.0.0  
**Status:** ✅ PRONTO PARA DEPLOY
