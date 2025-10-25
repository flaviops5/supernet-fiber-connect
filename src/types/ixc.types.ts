/**
 * IXC Integration Types
 * Contratos globais para integração com IXC Soft
 */

export interface IXCCustomer {
  id: string;
  razao: string;
  cnpj_cpf: string;
  email?: string;
  celular?: string;
  telefone?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  status?: string;
  bloqueado?: 'S' | 'N';
}

export interface IXCContract {
  id: string;
  id_cliente: string;
  status: string;
  valor: number;
  plano?: string;
  velocidade?: string;
}

export interface IXCRadusuario {
  id: string;
  login: string;
  status: 'online' | 'offline';
  ultimo_online?: string;
  ip?: string;
  mac?: string;
  signal_db?: number | null;
  ont_serial?: string;
  config_mismatch?: boolean;
}

export interface IXCONUSignal {
  ont_id: string;
  serial: string;
  rx_power?: number;
  tx_power?: number;
  distance?: number;
  status: 'online' | 'offline';
  last_seen?: string;
}

export interface IXCTicket {
  id: string;
  id_cliente: string;
  assunto: string;
  descricao: string;
  status: 'aberto' | 'em_andamento' | 'fechado';
  prioridade: 'baixa' | 'media' | 'alta';
  created_at: string;
  updated_at: string;
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
  duration_ms?: number;
}
