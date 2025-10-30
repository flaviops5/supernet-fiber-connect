# 🔐 Configuração do ENCRYPTION_KEY no Database

## Problema
O secret `ENCRYPTION_KEY` está configurado para Edge Functions mas **não está acessível** para funções PostgreSQL (`encrypt_text`, `decrypt_text`).

## Solução

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse: [Supabase Dashboard](https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp)
2. Vá em: **Project Settings** → **Database** → **Settings**
3. Role até **Custom Postgres Configuration**
4. Adicione:
   ```
   app.encryption_key = 'VALOR_DO_SECRET_AQUI'
   ```
5. Clique em **Save**
6. Reinicie o database se solicitado

### Opção 2: Via SQL (requer role superuser)

Execute no SQL Editor do Supabase:

```sql
-- Configurar encryption key no banco
ALTER DATABASE postgres SET app.encryption_key = 'VALOR_DO_SECRET_AQUI';

-- Recarregar configurações
SELECT pg_reload_conf();
```

## Validação

Após configurar, execute para testar:

```sql
-- Deve retornar valor criptografado
SELECT encrypt_text('teste123');

-- Deve retornar 'teste123'
SELECT decrypt_text(encrypt_text('teste123'));
```

## Segurança

⚠️ **IMPORTANTE:**
- Use o **mesmo valor** do secret `ENCRYPTION_KEY` já configurado nas Edge Functions
- **Nunca** commite este valor no código
- Este valor é usado para criptografia LGPD de dados sensíveis

## Status Atual

- ✅ Funções `encrypt_text()` e `decrypt_text()` criadas
- ✅ Secret configurado para Edge Functions
- ❌ Secret NÃO configurado no Database PostgreSQL
- ❌ Funções retornam erro: "unrecognized configuration parameter"

## Próximos Passos

1. Configure `app.encryption_key` via Dashboard (Opção 1)
2. Valide com os comandos SQL acima
3. Atualize o arquivo `FASE-2-CORRECOES-CRITICAS.md` marcando este blocker como resolvido
