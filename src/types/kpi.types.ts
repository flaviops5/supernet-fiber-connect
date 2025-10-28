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
// <<< PR9 v3
