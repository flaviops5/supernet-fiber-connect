/**
 * Scenario Context & Result Types
 * 
 * Interfaces unificadas para todos os cenários (A, B, C, D, E)
 * Garantem compatibilidade e facilitam testes isolados
 */

export interface SignalData {
  tx: number;
  rx: number;
  serial?: string;
  onu_serial?: string;
  status?: string;
}

export interface FlowState {
  waiting_step?: string;
  scenario_started?: string;
  scenario_completed?: string;
  ixc_client_id?: string;
  hybrid_mode_active?: boolean;
  timeout_attempts?: number;
  last_timeout_at?: string;
  clarification_attempts?: number;
  last_clarification_step?: string;
  reboot_attempts?: number;
  fast_path_enabled?: boolean;
  last_agent_question?: string;
  ticket_created?: boolean;
  ixc_ticket_id?: string;
  resolved?: boolean;
  needs_human?: boolean;
  continue?: string;
  geo?: {
    cidade?: string;
    bairro?: string;
    source?: string;
  };
  // Flexível para campos dinâmicos (usar JsonValue do error-types.ts)
  [key: string]: string | number | boolean | null | undefined | Record<string, unknown> | unknown[];
}

export interface MessageHistoryItem {
  sender_type: 'user' | 'agent';
  sender_name?: string;
  content: string;
  created_at?: string;
}

/**
 * Contexto completo passado para cada handler de cenário
 */
export interface ScenarioContext {
  // Identificadores
  conversation_id: string;
  customer_name: string;
  customer_cpf?: string;
  customer_phone?: string;
  customer_email?: string;
  
  // Cliente IXC
  ixc_client_id?: string;
  
  // Estado do fluxo
  flowState: FlowState;
  
  // Sinal óptico
  signal?: SignalData;
  
  // Mensagem do usuário
  message: string;
  normalizedMessage: string;
  
  // Histórico de mensagens
  messageHistory: MessageHistoryItem[];
  
  // Detecção de intenção/humor
  detectedIntent?: string;
  detectedMood?: string;
  
  // Análise de imagens (se houver)
  imageAnalysis?: string;
  
  // Mass Outage context
  massOutageActive?: boolean;
  massOutageData?: {
    event_id?: string;
    affected_region?: string;
    estimated_resolution?: string;
  };
  
  // Metadados adicionais
  metadata?: Record<string, any>;
}

/**
 * Resultado retornado por cada handler de cenário
 */
export interface ScenarioResult {
  // Mensagem principal a ser enviada ao cliente
  message: string;
  
  // Controle de inserção no banco
  shouldInsertMessage: boolean;
  
  // Atualizações do flow_state
  flowUpdates?: Partial<FlowState>;
  
  // Flags de ação
  shouldEscalate?: boolean;
  shouldTransfer?: boolean;
  shouldClose?: boolean;
  resolved?: boolean;
  
  // Ticket IXC
  ticketCreated?: boolean;
  ticketId?: string;
  ticketPriority?: 'baixa' | 'media' | 'alta' | 'urgente';
  
  // Contexto adicional (ex: media_context para MediaGuided)
  mediaContext?: string;
  
  // Transferência
  transferDepartment?: string;
  transferReason?: string;
  
  // KPIs e métricas
  kpiData?: {
    action: string;
    scenario_completed?: string;
    resolved?: boolean;
    escalated?: boolean;
    ticket_id?: string;
    [key: string]: any;
  };
  
  // Logs adicionais
  auditLogs?: Array<{
    action: string;
    details: Record<string, any>;
  }>;
  
  // Metadados extras
  extras?: Record<string, any>;
}

/**
 * Type para handlers de cenário
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Logger } from './logger.types.ts';

export type ScenarioHandler = (
  context: ScenarioContext,
  supabase: SupabaseClient,
  logger: Logger
) => Promise<ScenarioResult>;

/**
 * Tipos de cenário suportados
 */
export type ScenarioType = 'A' | 'B' | 'C' | 'D' | 'E' | null;

/**
 * Resultado da detecção de cenário
 */
export interface ScenarioDetectionResult {
  scenario: ScenarioType;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  priority: number; // 1 = maior prioridade
  signalData?: {
    tx: number;
    rx: number;
  };
  shouldStartImmediately?: boolean;
}

/**
 * Configuração de cenário (para feature flags e rollout)
 */
export interface ScenarioConfig {
  enabled: boolean;
  useLegacyCode: boolean; // Se true, usa código inline ao invés do módulo refatorado
  rolloutPercentage: number; // 0-100
  priority: number;
}
