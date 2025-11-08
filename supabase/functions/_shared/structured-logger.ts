import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { JsonObject } from "./error-types.ts";

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

export function createLogger(agentName: string, req?: Request) {
  const supabase = getSupabase();

  async function storeLog(level: string, message: string, metadata: JsonObject = {}) {
    try {
      if (!supabase) {
        console.warn("⚠️ Supabase não inicializado — log não persistido:", message);
        return;
      }
      
      // Sanitizar metadata para garantir que seja serializável
      const sanitizedMetadata = sanitizeMetadata(metadata);
      
      await supabase
        .from("monitoring_logs")
        .insert([
          {
            level,
            message,
            metadata: sanitizedMetadata,
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
    info: (msg: string, meta?: JsonObject) => {
      console.log(`ℹ️ [${agentName}]`, msg, meta ?? "");
      return storeLog("info", msg, meta ?? {});
    },
    warn: (msg: string, meta?: JsonObject) => {
      console.warn(`⚠️ [${agentName}]`, msg, meta ?? "");
      return storeLog("warn", msg, meta ?? {});
    },
    error: (msg: string, meta?: JsonObject) => {
      console.error(`❌ [${agentName}]`, msg, meta ?? "");
      return storeLog("error", msg, meta ?? {});
    },
  };
}
