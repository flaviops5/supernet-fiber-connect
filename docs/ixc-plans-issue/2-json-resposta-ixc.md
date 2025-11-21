# 2️⃣ JSON da Resposta do IXC

## Estrutura Esperada

### Resposta do Endpoint `/radgrupos`

```json
{
  "type": "success",
  "total": 150,
  "registros": [
    {
      "id": "1",
      "grupo": "100 MEGA",
      "download": "100000",
      "upload": "50000",
      "valor": "79.90",
      "tipo": "I"
    },
    {
      "id": "2",
      "grupo": "200 MEGA",
      "download": "200000",
      "upload": "100000",
      "valor": "99.90",
      "tipo": "I"
    },
    {
      "id": "49",
      "grupo": "MASTER 500M",
      "download": "500000",
      "upload": "250000",
      "valor": "149.90",
      "tipo": "I"
    }
  ]
}
```

### Resposta do Endpoint `/produto`

```json
{
  "type": "success",
  "total": 200,
  "registros": {
    "0": {
      "id": "36",
      "descricao": "Mega 400M/150M",
      "valor_produto": "109.90",
      "tipo": "I"
    },
    "1": {
      "id": "56",
      "descricao": "Teste #1",
      "valor_produto": "500.00",
      "tipo": "I"
    }
  }
}
```

**⚠️ ATENÇÃO**: `registros` pode ser um **array** ou um **objeto** dependendo do endpoint!

### Resposta do Endpoint `/su_oss_plano`

```json
{
  "type": "success",
  "total": 80,
  "registros": [
    {
      "id": "100",
      "nome": "Plano Corporativo 1GB",
      "download": "1000000",
      "upload": "500000",
      "valor": "299.90",
      "tipo": "C"
    }
  ]
}
```

## Campos Utilizados pelo Sistema

### Campos Possíveis por Endpoint

| Campo | radgrupos | produto | su_oss_plano |
|-------|-----------|---------|--------------|
| `id` | ✅ | ✅ | ✅ |
| `grupo` | ✅ | ❌ | ❌ |
| `nome` | ❌ | ❌ | ✅ |
| `descricao` | ❌ | ✅ | ❌ |
| `download` | ✅ | ❌ | ✅ |
| `upload` | ✅ | ❌ | ✅ |
| `valor` | ✅ | ❌ | ✅ |
| `valor_produto` | ❌ | ✅ | ❌ |
| `tipo` | ✅ | ✅ | ✅ |

### Interface TypeScript

```typescript
interface IXCPlanResponse {
  id?: string | number;
  grupo?: string;           // radgrupos
  nome?: string;            // su_oss_plano
  descricao?: string;       // produto
  download?: string;
  upload?: string;
  valor_produto?: string | number;  // produto
  valor?: string | number;          // radgrupos, su_oss_plano
  tipo?: string;  // I=Internet, C=Corporativo
}

interface IXCApiResponse {
  registros?: IXCPlanResponse[] | Record<string, IXCPlanResponse>;
  total?: number;
  message?: string;
}
```

## Normalização no Sistema

Após buscar de todos os endpoints, o sistema normaliza para:

```json
{
  "success": true,
  "total": 59,
  "plans": [
    {
      "id": "49",
      "name": "MASTER 500M",
      "download": "500000",
      "upload": "250000",
      "price": 149.90,
      "type": "I"
    }
  ]
}
```

## Possíveis Problemas

1. **Paginação incompleta**: Se houver mais de 2000 registros (20 páginas × 100), alguns planos não serão retornados
2. **Timeout**: Requisições paralelas podem demorar se houver muitos dados
3. **Estrutura variável**: `registros` pode ser array ou objeto
4. **Campos ausentes**: Cada endpoint retorna campos diferentes
5. **IDs duplicados**: Mesmo plano pode aparecer em múltiplos endpoints
