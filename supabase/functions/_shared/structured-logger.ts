// ===============================================================
// 🧠 structured-logger.ts
// Logger padronizado para Supabase Edge Functions
// ===============================================================

export function createLogger(source: string, req?: Request) {
  const start = Date.now();
  return {
    info: (msg: string, extra: Record<string, any> = {}) => {
      console.log(JSON.stringify({ level: "INFO", source, msg, durationMs: Date.now() - start, ...extra }));
    },
    warn: (msg: string, extra: Record<string, any> = {}) => {
      console.warn(JSON.stringify({ level: "WARN", source, msg, durationMs: Date.now() - start, ...extra }));
    },
    error: (msg: string, extra: Record<string, any> = {}) => {
      console.error(JSON.stringify({ level: "ERROR", source, msg, durationMs: Date.now() - start, ...extra }));
    },
  };
}
