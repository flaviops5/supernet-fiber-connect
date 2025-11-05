/**
 * Helpers para respostas padronizadas em Edge Functions
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { JsonObject } from "./error-types.ts";
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
 * PR #15 vFINAL ✅: Helper robusto para salvar last_agent_question
 * Detecta perguntas de forma inteligente e salva automaticamente no flow_state
 * 
 * @param supabaseAdmin - Cliente Supabase com permissões admin
 * @param ctx - Contexto com conversation_id e flowState opcional
 * @param message - Mensagem do agente a ser enviada
 * @param additionalContext - Contexto adicional a ser salvo (opcional)
 * @param mediaContext - Contexto de mídia para salvar na mensagem (opcional)
 */
export async function textReplyWithContext(
  supabaseAdmin: SupabaseClient,
  ctx: { conversation_id: string; flowState?: JsonObject } | string,
  message: string,
  additionalContext?: JsonObject,
  mediaContext?: string
): Promise<Response> {
  // Normalizar contexto se for string
  const conversation_id = typeof ctx === 'string' ? ctx : ctx.conversation_id;
  const flowState = typeof ctx === 'string' ? undefined : ctx.flowState;

  // >>> PR #14 ✅ - Salvar mensagem com media_context no banco
  if (mediaContext) {
    try {
      await supabaseAdmin
        .from('conversation_messages')
        .insert({
          conversation_id,
          content: message,
          sender_type: 'ai',
          sender_name: 'Luan Silva',
          media_context: mediaContext,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error("❌ Erro salvando mensagem com mídia:", error);
    }
  }
  // <<< PR #14 ✅

  // >>> PR #15 vFINAL ✅ - Detecção robusta de perguntas
  try {
    if (isQuestion(message)) {
      const updateData: JsonObject = {
        last_agent_question: message,
        ...additionalContext
      };

      await updateFlowState(
        supabaseAdmin, 
        { conversation_id, flowState }, 
        updateData
      );
    } else if (additionalContext) {
      // Salvar apenas contexto adicional se não for pergunta
      await updateFlowState(
        supabaseAdmin,
        { conversation_id, flowState },
        additionalContext
      );
    }
  } catch (error) {
    console.error("❌ Erro salvando contexto:", error);
  }
  // <<< PR #15 ✅

  return textReply(message);
}

/**
 * PR #15: Detecta se uma mensagem é uma pergunta de forma robusta
 * 
 * Features:
 * - Ignora URLs com "?" para não confundir
 * - Verifica interrogação no final de frases
 * - Detecta palavras-chave de perguntas em português
 * - Robusta contra edge cases e múltiplas linhas
 * 
 * @param message - Mensagem a ser analisada
 * @returns true se for uma pergunta, false caso contrário
 */
function isQuestion(message: string): boolean {
  if (!message || typeof message !== 'string') return false;

  // Remove URLs para não confundir com "?"
  const cleanMessage = message.replace(/https?:\/\/[^\s]+/g, '');
  
  // 1. Verifica se tem "?" próximo ao final (tolerante a emojis e espaços)
  const hasQuestionMark = /\?[\s\n🔍👇✅❓]*$/.test(cleanMessage.trim());
  
  // 2. Palavras interrogativas que sempre indicam perguntas
  const interrogativeWords = /\b(qual|quais|como|quando|onde|quem|por\s*que|porque|quanto|quantos|quantas)\b/i;
  
  // 3. Verbos que formam perguntas (contexto português BR)
  const questionVerbs = /\b(pode|podem|consegue|conseguem|você|vocês|confirma|confirme|está|estão|funciona|testou|verificou|viu|vê|há|existe|existem)\b/i;
  
  const lowerMessage = cleanMessage.toLowerCase();
  
  // Detecta interrogativa + "?" OU apenas "?" no final
  const hasInterrogativeWithMark = interrogativeWords.test(lowerMessage) && cleanMessage.includes('?');
  const hasVerbWithMark = questionVerbs.test(lowerMessage) && cleanMessage.includes('?');

  return hasQuestionMark || hasInterrogativeWithMark || hasVerbWithMark;
}
