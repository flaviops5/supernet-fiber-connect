/**
 * KPI Support Dashboard Types
 * MISSÃO 1.1: TypeScript Zero-Any (Frontend)
 * Substitui `any` types por interfaces específicas
 */

/**
 * Cluster de clientes offline detectado automaticamente
 */
export interface KPICluster {
  cluster_id: string;
  cidade: string;
  bairro: string;
  count: number;
  status: 'open' | 'investigating' | 'resolved';
  created_at: string;
  updated_at?: string;
}

/**
 * Loop de contexto detectado (cliente repete mesma questão)
 */
export interface KPILoop {
  loop_id: string;
  customer_id: string;
  customer_name: string;
  repeated_context: string;
  repetitions: number;
  first_occurrence: string;
  last_occurrence: string;
  status: 'active' | 'resolved';
}

/**
 * Evento de perda de energia (power loss) detectado
 */
export interface PowerLossEvent {
  event_id: string;
  customer_id: string;
  customer_name: string;
  cidade: string;
  bairro: string;
  detected_at: string;
  resolved_at?: string;
  status: 'detected' | 'confirmed' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Ranking de ONUs com problemas
 */
export interface OnuRanking {
  ixc_client_id: string;
  customer_name: string;
  onu_model: string;
  issue_count: number;
  last_issue: string;
  status: 'active' | 'monitoring' | 'resolved';
}

/**
 * Reteste de diagnóstico
 */
export interface RetestData {
  step: string;
  total: number;
  success_rate: number;
  avg_duration_ms: number;
  last_retest: string;
}

/**
 * Métricas agregadas do dashboard KPI
 */
export interface KPIDashboardMetrics {
  clusters: KPICluster[];
  loops: KPILoop[];
  powerLoss: PowerLossEvent[];
  onuRanking: OnuRanking[];
  retests: RetestData[];
  totals: {
    active_clusters: number;
    active_loops: number;
    power_loss_events: number;
    problematic_onus: number;
  };
}
