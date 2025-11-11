/**
 * Database Message Helpers
 * Funções para inserção de mensagens no banco de dados
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Evita salvar mensagens duplicadas do agente
 * Verifica se a última mensagem é idêntica e foi enviada recentemente
 */
export async function insertAgentMessageOnce(
  supabase: SupabaseClient,
  conversation_id: string,
  content: string,
  logger: any
): Promise<{ skipped?: boolean; error?: any }> {
  try {
    if (!content || !conversation_id) return { skipped: true };

    const { data: last } = await supabase
      .from('conversation_messages')
      .select('id, content, created_at, sender_name, sender_type')
      .eq('conversation_id', conversation_id)
      .eq('sender_type', 'agent')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = Date.now();
    if (last && last.sender_name === 'Luan Silva' && last.content === content) {
      const diff = now - new Date(last.created_at).getTime();
      if (diff < 5000) {
        logger.warn('Duplicate agent message detected, skipping', { conversation_id });
        return { skipped: true };
      }
    }

    return await supabase.from('conversation_messages').insert({
      conversation_id,
      sender_type: 'agent',
      sender_name: 'Luan Silva',
      content,
      ai_suggestion: false
    });
  } catch (e) {
    logger.error('insertAgentMessageOnce error', { error: e });
    return await supabase.from('conversation_messages').insert({
      conversation_id,
      sender_type: 'agent',
      sender_name: 'Luan Silva',
      content,
      ai_suggestion: false
    });
  }
}

/**
 * Inserir mensagem do agente (wrapper simplificado)
 */
export async function insertAgentMessage(
  supabase: SupabaseClient,
  conversationId: string,
  content: string,
  senderName = "Luan Silva",
  skipDbOps = false,
  logger?: any
): Promise<{ error: any }> {
  if (skipDbOps) {
    logger?.info("🧪 SKIP_DB_OPS: Mensagem não inserida", { 
      content: content.substring(0, 50),
      senderName 
    });
    return { error: null };
  }
  
  return await supabase.from("conversation_messages").insert({
    conversation_id: conversationId,
    sender_type: "agent",
    sender_name: senderName,
    content,
    ai_suggestion: false
  });
}
