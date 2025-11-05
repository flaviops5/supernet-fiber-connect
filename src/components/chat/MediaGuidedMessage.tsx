// PR #24 — Renderização de mídia oficial com loading/error states

import { useEffect, useState } from "react";
import { getMediaForStep } from "@/lib/media-official-helper";
import { Loader2, AlertCircle, Play, Volume2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface MediaAssetWithUrl {
  kind: 'video' | 'audio';
  url: string;
  description?: string;
  duration_seconds?: number;
}

interface MediaGuidedMessageProps {
  step: string;
}

export function MediaGuidedMessage({ step }: MediaGuidedMessageProps) {
  const [asset, setAsset] = useState<MediaAssetWithUrl | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadMedia() {
      try {
        setLoading(true);
        setError(null);
        
        const media = await getMediaForStep(step);
        
        if (!mounted) return;
        
        if (!media) {
          // Não é erro - apenas não há mídia para este step
          setLoading(false);
          return;
        }
        
        setAsset(media);
      } catch (err) {
        if (!mounted) return;
        console.error("[MediaGuidedMessage] Erro ao carregar mídia:", err);
        setError("Não foi possível carregar o tutorial");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadMedia();

    return () => {
      mounted = false;
    };
  }, [step]);

  // Loading state
  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Carregando tutorial...</span>
        </div>
        <Skeleton className="h-48 w-full rounded-md" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className="animate-in fade-in-50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Sem mídia disponível (não é erro)
  if (!asset) return null;

  // Renderização por tipo
  if (asset.kind === "video") {
    return (
      <div className="rounded-lg border bg-card overflow-hidden animate-in fade-in-50 slide-in-from-bottom-4">
        <video
          src={asset.url}
          controls
          playsInline
          preload="metadata"
          className="w-full bg-black"
          onError={() => setError("Erro ao carregar vídeo")}
        >
          <track kind="captions" />
        </video>
        {asset.description && (
          <div className="p-3 border-t bg-muted/50">
            <div className="flex items-start gap-2">
              <Play className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {asset.description}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (asset.kind === "audio") {
    return (
      <div className="rounded-lg border bg-card p-4 animate-in fade-in-50 slide-in-from-bottom-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Volume2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Tutorial em Áudio</p>
            {asset.duration_seconds && (
              <p className="text-xs text-muted-foreground">
                {asset.duration_seconds}s
              </p>
            )}
          </div>
        </div>
        <audio
          src={asset.url}
          controls
          preload="metadata"
          className="w-full"
          onError={() => setError("Erro ao carregar áudio")}
        >
          <track kind="captions" />
        </audio>
        {asset.description && (
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            {asset.description}
          </p>
        )}
      </div>
    );
  }

  return null;
}
