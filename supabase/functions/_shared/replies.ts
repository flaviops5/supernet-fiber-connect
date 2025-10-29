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
 * PR #15 vFINAL ✅: Helper robusto para salvar last_agent_question
 * Detecta perguntas de forma inteligente e salva automaticamente
 */
export async function textReplyWithContext(
  supabaseAdmin: any,
  ctx: { conversation_id: string; flowState?: any },
  message: string
): Promise<Response> {
  // >>> PR #15 vFINAL ✅ - Detecção robusta de perguntas
  try {
    if (isQuestion(message)) {
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

/**
 * PR #15: Detecta se uma mensagem é uma pergunta de forma robusta
 * - Ignora URLs com "?"
 * - Verifica interrogação no final de frases
 * - Detecta palavras-chave de perguntas
 */
function isQuestion(message: string): boolean {
  if (!message || typeof message !== 'string') return false;

  // Remove URLs para não confundir com "?"
  const cleanMessage = message.replace(/https?:\/\/[^\s]+/g, '');
  
  // Verifica se tem "?" no final de alguma frase
  const hasQuestionMark = /\?[\s\n]*(?:[^.!?]*)?$/.test(cleanMessage);
  
  // Palavras-chave que indicam perguntas (case insensitive)
  const questionKeywords = [
    'pode', 'consegue', 'você', 'confirma', 'confirme',
    'está', 'funciona', 'testou', 'verificou', 'viu',
    'qual', 'como', 'quando', 'onde', 'quem', 'por que'
  ];
  
  const lowerMessage = cleanMessage.toLowerCase();
  const hasQuestionKeyword = questionKeywords.some(kw => 
    lowerMessage.includes(kw) && cleanMessage.includes('?')
  );

  return hasQuestionMark || hasQuestionKeyword;
}
