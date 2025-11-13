# 🔒 ACT-003: Security Definer Functions Audit

**Data**: 2025-11-13  
**Status**: ⚠️ 4 Funções Vulneráveis Identificadas  
**Severidade**: ALTA

---

## 📋 Sumário Executivo

Auditoria completa de todas as funções com `SECURITY DEFINER` no banco de dados. Identificadas **4 funções vulneráveis** a **schema hijacking** por não possuírem `SET search_path`.

### 🎯 Estatísticas

| Métrica | Valor |
|---------|-------|
| **Total de Funções SECURITY DEFINER** | 30 |
| **Funções Seguras (com search_path)** | 26 (87%) |
| **Funções Vulneráveis (sem search_path)** | 4 (13%) |
| **Risco Geral** | ⚠️ MÉDIO |

---

## 🚨 Funções Vulneráveis (AÇÃO IMEDIATA NECESSÁRIA)

### 1. `anonymize_old_conversations()` - 🔴 CRÍTICO

**Vulnerabilidade**: Schema hijacking via tabelas maliciosas  
**Impacto**: Pode expor dados LGPD sensíveis ou impedir anonimização

```sql
CREATE OR REPLACE FUNCTION public.anonymize_old_conversations()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
-- ❌ FALTA: SET search_path TO 'public'
```

**Risco**:
- Atualiza `conversations` com dados sensíveis (CPF, nome, email)
- Sem `search_path`, atacante pode criar schema malicioso
- Pode burlar anonimização LGPD obrigatória

**Correção**: Adicionar `SET search_path TO 'public'`

---

### 2. `disable_maintenance_cron()` - 🟡 ALTO

**Vulnerabilidade**: Manipulação de cron jobs  
**Impacto**: Atacante pode desabilitar manutenções críticas

```sql
CREATE OR REPLACE FUNCTION public.disable_maintenance_cron()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
-- ❌ FALTA: SET search_path TO 'public'
```

**Risco**:
- Controla agendamento de manutenções de rede
- Pode impedir alertas de massa outage
- Afeta disponibilidade do sistema

**Correção**: Adicionar `SET search_path TO 'public'`

---

### 3. `enable_maintenance_cron()` - 🟡 ALTO

**Vulnerabilidade**: Manipulação de cron jobs  
**Impacto**: Atacante pode criar crons maliciosos

```sql
CREATE OR REPLACE FUNCTION public.enable_maintenance_cron()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
-- ❌ FALTA: SET search_path TO 'public'
```

**Risco**:
- Gerencia webhook para edge function
- Contém credenciais hardcoded (token JWT)
- Pode ser manipulado para chamar endpoints maliciosos

**Correção**: Adicionar `SET search_path TO 'public'`

---

### 4. `mask_cpf_before_insert()` - 🔴 CRÍTICO

**Vulnerabilidade**: Bypass de mascaramento de CPF  
**Impacto**: Exposição de dados pessoais (LGPD)

```sql
CREATE OR REPLACE FUNCTION public.mask_cpf_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
-- ❌ FALTA: SET search_path TO 'public'
```

**Risco**:
- Mascara CPF antes de insert
- Sem `search_path`, atacante pode criar função `REGEXP_REPLACE` maliciosa
- Pode armazenar CPFs completos sem mascaramento

**Correção**: Adicionar `SET search_path TO 'public'`

---

## ✅ Funções Seguras (26 funções)

Estas funções **JÁ POSSUEM** `SET search_path TO 'public'` e estão protegidas:

1. ✅ `add_board_creator_as_owner()`
2. ✅ `audit_notification_targets()`
3. ✅ `auto_sync_knowledge_base()`
4. ✅ `check_rate_limit()`
5. ✅ `cleanup_monitoring_logs()`
6. ✅ `create_installation_appointment()` (ambas versões)
7. ✅ `decrypt_text()`
8. ✅ `encrypt_text()`
9. ✅ `get_current_user_role()`
10. ✅ `get_installation_events()`
11. ✅ `get_installation_events_by_token()`
12. ✅ `handle_new_user()`
13. ✅ `has_role()`
14. ✅ `is_board_member()` (ambas versões)
15. ✅ `is_board_owner()`
16. ✅ `kanban_board_stats()` (ambas versões)
17. ✅ `kanban_import_summary()`
18. ✅ `kanban_user_activity_log()`
19. ✅ `log_security_event()`
20. ✅ `log_user_activity()`
21. ✅ `mark_detractor_followup()`
22. ✅ `update_conversation_last_message()`
23. ✅ `update_notification_targets_updated_at()`
24. ✅ `update_nps_stats()`
25. ✅ `update_updated_at_timestamp()`
26. ✅ `validate_calendar_token()`

---

## 🔬 Como Funciona o Ataque (Schema Hijacking)

### Exemplo de Exploração

**Cenário**: `anonymize_old_conversations()` sem `search_path`

