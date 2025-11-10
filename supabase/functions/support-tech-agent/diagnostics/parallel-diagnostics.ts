/**
 * PR#17 - Parallel Diagnostics
 * Executa diagnósticos de sinal e conectividade em paralelo com timeouts independentes
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ParallelDiagnosticsResult {
  signalResult: PromiseSettledResult<any>;
  connectivityResult: PromiseSettledResult<any>;
  elapsed: number;
}

/**
 * Helper: Adiciona timeout a uma promise
 */
function withTimeout<T>(
  promise: Promise<T>, 
  ms: number, 
  label: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label} (${ms}ms)`)), ms)
    )
  ]);
}

/**
 * Executa signal check e connectivity test simultaneamente
 */
export async function runParallelDiagnostics(
  ixc_client_id: string,
  conversation_id: string,
  supabase: SupabaseClient,
  logger: any
): Promise<ParallelDiagnosticsResult> {
  const start = Date.now();

  logger.info("🔄 PR#17: Iniciando diagnósticos paralelos", { ixc_client_id });

  // Executar ambos em paralelo com timeouts independentes
  const [signalResult, connectivityResult] = await Promise.allSettled([
    withTimeout(
      supabase.functions.invoke("ixc-onu-signal", {
        body: { ixc_client_id }
      }),
      8000, // 8s para signal (IXC pode ser lento)
      "ixc-onu-signal"
    ),
    withTimeout(
      supabase.functions.invoke("test-equipment-connectivity", {
        body: { ixc_client_id, timeout: 5000 }
      }),
      6000, // 6s para connectivity (já tem timeout interno de 5s)
      "test-equipment-connectivity"
    )
  ]);

  const elapsed = Date.now() - start;

  // Log detalhado para auditoria
  await supabase.from("registros_de_monitoramento").insert({
    acao: "parallel_diag_finished",
    fluxo: "support-tech",
    conversation_id,
    detalhes: {
      elapsed_ms: elapsed,
      signal_status: signalResult.status,
      signal_ok: signalResult.status === "fulfilled",
      signal_error: signalResult.status === "rejected" 
        ? (signalResult.reason?.message || String(signalResult.reason))
        : null,
      connectivity_status: connectivityResult.status,
      connectivity_ok: connectivityResult.status === "fulfilled",
      connectivity_error: connectivityResult.status === "rejected"
        ? (connectivityResult.reason?.message || String(connectivityResult.reason))
        : null
    }
  });

  logger.info("✅ PR#17: Diagnósticos paralelos concluídos", {
    elapsed,
    signal_ok: signalResult.status === "fulfilled",
    connectivity_ok: connectivityResult.status === "fulfilled"
  });

  return { signalResult, connectivityResult, elapsed };
}
