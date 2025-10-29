/**
 * PR#27 - Async Safety Helpers
 * Utilitários para operações assíncronas não-bloqueantes
 */

/**
 * Dispara uma Promise sem bloquear a request.
 * Em ambientes Edge (Deno/Supabase), usa EdgeRuntime.waitUntil quando disponível.
 */
export function defer<T = unknown>(promise: Promise<T> | (() => Promise<T>)): void {
  try {
    const p = typeof promise === "function" ? promise() : promise;
    // @ts-ignore - EdgeRuntime existe no ambiente Supabase Edge Functions
    if (globalThis?.EdgeRuntime?.waitUntil) {
      // @ts-ignore
      globalThis.EdgeRuntime.waitUntil(p);
      return;
    }
    // Fallback: não bloquear e engolir erros
    p.catch(() => {});
  } catch {
    // ignora
  }
}

/**
 * Envolve uma Promise com timeout (em ms). Rejeita em caso de estouro.
 */
export async function withTimeout<T>(
  p: Promise<T>,
  ms = 5000,
  label = "op"
): Promise<T> {
  let t: number | undefined;
  const timer = new Promise<never>((_, rej) => {
    // @ts-ignore
    t = setTimeout(() => rej(new Error(`timeout: ${label} (${ms}ms)`)), ms);
  });
  try {
    const r = await Promise.race([p, timer]);
    return r as T;
  } finally {
    // @ts-ignore
    clearTimeout(t);
  }
}

/**
 * Tenta executar uma função sem lançar exceção (safe & silencioso).
 * Retorna { ok:false, error } em caso de erro.
 */
export async function safeCall<T>(
  fn: () => Promise<T>
): Promise<{ ok: true; data: T } | { ok: false; error: unknown }> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error };
  }
}

/** No-op async */
export async function noop(): Promise<void> {
  /* vazio */
}
