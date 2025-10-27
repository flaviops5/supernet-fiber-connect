/**
 * Media Helper - PR #6
 * Sistema de mídia guiada para suporte técnico
 * 
 * Funcionalidades:
 * - Exibição de mídia com fallback automático
 * - Logging estruturado de uso de mídia
 * - Métricas de resolução com mídia
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "./logger";

export type MediaType = 'image' | 'video' | 'audio';
export type MediaContext = 'los_detected' | 'fiber_reconnect' | 'onu_visual' | 'cpf_request';

export interface MediaAsset {
  type: MediaType;
  url: string;
  alt?: string;
  fallbackText: string;
}

interface MediaLogData {
  conversation_id: string;
  agent_name: string;
  media_type: MediaType;
  media_context: MediaContext;
  media_url: string;
  displayed_successfully: boolean;
  user_feedback?: 'helped' | 'not_helped';
}

/**
 * Mapeamento de contexto para assets de mídia
 */
export const MEDIA_ASSETS: Record<MediaContext, MediaAsset> = {
  los_detected: {
    type: 'image',
    url: '/assets/support-tech-media/los-blinking-placeholder.png',
    alt: 'Luz vermelha LOS piscando no aparelho',
    fallbackText: 'A luz vermelha chamada "LOS" está piscando no seu aparelho. Ela fica na parte da frente, ao lado das outras luzes.'
  },
  fiber_reconnect: {
    type: 'image',
    url: '/assets/support-tech-media/reconnect-fiber-placeholder.png',
    alt: 'Como reconectar o cabo de fibra',
    fallbackText: 'Localize o conector verde (parte onde a fibra entra no aparelho). Retire-o delicadamente e conecte novamente até ouvir um clique.'
  },
  onu_visual: {
    type: 'image',
    url: '/assets/support-tech-media/onu-front-simple.png',
    alt: 'Visão frontal do aparelho com luzes indicadoras',
    fallbackText: 'Na frente do seu aparelho, você verá algumas luzes. A luz "LOS" é a que indica o sinal da fibra.'
  },
  cpf_request: {
    type: 'audio',
    url: '/campaign-media/support-tech-audio/cloe_solicita_cpf_v1.mp3',
    fallbackText: 'Por favor, me informe seu CPF para que eu possa localizar seus dados.'
  }
};

/**
 * Obtém o asset de mídia adequado para o contexto
 */
export function getMediaAsset(context: MediaContext, agentName?: string): MediaAsset {
  const asset = MEDIA_ASSETS[context];
  
  // Ajusta URL de áudio conforme o agente
  if (asset.type === 'audio' && agentName) {
    const audioMap: Record<string, string> = {
      'Luan Aquino': `/campaign-media/support-tech-audio/luan_${context}_v1.mp3`,
      'Cloé': `/campaign-media/support-tech-audio/cloe_${context}_v1.mp3`
    };
    
    if (audioMap[agentName]) {
      return { ...asset, url: audioMap[agentName] };
    }
  }
  
  return asset;
}

/**
 * Verifica se a mídia está disponível
 */
export async function checkMediaAvailability(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    logger.warn('Media availability check failed', { url, error });
    return false;
  }
}

/**
 * Registra uso de mídia para métricas
 * Nota: A tabela media_usage_logs será criada via migração SQL
 */
export async function logMediaUsage(data: MediaLogData): Promise<void> {
  try {
    // Log localmente até que a tabela seja criada
    logger.info('Media usage', { 
      conversation_id: data.conversation_id,
      agent_name: data.agent_name,
      media_type: data.media_type,
      media_context: data.media_context,
      media_url: data.media_url,
      displayed_successfully: data.displayed_successfully,
      user_feedback: data.user_feedback
    });
    
    // TODO: Uncomment after migration
    // const { error } = await supabase
    //   .from('media_usage_logs')
    //   .insert({
    //     conversation_id: data.conversation_id,
    //     agent_name: data.agent_name,
    //     media_type: data.media_type,
    //     media_context: data.media_context,
    //     media_url: data.media_url,
    //     displayed_successfully: data.displayed_successfully,
    //     user_feedback: data.user_feedback,
    //     created_at: new Date().toISOString()
    //   });
  } catch (error) {
    logger.error('Exception logging media usage', error);
  }
}

/**
 * Registra feedback do usuário sobre a mídia
 * Nota: A tabela media_usage_logs será criada via migração SQL
 */
export async function recordMediaFeedback(
  conversationId: string,
  mediaContext: MediaContext,
  helped: boolean
): Promise<void> {
  try {
    // Log localmente até que a tabela seja criada
    logger.info('Media feedback recorded', { 
      conversation_id: conversationId,
      context: mediaContext, 
      helped 
    });
    
    // TODO: Uncomment after migration
    // const { error } = await supabase
    //   .from('media_usage_logs')
    //   .update({ 
    //     user_feedback: helped ? 'helped' : 'not_helped',
    //     feedback_at: new Date().toISOString()
    //   })
    //   .eq('conversation_id', conversationId)
    //   .eq('media_context', mediaContext)
    //   .is('user_feedback', null)
    //   .order('created_at', { ascending: false })
    //   .limit(1);
  } catch (error) {
    logger.error('Exception recording media feedback', error);
  }
}

/**
 * Formata mensagem com mídia para exibição
 */
export interface MediaMessage {
  mediaAsset: MediaAsset;
  text: string;
  showMediaFirst: boolean;
}

export function formatMediaMessage(
  context: MediaContext,
  messageText: string,
  agentName?: string
): MediaMessage {
  const mediaAsset = getMediaAsset(context, agentName);
  
  return {
    mediaAsset,
    text: messageText,
    showMediaFirst: true // Sempre mídia antes do texto (PR #6 requirement)
  };
}
