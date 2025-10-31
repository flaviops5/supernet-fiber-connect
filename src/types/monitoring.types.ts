/**
 * Monitoring & Analytics Types
 * MISSÃO 1.1: TypeScript Zero-Any (Frontend)
 * Types para componentes de monitoramento
 */

/**
 * Análise de escape de contexto (quando IA sai do fluxo)
 */
export interface ContextEscapeAnalysis {
  id: string;
  conversation_id: string;
  agent_name: string;
  expected_context: string;
  actual_context: string;
  step_number: number;
  detected_at: string;
  severity: 'low' | 'medium' | 'high';
  auto_recovered: boolean;
}

/**
 * Step que mais causa escape de contexto
 */
export interface TopEscapeStep {
  step_name: string;
  escape_count: number;
  total_executions: number;
  escape_rate: number;
  last_occurrence: string;
}

/**
 * Métricas de contexto por agente
 */
export interface AgentContextMetrics {
  agent_name: string;
  total_escapes: number;
  auto_recovery_rate: number;
  avg_steps_to_recovery: number;
  most_problematic_step: string;
}

/**
 * Sistema de alerta genérico
 */
export interface SystemAlert {
  id: string;
  alert_type: 'error' | 'warning' | 'info';
  source: string;
  message: string;
  metadata: Record<string, unknown>; // JSON dinâmico do Supabase
  created_at: string;
  resolved_at?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Fast Path Dashboard Stats
 */
export interface FastPathStats {
  total_diagnoses: number;
  parallel_diagnoses: number;
  avg_duration_ms: number;
  success_rate: number;
  date: string;
}

/**
 * Fast Path Record (diagnóstico individual)
 */
export interface FastPathRecord {
  id: string;
  customer_id: string;
  diagnosis_type: 'signal' | 'connectivity' | 'full';
  duration_ms: number;
  success: boolean;
  parallel: boolean;
  created_at: string;
}

/**
 * Métricas por agente do sistema
 */
export interface AgentMetrics {
  success_rate: number;
  avg_response_time_ms: number;
  total_interactions: number;
  active_conversations: number;
  context_escapes: number;
}

/**
 * Métricas agregadas do sistema
 */
export interface SystemMetrics {
  by_agent: Record<string, AgentMetrics>;
  global: {
    uptime_hours: number;
    total_conversations: number;
    avg_satisfaction_score: number;
    alerts_pending: number;
  };
}
