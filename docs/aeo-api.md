# AEO API — Supernet Fiber

## 1. Objetivo

Esta API expõe dados públicos dos Planos e Serviços para mecanismos de IA (AEO):

- Google SGE
- Meta AI
- Perplexity
- ChatGPT Browsing
- Copilot

## 2. Endpoint

```
GET /api/content/:slug
```

## 3. Input

Validado com Zod:

- `slug`: string (obrigatório, não vazio)

## 4. Estrutura da resposta

### 4.1 Sucesso

```json
{
  "success": true,
  "data": {
    "type": "plan" | "service",
    "slug": "residenciais",
    "title": "...",
    "description": "...",
    "category": "planos" | "servicos",
    "schemaType": "Product" | "Service",
    "price": 99.9,     // apenas para planos
    "metadata": {
      "path": "/planos/residenciais",
      "provider": "Supernet Fibra"
    }
  }
}
```

### 4.2 Erro

```json
{
  "success": false,
  "error": "CONTENT_NOT_FOUND"
}
```

## 5. Fontes de dados

A API não acessa banco na FASE 1.  
Ela usa:

- `PLANS` em `src/data/plans.ts`
- `SERVICES` em `src/data/services.ts`

**Helpers**:
- `getPlanConfig`
- `getServiceConfig`

## 6. Como testar

| Teste | URL |
|-------|-----|
| Plano Residencial | `/api/content/residenciais` |
| Plano Empresarial | `/api/content/empresariais` |
| Serviço Telemedicina | `/api/content/telemedicina` |
| Serviço Energia | `/api/content/energia` |

## 7. Regras internas

- Nenhum dado confidencial pode ser entregue
- Resposta deve ser 100% estática e pública
- TS strict mode
- Nenhum `any`
- Validar input sempre via Zod
