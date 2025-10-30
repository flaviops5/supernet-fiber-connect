# PR#XX – [TÍTULO DO PR]

**Data verificação:** YYYY-MM-DD  
**Verificador:** [Nome]  
**Tempo gasto:** [Xh]

---

## 📋 Checklist de Verificação

### Documentação
- [ ] Arquivo `/docs/PR-xx-NOME.md` existe
- [ ] Documentação está completa e clara
- [ ] Exemplos de uso incluídos
- [ ] Link para PR no Lovable funcional

### Implementação Técnica
- [ ] Migração SQL aplicada (se aplicável)
- [ ] Edge Function deployada (se aplicável)
- [ ] Código frontend implementado (se aplicável)
- [ ] RLS policies configuradas corretamente
- [ ] Logs sendo gravados em `registros_de_monitoramento`

### Segurança
- [ ] RLS habilitado em novas tabelas
- [ ] Políticas de acesso validadas (admin/gestor/user)
- [ ] Dados sensíveis sanitizados nos logs
- [ ] Sem exposição de secrets/tokens

### Performance
- [ ] Latência aceitável (< 15s para operações críticas)
- [ ] Sem gargalos evidentes
- [ ] Cache implementado quando necessário
- [ ] Fire-and-forget usado para logs

### Testes
- [ ] Teste funcional executado
- [ ] Teste de segurança executado
- [ ] Teste de edge cases executado
- [ ] Rollback testado (se aplicável)

---

## 🧪 Testes Realizados

### Teste 1: [Nome do Teste]
**Objetivo:** [descrever]  
**Procedimento:**
1. [passo 1]
2. [passo 2]
3. [passo 3]

**Resultado:** ✅ Passou | ❌ Falhou  
**Evidência:** [screenshot/log/comando]

### Teste 2: [Nome do Teste]
**Objetivo:** [descrever]  
**Procedimento:**
1. [passo 1]
2. [passo 2]

**Resultado:** ✅ Passou | ❌ Falhou  
**Evidência:** [screenshot/log/comando]

---

## 📊 Análise de Impacto

### Tabelas Afetadas
- `table_name` - [descrição da mudança]

### Edge Functions Afetadas
- `function-name` - [descrição da mudança]

### Componentes UI Afetados
- `ComponentName.tsx` - [descrição da mudança]

### Dependências
- Depende de: PR#XX, PR#YY
- Impacta: PR#ZZ

---

## 💡 Observações

### ✅ Pontos Positivos
- [ponto 1]
- [ponto 2]

### ⚠️ Observações Importantes
- [observação 1]
- [observação 2]

### ❌ Problemas Encontrados
- [problema 1] - **Status:** [Corrigido | Pendente | Não bloqueante]
- [problema 2] - **Status:** [Corrigido | Pendente | Não bloqueante]

---

## 📈 Métricas

| Métrica | Valor | Meta | Status |
|---------|-------|------|--------|
| Latência média | XXms | < 15s | ✅ |
| Taxa de erro | X% | < 1% | ✅ |
| Cobertura de testes | XX% | > 80% | ⚠️ |
| Linhas de código | XXX | - | ℹ️ |

---

## 🔗 Referências

- **Documentação:** `/docs/PR-xx-NOME.md`
- **Código Edge Function:** `/supabase/functions/nome-funcao/`
- **Código Frontend:** `/src/components/...`
- **Migração SQL:** `/supabase/migrations/XXXXXX_nome.sql`
- **Link PR Lovable:** [URL]

---

## ✅ Conclusão

**Resultado Final:** 
- ✅ **Aprovado** - Totalmente funcional, documentado e testado
- ⚠️ **Aprovado com observação** - Funcional mas com ressalvas não bloqueantes
- ❌ **Reprovado** - Não funcional ou requer correções críticas
- 🔄 **Reavaliação necessária** - Requer mais testes

**Justificativa:**
[Texto explicando a decisão final baseado nos testes e observações]

**Recomendações:**
1. [recomendação 1]
2. [recomendação 2]

**Próximas ações:**
- [ ] [ação 1]
- [ ] [ação 2]

---

**Assinatura Digital:**
```
PR: #XX
Hash: [git commit hash]
Data: YYYY-MM-DD HH:mm
Verificador: [Nome]
```
