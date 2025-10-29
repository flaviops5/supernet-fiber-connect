// PR #25 — Tipos para dados geográficos

export interface GeoRegion {
  id: string;
  cidade: string;
  bairro: string | null;
  lat: number;
  lng: number;
  created_at: string;
}

export interface RegionKPI {
  cidade: string;
  bairro: string | null;
  lat: number | null;
  lng: number | null;
  total_incidents: number;
  critical_rx: number;
  tickets: number;
  last_event: string;
}

export interface MapPoint {
  position: [number, number];
  label: string;
  incidents: number;
  criticalRx: number;
  tickets: number;
  lastEvent: Date;
  isCritical: boolean;
}
