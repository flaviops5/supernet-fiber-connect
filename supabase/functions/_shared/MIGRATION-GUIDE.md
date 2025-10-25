# Guia de Migração - Sprints 2, 3 e 4

## Sprint 2: Migração para Logger Estruturado

### Passo 1: Importar o Logger

```typescript
// No topo do arquivo
import { createLogger } from '../_shared/logger.ts';

// Criar logger com nome da função
const logger = createLogger('function-name');
```

### Passo 2: Substituir console.log

**Antes:**
```typescript
console.log('📡 Buscando cliente:', clientId);
console.log('✅ Cliente encontrado:', customer);
console.error('❌ Erro:', error);
```

**Depois:**
```typescript
logger.info('Buscando cliente', { clientId });
logger.info('Cliente encontrado', { customerId: customer.id, name: customer.name });
logger.error('Erro ao buscar cliente', { error, clientId });
```

### Passo 3: Usar Timing para Performance

```typescript
// Antes
const start = Date.now();
const result = await fetchData();
console.log(`Tempo: ${Date.now() - start}ms`);

// Depois
const endTimer = logger.time('fetch-data');
const result = await fetchData();
endTimer(); // Loga automaticamente: "⏱️ fetch-data" { duration_ms: 125 }
```

### Passo 4: Child Logger para Contexto

```typescript
// Função que processa múltiplos items
async function processClients(clients: Client[]) {
  const logger = createLogger('process-clients');
  
  for (const client of clients) {
    // Child logger com contexto do cliente
    const clientLogger = logger.child({ clientId: client.id });
    
    clientLogger.info('Processando cliente', { status: client.status });
    
    try {
      await processClient(client);
      clientLogger.info('Cliente processado com sucesso');
    } catch (error) {
      clientLogger.error('Erro ao processar cliente', { error });
    }
  }
}
```

## Sprint 3: Padronização de Nomenclaturas

### Identificar Problemas

Execute uma busca regex para encontrar inconsistências:

1. **snake_case em TypeScript**: `[a-z]+_[a-z]+` (deveria ser camelCase)
2. **UPPER_CASE não-constante**: `const [A-Z_]+\s*=\s*[^A-Z]` (deveria ser camelCase)
3. **PascalCase em variáveis**: `const [A-Z][a-z]` (deveria ser camelCase)

### Exemplo de Refatoração

**Antes:**
```typescript
const user_data = {
  cliente_id: '123',
  nome_completo: 'João Silva'
};

function Get_Client_By_Id(client_id: string) {
  return fetchClient(client_id);
}
```

**Depois:**
```typescript
import { objectToCamelCase } from '../_shared/naming-conventions.ts';

const userData = objectToCamelCase({
  cliente_id: '123',
  nome_completo: 'João Silva'
}); // { clienteId: '123', nomeCompleto: 'João Silva' }

function getClientById(clientId: string) {
  return fetchClient(clientId);
}
```

### Conversão de Dados da API IXC

A API IXC retorna dados em snake_case, mas devemos trabalhar com camelCase:

```typescript
import { objectToCamelCase, objectToSnakeCase } from '../_shared/naming-conventions.ts';

// Recebendo dados da API IXC
const ixcResponse = await callIxc('/cliente', {
  qtype: 'cliente.id',
  query: clientId
});

// Converter para camelCase para uso interno
const customer = objectToCamelCase<IXCCustomer>(ixcResponse.data.registros[0]);
// Agora: { clienteId, nomeCompleto, emailHotsite, etc. }

// Enviando dados para IXC (converter de volta para snake_case)
const updateData = objectToSnakeCase({
  clienteId: '123',
  nomeCompleto: 'João Silva'
});
// Resultado: { cliente_id: '123', nome_completo: 'João Silva' }
```

## Sprint 4: ESLint Configuration

### Rodar ESLint

```bash
# Verificar problemas
npm run lint

# Fixar problemas automáticos
npm run lint -- --fix
```

