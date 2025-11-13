# 🔒 Validação Automatizada de Segurança

**Data:** 2025-11-13  
**Status:** ✅ Implementado  
**Objetivo:** Prevenir regressões em segurança através de validação automatizada

---

## 📋 Scripts Disponíveis

### 1. **Validação SQL** (`scripts/validate-security-definer.sql`)

Executa validação diretamente no banco de dados PostgreSQL.

**Como usar:**
```bash
# Via psql
psql -d postgres -f scripts/validate-security-definer.sql

# Via Supabase SQL Editor
# Cole o conteúdo do arquivo no editor e execute
```

**O que valida:**
- ✅ Funções SECURITY DEFINER sem `SET search_path`
- ✅ Conta total de funções protegidas vs vulneráveis
- ✅ Lista detalhada de funções que precisam correção

**Saída:**
```
🔍 ============================================
🔍 VALIDAÇÃO: SECURITY DEFINER Functions
🔍 ============================================

📊 RESUMO:
   Total de funções SECURITY DEFINER: 35
   Funções protegidas: 35

✅ VALIDAÇÃO PASSOU
✅ Todas as 35 funções SECURITY DEFINER estão protegidas
✅ SET search_path configurado corretamente
```

---

### 2. **Validação Shell** (`scripts/validate-security.sh`)

Script completo que valida múltiplos aspectos de segurança.

**Como usar:**
```bash
# Tornar executável
chmod +x scripts/validate-security.sh

# Executar
./scripts/validate-security.sh
```

**O que valida:**
1. **SECURITY DEFINER Functions**
   - Busca em arquivos de migration SQL
   - Detecta funções sem `SET search_path`
   - Ignora funções do pgvector automaticamente

2. **Edge Functions sem Autenticação**
   - Detecta uso de `createPublicHandler`
   - Exclui webhooks legítimos
   - Alerta para revisão manual

3. **Secrets Hardcoded**
   - Busca padrões de API keys
   - Detecta tokens e senhas hardcoded
   - Ignora uso correto de `Deno.env.get()`

**Saída:**
```
🔍 ============================================
🔍 VALIDAÇÃO DE SEGURANÇA
🔍 ============================================

📋 [1/3] Validando SECURITY DEFINER functions...
✅ PASSOU: Nenhuma função SECURITY DEFINER vulnerável

📋 [2/3] Validando Edge Functions sem autenticação...
✅ PASSOU: Todas as edge functions requerem autenticação

📋 [3/3] Validando secrets hardcoded...
✅ PASSOU: Nenhum secret hardcoded encontrado

============================================
✅ VALIDAÇÃO PASSOU
✅ Todas as verificações de segurança passaram
============================================
```

---

### 3. **Validação Existente** (`scripts/validate-security-definer.sh`)

Script Git pre-commit hook para bloquear commits com vulnerabilidades.

**Como usar:**
```bash
# Como pre-commit hook (ver seção abaixo)
```

---

## 🔧 Integração com Git (Pre-commit Hook)

### Instalação Manual

1. **Copiar script para hooks:**
```bash
cp scripts/validate-security-definer.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

2. **Testar:**
```bash
# Fazer uma alteração
git add .
git commit -m "test"

# O hook será executado automaticamente
```

### O que o hook faz:

- ✅ Executa ANTES de cada commit
- ✅ Valida apenas arquivos SQL em `supabase/migrations/`
- ✅ Bloqueia commit se encontrar vulnerabilidades
- ✅ Mostra instruções de correção

**Exemplo de bloqueio:**
```
🚨 ============================================
🚨 COMMIT BLOQUEADO - SECURITY ISSUE
🚨 ============================================

❌ Encontradas funções SECURITY DEFINER vulneráveis

📁 ARQUIVOS COM PROBLEMAS:
   - supabase/migrations/20250113_new_function.sql
     Line 10: create_user_account

🔒 CORREÇÃO NECESSÁRIA:
   Adicione esta linha após SECURITY DEFINER:
   SET search_path TO 'public'
```

---

## 🚀 Uso em CI/CD

### GitHub Actions

```yaml
name: Security Validation

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Validate Security
        run: |
          chmod +x scripts/validate-security.sh
          ./scripts/validate-security.sh
```

### GitLab CI

```yaml
security:validation:
  stage: test
  script:
    - chmod +x scripts/validate-security.sh
    - ./scripts/validate-security.sh
```

---

## 📖 Correção de Vulnerabilidades

### Exemplo 1: Função SECURITY DEFINER sem search_path

**❌ ERRADO:**
```sql
CREATE OR REPLACE FUNCTION public.delete_user_data(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- ← VULNERÁVEL!
AS $$
BEGIN
  DELETE FROM user_data WHERE id = user_id;
END;
$$;
```

**✅ CORRETO:**
```sql
CREATE OR REPLACE FUNCTION public.delete_user_data(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'  -- ← PROTEGIDO!
AS $$
BEGIN
  DELETE FROM user_data WHERE id = user_id;
END;
$$;
```

### Exemplo 2: Edge Function Pública

**❌ ERRADO (a menos que seja webhook):**
```typescript
export default createPublicHandler(
  'sensitive-operation',
  async (req, { supabase }) => {
    // Qualquer pessoa pode chamar!
    return { data: sensitiveData };
  }
);
```

**✅ CORRETO:**
```typescript
export default createAuthenticatedHandler(
  'sensitive-operation',
  async (req, { supabase, user }) => {
    // Apenas usuários autenticados
    // + validação RBAC se necessário
    return { data: sensitiveData };
  }
);
```

---

## 🎯 Roadmap

### ✅ Implementado
- [x] Script SQL de validação
- [x] Script Shell completo
- [x] Pre-commit hook
- [x] Documentação

### 🟡 Próximos Passos
- [ ] Validação de RLS policies
- [ ] Dashboard de métricas de segurança
- [ ] Alertas automáticos via Slack/Discord
- [ ] Scan de dependências vulneráveis

---

## 📚 Referências

- **Auditoria Completa:** `docs/ACT-003-SECURITY-DEFINER-AUDIT.md`
- **Progresso P0:** `docs/FASE-1-P0-COMPLETO.md`
- **Auditoria P0:** `auditoria/p0-security-fixes-completed.md`
- **Supabase Docs:** https://supabase.com/docs/guides/database/postgres/security-definer
- **OWASP A01:2021:** Broken Access Control

---

**Última atualização:** 2025-11-13  
**Autor:** Security Team  
**Status:** ✅ Produção
