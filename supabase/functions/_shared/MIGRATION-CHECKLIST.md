# ✅ Checklist de Migração - Edge Functions

Use este checklist para cada função migrada para o sistema de proteção.

---

## 📋 Pré-Migração

### Análise da Função
- [ ] Li e entendi o código da função completamente
- [ ] Identifiquei se é pública ou requer autenticação
- [ ] Identifiquei se precisa rate limiting
- [ ] Verifiquei se tem lógica especial (HMAC, circuit breaker, cache)
- [ ] Verifiquei dependências e imports

### Decisão de Template
- [ ] **Pública simples** → `createPublicHandler`
- [ ] **Autenticada simples** → `createAuthenticatedHandler`
- [ ] **Complexa/customizada** → `createProtectedHandler`
- [ ] **Streaming/especial** → Error handler + metrics manual

---

## 🔧 Durante a Migração

### Código
- [ ] Removi imports antigos de CORS
- [ ] Removi try/catch manual se usando base-handler
- [ ] Mantive apenas a lógica de negócio no handler
- [ ] Atualizei imports necessários
- [ ] Verifiquei tipos TypeScript (se aplicável)

### Proteções Especiais
- [ ] Se tinha HMAC validation → preservei
- [ ] Se tinha circuit breaker → preservei
- [ ] Se tinha cache → preservei
- [ ] Se tinha LGPD logging → preservei

### Configuração
- [ ] Atualizei `supabase/config.toml` com `verify_jwt` correto
- [ ] Verifiquei se secrets necessários estão configurados
- [ ] Documentei mudanças significativas

---

## ✅ Pós-Migração

### Testes Manuais
- [ ] Testei requisição bem-sucedida
- [ ] Testei requisição com erro
- [ ] Testei CORS preflight (OPTIONS)
- [ ] Testei rate limiting (se aplicável)
- [ ] Testei autenticação (se aplicável)

### Verificação de Logs
- [ ] Logs estruturados aparecem no console
- [ ] Métricas sendo registradas na tabela `agent_metrics`
- [ ] Erros sendo logados na tabela `monitoring_logs`
- [ ] Não há console.log simples (todos via logger ou estruturados)

### Documentação
- [ ] Atualizei `IMPLEMENTATION-STATUS.md`
- [ ] Adicionei comentários no código se necessário
- [ ] Documentei comportamento especial (se houver)

### Validação Final
- [ ] Função responde corretamente em produção
- [ ] Performance não degradou
- [ ] Nenhuma regressão detectada
- [ ] Code review realizado (se em equipe)

---

## 🎯 Critérios de Aceitação

### Obrigatórios (bloqueiam merge)
✅ CORS funcionando corretamente
✅ Error handling padronizado
✅ Métricas sendo registradas
✅ Configuração no config.toml correta
✅ Sem console.log simples

### Desejáveis (não bloqueiam)
⭐ Rate limiting implementado
⭐ Documentação inline
⭐ Testes automatizados
⭐ Performance otimizada

---

## 🚫 Anti-Patterns (O que NÃO fazer)

❌ **Não copiar/colar código de CORS/error handling**
✅ Use base-handler ou shared helpers

❌ **Não deixar console.log em produção**
✅ Use logger estruturado

❌ **Não hardcodar secrets**
✅ Use Deno.env.get()

❌ **Não ignorar erros silenciosamente**
✅ Sempre log e/ou throw

❌ **Não fazer deploy sem testar**
✅ Teste localmente primeiro

---

## 📊 Template de Commit

```
feat(edge-functions): migrate [function-name] to base-handler

- Applied createPublicHandler/createAuthenticatedHandler
- Removed manual CORS and error handling
- Added automatic metrics recording
- Configured verify_jwt in config.toml

Refs: ROADMAP-TO-100.md
```

---

## 🔄 Processo de Revisão

### Auto-Review (antes de commitar)
1. Rodei todos os checks acima? ✅
2. Testei manualmente? ✅
3. Documentação atualizada? ✅

### Peer Review (se em equipe)
1. Code review por outro desenvolvedor
2. Validação de testes
3. Aprovação final

---

## 📞 Ajuda e Suporte

### Onde buscar ajuda:
- `_shared/TEMPLATE.md` - Exemplos de uso
- `_shared/base-handler.ts` - Implementação do handler
- `_shared/README.md` - Visão geral do sistema

### Problemas comuns:

**Problema:** Função não responde
**Solução:** Verificar config.toml e logs do Supabase

**Problema:** CORS error
**Solução:** Verificar se base-handler está retornando corsHeaders

**Problema:** Rate limit não funciona
**Solução:** Verificar se extractCpf está implementado

**Problema:** Métricas não aparecem
**Solução:** Verificar conexão Supabase e tabela agent_metrics

---

## 🎓 Checklist Rápido (TL;DR)

Antes de marcar como concluído:

```bash
✅ Código limpo e usando base-handler
✅ config.toml atualizado
✅ Testado manualmente
✅ Métricas funcionando
✅ Documentação OK
✅ Commit e push
```

**Tempo estimado por função:** 15-30 minutos
**Funções por dia (ritmo confortável):** 6-8
**Funções por dia (ritmo acelerado):** 12-15