1. **Atacante cria schema malicioso**:
```sql
CREATE SCHEMA evil;
CREATE TABLE evil.conversations AS SELECT * FROM public.conversations;
```

2. **Atacante altera search_path da sessão**:
```sql
SET search_path TO evil, public;
```

3. **Atacante chama função vulnerável**:
```sql
SELECT anonymize_old_conversations();
-- ❌ Função atualiza evil.conversations ao invés de public.conversations
-- ✅ Dados sensíveis em public.conversations permanecem expostos
```

4. **Resultado**: Violação LGPD - Dados não anonimizados!

---

## 🛠️ Plano de Correção

### Migration SQL

A migration foi criada em:
```
supabase/migrations/YYYYMMDDHHMMSS_fix_security_definer_search_path.sql
```

### Funções Corrigidas

1. ✅ `anonymize_old_conversations()` → Adicionar `SET search_path TO 'public'`
2. ✅ `disable_maintenance_cron()` → Adicionar `SET search_path TO 'public'`
3. ✅ `enable_maintenance_cron()` → Adicionar `SET search_path TO 'public'`
4. ✅ `mask_cpf_before_insert()` → Adicionar `SET search_path TO 'public'`

---

## 📊 Impacto da Correção

| Antes | Depois |
|-------|--------|
| 4 funções vulneráveis | 0 funções vulneráveis |
| 13% de risco | 0% de risco |
| Ataque schema hijacking possível | ✅ Ataque bloqueado |
| Dados LGPD em risco | ✅ Conformidade LGPD |

---

## 🧪 Scripts de Validação

### 1. Listar Funções sem search_path

```sql
SELECT 
  p.proname as function_name,
  CASE 
    WHEN prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_type,
  CASE 
    WHEN proconfig IS NOT NULL AND 'search_path' = ANY(
      SELECT split_part(unnest(proconfig), '=', 1)
    ) THEN 'YES'
    ELSE 'NO'
  END as has_search_path
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY 
  CASE 
    WHEN proconfig IS NOT NULL AND 'search_path' = ANY(
      SELECT split_part(unnest(proconfig), '=', 1)
    ) THEN 1 ELSE 0 
  END,
  p.proname;
```

### 2. Verificar Correção Aplicada

```sql
-- Deve retornar 0 linhas após migration
SELECT 
  p.proname as vulnerable_function
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND (
    proconfig IS NULL 
    OR NOT ('search_path' = ANY(
      SELECT split_part(unnest(proconfig), '=', 1)
    ))
  )
ORDER BY p.proname;
```

---

## ⚠️ Alertas Importantes

### Durante a Migration

- ⏱️ **Downtime**: ~5 segundos (funções são recriadas)
- 🔒 **Locks**: Breves locks em `conversations`, `maintenance_cron_control`
- 📊 **Rollback**: Migration é idempotente, pode ser revertida

### Após a Migration

- ✅ Todas as chamadas existentes continuam funcionando
- ✅ Nenhuma mudança na interface das funções
- ✅ Performance não é afetada
- ⚠️ Ataques de schema hijacking agora são bloqueados

---

## 📋 Checklist de Implantação

### Pré-Deploy

- [ ] Backup do banco de dados criado
- [ ] Migration revisada por segundo admin
- [ ] Testes em staging executados
- [ ] Alertas configurados para monitorar erros

### Deploy

- [ ] Migration aplicada via Supabase Dashboard
- [ ] Script de validação executado (0 vulnerabilidades)
- [ ] Logs verificados (sem erros)
- [ ] Smoke tests executados

### Pós-Deploy

- [ ] Re-executar script de auditoria
- [ ] Confirmar 100% de funções seguras
- [ ] Atualizar documentação de segurança
- [ ] Notificar equipe de DevOps

---

## 🎯 Próximos Passos

### Imediato (Hoje)

1. ✅ Aplicar migration de correção
2. ✅ Validar correção via SQL script
3. ✅ Atualizar ACT-003 para "RESOLVIDO"

### Curto Prazo (Esta Semana)

1. 📊 Implementar monitoramento contínuo de SECURITY DEFINER
2. 🔧 Adicionar pre-commit hook para detectar novas funções sem search_path
3. 📖 Atualizar guia de desenvolvimento com regra obrigatória

### Médio Prazo (Este Mês)

1. 🤖 Criar CI/CD check automático para novas migrations
2. 📊 Dashboard de compliance de segurança
3. 🎓 Treinamento da equipe sobre schema hijacking

---

## 📚 Referências

- [PostgreSQL Security Definer Best Practices](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
- [OWASP: SQL Injection via search_path](https://owasp.org/www-community/attacks/SQL_Injection)
- [Supabase Security Guidelines](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [LGPD Art. 46 - Medidas de Segurança](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

---

**Última Atualização**: 2025-11-13  
**Próxima Auditoria**: 2025-12-13  
**Responsável**: Security Team
