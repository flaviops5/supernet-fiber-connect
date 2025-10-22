/**
 * AI Agent Types
 * Contratos para sistema multiagente
 */

export type AgentRole = 
  | 'routing-agent'
  | 'support-tech-agent'
  | 'support-financial-agent'
  | 'sales-agent'
  | 'telemedicina-agent'
  | 'automacao-agent';

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ConversationContext {
  conversation_id: string;
  customer_cpf?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  protocol?: string;
  initial_message: string;
  attempts_for_cpf?: number;
  timestamp: string;
}

export interface RoutingPayload {
  conversation_id: string;
  client: {
    cpf: string;
    name: string;
    email?: string;
    phone?: string;
    contract_id?: number;
    pppoe_login?: string;
    address?: {
      cep?: string;
      city?: string;
      region?: string;
    };
  };
  ixc?: {
    cliente_full?: any;
    radusuario?: {
      status: 'online' | 'offline';
      last_online_minutes?: number;
      signal_db?: number | null;
      ont_serial?: string;
      config_mismatch?: boolean;
    };
    contracts?: any[];
  };
  supabase?: {
    mass_outage_checked: boolean;
    mass_outage_match: boolean;
    mass_outage_event_id?: string | null;
  };
  context: ConversationContext;
  next_action?: AgentRole;
  routeReason?: string;
}

export interface AgentToolCall {
  tool_name: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
}

export interface AgentResponse {
  success: boolean;
  message: string;
  agent: AgentRole;
  metadata?: Record<string, any>;
  tool_calls?: AgentToolCall[];
}

export interface DiagnosticoResult {
  status: 'online' | 'offline' | 'instavel' | 'desconhecido';
  signal_quality?: 'excelente' | 'bom' | 'regular' | 'ruim';
  tx_power?: number;
  rx_power?: number;
  issues?: string[];
  recommendations?: string[];
  mass_outage?: boolean;
}
