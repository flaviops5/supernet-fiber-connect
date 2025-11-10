/**
 * Timeout Handler
 * Gerencia protocolo de timeout escalonado
 * 1ª tentativa: 1:30min | 2ª tentativa: 5min | 3ª tentativa: 15min (fechar)
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface TimeoutResult {
  shouldRespond: boolean;
  message?: string;
  action: "remind" | "final_warning" | "close" | "none";
}

/**
 * Verifica timeout e retorna ação apropriada
 */
export async function checkTimeout(
  supabase: SupabaseClient,
  conversationId: string,
  customerName: string,
  isFirstMessage: boolean,
  logger: any
): Promise<TimeoutResult> {
  // Não aplicar timeout em primeira mensagem
  if (isFirstMessage) {
    return { shouldRespond: false, action: "none" };
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("metadata, updated_at")
    .eq("id", conversationId)
    .single();

  if (!conversation) {
    return { shouldRespond: false, action: "none" };
  }

  const flowState = (conversation.metadata as any)?.flow_state || {};
  const lastInteraction = conversation.updated_at 
    ? new Date(conversation.updated_at) 
    : new Date();
  
  const minutesWithoutReply = Math.floor(
    (new Date().getTime() - lastInteraction.getTime()) / 60000
  );

  const timeoutAttempts = flowState.timeout_attempts || 0;

  // ⏱️ Timeout 1: 1:30min (primeira tentativa)
  if (minutesWithoutReply >= 1.5 && minutesWithoutReply < 5 && timeoutAttempts === 0) {
    logger.info("Timeout 1ª tentativa: Cliente sem resposta há 1:30min", {
      minutesWithoutReply,
      conversationId
    });

    await supabase
      .from("conversations")
      .update({
        metadata: {
          ...(conversation.metadata as any || {}),
          flow_state: {
            ...flowState,
            timeout_attempts: 1,
            last_timeout_at: new Date().toISOString()
          }
        }
      })
      .eq("id", conversationId);

    const firstName = customerName.split(' ')[0];
    return {
      shouldRespond: true,
      action: "remind",
      message: `Oi ${firstName}! Ainda está por aí? 😊\n\nPrecisa de alguma ajuda para continuar?`
    };
  }

  // ⏱️ Timeout 2: 5min (segunda tentativa)
  if (minutesWithoutReply >= 5 && minutesWithoutReply < 15 && timeoutAttempts === 1) {
    logger.info("Timeout 2ª tentativa: Cliente sem resposta há 5min", {
      minutesWithoutReply,
      conversationId
    });

    await supabase
      .from("conversations")
      .update({
        metadata: {
          ...(conversation.metadata as any || {}),
          flow_state: {
            ...flowState,
            timeout_attempts: 2,
            last_timeout_at: new Date().toISOString()
          }
        }
      })
      .eq("id", conversationId);

    const firstName = customerName.split(' ')[0];
    return {
      shouldRespond: true,
      action: "final_warning",
      message: `${firstName}, vou precisar encerrar esse atendimento em alguns minutos por inatividade. 🕒\n\nSe ainda precisar de ajuda, é só me chamar!`
    };
  }

  // ⏱️ Timeout 3: 15min (encerrar)
  if (minutesWithoutReply >= 15 && timeoutAttempts >= 2) {
    logger.info("Timeout 3ª tentativa: Encerrando por inatividade (15min)", {
      minutesWithoutReply,
      conversationId
    });

    await supabase
      .from("conversations")
      .update({
        status: "closed",
        metadata: {
          ...(conversation.metadata as any || {}),
          closed_reason: "timeout_15min",
          flow_state: {
            ...flowState,
            timeout_attempts: 3,
            closed_at: new Date().toISOString()
          }
        }
      })
      .eq("id", conversationId);

    const firstName = customerName.split(' ')[0];
    return {
      shouldRespond: true,
      action: "close",
      message: `${firstName}, vou encerrar esse atendimento por inatividade. ⏱️\n\nQuando precisar, é só me chamar novamente! Estou sempre por aqui. 😊`
    };
  }

  return { shouldRespond: false, action: "none" };
}
