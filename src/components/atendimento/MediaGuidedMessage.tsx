/**
 * MediaGuidedMessage - PR #6
 * Componente para exibir mensagens com mídia guiada
 * 
 * Features:
 * - Mídia sempre ANTES do texto
 * - Fallback automático se mídia falhar
 * - Logging de uso e feedback
 * - Suporte a imagem, vídeo e áudio
 */

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { 
  MediaAsset,
  MediaContext,
  logMediaUsage, 
  recordMediaFeedback,
  checkMediaAvailability 
} from "@/lib/media-helper";
import { logger } from "@/lib/logger";

interface MediaGuidedMessageProps {
  mediaAsset: MediaAsset;
  text: string;
  conversationId: string;
  agentName: string;
  mediaContext: MediaContext;
  showFeedback?: boolean;
}

export function MediaGuidedMessage({
  mediaAsset,
  text,
  conversationId,
  agentName,
  mediaContext,
  showFeedback = true
}: MediaGuidedMessageProps) {
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  useEffect(() => {
    // Verifica disponibilidade da mídia
    checkMediaAvailability(mediaAsset.url).then(available => {
      if (available) {
        setMediaLoaded(true);
        logMediaUsage({
          conversation_id: conversationId,
          agent_name: agentName,
          media_type: mediaAsset.type,
          media_context: mediaContext,
          media_url: mediaAsset.url,
          displayed_successfully: true
        });
      } else {
        setMediaError(true);
        logger.warn('Media not available, using fallback', { 
          url: mediaAsset.url 
        });
        logMediaUsage({
          conversation_id: conversationId,
          agent_name: agentName,
          media_type: mediaAsset.type,
          media_context: mediaContext,
          media_url: mediaAsset.url,
          displayed_successfully: false
        });
      }
    });
  }, [mediaAsset.url, conversationId, agentName, mediaAsset.type, mediaContext]);

  const handleFeedback = async (helped: boolean) => {
    await recordMediaFeedback(conversationId, mediaContext, helped);
    setFeedbackGiven(true);
  };

  const renderMedia = () => {
    if (mediaError) {
      return (
        <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          {mediaAsset.fallbackText}
        </div>
      );
    }

    switch (mediaAsset.type) {
      case 'image':
        return (
          <img
            src={mediaAsset.url}
            alt={mediaAsset.alt || 'Imagem de suporte'}
            className="w-full rounded-lg"
            onError={() => setMediaError(true)}
            onLoad={() => setMediaLoaded(true)}
          />
        );
      
      case 'video':
        return (
          <video
            src={mediaAsset.url}
            controls
            className="w-full rounded-lg"
            onError={() => setMediaError(true)}
            onLoadedData={() => setMediaLoaded(true)}
          >
            Seu navegador não suporta vídeo.
          </video>
        );
      
      case 'audio':
        return (
          <audio
            src={mediaAsset.url}
            controls
            className="w-full"
            onError={() => setMediaError(true)}
            onLoadedData={() => setMediaLoaded(true)}
          >
            Seu navegador não suporta áudio.
          </audio>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card className="p-4 space-y-4">
      {/* Mídia SEMPRE antes do texto (PR #6 requirement) */}
      <div className="media-container">
        {renderMedia()}
      </div>

      {/* Texto após a mídia */}
      <div className="text-content">
        <p className="text-sm whitespace-pre-wrap">{text}</p>
      </div>

      {/* Feedback: A mídia ajudou? */}
      {showFeedback && mediaLoaded && !feedbackGiven && (
        <div className="feedback-section border-t pt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Esta explicação com imagem/vídeo foi útil?
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleFeedback(true)}
              className="flex items-center gap-1"
            >
              <ThumbsUp className="h-3 w-3" />
              Sim, ajudou
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleFeedback(false)}
              className="flex items-center gap-1"
            >
              <ThumbsDown className="h-3 w-3" />
              Não ajudou
            </Button>
          </div>
        </div>
      )}

      {feedbackGiven && (
        <p className="text-xs text-muted-foreground">
          ✅ Obrigado pelo seu feedback!
        </p>
      )}
    </Card>
  );
}
