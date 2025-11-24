# Documentação Técnica — Supernet Fiber

## Índice de Documentação

### 📄 Documentação Textual

1. **[SEO - Guia Oficial](./seo.md)**
   - Sistema completo de SEO técnico
   - OpenGraph e Twitter Cards
   - JSON-LD Schemas
   - Componentes `<PlanSEOBlock>` e `<ServiceSEOBlock>`

2. **[AEO API - Documentação](./aeo-api.md)**
   - Endpoint `/api/content/:slug`
   - Estrutura de dados para AI Engines
   - Exemplos de uso e testes

### 📊 Documentação Visual

3. **[Arquitetura SEO & AEO](./seo-architecture.md)**
   - Diagramas de arquitetura
   - Fluxos de dados
   - Estrutura de componentes
   - Integração com mecanismos de busca

## Quick Links

### Para Desenvolvedores

- [Como adicionar SEO a uma página de plano](#seo-planos)
- [Como adicionar SEO a uma página de serviço](#seo-servicos)
- [Como testar a API de conteúdo](#testar-api)

### Para Auditoria

- [Verificar implementação de SEO](#verificar-seo)
- [Validar schemas JSON-LD](#validar-schemas)
- [Testar integração com AI Engines](#testar-aeo)

---

## <a name="seo-planos"></a>Como adicionar SEO a uma página de plano

```tsx
import { PlanSEOBlock } from "@/components/seo/PlanSEOBlock";

export default function PlanoResidencial() {
  return (
    <>
      <PlanSEOBlock planId="residenciais" />
      {/* Resto do conteúdo da página */}
    </>
  );
}
```

**IDs disponíveis**: `residenciais`, `empresariais`, `monitoramento`, `streaming`, `telemedicina`

---

## <a name="seo-servicos"></a>Como adicionar SEO a uma página de serviço

```tsx
import { ServiceSEOBlock } from "@/components/seo/ServiceSEOBlock";

export default function ServicoTelemedicina() {
  return (
    <>
      <ServiceSEOBlock serviceId="telemedicina" />
      {/* Resto do conteúdo da página */}
    </>
  );
}
```

**IDs disponíveis**: `energia`, `automacao-residencial`, `monitoramento-residencial`, `monitoramento-veicular`, `super-ze`, `telemedicina`, `sos-empresarial`, `cabeamento-estruturado`, `redes-wifi`, `eventos`, `ia`

---

## <a name="testar-api"></a>Como testar a API de conteúdo

### Teste local
```bash
curl http://localhost:54321/functions/v1/content/residenciais
```

### Teste em produção
```bash
curl https://[PROJECT_URL].supabase.co/functions/v1/content/residenciais
```

### Resposta esperada
```json
{
  "success": true,
  "data": {
    "type": "plan",
    "slug": "residenciais",
    "title": "Planos Residenciais – Internet Fibra Supernet",
    "description": "Conheça os planos de internet residencial Supernet com velocidades de 300 a 700 megas.",
    "category": "planos",
    "schemaType": "Product",
    "price": 99.9,
    "metadata": {
      "path": "/planos/residenciais",
      "provider": "Supernet Fibra"
    }
  }
}
```

---

## <a name="verificar-seo"></a>Verificar implementação de SEO

### Checklist

- [ ] Página usa `<PlanSEOBlock>` ou `<ServiceSEOBlock>`
- [ ] `<title>` está correto no HTML renderizado
- [ ] `<meta name="description">` está presente
- [ ] `<link rel="canonical">` aponta para a URL correta
- [ ] Tags OpenGraph estão presentes (`og:title`, `og:description`, `og:image`)
- [ ] JSON-LD está presente e válido

### Ferramentas de validação

- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema.org Validator](https://validator.schema.org/)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)

---

## <a name="validar-schemas"></a>Validar schemas JSON-LD

Acesse o código fonte da página (View Source) e procure por:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Supernet Fibra",
  ...
}
</script>
```

Copie o conteúdo JSON e valide em:
- https://validator.schema.org/
- https://search.google.com/test/rich-results

---

## <a name="testar-aeo"></a>Testar integração com AI Engines

### Google SGE (Search Generative Experience)

1. Acesse Google Search
2. Busque por: "planos de internet supernet fibra"
3. Verifique se aparece no AI Overview

### Perplexity

1. Acesse perplexity.ai
2. Pergunte: "Quais são os planos da Supernet Fibra?"
3. Verifique se cita informações corretas

### ChatGPT (com browsing)

1. Acesse ChatGPT com acesso à web
2. Pergunte: "Me mostre os planos da Supernet Fibra"
3. Verifique se utiliza a API /content

---

## Arquitetura

Consulte [seo-architecture.md](./seo-architecture.md) para visualizar:

- Diagrama de componentes
- Fluxo de dados
- Estrutura de classes
- Integração entre sistemas

---

## Contribuindo

Ao adicionar novos planos ou serviços:

1. Adicione entrada em `src/data/plans.ts` ou `src/data/services.ts`
2. Use o `<PlanSEOBlock>` ou `<ServiceSEOBlock>` na página
3. Valide com ferramentas de SEO
4. Teste a API `/api/content/:slug`
5. Atualize esta documentação se necessário

---

## Suporte

Para dúvidas sobre:
- **SEO técnico**: consulte [seo.md](./seo.md)
- **API AEO**: consulte [aeo-api.md](./aeo-api.md)
- **Arquitetura visual**: consulte [seo-architecture.md](./seo-architecture.md)

---

# 📋 Auditorias de Edge Functions IXC

## 📊 Status Geral

| Edge Function | Status | Prioridade | Última Revisão |
|---------------|--------|------------|----------------|
| [ixc-list-plans](#audit-ixc-list-plans) | ⚠️ Requer Otimizações | Alta | 2025-11-24 |
| [ixc-sync-plans](#audit-ixc-sync-plans) | ⚠️ Requer Otimizações | Alta | 2025-11-24 |
| [ixc-create-contract](#audit-ixc-create-contract) | ⚠️ Requer Refatoração | Média | 2025-11-24 |

**Legenda:**
- ✅ **Produção Ready** - Pode ir para produção sem alterações
- ⚠️ **Requer Otimizações** - Funcional mas com problemas de performance/segurança
- 🔴 **Bloqueante** - Não deve ir para produção

---

## 📁 Auditorias Disponíveis

### <a name="audit-ixc-list-plans"></a>ixc-list-plans
**Arquivo:** [audit-ixc-list-plans.md](./audit-ixc-list-plans.md)  
**Propósito:** Lista planos comerciais combinando `vd_planos` + `radgrupos`  

**Principais Issues:**
- ⚠️ Performance ruim - Busca todos os planos sem cache
- ⚠️ Sem timeout nas requisições
- ⚠️ Loop infinito potencial na paginação

**Melhorias Implementadas:**
- ✅ Cache em memória (TTL: 5 minutos)
- ✅ Timeout de 30s
- ✅ Limite de 100 páginas
- ✅ Filtros por IDs e nome

---

### <a name="audit-ixc-sync-plans"></a>ixc-sync-plans
**Arquivo:** [audit-ixc-sync-plans.md](./audit-ixc-sync-plans.md)  
**Propósito:** Sincroniza planos específicos do IXC para tabela local `plans`  

**Principais Issues:**
- ⚠️ Performance péssima - Busca todos os planos para sincronizar apenas alguns
- ⚠️ Processamento sequencial (poderia ser paralelo)
- ⚠️ Sem cache compartilhado

**Melhorias Implementadas:**
- ✅ Timeout de 45s
- ✅ Processamento paralelo em lotes de 5
- ✅ Limite de 100 páginas
- ✅ Métricas detalhadas

---

### <a name="audit-ixc-create-contract"></a>ixc-create-contract
**Arquivo:** [audit-ixc-create-contract.md](./audit-ixc-create-contract.md)  
**Propósito:** Cria novo contrato em `vd_contratos` no IXC  

**Principais Issues:**
- ⚠️ Tipagem fraca (`as any` demais)
- ⚠️ Envia campos vazios ao IXC
- ⚠️ Valores hardcoded sem documentação

**Melhorias Implementadas:**
- ✅ Type narrowing adequado
- ✅ Detecção automática tipo_pessoa (F/J)
- ✅ Remove campos não fornecidos
- ✅ Timeout de 30s

---

## 🎯 Próximos Passos - Edge Functions

### Curto Prazo (Crítico)
1. **Aplicar código otimizado** dos três edge functions
2. **Implementar cache Redis** para ambientes multi-instância
3. **Adicionar métricas Prometheus** para monitoramento

### Médio Prazo (Importante)
4. **Background refresh** para cache expirar suavemente
5. **Retry automático** para erros temporários
6. **Webhook de conclusão** para operações longas

---

## 📝 Changelog

| Data | Auditorias Adicionadas | Revisor |
|------|------------------------|---------|
| 2025-11-24 | ixc-list-plans, ixc-sync-plans, ixc-create-contract | AI Code Auditor |

---

**Última Atualização:** 2025-11-24
