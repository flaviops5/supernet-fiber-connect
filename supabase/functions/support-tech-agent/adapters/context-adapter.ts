/**
 * Context Adapter
 * 
 * Converte dados do formato inline (código monolítico) para o formato
 * esperado pelos cenários refatorados (módulos isolados).
 * 
 * Essa camada de adaptação permite rollout gradual feature-flagged
 * mantendo 100% de compatibilidade entre ambas as implementações.
 */

import type { ScenarioType } from "../types/scenario-context.ts";
import type { FlowState, MessageHistoryItem, MassOutageData } from "../types/database.types.ts";
import type { JsonObject } from "../../../_shared/error-types.ts";

/**
 * Dados disponíveis no formato inline (extraídos do handler principal)
 */
export interface InlineContextData {
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
  signal?: {
    tx?: number;
    rx?: number;
    serial?: string;
    onu_serial?: string;
  };
  
  // Mensagem do usuário
  message: string;
  normalizedMessage?: string;
  
  // Histórico de mensagens
  messageHistory: MessageHistoryItem[];
  
  // Detecção de intenção/humor
  detectedIntent?: string;
  detectedMood?: string;
  
  // Análise de imagens
  imageAnalysis?: string;
  
  // 🆕 RAG Context
  ragContext?: string;
  
  // Mass Outage
  massOutageActive?: boolean;
  massOutageData?: MassOutageData;
  
  // Metadata adicional
  metadata?: JsonObject;
}

/**
 * Adapta contexto inline para Cenário A
 * 
 * Interface esperada por handleScenarioA:
 * - conversation_id
 * - ixc_client_id
 * - customer_name
 * - current_message
 * - flow_state
 * - waiting_step
 * - signal_data
 * - message_history
 */
export interface ScenarioAContextData {
  conversation_id: string;
  ixc_client_id?: string;
  customer_name: string;
  current_message: string;
  flow_state: FlowState;
  waiting_step?: string;
  signal_data: {
    tx: number;
    rx: number;
    serial?: string;
  } | null;
  message_history: MessageHistoryItem[];
}

export function buildScenarioAContext(data: InlineContextData): ScenarioAContextData {
  return {
    conversation_id: data.conversation_id,
    ixc_client_id: data.ixc_client_id || data.flowState?.ixc_client_id,
    customer_name: data.customer_name,
    current_message: data.message,
    flow_state: data.flowState || {},
    waiting_step: data.flowState?.waiting_step,
    signal_data: data.signal ? {
      tx: Number(data.signal.tx) || 0,
      rx: Number(data.signal.rx) || 0,
      serial: data.signal.serial || data.signal.onu_serial
    } : null,
    message_history: data.messageHistory || []
  };
}

/**
 * Adapta contexto inline para Cenário B
 * 
 * Interface esperada por handleScenarioB:
 * - conversation_id
 * - ixc_client_id
 * - customer_name
 * - current_message
 * - flow_state
 * - signal_data
 * - message_history
 * - fast_path_eligible (calculado aqui)
 */
export interface ScenarioBContextData {
  conversation_id: string;
  ixc_client_id?: string;
  customer_name: string;
  current_message: string;
  flow_state: FlowState;
  signal_data: {
    tx: number;
    rx: number;
    serial?: string;
  } | null;
  message_history: MessageHistoryItem[];
  fast_path_eligible: boolean;
  waiting_step?: string;
  reboot_attempts: number;
}

export function buildScenarioBContext(data: InlineContextData): ScenarioBContextData {
  // Verificar elegibilidade para Fast-Path
  const isFirstDetection = !data.flowState?.scenario_started;
  const noRebootYet = !data.flowState?.reboot_attempts || data.flowState.reboot_attempts === 0;
  const hasIxcId = !!data.ixc_client_id;
  
  const fast_path_eligible = isFirstDetection && noRebootYet && hasIxcId;

  return {
    conversation_id: data.conversation_id,
    ixc_client_id: data.ixc_client_id || data.flowState?.ixc_client_id,
    customer_name: data.customer_name,
    current_message: data.message,
    flow_state: data.flowState || {},
    signal_data: data.signal ? {
      tx: Number(data.signal.tx) || 0,
      rx: Number(data.signal.rx) || 0,
      serial: data.signal.serial || data.signal.onu_serial
    } : null,
    message_history: data.messageHistory || [],
    fast_path_eligible,
    waiting_step: data.flowState?.waiting_step,
    reboot_attempts: data.flowState?.reboot_attempts || 0
  };
}

/**
 * Adapta contexto inline para Cenário C
 * 
 * Interface esperada por handleScenarioC:
 * - conversationId (camelCase!)
 * - ixcClientId (camelCase!)
 * - customerName (camelCase!)
 * - currentMessage (camelCase!)
 * - flowState
 * - signalData (camelCase!)
 * - messageHistory (camelCase!)
 */
export function buildScenarioCContext(data: InlineContextData): any {
  return {
    conversationId: data.conversation_id,
    ixcClientId: data.ixc_client_id || data.flowState?.ixc_client_id,
    customerName: data.customer_name,
    currentMessage: data.message,
    flowState: data.flowState || {},
    signalData: data.signal ? {
      tx: Number(data.signal.tx) || 0,
      rx: Number(data.signal.rx) || 0,
      serial: data.signal.serial || data.signal.onu_serial
    } : null,
    messageHistory: data.messageHistory || [],
    waitingStep: data.flowState?.waiting_step
  };
}

