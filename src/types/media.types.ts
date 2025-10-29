// PR #24 — Tipos para mídias oficiais

export type MediaKind = 'video' | 'audio' | 'image';

export interface OfficialMediaAsset {
  id: string;
  kind: MediaKind;
  code: string;
  storage_path: string;
  duration_seconds: number | null;
  locale: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaAssetWithUrl extends OfficialMediaAsset {
  url: string;
}

export const STEP_MEDIA_MAP: Record<string, string> = {
  'scenario_a_check_power': 'video_onu_power',
  'scenario_a_verify_red_light': 'video_onu_power',
  'scenario_a_reconnect_fiber': 'video_fiber_connector',
  'scenario_c_reconnect_fiber': 'video_fiber_connector',
  'scenario_b_power_cycle_request': 'audio_reboot_router',
  'scenario_b_reboot_router': 'audio_reboot_router'
} as const;
