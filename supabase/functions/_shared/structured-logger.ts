import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { JsonObject } from "./error-types.ts";
import { getOrCreateTraceId } from "./trace-id.ts";
import { DurationTracker } from "./duration-tracker.ts";

// Cria cliente Supabase local seguro
function getSupabase() {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("Variáveis de ambiente Supabase ausentes");
    return createClient(url, key);
  } catch (err) {
    console.error("⚠️ Falha ao inicializar Supabase no logger:", err instanceof Error ? err.message : 'Unknown error');
    return null;
  }
}

export interface LoggerOptions {
  traceId?: string;
  durationTracker?: DurationTracker;
}

export function createLogger(agentName: string, req?: Request, options?: LoggerOptions) {
  const supabase = getSupabase();
  const traceId = options?.traceId ?? (req ? getOrCreateTraceId(req) : crypto.randomUUID().slice(0, 8));
  const tracker = options?.durationTracker;

  async function storeLog(level: string, message: string, metadata: JsonObject = {}) {
    try {
      if (!supabase) {
        console.warn("⚠️ Supabase não inicializado — log não persistido:", message);
        return;
      }
      
      // Sanitizar metadata para garantir que seja serializável
      const sanitizedMetadata = sanitizeMetadata(metadata);
      
      // Add trace_id and duration_ms to metadata
      const enrichedMetadata = {
        ...sanitizedMetadata,
        trace_id: traceId,
        ...(tracker ? { duration_ms: tracker.elapsed } : {}),
      };
      
      await supabase
        .from("monitoring_logs")
        .insert([
          {
            level,
            message,
            metadata: enrichedMetadata,
            agent_name: agentName,
            timestamp: new Date().toISOString(),
          },
        ]);
    } catch (err) {
      console.error("❌ Falha ao salvar log:", err instanceof Error ? err.message : 'Unknown error');
    }
  }

  // Helper para sanitizar metadata
  function sanitizeMetadata(meta: JsonObject): JsonObject {
    try {
      return JSON.parse(JSON.stringify(meta));
    } catch (err) {
      console.warn("⚠️ Failed to sanitize metadata:", err);
      return { error: 'Failed to sanitize metadata' };
    }
  }

  return {
    traceId, // Expose trace ID for propagation
    
    info: (msg: string, meta?: JsonObject) => {
      const duration = tracker ? `[${tracker.elapsed}ms]` : '';
      console.log(`ℹ️ [${agentName}:${traceId}] ${duration}`, msg, meta ?? "");
      return storeLog("info", msg, meta ?? {});
    },
    warn: (msg: string, meta?: JsonObject) => {
      const duration = tracker ? `[${tracker.elapsed}ms]` : '';
      console.warn(`⚠️ [${agentName}:${traceId}] ${duration}`, msg, meta ?? "");
      return storeLog("warn", msg, meta ?? {});
    },
    error: (msg: string, meta?: JsonObject) => {
      const duration = tracker ? `[${tracker.elapsed}ms]` : '';
      console.error(`❌ [${agentName}:${traceId}] ${duration}`, msg, meta ?? "");
      return storeLog("error", msg, meta ?? {});
    },
    
    // Helper to measure operation duration
    measure: async <T>(operation: string, fn: () => Promise<T>): Promise<T> => {
      const opTimer = new DurationTracker();
      console.log(`⏱️ [${agentName}:${traceId}] Starting: ${operation}`);
      
      try {
        const result = await fn();
        const duration = opTimer.complete();
        console.log(`✅ [${agentName}:${traceId}] Completed: ${operation} (${duration}ms)`);
        await storeLog("info", `${operation} completed`, { duration_ms: duration });
        return result;
      } catch (error) {
        const duration = opTimer.complete();
        console.error(`❌ [${agentName}:${traceId}] Failed: ${operation} (${duration}ms)`, error);
        await storeLog("error", `${operation} failed`, { 
          duration_ms: duration,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    },
  };
}
