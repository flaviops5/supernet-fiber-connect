// ===============================================================
// 🧠 structured-logger.ts (final otimizado)
// ===============================================================

import { storeLog } from "./store-log.ts";

export function createLogger(source: string, req?: Request) {
  const start = Date.now();
  return {
    info: (msg: string, extra: Record<string, any> = {}) => {
      const log = { level: "INFO", source, msg, durationMs: Date.now() - start, ...extra };
      console.log(JSON.stringify(log));
      // Fire-and-forget
      storeLog({
        source,
        level: "INFO",
        message: msg,
        context: extra,
        durationMs: log.durationMs,
      }).catch(() => {});
    },
    warn: (msg: string, extra: Record<string, any> = {}) => {
      const log = { level: "WARN", source, msg, durationMs: Date.now() - start, ...extra };
      console.warn(JSON.stringify(log));
      storeLog({
        source,
        level: "WARN",
        message: msg,
        context: extra,
        durationMs: log.durationMs,
      }).catch(() => {});
    },
    error: (msg: string, extra: Record<string, any> = {}) => {
      const log = { level: "ERROR", source, msg, durationMs: Date.now() - start, ...extra };
      console.error(JSON.stringify(log));
      storeLog({
        source,
        level: "ERROR",
        message: msg,
        context: extra,
        durationMs: log.durationMs,
      }).catch(() => {});
    },
  };
}
