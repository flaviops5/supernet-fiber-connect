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
    cliente_full?: unknown;
    radusuario?: {
      status: 'online' | 'offline';
      last_online_minutes?: number;
      signal_db?: number | null;
      ont_serial?: string;
      config_mismatch?: boolean;
    };
    contracts?: unknown[];
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
  action_payload: unknown;
  ixcticket_id?: string;
  result?: unknown;
}

export interface IXCProxyRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  query?: string;
  body?: unknown;
}

export interface IXCProxyResponse {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
}

// ============================================
// ERROR TYPES (re-exported from error-types.ts)
// ============================================

export type { IXCError, EdgeFunctionError, APIError } from './error-types.ts';

// ============================================
// IXC ENTITY TYPES
// ============================================

export interface IXCCustomer {
  id: string;
  razao: string;
  nome_fantasia?: string;
  cnpj_cpf: string;
  email?: string;
  telefone_comercial?: string;
  telefone_celular?: string;
  fone_celular?: string;
  whatsapp?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  bloqueado?: string;
  bloqueado_financeiro?: string;
  status?: string;
  ativo?: string;
  acesso_automatico_central?: string;
  hotsite_acesso?: string;
  status_prospeccao?: string;
  ultima_atualizacao?: string;
  participa_cobranca?: string;
  cob_envia_email?: string;
  tipo_assinante?: string;
  [key: string]: unknown; // Para campos dinâmicos do IXC
}

export interface RadiusUser {
  id: string;
  id_cliente: string;
  login: string;
  online: string; // 'S', 'SS', 'N'
  framedipaddress?: string;
  ip?: string;
  acctstarttime?: string;
  acctinputoctets?: string;
  acctoutputoctets?: string;
  acctsessiontime?: string;
  upload_atual?: string;
  download_atual?: string;
  tempo_conexao?: string;
}

export interface ClientStatus {
  id: string;
  razao: string;
  bloqueado: string;
  bloqueado_financeiro: string;
}