/**
 * Adapta contexto inline para Cenário D
 * 
 * Interface esperada por handleScenarioD:
 * - conversationId (camelCase!)
 * - ixcClientId (camelCase!)
 * - customerName (camelCase!)
 * - currentMessage (camelCase!)
 * - flowState
 * - signalData (camelCase!)
 * - messageHistory (camelCase!)
 */
export function buildScenarioDContext(data: InlineContextData): any {
  return {
    conversationId: data.conversation_id,
    ixcClientId: data.ixc_client_id || data.flowState?.ixc_client_id,
    customerName: data.customer_name,
    currentMessage: data.message,
    flowState: data.flowState || {},
    signalData: data.signal ? {
      tx: Number(data.signal.tx) || 0,
      rx: Number(data.signal.rx) || 0,
      serial: data.signal.serial || data.signal.onu_serial,
      status: 'critical' // Cenário D sempre é crítico
    } : null,
    messageHistory: data.messageHistory || [],
    waitingStep: data.flowState?.waiting_step
  };
}

/**
 * Adapta contexto inline para Cenário E
 * 
 * Interface esperada por handleScenarioE:
 * - conversationId (camelCase!)
 * - ixcClientId (camelCase!)
 * - customerName (camelCase!)
 * - currentMessage (camelCase!)
 * - flowState
 * - signalData (camelCase!)
 * - messageHistory (camelCase!)
 */
export function buildScenarioEContext(data: InlineContextData): any {
  return {
    conversationId: data.conversation_id,
    ixcClientId: data.ixc_client_id || data.flowState?.ixc_client_id,
    customerName: data.customer_name,
    currentMessage: data.message,
    flowState: data.flowState || {},
    signalData: data.signal ? {
      tx: Number(data.signal.tx) || 0,
      rx: Number(data.signal.rx) || 0,
      serial: data.signal.serial || data.signal.onu_serial,
      status: 'good' // Cenário E: sinal OK mas problema de rede
    } : null,
    messageHistory: data.messageHistory || [],
    waitingStep: data.flowState?.waiting_step,
    wanIssue: data.flowState?.wan_issue || false,
    wifiIssue: data.flowState?.wifi_issue || false
  };
}

/**
 * Função principal: roteamento automático baseado no cenário
 * 
 * @param scenario - Cenário detectado (A, B, C, D, E)
 * @param data - Dados do contexto inline
 * @returns Contexto adaptado para o cenário específico
 */
export function buildScenarioContext(
  scenario: ScenarioType,
  data: InlineContextData
): any {
  if (!scenario) {
    throw new Error("Scenario type is required for context adaptation");
  }

  switch (scenario) {
    case 'A':
      return buildScenarioAContext(data);
    
    case 'B':
      return buildScenarioBContext(data);
    
    case 'C':
      return buildScenarioCContext(data);
    
    case 'D':
      return buildScenarioDContext(data);
    
    case 'E':
      return buildScenarioEContext(data);
    
    default:
      throw new Error(`Unknown scenario type: ${scenario}`);
  }
}

/**
 * Adapta resultado dos cenários refatorados para formato inline
 * 
 * Isso permite que o código inline processe o resultado de forma transparente
 */
export interface AdaptedResult {
  message: string;
  shouldInsertMessage: boolean;
  flowUpdates?: Record<string, any>;
  shouldEscalate?: boolean;
  resolved?: boolean;
  ticketCreated?: boolean;
  ticketId?: string;
}

export function adaptScenarioResult(
  scenario: ScenarioType,
  result: any
): AdaptedResult {
  // Cenário A usa nomenclatura diferente
  if (scenario === 'A' || scenario === 'B') {
    return {
      message: result.message,
      shouldInsertMessage: result.should_insert !== false,
      flowUpdates: result.flow_updates,
      shouldEscalate: result.escalate || false,
      resolved: result.resolved || false,
      ticketCreated: result.flow_updates?.ticket_created || false,
      ticketId: result.flow_updates?.ixc_ticket_id
    };
  }
  
  // Cenários C, D, E usam nomenclatura mais próxima
  return {
    message: result.message,
    shouldInsertMessage: result.shouldInsert !== false,
    flowUpdates: result.flowUpdates,
    shouldEscalate: result.shouldEscalate || false,
    resolved: result.resolved || false,
    ticketCreated: result.ticketCreated || false,
    ticketId: result.ticketId
  };
}

/**
 * Valida se o contexto inline tem dados suficientes para o cenário
 * 
 * @returns { valid: boolean, missing: string[] }
 */
export function validateInlineContext(
  scenario: ScenarioType,
  data: InlineContextData
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  // Validações comuns a todos os cenários
  if (!data.conversation_id) missing.push('conversation_id');
  if (!data.customer_name) missing.push('customer_name');
  if (!data.message) missing.push('message');

  // Validações específicas por cenário
  switch (scenario) {
    case 'A':
    case 'D':
      // Cenários críticos: precisam de sinal
      if (!data.signal) missing.push('signal');
      break;
    
    case 'B':
    case 'C':
      // Cenários de diagnóstico: precisam de ixc_client_id
      if (!data.ixc_client_id && !data.flowState?.ixc_client_id) {
        missing.push('ixc_client_id');
      }
      break;
    
    case 'E':
      // Cenário E: flexível, pode ter ou não ixc_client_id
      break;
  }

  return {
    valid: missing.length === 0,
    missing
  };
}
