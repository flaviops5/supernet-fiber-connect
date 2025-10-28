/**
 * Helpers para respostas padronizadas em Edge Functions
 */

import { updateFlowState } from "./flow-state.ts";

export function textReply(message: string) {
  return new Response(
    JSON.stringify({ reply: message }),
    { headers: { "Content-Type": "application/json" } }
  );
}

export function jsonReply(payload: Record<string, unknown>) {
  return new Response(
    JSON.stringify(payload),
    { headers: { "Content-Type": "application/json" } }
  );
}

/**
 * PR #15: Helper para salvar last_agent_question automaticamente
 * Usado quando o agente faz uma pergunta que requer resposta do usuário
 */
export async function textReplyWithContext(
  supabaseAdmin: any,
  ctx: { conversation_id: string; flowState?: any },
  message: string
): Promise<Response> {
  // >>> PR #15 vFINAL ✅ - Salvar última pergunta com try/catch
  try {
    if (message.includes("?")) {
      await updateFlowState(supabaseAdmin, ctx, {
        last_agent_question: message
      });
    }
  } catch (error) {
    console.error("❌ Erro salvando last_agent_question:", error);
  }
  // <<< PR #15 ✅

  return textReply(message);
}