### Problemas Comuns e Soluções

#### 1. `@typescript-eslint/no-explicit-any`

❌ **Problema:**
```typescript
function processData(data: any) {
  return data.value;
}
```

✅ **Solução:**
```typescript
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: string }).value;
  }
  throw new Error('Invalid data format');
}

// Ou melhor ainda, criar um tipo
interface ProcessableData {
  value: string;
}

function processData(data: ProcessableData) {
  return data.value;
}
```

#### 2. `no-console`

❌ **Problema:**
```typescript
console.log('Processing:', item);
```

✅ **Solução:**
```typescript
import { createLogger } from '../_shared/logger.ts';
const logger = createLogger('function-name');

logger.info('Processing item', { itemId: item.id });
```

#### 3. `prefer-const`

❌ **Problema:**
```typescript
let total = 0;
let items = getItems();
// items nunca é reatribuído
```

✅ **Solução:**
```typescript
let total = 0; // OK - é mutável
const items = getItems(); // const - não é reatribuído
```

#### 4. `eqeqeq`

❌ **Problema:**
```typescript
if (value == null) { }
if (count == 0) { }
```

✅ **Solução:**
```typescript
if (value === null || value === undefined) { }
// ou
if (value == null) { } // eslint-disable-next-line eqeqeq

if (count === 0) { }
```

#### 5. `@typescript-eslint/consistent-type-imports`

❌ **Problema:**
```typescript
import { IXCCustomer, RadiusUser } from '../_shared/types.ts';
```

✅ **Solução:**
```typescript
import type { IXCCustomer, RadiusUser } from '../_shared/types.ts';
```

### Supressão Justificada

Quando realmente necessário, documente o motivo:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function legacyAdapter(data: any): ProcessedData {
  // Esta função é um adapter para API legada que não tem tipos
  // TODO: Criar tipos quando a API for documentada
  return processLegacyData(data);
}
```

## Checklist de Migração Completa

### Por Função

- [ ] Importar e criar logger
- [ ] Substituir todos `console.log` por `logger.info/debug`
- [ ] Substituir todos `console.error` por `logger.error`
- [ ] Substituir todos `console.warn` por `logger.warn`
- [ ] Adicionar timing para operações lentas
- [ ] Verificar nomenclaturas (camelCase, PascalCase, etc)
- [ ] Converter objetos IXC para camelCase
- [ ] Remover tipos `any` (usar `unknown` ou tipos específicos)
- [ ] Usar `import type` para tipos
- [ ] Rodar ESLint e corrigir warnings

### Exemplo Completo de Migração

**Antes:**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  console.log('Request received');
  
  const body = await req.json();
  const user_id = body.userId;
  
  let result: any;
  try {
    result = await fetchUser(user_id);
    console.log('User found:', result);
  } catch (e) {
    console.error('Error:', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
  
  return new Response(JSON.stringify(result), { status: 200 });
});
```

**Depois:**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createLoggerFromRequest } from '../_shared/logger.ts';
import { getErrorMessage } from '../_shared/error-types.ts';
import type { User } from '../_shared/types.ts';

serve(async (req) => {
  const logger = createLoggerFromRequest('fetch-user', req);
  logger.info('Request received');
  
  try {
    const body = await req.json() as { userId: string };
    const userId = body.userId;
    
    const endTimer = logger.time('fetch-user-from-db');
    const result: User = await fetchUser(userId);
    endTimer();
    
    logger.info('User found', { userId: result.id });
    
    return new Response(JSON.stringify(result), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Error fetching user', { 
      error: getErrorMessage(error),
      details: error 
    });
    
    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
```

## Próximos Passos

1. Migrar funções críticas primeiro (support-tech-agent, routing-agent)
2. Migrar funções de integração (ixc-integration, detect-mass-outage)
3. Migrar funções auxiliares
4. Atualizar documentação com exemplos reais
5. Criar testes para validar logging
