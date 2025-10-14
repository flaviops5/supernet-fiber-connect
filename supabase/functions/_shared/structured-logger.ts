import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Cria cliente Supabase local seguro
function getSupabase() {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("Variáveis de ambiente Supabase ausentes");
    return createClient(url, key);
  } catch (err: any) {
    console.error("⚠️ Falha ao inicializar Supabase no logger:", err.message);
    return null;
  }
}

export function createLogger(agentName: string, req?: Request) {
  const supabase = getSupabase();

  async function storeLog(level: string, message: string, metadata: Record<string, any> = {}) {
    try {
      if (!supabase) {
        console.warn("⚠️ Supabase não inicializado — log não persistido:", message);
        return;
      }
      await supabase
        .from("monitoring_logs")
        .insert([
          {
            level,
            message,
            metadata,
            agent_name: agentName,
            timestamp: new Date().toISOString(),
          },
        ]);
    } catch (err: any) {
      console.error("❌ Falha ao salvar log:", err.message);
    }
  }

  return {
    info: (msg: string, meta?: Record<string, any>) => {
      console.log(`ℹ️ [${agentName}]`, msg, meta ?? "");
      return storeLog("info", msg, meta ?? {});
    },
    warn: (msg: string, meta?: Record<string, any>) => {
      console.warn(`⚠️ [${agentName}]`, msg, meta ?? "");
      return storeLog("warn", msg, meta ?? {});
    },
    error: (msg: string, meta?: Record<string, any>) => {
      console.error(`❌ [${agentName}]`, msg, meta ?? "");
      return storeLog("error", msg, meta ?? {});
    },
  };
}
