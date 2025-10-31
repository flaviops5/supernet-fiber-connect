/**
 * Media & Guided Message Types
 * MISSÃO 1.1: TypeScript Zero-Any (Frontend)
 * Types para componentes de mídia guiada
 */

/**
 * Contextos de mídia guiada disponíveis
 */
export type MediaContext = 
  | 'los_detected'
  | 'payment_due'
  | 'installation_guide'
  | 'troubleshooting'
  | 'welcome'
  | 'survey';

/**
 * Asset de mídia (imagem, vídeo, PDF)
 */
export interface MediaAsset {
  url: string;
  type: 'image' | 'video' | 'pdf' | 'gif';
  title?: string;
  description?: string;
  thumbnail_url?: string;
  duration_seconds?: number; // Para vídeos
  file_size_bytes?: number;
}

/**
 * Mensagem guiada por mídia
 */
export interface GuidedMessage {
  id: string;
  conversation_id: string;
  media_asset: MediaAsset;
  media_context: MediaContext;
  sent_at: string;
  viewed_at?: string;
  feedback?: 'helpful' | 'not_helpful';
  feedback_at?: string;
}

/**
 * Metadata de mensagem com contexto de mídia
 */
export interface MessageMetadata {
  media_context?: MediaContext;
  media_url?: string;
  media_type?: MediaAsset['type'];
  customer_name?: string;
  customer_phone?: string;
  [key: string]: unknown; // Permite propriedades adicionais
}

/**
 * Feedback de mídia guiada
 */
export interface MediaFeedback {
  guided_message_id: string;
  helped: boolean;
  comment?: string;
  created_at: string;
}

/**
 * Estatísticas de mídia guiada
 */
export interface MediaGuidedStats {
  total_sent: number;
  total_viewed: number;
  helpful_count: number;
  not_helpful_count: number;
  view_rate: number;
  helpfulness_rate: number;
  by_context: Record<MediaContext, {
    sent: number;
    viewed: number;
    helpful: number;
  }>;
}
