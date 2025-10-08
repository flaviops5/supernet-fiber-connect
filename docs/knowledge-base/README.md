# 📚 Knowledge Base - SUPERNET FIBRA

Sistema centralizado de conhecimento para alimentar os agentes de IA.

## 🎯 Objetivo

Armazenar, versionar e sincronizar todo o conhecimento que os agentes precisam para atender clientes, incluindo:

- Informações sobre planos e serviços
- Procedimentos técnicos
- Políticas comerciais
- FAQs e troubleshooting
- Integrações com sistemas externos

---

## 📁 Estrutura

```
/docs/knowledge-base/
├── README.md                      # Este arquivo
├── data-sources/                  # Arquivos-fonte (versão canônica)
│   ├── vendas/
│   │   ├── planos-supernet.md
│   │   └── politicas-comerciais.md
│   ├── suporte/
│   │   ├── troubleshooting-onu.md
│   │   └── protocolos-atendimento.md
│   ├── automacao/
│   │   └── dispositivos-compativeis.md
│   └── telemedicina/
│       └── planos-servicos.md
└── scripts/
    └── sync-kb-to-supabase.ts     # Script de sincronização
```

---

## 🔄 Fluxo de Atualização

### 1. Editar Arquivos-Fonte

Todos os arquivos em `data-sources/` são a **fonte da verdade**. Para atualizar o conhecimento:

```bash
# Editar arquivo relevante
vim docs/knowledge-base/data-sources/vendas/planos-supernet.md

# Commit das mudanças
git add docs/knowledge-base/data-sources/
git commit -m "docs: atualizar planos de internet"
```

### 2. Sincronizar com Supabase

Executar o script de sincronização:

```bash
# Localmente (requer credenciais)
deno run --allow-net --allow-read --allow-env \
  docs/knowledge-base/scripts/sync-kb-to-supabase.ts

# Ou via Edge Function (recomendado)
# O sync-chatbot-knowledge pode ser adaptado para ler destes arquivos
```

### 3. Verificar Sincronização

- Ir para Supabase Dashboard → Table Editor → `knowledge_base`
- Verificar que os registros foram atualizados
- Testar agentes para garantir que estão usando novo conhecimento

---

## 📝 Formato dos Arquivos

Todos os arquivos em `data-sources/` devem seguir este padrão:

### Metadados (YAML Front Matter)

```markdown
---
title: "Título do Documento"
category: "vendas" | "suporte_tecnico" | "automacao" | "telemedicina"
agent_types: ["sales", "support_tech"]  # Quais agentes podem acessar
is_active: true
last_updated: "2025-10-08"
author: "Nome do Autor"
version: "1.0"
---

# Conteúdo do Documento

[Markdown normal aqui]
```

### Categorias Válidas

| Categoria | Descrição | Agentes |
|-----------|-----------|---------|
| `vendas` | Planos, promoções, políticas comerciais | sales |
| `suporte_tecnico` | Troubleshooting, procedimentos técnicos | support_tech |
| `suporte_financeiro` | Boletos, negociação, desbloqueio | support_financial |
| `automacao` | Smart home, dispositivos, integrações | automacao |
| `telemedicina` | Planos de saúde, consultas, especialidades | telemedicina |
| `geral` | Informações gerais da empresa | todos |
| `ixc_endpoints` | Documentação técnica de APIs | support_tech, support_financial |

---

## 🔍 Busca e RAG

### Abordagem Atual (Query-Based)

Os agentes fazem queries diretas na tabela `knowledge_base`:

```sql
SELECT title, content, category 
FROM knowledge_base 
WHERE category IN ('vendas', 'geral')
  AND is_active = true
ORDER BY created_at DESC;
```

### Futuro (Vector-Based - TODO)

Implementar busca semântica com embeddings:

1. Gerar embeddings dos documentos
2. Armazenar em `pgvector`
3. Buscar documentos mais relevantes via similaridade

---

## ✅ Checklist de Atualização

Ao adicionar/modificar conhecimento:

- [ ] Editar arquivo .md em `data-sources/`
- [ ] Verificar metadados YAML
- [ ] Testar formatação Markdown
- [ ] Rodar script de sincronização
- [ ] Verificar no Supabase que foi inserido
- [ ] Testar agente relevante
- [ ] Commit e push das mudanças
- [ ] Documentar no changelog (se mudança significativa)

---

## 🚨 Importante

### ❌ O que NÃO fazer

- **Não editar direto no Supabase** - sempre editar arquivos .md primeiro
- **Não deletar arquivos** - marcar como `is_active: false` nos metadados
- **Não usar informações sensíveis** - senhas, tokens, dados de clientes
- **Não duplicar informações** - manter fonte única da verdade

### ✅ Boas Práticas

- **Revisar antes de commitar** - verificar ortografia e formatação
- **Manter histórico** - usar Git para rastrear mudanças
- **Versionar documentos** - incrementar version nos metadados
- **Testar com agentes** - sempre validar que informação está correta

---

## 📊 Métricas de Uso

Para entender quais documentos são mais consultados:

```sql
-- Documento mais referenciado em respostas (TODO: implementar tracking)
SELECT 
  kb.title,
  kb.category,
  COUNT(*) as usage_count
FROM knowledge_base kb
JOIN agent_metrics am ON am.metadata->>'kb_doc_id' = kb.id::text
GROUP BY kb.id
ORDER BY usage_count DESC
LIMIT 10;
```

---

## 🔧 Manutenção

### Revisão Periódica

- **Mensal:** Revisar documentos mais usados para atualizar
- **Trimestral:** Auditar documentos inativos ou obsoletos
- **Anual:** Reestruturar categorias se necessário

### Auditoria de Qualidade

```bash
# Verificar arquivos sem metadados
grep -L "^---" data-sources/**/*.md

# Verificar links quebrados (TODO: script)
```

---

## 📚 Exemplos

### Adicionar Novo Plano

1. Criar/editar `data-sources/vendas/planos-supernet.md`
2. Adicionar seção do novo plano
3. Sincronizar
4. Testar com Sales Agent

### Atualizar Procedimento Técnico

1. Editar `data-sources/suporte/troubleshooting-onu.md`
2. Atualizar steps do procedimento
3. Incrementar version nos metadados
4. Sincronizar
5. Testar com Tech Support Agent

---

## 🆘 Troubleshooting

### Problema: Sincronização falhou

**Solução:**
1. Verificar credenciais do Supabase
2. Checar formato dos metadados YAML
3. Ver logs do script de sincronização

### Problema: Agente não usa novo conhecimento

**Solução:**
1. Verificar que documento está com `is_active: true`
2. Verificar que categoria está correta
3. Verificar que `agent_types` inclui o agente
4. Limpar cache (se implementado)

### Problema: Documento muito grande

**Solução:**
- Dividir em múltiplos documentos menores
- Cada documento deve ter < 4000 palavras
- Usar links internos para referenciar outros docs

---

## 📞 Contato

**Dúvidas sobre Knowledge Base?**
- Time Técnico: tech@supernet.com.br
- Slack: #kb-updates

---

**Última atualização:** Outubro 2025
**Próxima revisão:** Dezembro 2025
