/**
 * Agent System Types
 * Tipos para sistema multiagente
 */

import type { JsonValue, JsonObject } from './error-types.ts';

// ============================================
// AGENT ROLES & CONVERSATION
// ============================================

export type AgentRole = 
  | 'routing-agent'
  | 'support-tech-agent'
  | 'support-financial-agent'
  | 'sales-agent'
  | 'telemedicina-agent'
  | 'automacao-agent';

export interface ConversationMetadata extends JsonObject {
  protocol?: string;
  status?: string;
  cpf_redacted?: string;
  source?: string;
  flow_state?: string;
  scenario?: string;
  cpf_retry_count?: number;
  clarification_attempts?: number;
  last_clarification_step?: string;
  last_step_key?: string;
  waiting_for_image?: boolean;
  [key: string]: JsonValue;
}

export interface ConversationMessage {
  id?: string;
  conversation_id: string;
  sender_type: 'customer' | 'agent' | 'system';
  sender_name?: string;
  content: string;
  created_at?: string;
  metadata?: JsonObject;
}

export interface Conversation {
  id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_cpf?: string;
  status: 'waiting' | 'active' | 'resolved' | 'closed';
  department?: string;
  protocol?: string;
  metadata?: ConversationMetadata;
  created_at: string;
  updated_at?: string;
}

// ============================================
// ATTACHMENT TYPES
// ============================================

export interface MessageAttachment {
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  mime_type?: string;
  size?: number;
  filename?: string;
}

// ============================================
// AGENT REQUEST/RESPONSE
// ============================================

export interface AgentRequest {
  conversation_id?: string;
  conversationId?: string;
  message?: string;
  message_content?: string;
  messages?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  customerData?: {
    cpf?: string;
    name?: string;
    ixc_client_id?: string;
    [key: string]: JsonValue;
  };
  attachments?: MessageAttachment[];
  routeReason?: string;
  [key: string]: JsonValue;
}

export interface AgentResponse {
  ok: boolean;
  protocol?: string;
  targetDepartment?: string;
  message?: string;
  needsCPF?: boolean;
  reboot_success?: boolean;
  error?: string;
  [key: string]: JsonValue;
}

// ============================================
// SIMULATION & FLOW
// ============================================

export interface FlowStep {
  step_key: string;
  question: string;
  approved?: boolean;
}

export interface SimulationData {
  subject: string;
  steps: FlowStep[];
  [key: string]: JsonValue;
}

export interface ApprovedMessage {
  step_key: string;
  question: string;
  subject?: string;
}

// ============================================
// REBOOT & DIAGNOSTIC
// ============================================

export interface RebootResult {
  ok: boolean;
  success?: boolean;
  is_online?: boolean;
  message?: string;
  duration_ms?: number;
  [key: string]: JsonValue;
}

export interface ONUSignal {
  tx_power?: number;
  rx_power?: number;
  distance?: number;
  status?: 'online' | 'offline';
  ont_id?: string;
  serial?: string;
  [key: string]: JsonValue;
}

// ============================================
// LOVABLE AI TYPES
// ============================================

export interface LovableAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LovableAIRequest {
  model: string;
  messages: LovableAIMessage[];
  temperature?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
}

export interface LovableAIResponse {
  id: string;
  choices: Array<{
    message: {
      content?: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
