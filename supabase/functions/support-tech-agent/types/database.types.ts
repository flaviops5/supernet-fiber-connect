/**
 * Database Types
 * Interfaces para dados do banco de dados
 */

import type { JsonValue, JsonObject } from '../../../_shared/error-types.ts';

export interface ConversationMetadata extends JsonObject {
  protocol?: string;
  status?: string;
  cpf_redacted?: string;
  source?: string;
  flow_state?: FlowState;
  scenario?: string;
  cpf_retry_count?: number;
  clarification_attempts?: number;
  last_clarification_step?: string;
  last_step_key?: string;
  waiting_for_image?: boolean;
  ixc_client_id?: string;
  [key: string]: JsonValue;
}

export interface FlowState extends JsonObject {
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
  [key: string]: JsonValue;
}

export interface MessageHistoryItem {
  sender_type: 'user' | 'agent' | 'customer' | 'system';
  sender_name?: string;
  content: string;
  created_at?: string;
  metadata?: JsonObject;
}

export interface MassOutageData {
  event_id?: string;
  affected_region?: string;
  estimated_resolution?: string;
  [key: string]: JsonValue;
}

export interface BoardMembership {
  board_id: string;
  user_id: string;
  role?: string;
  created_at?: string;
}

export interface KanbanBoard {
  id: string;
  title: string;
  created_at: string;
  created_by?: string;
  metadata?: JsonObject;
}

export interface CalendarEvent {
  id: string;
  title: string;
  municipio?: string;
  data_instalacao: string;
  status: string;
  [key: string]: JsonValue;
}
