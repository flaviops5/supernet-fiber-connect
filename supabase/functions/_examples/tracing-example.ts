/**
 * 📝 EXEMPLO: Edge Function com Distributed Tracing
 * 
 * Este arquivo demonstra o uso completo do sistema de tracing:
 * - trace_id automático
 * - duration_ms tracking
 * - Checkpoints de performance
 * - Propagação cross-function
 * - Error handling com contexto
 * 
 * NÃO DEPLOYAR - Apenas referência para migração
 */

import { createLogger } from "../_shared/structured-logger.ts";
import { getOrCreateTraceId, injectTraceId } from "../_shared/trace-id.ts";
import { createTimer } from "../_shared/duration-tracker.ts";

// ============================================================
// EXEMPLO 1: Edge Function Básica com Tracing
// ============================================================

Deno.serve(async (req) => {
  // Step 1: Setup tracing
  const timer = createTimer();
  const traceId = getOrCreateTraceId(req);
  const logger = createLogger('example-function', req, { 
    traceId, 
    durationTracker: timer 
  });

  // Step 2: Log entrada
  logger.info('Function invoked', { 
    method: req.method,
    url: req.url 
  });

  try {
    // Step 3: Parse input
    timer.checkpoint('parse-start');
    const body = await req.json();
    timer.checkpoint('parse-end');
    const parseMs = timer.between('parse-start', 'parse-end');
    
    logger.info('Input parsed', { 
      duration_ms: parseMs,
      keys: Object.keys(body) 
    });

    // Step 4: Validate input
    if (!body.userId) {
      logger.warn('Missing userId', { body });
      return new Response(
        JSON.stringify({ error: 'userId required' }), 
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'X-Trace-Id': traceId // Sempre retornar trace ID
          }
        }
      );
    }

    // Step 5: Database query com measurement
    const [user, dbMs] = await logger.measure('database-query', async () => {
      timer.checkpoint('db-start');
      const result = await fetchUserFromDB(body.userId);
      timer.checkpoint('db-end');
      return result;
    });

    logger.info('User fetched', { 
      duration_ms: dbMs,
      user_id: user.id 
    });

    // Step 6: External API call com measurement
    const [apiData, apiMs] = await logger.measure('external-api', async () => {
      timer.checkpoint('api-start');
      const response = await fetch('https://api.example.com/data', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${Deno.env.get('API_TOKEN')}` }
      });
      timer.checkpoint('api-end');
      return await response.json();
    });

    logger.info('API data fetched', { 
      duration_ms: apiMs,
      records: apiData.length 
    });

    // Step 7: Processing
    timer.checkpoint('process-start');
    const result = processData(user, apiData);
    timer.checkpoint('process-end');
    const processMs = timer.between('process-start', 'process-end');

    logger.info('Data processed', { duration_ms: processMs });

    // Step 8: Final response
    const totalMs = timer.complete();
    logger.info('Function completed', { 
      duration_ms: totalMs,
      breakdown: {
        parse_ms: parseMs,
        db_ms: dbMs,
        api_ms: apiMs,
        process_ms: processMs
      }
    });

    return new Response(
      JSON.stringify(result), 
      { 
        headers: { 
          'Content-Type': 'application/json',
          'X-Trace-Id': traceId,
          'X-Duration-Ms': String(totalMs)
        }
      }
    );

  } catch (error) {
    const totalMs = timer.complete();
    
    logger.error('Function failed', { 
      duration_ms: totalMs,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        trace_id: traceId 
      }), 
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'X-Trace-Id': traceId 
        }
      }
    );
  }
});

// ============================================================
// EXEMPLO 2: Propagação Cross-Function
// ============================================================

async function callDownstreamFunction(
  traceId: string, 
  data: unknown
): Promise<Response> {
  const logger = createLogger('caller-function', undefined, { traceId });

  logger.info('Calling downstream function', { data });

  // ✅ Propagar trace_id via injectTraceId()
  const response = await fetch(
    'https://project.supabase.co/functions/v1/downstream-function',
    injectTraceId(traceId, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 
        'Content-Type': 'application/json',
        'apikey': Deno.env.get('SUPABASE_ANON_KEY')!
      }
    })
  );

  logger.info('Downstream responded', { 
    status: response.status,
    returned_trace_id: response.headers.get('X-Trace-Id')
  });

  return response;
}

// ============================================================
// EXEMPLO 3: Performance Budget
// ============================================================

import { createBudget } from "../_shared/duration-tracker.ts";

async function expensiveOperation(traceId: string): Promise<void> {
  const logger = createLogger('expensive-op', undefined, { traceId });
  const budget = createBudget('expensive-operation', 1000); // 1000ms limit

  logger.info('Starting expensive operation');

  // Simular operação cara
  await new Promise(resolve => setTimeout(resolve, 1200));

  const { exceeded, duration } = budget.check();
  
  if (exceeded) {
    logger.warn('Performance budget exceeded!', { 
      duration_ms: duration,
      budget_ms: 1000 
    });
  } else {
    logger.info('Within budget', { duration_ms: duration });
  }
}

// ============================================================
// EXEMPLO 4: Error Handling Detalhado
// ============================================================

async function robustOperation(traceId: string): Promise<Result> {
  const timer = createTimer();
  const logger = createLogger('robust-op', undefined, { 
    traceId, 
    durationTracker: timer 
  });

  try {
    logger.info('Operation started');

    // Operação que pode falhar
    timer.checkpoint('risky-start');
    const result = await riskyDatabaseCall();
    timer.checkpoint('risky-end');

    const duration = timer.between('risky-start', 'risky-end');
    logger.info('Risky operation succeeded', { duration_ms: duration });

    return result;

  } catch (error) {
    const duration = timer.complete();

    // Log estruturado de erro
    logger.error('Operation failed', {
      duration_ms: duration,
      error_type: error instanceof Error ? error.constructor.name : 'Unknown',
      error_message: error instanceof Error ? error.message : String(error),
      error_stack: error instanceof Error ? error.stack : undefined,
      // Contexto adicional útil para debug
      timestamp: new Date().toISOString(),
      checkpoints: timer.getAllCheckpoints()
    });

    // Re-throw para handler upstream
    throw error;
  }
}

// ============================================================
// EXEMPLO 5: Supabase Function Invoke com Tracing
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { injectTraceContext } from "../_shared/trace-id.ts";

async function callSupabaseFunction(traceId: string): Promise<void> {
  const logger = createLogger('supabase-caller', undefined, { traceId });
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  logger.info('Invoking Supabase function');

  // ✅ Propagar trace_id via injectTraceContext()
  const { data, error } = await supabase.functions.invoke(
    'my-function',
    injectTraceContext(traceId, {
      body: { foo: 'bar' }
    })
  );

  if (error) {
    logger.error('Function invocation failed', { error });
    throw error;
  }

  logger.info('Function invocation succeeded', { data });
}

// ============================================================
// HELPERS (Mock - substituir por reais na migration)
// ============================================================

interface User {
  id: string;
  name: string;
}

interface Result {
  success: boolean;
}

async function fetchUserFromDB(userId: string): Promise<User> {
  // Mock - substituir por query real
  return { id: userId, name: 'Test User' };
}

function processData(user: User, apiData: any[]): Result {
  // Mock - substituir por lógica real
  return { success: true };
}

async function riskyDatabaseCall(): Promise<Result> {
  // Mock - substituir por operação real
  if (Math.random() > 0.5) {
    throw new Error('Database connection failed');
  }
  return { success: true };
}
