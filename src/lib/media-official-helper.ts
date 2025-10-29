// PR #24 — Helper para carregar mídias oficiais com cache e tipagem forte

import { supabase } from "@/integrations/supabase/client";
import type { OfficialMediaAsset, MediaAssetWithUrl } from "@/types/media.types";
import { STEP_MEDIA_MAP } from "@/types/media.types";

// Cache em memória (5 minutos)
const mediaCache = new Map<string, { asset: OfficialMediaAsset; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Busca mídia oficial por código com cache
 */
export async function getOfficialMedia(
  code: string
): Promise<MediaAssetWithUrl | null> {
  // Verificar cache
  const cached = mediaCache.get(code);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return buildMediaUrl(cached.asset);
  }

  try {
    const { data, error } = await supabase
      .from("official_media_assets")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      console.error(`[Media Helper] Erro ao buscar mídia ${code}:`, error);
      return null;
    }

    if (!data) {
      console.warn(`[Media Helper] Mídia não encontrada: ${code}`);
      return null;
    }

    // Atualizar cache
    mediaCache.set(code, { asset: data as OfficialMediaAsset, timestamp: Date.now() });

    return buildMediaUrl(data as OfficialMediaAsset);
  } catch (err) {
    console.error(`[Media Helper] Exceção ao buscar mídia ${code}:`, err);
    return null;
  }
}

/**
 * Mapeia step do fluxo para código de mídia
 */
export function mediaCodeForStep(step: string): string | null {
  return STEP_MEDIA_MAP[step] ?? null;
}

/**
 * Busca mídia por step (atalho)
 */
export async function getMediaForStep(
  step: string
): Promise<MediaAssetWithUrl | null> {
  const code = mediaCodeForStep(step);
  if (!code) return null;
  return getOfficialMedia(code);
}

/**
 * Constrói URL pública do storage
 */
function buildMediaUrl(asset: OfficialMediaAsset): MediaAssetWithUrl {
  const baseUrl = "https://mxdupkbpxjcfxdgrwknp.supabase.co/storage/v1/object/public";
  const url = `${baseUrl}/${asset.storage_path}`;
  
  return {
    ...asset,
    url
  };
}

/**
 * Pré-carrega mídias comuns (chamado no init da app)
 */
export async function preloadCommonMedia(): Promise<void> {
  const commonCodes = ['video_onu_power', 'video_fiber_connector', 'audio_reboot_router'];
  
  await Promise.allSettled(
    commonCodes.map(code => getOfficialMedia(code))
  );
}
