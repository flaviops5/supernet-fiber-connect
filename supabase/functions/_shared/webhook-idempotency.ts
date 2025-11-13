/**
 * Webhook Idempotency Helper
 * 
 * Previne processamento duplicado de eventos de webhook
 * usando a tabela webhook_events como registro de deduplicação.
 * 
 * Item 11 da Auditoria
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

export interface WebhookEventData {
  webhookName: string;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  existingEventId?: string;
  processedAt?: string;
}

/**
 * Verifica se um evento já foi processado anteriormente
 * 
 * @param supabase - Cliente Supabase com permissões de service_role
 * @param webhookName - Nome do webhook (ex: 'whatsapp-webhook')
 * @param eventId - Identificador único do evento (ex: messageId)
 * @returns Resultado indicando se é duplicado
 */
export async function checkDuplicateEvent(
  supabase: SupabaseClient,
  webhookName: string,
  eventId: string
): Promise<IdempotencyCheckResult> {
  const { data, error } = await supabase
    .from('webhook_events')
    .select('id, processed_at')
    .eq('webhook_name', webhookName)
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) {
    console.error('Error checking duplicate event:', error);
    // Em caso de erro, permitir processamento (fail-open)
    return { isDuplicate: false };
  }

  if (data) {
    return {
      isDuplicate: true,
      existingEventId: data.id,
      processedAt: data.processed_at
    };
  }

  return { isDuplicate: false };
}

/**
 * Registra um evento de webhook para prevenir duplicação futura
 * 
 * @param supabase - Cliente Supabase com permissões de service_role
 * @param eventData - Dados do evento a ser registrado
 * @returns ID do evento registrado ou null em caso de erro
 */
export async function registerWebhookEvent(
  supabase: SupabaseClient,
  eventData: WebhookEventData
): Promise<string | null> {
  const { data, error } = await supabase
    .from('webhook_events')
    .insert({
      webhook_name: eventData.webhookName,
      event_id: eventData.eventId,
      event_type: eventData.eventType,
      payload: eventData.payload,
      metadata: eventData.metadata || {},
      processed_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error) {
    // Violação de constraint único = duplicado (esperado em race conditions)
    if (error.code === '23505') {
      console.warn(`Duplicate event detected during insert: ${eventData.eventId}`);
      return null;
    }
    
    console.error('Error registering webhook event:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * Verifica duplicação E registra o evento em uma única operação
 * 
 * Usa INSERT com ON CONFLICT para garantir atomicidade.
 * Retorna true se o evento foi registrado com sucesso (não é duplicado).
 * Retorna false se o evento já existia (é duplicado).
 * 
 * @param supabase - Cliente Supabase com permissões de service_role
 * @param eventData - Dados do evento
 * @returns true se evento é novo, false se é duplicado
 */
export async function checkAndRegisterEvent(
  supabase: SupabaseClient,
  eventData: WebhookEventData
): Promise<boolean> {
  // Tentar inserir o evento
  const { error } = await supabase
    .from('webhook_events')
    .insert({
      webhook_name: eventData.webhookName,
      event_id: eventData.eventId,
      event_type: eventData.eventType,
      payload: eventData.payload,
      metadata: eventData.metadata || {},
      processed_at: new Date().toISOString()
    });

  if (error) {
    // Violação de constraint único = evento duplicado
    if (error.code === '23505') {
      console.warn(`⚠️ Duplicate event rejected: ${eventData.webhookName}/${eventData.eventId}`);
      return false; // É duplicado
    }
    
    // Outro erro - logar mas permitir processamento (fail-open)
    console.error('❌ Error in checkAndRegisterEvent:', error);
    return true; // Permitir processamento em caso de erro
  }

  // Inserção bem-sucedida = evento novo
  console.log(`✅ New event registered: ${eventData.webhookName}/${eventData.eventId}`);
  return true; // Não é duplicado
}
