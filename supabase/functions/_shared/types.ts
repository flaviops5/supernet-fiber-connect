// ============================================
// TIPOS PADRONIZADOS - RoutingPayload
// ============================================

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
  context: {
    initial_message: string;
    attempts_for_cpf?: number;
    timestamp: string;
  };
  next_action?: 'support-tech-agent' | 'support-financial-agent' | 'sales-agent';
  routeReason?: string;
}

export interface ActionLogEntry {
  agent_name: string;
  client_cpf?: string;
  action_type: string;
  action_payload: any;
  ixcticket_id?: string;
  result?: any;
}

export interface IXCProxyRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  query?: string;
  body?: any;
}

export interface IXCProxyResponse {
  ok: boolean;
  status: number;
  data?: any;
  error?: string;
}
