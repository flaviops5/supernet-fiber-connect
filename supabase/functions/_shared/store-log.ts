// ===============================================================
// 🧾 store-log.ts (versão otimizada)
// ===============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

export function storeLog({
  source,
  level,
  message,
  context = {},
  durationMs,
}: {
  source: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
  context?: Record<string, any>;
  durationMs?: number;
}) {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ Missing Supabase credentials for storeLog()");
      return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ✅ Fire-and-forget: não bloqueia a função principal
    EdgeRuntime.waitUntil(
      supabase.from("monitoring_logs").insert([
        {
          source,
          level,
          message,
          context,
          duration_ms: durationMs,
          created_by: "system",
        },
      ])
    );
  } catch (err) {
    console.error("❌ storeLog() failed:", err.message);
  }
}
