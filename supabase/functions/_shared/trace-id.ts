/**
 * 🔍 Trace ID Management for Distributed Tracing
 * 
 * Generates and propagates trace IDs across edge functions for request correlation.
 * Compliant with OpenTelemetry trace context propagation.
 */

/**
 * Generate a new UUID v4 trace ID
 */
export function generateTraceId(): string {
  return crypto.randomUUID();
}

/**
 * Extract trace ID from request headers
 * Supports multiple header formats:
 * - X-Trace-Id (custom)
 * - traceparent (W3C Trace Context)
 * - X-Request-Id (fallback)
 */
export function extractTraceId(request: Request): string | null {
  // Try custom header first
  const customTraceId = request.headers.get('X-Trace-Id');
  if (customTraceId) return customTraceId;

  // Try W3C Trace Context (traceparent format: version-trace_id-parent_id-trace_flags)
  const traceparent = request.headers.get('traceparent');
  if (traceparent) {
    const parts = traceparent.split('-');
    if (parts.length >= 2) return parts[1]; // Extract trace_id
  }

  // Try X-Request-Id as fallback
  const requestId = request.headers.get('X-Request-Id');
  if (requestId) return requestId;

  return null;
}

/**
 * Inject trace ID into request for function-to-function calls
 * 
 * @example
 * ```ts
 * const response = await fetch(url, injectTraceId(traceId, {
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * }));
 * ```
 */
export function injectTraceId(
  traceId: string,
  init: RequestInit = {}
): RequestInit {
  const headers = new Headers(init.headers);
  headers.set('X-Trace-Id', traceId);
  
  // Also set W3C Trace Context for compatibility
  // Format: version-trace_id-parent_id-trace_flags
  // Using 00 (version) and 01 (sampled flag)
  const spanId = crypto.randomUUID().slice(0, 16).replace(/-/g, '');
  headers.set('traceparent', `00-${traceId}-${spanId}-01`);

  return {
    ...init,
    headers,
  };
}

/**
 * Get or create trace ID from request
 * If no trace ID exists, generates a new one
 * 
 * @example
 * ```ts
 * const traceId = getOrCreateTraceId(req);
 * console.log(`[${traceId}] Processing request...`);
 * ```
 */
export function getOrCreateTraceId(request: Request): string {
  return extractTraceId(request) ?? generateTraceId();
}

/**
 * Create trace context object with metadata
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  timestamp: string;
}

/**
 * Create a new trace context
 * 
 * @example
 * ```ts
 * const ctx = createTraceContext(req);
 * logger.info('Request received', ctx);
 * ```
 */
export function createTraceContext(request: Request): TraceContext {
  const traceId = getOrCreateTraceId(request);
  const spanId = crypto.randomUUID().slice(0, 16).replace(/-/g, '');
  
  // Extract parent span ID from traceparent if available
  const traceparent = request.headers.get('traceparent');
  let parentSpanId: string | undefined;
  if (traceparent) {
    const parts = traceparent.split('-');
    if (parts.length >= 3) parentSpanId = parts[2];
  }

  return {
    traceId,
    spanId,
    parentSpanId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Inject trace context into Supabase function invocations
 * 
 * @example
 * ```ts
 * const { data } = await supabase.functions.invoke('my-function', 
 *   injectTraceContext(traceId, {
 *     body: { foo: 'bar' }
 *   })
 * );
 * ```
 */
export function injectTraceContext(
  traceId: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): {
  body: unknown;
  headers: Record<string, string>;
} {
  return {
    body: options.body,
    headers: {
      ...options.headers,
      'X-Trace-Id': traceId,
    },
  };
}
