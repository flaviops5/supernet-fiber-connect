# 🔒 Auditoria SECURITY DEFINER Functions - P1 ALTO

**Data:** 2025-11-13  
**Objetivo:** Identificar e corrigir funções SECURITY DEFINER que bypassam RLS de forma insegura

---

## 📊 Resumo Executivo

- **Total SECURITY DEFINER:** 91 ocorrências em 45 arquivos
- **Funções Críticas Identificadas:** 8
- **Status:** 🟡 EM ANÁLISE

---

## 🚨 Funções Críticas (Requerem Ação Imediata)

### 1. ❌ `validate_calendar_token()` - CRÍTICO
**Arquivo:** `20251103132418_d4b66537-379d-4567-82b7-a5439f600cdc.sql`
**Problema:** Retorna dados sensíveis (board_id, entity_name, entity_filter) sem validar propriedade do usuário
**Risco:** Qualquer usuário com token pode acessar dados de boards que não pertencem a ele
**Severidade:** 🔴 CRÍTICA

```sql
-- ATUAL (INSEGURO)
CREATE OR REPLACE FUNCTION public.validate_calendar_token(p_token TEXT)
RETURNS TABLE (board_id UUID, entity_name TEXT, entity_filter JSONB, is_valid BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
```

**Correção Proposta:**
- ✅ Adicionar validação de ownership do board antes de retornar dados
- ✅ Verificar se usuário autenticado é membro/owner do board OU
- ✅ Mudar para SECURITY INVOKER e deixar RLS fazer o trabalho

---

### 2. ⚠️ `anonymize_old_conversations()` - MÉDIO
**Arquivo:** `20251113003109_713deedc-ff45-44e0-a5b4-3d1402c3327b.sql`
**Problema:** Anonimiza conversas sem verificar ownership
**Risco:** Pode anonimizar conversas de outros usuários/empresas
**Severidade:** 🟡 MÉDIA
**Status:** ✅ PARCIALMENTE CORRIGIDO (SET search_path = public)

```sql
-- ATUAL
SECURITY DEFINER SET search_path = public
```

**Correção Adicional Necessária:**
- ✅ Adicionar WHERE clause filtrando por tenant/empresa se multi-tenant
- ✅ Adicionar auditoria de QUEM executou a anonimização

---

### 3. ✅ `cleanup_old_logs()` - RESOLVIDO
**Arquivo:** `20251103184316_975b973e-afe3-43c7-9f9c-bfbe1a7052a1.sql`
**Status:** ✅ CORRIGIDO - Mudado para SECURITY INVOKER

---

### 4. ⚠️ `log_user_activity()` - MÉDIO
**Função:** Permite especificar `user_id_param` manualmente
**Risco:** Usuário pode logar atividade de outro usuário
**Severidade:** 🟡 MÉDIA

```sql
-- ATUAL
CREATE OR REPLACE FUNCTION public.log_user_activity(
  activity_type text,
  activity_description text,
  user_id_param uuid DEFAULT NULL::uuid,  -- ❌ PERIGO
  metadata_param jsonb DEFAULT '{}'::jsonb
)
```

**Correção Proposta:**
- ✅ Remover parâmetro `user_id_param` externo
- ✅ SEMPRE usar `auth.uid()` internamente
- ✅ Criar função separada `log_system_activity()` para logs de sistema (com controle de acesso)

---

### 5. ⚠️ `log_security_event()` - MÉDIO
**Função:** Mesma vulnerabilidade que `log_user_activity()`
**Risco:** Usuário pode logar eventos de segurança de outro usuário
**Severidade:** 🟡 MÉDIA

**Correção:** Idêntica a `log_user_activity()`

---

### 6. ⚠️ `check_rate_limit()` - BAIXO
**Função:** Usa `auth.uid()` mas retorna controle ao usuário
**Risco:** Baixo, mas pode ser bypassado com múltiplas sessões
**Severidade:** 🟢 BAIXA
**Status:** ✅ ACEITÁVEL (usa auth.uid() corretamente)

---

### 7. ⚠️ `create_installation_appointment()` - MÉDIO
**Função:** Cria agendamentos sem validar permissões
**Risco:** Qualquer usuário autenticado pode criar agendamentos
**Severidade:** 🟡 MÉDIA

```sql
-- ATUAL
IF v_role NOT IN ('authenticated', 'service_role') THEN
  RAISE EXCEPTION 'Not authorized';
END IF;
```

**Problema:** Apenas verifica se está autenticado, não verifica ROLE específico
**Correção Proposta:**
- ✅ Verificar se usuário tem role 'admin' ou 'editor'
- ✅ Ou criar tabela de permissões específicas para agendamentos

---

### 8. ✅ `is_board_member()`, `is_board_owner()`, `has_role()` - CORRETO
**Arquivos:** Várias migrations
**Status:** ✅ CORRETO - São funções helper para RLS, uso legítimo de SECURITY DEFINER
**Justificativa:** Previnem recursão RLS, são read-only, usam auth.uid()

---

## 📋 Plano de Ação

### Fase 1 - CRÍTICO (Hoje)
- [ ] **ACT-P1.1:** Corrigir `validate_calendar_token()` - adicionar validação de ownership
- [ ] **ACT-P1.2:** Corrigir `log_user_activity()` - remover parâmetro user_id externo
- [ ] **ACT-P1.3:** Corrigir `log_security_event()` - remover parâmetro user_id externo

### Fase 2 - IMPORTANTE (Esta semana)
- [ ] **ACT-P1.4:** Adicionar validação de role em `create_installation_appointment()`
- [ ] **ACT-P1.5:** Adicionar auditoria de execução em `anonymize_old_conversations()`
- [ ] **ACT-P1.6:** Criar testes automatizados para todas as funções SECURITY DEFINER

### Fase 3 - PREVENTIVO (Próximo sprint)
- [ ] **ACT-P1.7:** Criar linter que detecta novos SECURITY DEFINER sem `SET search_path`
- [ ] **ACT-P1.8:** Documentar padrões de segurança para SECURITY DEFINER
- [ ] **ACT-P1.9:** Code review obrigatório para novas funções SECURITY DEFINER

---

## 🎯 Critérios de Segurança

### ✅ SECURITY DEFINER Legítimo (Permitido)
1. **Helper functions** para RLS (has_role, is_board_member, etc)
2. **Triggers** que precisam bypassar RLS (handle_new_user, add_board_creator_as_owner)
3. **Funções read-only** que não expõem dados sensíveis
4. **SEMPRE** usa `SET search_path = public` ou equivalente
5. **SEMPRE** valida auth.uid() antes de qualquer operação

### ❌ SECURITY DEFINER Perigoso (Proibido)
1. Aceita `user_id` como parâmetro externo
2. Retorna dados sensíveis sem validar ownership
3. Modifica dados sem verificar permissões
4. Não usa `SET search_path`
5. Não valida auth.uid()

---

## 📈 Métricas

| Categoria | Quantidade | % |
|-----------|------------|---|
| **Total SECURITY DEFINER** | 91 | 100% |
| **Legítimos (RLS helpers)** | ~70 | ~77% |
| **Críticos (Correção imediata)** | 3 | 3% |
| **Importantes (Correção semana)** | 3 | 3% |
| **Aceitáveis** | ~15 | ~17% |

---

## 🔗 Referências

- [Supabase Security Best Practices](https://supabase.com/docs/guides/database/functions#security-definer-functions)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [OWASP: Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)

---

**Próximos Passos:** Aguardando aprovação para iniciar correções da Fase 1
