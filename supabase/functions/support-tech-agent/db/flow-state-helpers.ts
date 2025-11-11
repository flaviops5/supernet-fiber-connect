/**
 * Flow State Database Helpers
 * Funções para manipulação de flow_state no banco de dados
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Normalizar flow_state para evitar espalhar string em chaves '0','1',...
 */
export function normalizeFlowState(fs: any): Record<string, any> {
  if (typeof fs === "string") return { continue: fs };
  if (!fs || typeof fs !== "object" || Array.isArray(fs)) return {};
  return fs;
}

/**
 * Atualizar waiting_step no flow_state
 */
export async function setWaitingStep(
  supabaseClient: SupabaseClient,
  conversationId: string,
  meta: any,
  step: string,
  extra: Record<string, any> = {}
): Promise<void> {
  await supabaseClient
    .from("conversations")
    .update({
      metadata: {
        ...(meta || {}),
        flow_state: {
          ...((meta?.flow_state) || {}),
          ...extra,
          waiting_step: step
        }
      }
    })
    .eq("id", conversationId);
}

/**
 * Persistir ixc_client_id no flow_state
 */
export async function persistIxcClientId(
  supabase: SupabaseClient,
  conversation_id: string,
  ixc_client_id: string,
  logger: any
): Promise<void> {
  const { data: currentConv } = await supabase
    .from("conversations")
    .select("metadata")
    .eq("id", conversation_id)
    .single();

  const existingState = (currentConv?.metadata as any)?.flow_state;
  
  if (!existingState?.ixc_client_id || existingState?.ixc_client_id !== ixc_client_id) {
    await supabase
      .from("conversations")
      .update({
        metadata: {
          ...(currentConv?.metadata as any || {}),
          flow_state: {
            ...existingState,
            ixc_client_id
          }
        }
      })
      .eq("id", conversation_id);

    await supabase
      .from("registros_de_monitoramento")
      .insert({
        acao: "persist_ixc_client_id",
        fluxo: "support-tech",
        conversation_id,
        detalhes: { ixc_client_id }
      });
    
    logger.info("IXC client_id persistido", { ixc_client_id });
  }
}
