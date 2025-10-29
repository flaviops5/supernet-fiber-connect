// PR #19 — Types (M3 ✅)

export interface AgingEvent {
  id: string;
  conversation_id: string;
  fluxo: string;
  step: string;
  meta: Record<string, unknown>; // Sprint 10: unknown is safer than any for metadata
  created_at: string;
}

export interface OnuTrackingEvent {
  id: string;
  conversation_id?: string;
  ixc_client_id?: string;
  onu_serial?: string;
  rx_dbm?: number;
  tx_dbm?: number;
  status: 'ok' | 'weak' | 'critical' | 'unknown';
  source: 'signal_tool' | 'manual';
  created_at: string;
}

export interface SupportRetest {
  id: string;
  conversation_id?: string;
  ixc_client_id?: string;
  step: 'post_reboot' | 'post_optical' | 'post_route';
  before_ok?: boolean;
  after_ok?: boolean;
  latency_ms_before?: number;
  latency_ms_after?: number;
  created_at: string;
}

export interface AgingSummary {
  conversations: number;
  p50_seconds: number;
  p90_seconds: number;
}

export interface OnuInstability {
  ixc_client_id: string;
  events_weak_critical: number;
  last_serial: string;
}

export interface RetestEffectiveness {
  step: string;
  total: number;
  ok_after: number;
  success_rate_pct: number;
}
