// >>> PR9 v3: KPI Dashboard types
export interface KPIRow {
  ts: string;
  total_count: number;
  resolved_remote_count: number;
  tickets_count: number;
}

export interface KPIMetrics {
  total: number;
  remoteRate: number;
  tickets: number;
  timeSeries: Array<{
    date: string;
    total: number;
    resolved: number;
  }>;
}

// >>> PR10B
export type KPIRegionRow = {
  ts: string;
  cidade: string | null;
  bairro: string | null;
  total_count: number;
  tickets_count: number;
  rx_critico_count: number;
};

export type KPIRegionAgg = {
  key: string; // cidade|bairro
  cidade: string;
  bairro: string | null;
  totalCount: number;
  tickets: number;
  rxCrit: number;
};
// <<< PR10B
// <<< PR9 v3
