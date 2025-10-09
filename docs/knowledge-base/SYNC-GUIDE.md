# 📚 Guia de Sincronização - Knowledge Base

## 🎯 Objetivo

Migrar TODOS os documentos `.md` do projeto para a base de conhecimento vetorial do Supabase.

---

## 🔄 Métodos de Sincronização

### Método 1: Botão "Sincronizar Docs" (Interface Web)
✅ **Rápido e fácil**  
⚠️ **Limitado**: Registra apenas 10 documentos principais (metadados)

**Como usar:**
1. Acesse: **Admin → Knowledge Base**
2. Clique em **"Sincronizar Docs"**
3. Aguarde confirmação

**O que sincroniza:**
- `multiagent-architecture.md`
- `agent-personality-guide.md`
- `agent-tools-matrix.md`
- `tools-reference.md`
- `operational-guide.md`
- `whatsapp-integration-guide.md`
- `system-complete-description.md`
- `system-robustness-100.md`
- `conceitos-fundamentais.md`
- `knowledge-base/README.md`

---

### Método 2: Script Deno (Sincronização Completa) ⭐ RECOMENDADO

✅ **Completo**: Sincroniza TODOS os arquivos `.md` do projeto  
✅ **Conteúdo completo**: Não apenas metadados  
✅ **Automático**: Detecta categoria, título, metadados

**Requisitos:**
- Deno instalado ([deno.land](https://deno.land))
- Variáveis de ambiente configuradas:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

**Como usar:**

```bash
# 1. Configure as variáveis de ambiente (opcional, se não estiverem no .env)
export SUPABASE_URL="https://seu-projeto.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"

# 2. Execute o script de sincronização
deno run --allow-net --allow-read --allow-env docs/knowledge-base/scripts/sync-kb-to-supabase.ts
```

**O que sincroniza:**
- ✅ Todos os arquivos `.md` da pasta `docs/`
- ✅ Todos os arquivos em `docs/knowledge-base/data-sources/`
- ❌ Ignora: `README.md`, `node_modules`, `.git`

**Categorias detectadas automaticamente:**
- `vendas` - Arquivos em `data-sources/vendas/`
- `suporte` - Arquivos em `data-sources/suporte/`
- `telemedicina` - Arquivos em `data-sources/telemedicina/`
- `automacao` - Arquivos em `data-sources/automacao/`
- `integracao` - Arquivos com "whatsapp" no caminho
- `arquitetura` - Arquivos com "agent" ou "multiagent"
- `documentacao-tecnica` - Arquivos com "tools" ou "operational"
- `sistema` - Arquivos com "system" ou "robustness"
- `geral` - Demais arquivos

---

## 📊 Resultado da Sincronização

Após executar, você verá:

```
🚀 Iniciando sincronização da Knowledge Base...

📄 Processando: docs/multiagent-architecture.md
✅ Sincronizado: Multiagent Architecture

📄 Processando: docs/knowledge-base/data-sources/vendas/planos-supernet.md
✅ Sincronizado: Planos Supernet

...

==================================================
📊 RESUMO DA SINCRONIZAÇÃO
==================================================
Total de arquivos: 45
✅ Sucesso: 45
❌ Erros: 0
==================================================
```

---

## 🤖 Próximos Passos: Vetorização

Após sincronizar os documentos na `knowledge_base`, você precisa **gerar embeddings** para busca semântica:

### 1. Acesse o Painel de Migração
**Admin → Knowledge Base → Painel de Migração Vetorial**

### 2. Configure OpenAI API Key
- Necessário para gerar embeddings
- Usa o modelo `text-embedding-3-small` (1536 dimensões)

### 3. Execute Migração em Lotes
- Clique em **"Iniciar Migração"**
- Processa 25 documentos por vez
- Gera embeddings e insere na `knowledge_index`

### 4. Verifique Status
- **Total de documentos**: Quantos estão na `knowledge_base`
- **Já migrados**: Quantos têm embeddings
- **Pendentes**: Quantos faltam processar

---

## 🔍 Como os Agentes Usam o Conhecimento

1. **Usuário faz pergunta** ao agente
2. **Embedding da pergunta** é gerado (OpenAI)
3. **Busca semântica** na `knowledge_index` (PostgreSQL pgvector)
4. **Top 5 documentos** mais relevantes (similaridade > 50%)
5. **Contexto enviado** para o LLM (Gemini Flash)
6. **Resposta personalizada** usando o conhecimento

---

## 📝 Exemplo de Uso

```bash
# 1. Sincronizar todos os documentos
deno run --allow-net --allow-read --allow-env docs/knowledge-base/scripts/sync-kb-to-supabase.ts

# 2. No painel web: Admin → Knowledge Base
# 3. Clique em "Iniciar Migração" no painel vetorial
# 4. Aguarde até "Migração completa!"
# 5. Teste no chat corporativo: "Quais são os planos de internet?"
```

---

## ⚠️ Troubleshooting

### "SUPABASE_URL não definida"
```bash
export SUPABASE_URL="https://seu-projeto.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="sua-key"
```

### "Deno command not found"
Instale o Deno: [deno.land/manual/getting_started/installation](https://deno.land/manual/getting_started/installation)

### "Erro ao sincronizar"
- Verifique conexão com internet
- Confirme que as credenciais do Supabase estão corretas
- Verifique logs no console

### Documentos não aparecem na busca
- Execute a **vetorização** após sincronizar
- Confirme que `migrated_at` não é null na tabela `knowledge_base`
- Verifique se há embeddings na tabela `knowledge_index`

---

## 📚 Recursos Adicionais

- [Documentação Supabase Vector](https://supabase.com/docs/guides/ai/vector-embeddings)
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
- [Deno Runtime](https://deno.land)

---

✅ **Pronto!** Agora sua base de conhecimento está completa e os agentes podem consultar toda a documentação.
