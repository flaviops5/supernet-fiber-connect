# 1️⃣ Código da Chamada - IXC List Plans

## Edge Function: `ixc-list-plans`

### Endpoints Consultados

A função busca planos de **3 endpoints diferentes** do IXC:

```typescript
const [radgruposPlans, produtoPlans, ossPlanoPlans] = await Promise.all([
  fetchPlansFromEndpoint('radgrupos', 'radgrupos'),
  fetchPlansFromEndpoint('produto', 'produto'),
  fetchPlansFromEndpoint('su_oss_plano', 'su_oss_plano'),
]);
```

### Lógica de Paginação

Cada endpoint é consultado com:
- **Paginação**: 100 registros por página (`rp: '100'`)
- **Mínimo**: 5 páginas sempre processadas
- **Máximo**: 20 páginas por endpoint
- **Critério de parada**: Página vazia após página 5

```typescript
const minPages = 5;
const maxPages = 20;

while (hasMorePages && currentPage <= maxPages) {
  const body = new URLSearchParams({
    page: String(currentPage),
    rp: '100',
    sortname: endpoint === 'radgrupos' ? 'radgrupos.grupo' : 
              (endpoint === 'produto' ? 'produto.descricao' : 'su_oss_plano.nome'),
    sortorder: 'asc',
  });
  
  const response = await fetch(`${baseUrl}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'ixcsoft': 'listar',
    },
    body,
  });
}
```

### Deduplicação

Após buscar de todos os endpoints, remove duplicatas por ID:

```typescript
const allPlansMap = new Map<string, IXCPlanResponse>();

[...radgruposPlans, ...produtoPlans, ...ossPlanoPlans].forEach(plan => {
  const id = String(plan.id || '');
  if (id && !allPlansMap.has(id)) {
    allPlansMap.set(id, plan);
  }
});
```

### Filtro MASTER

Busca planos com "MASTER" no nome:

```typescript
const masterPlans = allPlans.filter(p => 
  (p.grupo?.toUpperCase().includes('MASTER') || 
   p.nome?.toUpperCase().includes('MASTER') ||
   p.descricao?.toUpperCase().includes('MASTER'))
);
```

## Variáveis de Ambiente Necessárias

```
IXC_API_USERNAME=<usuário>
IXC_API_PASSWORD=<senha>
IXC_API_BASE_URL=<https://seu-ixc.com.br>
```

## URL Base Normalizada

```typescript
const cleanBaseUrl = IXC_API_BASE.replace(/\/adm\.php$/, '').replace(/^https?:\/\//, '');
const baseUrl = `https://${cleanBaseUrl}/webservice/v1`;
```

## Frontend: Chamada da Edge Function

```typescript
const { data, error } = await supabase.functions.invoke('ixc-list-plans');

if (error) throw error;
if (data?.plans) {
  setPlans(data.plans);
  console.log(`✅ ${data.total} planos carregados do IXC`);
}
```
