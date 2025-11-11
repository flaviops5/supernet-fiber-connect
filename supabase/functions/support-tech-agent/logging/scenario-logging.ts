/**
 * Scenario Logging Helpers
 * Funções auxiliares para logging de cenários
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Log específico para Cenário B
 */
export async function logB(
  supabaseClient: SupabaseClient,
  conversation_id: string,
  acao: string,
  detalhes: Record<string, any> = {}
): Promise<void> {
  await supabaseClient.from("registros_de_monitoramento").insert({
    fluxo: "support-tech",
    acao,
    conversation_id,
    detalhes
  });
}
