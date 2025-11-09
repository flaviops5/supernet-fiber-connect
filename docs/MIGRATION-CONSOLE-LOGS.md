# 🔄 Migração Automática: console.log → unified-logger

## 📋 Visão Geral

Script automatizado que substitui todos os `console.log`, `console.error`, `console.warn` no frontend por chamadas estruturadas do `unified-logger`.

**Status atual:** ~712 ocorrências de `console.*` no código

**Impacto esperado:**
- ✅ 100% dos logs estruturados e rastreáveis
- ✅ Sanitização automática de PII (CPF, tokens, senhas)
- ✅ CorrelationId para debug distribuído
- ✅ Persistência em Supabase para análise histórica

---

## 🚀 Como Executar

### 1. Executar Migração Automática

```bash
# Executa o script de migração
node scripts/migrate-console-logs.js
```

O script irá:
1. ✅ Criar backup automático em `.migration-backup/`
2. ✅ Escanear todos os arquivos `.ts` e `.tsx` em `src/`
3. ✅ Substituir `console.*` por `logger.*` apropriado
4. ✅ Adicionar `import { logger } from "@/lib/unified-logger"` onde necessário
5. ✅ Validar sintaxe TypeScript
6. ✅ Gerar relatório de migração

### 2. Revisar Mudanças

```bash
# Ver todas as mudanças
git diff

# Ver apenas arquivos modificados
git status
```

### 3. Testar Aplicação

```bash
# Rodar aplicação
npm run dev

# Executar testes
npm run test

# Validar tipos
npm run type-check
```

### 4. Commit

```bash
git add .
git commit -m "feat: migrar 712 console.log para unified-logger"
```

---

## 🔍 Padrões de Substituição

| Antes | Depois | Nível |
|-------|--------|-------|
| `console.log("msg")` | `logger.info("msg")` | info |
| `console.error("err", e)` | `logger.error("err", { error: e })` | error |
| `console.warn("warn")` | `logger.warn("warn")` | warn |
| `console.debug("debug")` | `logger.debug("debug")` | debug |
| `console.info("info")` | `logger.info("info")` | info |

### Exemplo de Migração

**Antes:**
```typescript
function loadUser(userId: string) {
  console.log("Loading user", userId);
  
  try {
    const user = await fetchUser(userId);
    console.log("User loaded:", user);
  } catch (error) {
    console.error("Failed to load user", error);
  }
}
```

**Depois:**
```typescript
import { logger } from "@/lib/unified-logger";

function loadUser(userId: string) {
  logger.info("Loading user", { userId });
  
  try {
    const user = await fetchUser(userId);
    logger.info("User loaded", { userId, userName: user.name });
  } catch (error) {
    logger.error("Failed to load user", { userId, error });
  }
}
```

---

## ⚙️ Configuração ESLint

O ESLint foi atualizado para **proibir** qualquer uso de `console.*`:

```javascript
// eslint.config.js
rules: {
  "no-console": ["error", { allow: [] }] // ❌ Nenhum console.* permitido
}
```

### Desabilitar em Casos Específicos

Se REALMENTE precisar usar `console.log` (não recomendado):

```typescript
// eslint-disable-next-line no-console
console.log("Debug temporário");
```

---

## 🛡️ Casos Especiais

### 1. Arquivos de Teste

Os arquivos de teste (`*.test.ts`, `*.spec.tsx`) são **ignorados** automaticamente.

### 2. Logs com Objetos Complexos

**Antes:**
```typescript
console.log("User data:", { name, email, cpf: "123.456.789-00" });
```

**Depois:**
```typescript
logger.info("User data", { name, email, cpf: "123.456.789-00" });
// CPF será automaticamente sanitizado para: [CPF_REMOVED]
```

### 3. Logs Condicionais

**Antes:**
```typescript
if (import.meta.env.DEV) {
  console.log("Debug info", data);
}
```

**Depois:**
```typescript
logger.debug("Debug info", data);
// logger.debug() só loga em desenvolvimento automaticamente
```

### 4. Logs em Edge Functions

Edge Functions já foram migradas manualmente (Sprint 2):
- ✅ `ixc-proxy`
- ✅ `detect-mass-outage`
- ✅ `support-tech-agent`
- ✅ `routing-agent`
- ✅ `whatsapp-webhook`

---

## 📊 Relatório de Exemplo

```
============================================================
📊 RELATÓRIO DE MIGRAÇÃO
============================================================
📁 Arquivos escaneados:     247
✏️  Arquivos modificados:    89
🔄 Total de substituições:  712

📈 Por nível:
   • logger.info():  534
   • logger.warn():  67
   • logger.error(): 98
   • logger.debug(): 13

💾 Backup salvo em: .migration-backup/
============================================================

🔍 Validando sintaxe TypeScript...
✅ Sintaxe validada com sucesso!

✅ Migração concluída!

📝 Próximos passos:
   1. Revise as mudanças: git diff
   2. Teste a aplicação: npm run dev
   3. Execute os testes: npm run test
   4. Commit: git add . && git commit -m "feat: migrar para unified-logger"
```

---

## 🔄 Rollback (Se Necessário)

Se algo der errado, restaure o backup:

```bash
# Restaurar todos os arquivos
cp -r .migration-backup/* src/

# Ou restaurar arquivo específico
cp .migration-backup/pages/Dashboard.tsx src/pages/Dashboard.tsx
```

---

## ✅ Checklist Pós-Migração

- [ ] Script executado sem erros
- [ ] `git diff` revisado manualmente
- [ ] Aplicação roda sem erros (`npm run dev`)
- [ ] Testes passam (`npm run test`)
- [ ] Validação de tipos OK (`npm run type-check`)
- [ ] Logs aparecem corretamente no console
- [ ] Logs persistem em `monitoring_logs` (verificar no Supabase)
- [ ] Commit realizado

---

## 🎯 Benefícios Após Migração

| Métrica | Antes | Depois |
|---------|-------|--------|
| Logs estruturados | 0% | 100% |
| Rastreabilidade | Nenhuma | correlationId em todos |
| PII exposto | Sim (CPF, tokens) | ❌ Sanitizado automaticamente |
| Pesquisa histórica | Impossível | ✅ SQL no Supabase |
| Alertas automáticos | Nenhum | ✅ Via `level='error'` |
| Debug distribuído | Manual | ✅ correlationId cross-service |

---

## 📞 Suporte

Problemas com a migração?

1. Revise o backup em `.migration-backup/`
2. Verifique erros no console: `npm run type-check`
3. Consulte: `docs/UNIFIED-LOGGER-GUIDE.md`

---

**Sprint 2 Completo** ✅  
**Próximo:** Sprint 3 - Alertas Automáticos (Telegram)
