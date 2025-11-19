# SEO — Guia Oficial do Projeto Supernet Fiber

## 1. Objetivo

Este documento descreve como funciona o sistema completo de SEO técnico, OpenGraph, Twitter Cards e JSON-LD utilizado nas páginas públicas do projeto.

Todo o sistema está padronizado para:

- Google Search
- Google SGE (AI Overviews)
- Meta AI
- Perplexity
- Bing / Copilot
- ChatGPT Browsing

## 2. Componentes principais

### 2.1. `<SEO />`

**Local**: `src/components/seo/SEO.tsx`  
**Função**: controla title, description, canonical, OpenGraph, Twitter, e noindex.

**Props**:
```typescript
interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
}
```

## 3. Schemas JSON-LD

Estão em `src/components/seo/schemas/`.

- `OrganizationSchema.tsx`
- `ProductSchema.tsx`
- `ServiceSchema.tsx`
- `FAQSchema.tsx`
- `ArticleSchema.tsx`

Todos implementados seguindo TypeScript strict mode e Development Guidelines.

## 4. Sistemas automáticos

Para evitar repetição e padronizar SEO, foram criados dois sistemas automáticos:

### 4.1. SEO para Serviços

**Arquivo**: `src/components/seo/ServiceSEOBlock.tsx`

Usa:
- tabela `SERVICES`
- helper `getServiceConfig`
- gera SEO + OrganizationSchema + ServiceSchema

**Como usar**:
```tsx
<ServiceSEOBlock serviceId="telemedicina" />
```

### 4.2. SEO para Planos

**Arquivo**: `src/components/seo/PlanSEOBlock.tsx`

Usa:
- tabela `PLANS`
- helper `getPlanConfig`
- gera SEO + OrganizationSchema + ProductSchema

**Como usar**:
```tsx
<PlanSEOBlock planId="residenciais" />
```

## 5. Sitemap e Robots

- `/public/sitemap.xml` → estático, cobrindo todas as rotas públicas
- `/public/robots.txt` → compatível com todos os crawlers modernos

Ambos seguem padrões do Google e foram configurados conforme recomendado.

## 6. Boas práticas internas

- Nunca duplicar SEO manualmente.
- Sempre usar `<PlanSEOBlock>` ou `<ServiceSEOBlock>` para rotas dessas categorias.
- Todo código deve ser TypeScript strict mode.
- Nenhum `any`.
- Todos scripts JSON-LD devem ser injetados com `<script type="application/ld+json">`.
