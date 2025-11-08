# 📘 Guia do Logger Unificado

## 🎯 Visão Geral

Sistema de logging centralizado que funciona tanto no frontend (React) quanto no backend (Edge Functions).

## ✨ Features

- ✅ **Universal**: Funciona em browser e Deno
- ✅ **Sanitização automática**: Remove CPF, email, telefone, tokens
- ✅ **Correlation ID**: Rastreamento distribuído de requisições
- ✅ **Non-blocking**: Persistência assíncrona no DB
- ✅ **Metadata estruturado**: Suporte a objetos JSON complexos

## 📦 Instalação

### Frontend
```typescript
import { createLogger } from '@/lib/unified-logger';
```

### Edge Functions
```typescript
import { createLogger } from '../_shared/unified-logger.ts';
```

## 🚀 Uso Básico

### Criar Logger

```typescript
const logger = createLogger('meu-componente');
```

### Níveis de Log

```typescript
logger.debug('Debugging info', { userId: 123 });  // Apenas em DEV
logger.info('Operation successful', { result: data });
logger.warn('Slow response', { duration: 2000 });
logger.error('Request failed', { error: err.message });
```

### Com Correlation ID

```typescript
// Frontend
const logger = createLogger('checkout', correlationId);

// Edge Function
import { createLoggerFromRequest } from '../_shared/unified-logger.ts';
const logger = createLoggerFromRequest('api-handler', req);
```

### Child Logger

```typescript
const parentLogger = createLogger('parent-context');
const childLogger = parentLogger.child('child-context');

childLogger.info('Child log');  // Context: parent-context:child-context
```

## 📊 Exemplos Práticos

### Frontend - React Component

```typescript
import { createLogger } from '@/lib/unified-logger';

export function UserDashboard() {
  const logger = createLogger('user-dashboard');

  useEffect(() => {
    logger.info('Dashboard loaded', { 
      userId: user.id,
      role: user.role 
    });
  }, []);

  const handleAction = async () => {
    try {
      logger.info('Starting action', { actionType: 'export' });
      await exportData();
      logger.info('Action completed successfully');
    } catch (error) {
      logger.error('Action failed', { 
        error: error.message,
        stack: error.stack 
      });
    }
  };

  return <div>...</div>;
}
```

### Edge Function

```typescript
import { createLoggerFromRequest } from '../_shared/unified-logger.ts';

Deno.serve(async (req) => {
  const logger = createLoggerFromRequest('process-payment', req);
  
  try {
    logger.info('Payment request received', {
      method: req.method,
      url: req.url,
    });

    const body = await req.json();
    logger.info('Request parsed', { 
      amount: body.amount,
      currency: body.currency 
    });

    const result = await processPayment(body);
    
    logger.info('Payment processed', { 
      transactionId: result.id,
      status: result.status 
    });

    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        'X-Correlation-ID': logger.getCorrelationId(),
      },
    });
  } catch (error) {
    logger.error('Payment processing failed', {
      error: error.message,
      stack: error.stack,
    });
    
    return new Response(
      JSON.stringify({ error: 'Payment failed' }),
      { status: 500 }
    );
  }
});
```

## 🔒 Sanitização Automática

O logger remove automaticamente dados sensíveis:

```typescript
logger.info('User data', {
  cpf: '123.456.789-00',        // → [CPF_REDACTED]
  email: 'user@example.com',    // → [EMAIL_REDACTED]
  phone: '(11) 98765-4321',     // → [PHONE_REDACTED]
  token: 'abc123xyz...',        // → [TOKEN_REDACTED]
  password: 'secret',           // → [REDACTED]
});
```

## 📈 Visualização de Logs

Acesse `/admin/monitoring-logs` para visualizar logs com:
- Filtros por contexto, nível, data
- Busca full-text
- Detalhes completos (metadata, correlation ID)
- Export de dados

## 🔧 Configuração

### Tabela no Supabase

```sql
CREATE TABLE public.monitoring_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_timestamp timestamptz NOT NULL DEFAULT now(),
  level text NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message text NOT NULL,
  context text NOT NULL,
  correlation_id text,
  environment text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Limpeza Automática

Logs com mais de 90 dias são removidos automaticamente:

```sql
SELECT public.cleanup_monitoring_logs();
```

## 🎯 Best Practices

### ✅ DO

```typescript
// Contextos descritivos
const logger = createLogger('user-profile-form');

// Metadata estruturado
logger.info('Form submitted', {
  fields: ['name', 'email'],
  validationErrors: 0,
});

// Correlation ID em requisições
const correlationId = req.headers.get('X-Correlation-ID');
const logger = createLogger('api', correlationId);
```

### ❌ DON'T

```typescript
// Não use contextos genéricos
const logger = createLogger('app');

// Não logue dados sensíveis explícitos
logger.info('User password is: ' + password);  // ❌

// Não use console.log diretamente
console.log('Something happened');  // ❌ Use logger.info()
```

## 📊 Métricas

Consultar logs por período:

```sql
SELECT 
  context,
  level,
  COUNT(*) as total
FROM monitoring_logs
WHERE log_timestamp >= now() - interval '24 hours'
GROUP BY context, level
ORDER BY total DESC;
```

Buscar por correlation ID:

```sql
SELECT * 
FROM monitoring_logs
WHERE correlation_id = 'abc-123-xyz'
ORDER BY log_timestamp ASC;
```

## 🚨 Alertas

Logs de erro podem disparar alertas automáticos (futuro):

```typescript
// Exemplo de integração com Telegram
if (level === 'error') {
  await notifyTelegram({
    message: entry.message,
    context: entry.context,
    correlationId: entry.correlation_id,
  });
}
```

## 📚 API Completa

### `createLogger(context: string, correlationId?: string): UnifiedLogger`
Cria um logger com contexto específico.

### `logger.debug(message: string, meta?: LogMetadata): void`
Log de debug (apenas em desenvolvimento).

### `logger.info(message: string, meta?: LogMetadata): void`
Log informativo.

### `logger.warn(message: string, meta?: LogMetadata): void`
Log de warning.

### `logger.error(message: string, meta?: LogMetadata): void`
Log de erro.

### `logger.child(childContext: string): UnifiedLogger`
Cria um child logger com o mesmo correlation ID.

### `logger.getCorrelationId(): string`
Retorna o correlation ID atual.

### `createLoggerFromRequest(context: string, req: Request): UnifiedLogger`
**Edge Functions only**: Cria logger extraindo correlation ID do header.

## 🔄 Migração de console.log

### Antes
```typescript
console.log('User logged in:', userId);
console.error('Failed to fetch:', error);
```

### Depois
```typescript
import { createLogger } from '@/lib/unified-logger';
const logger = createLogger('auth');

logger.info('User logged in', { userId });
logger.error('Failed to fetch', { error: error.message });
```

## 🎓 Próximos Passos

1. **Sprint 2**: Migrar edge functions restantes
2. **Sprint 3**: Substituir 712 console.log no frontend
3. **Sprint 4**: Dashboard avançado com métricas em tempo real
4. **Sprint 5**: Alertas automáticos via Telegram/Email
