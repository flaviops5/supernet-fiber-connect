/**
 * IXC API Types
 * Tipos específicos para integração com IXC Soft
 */

import type { JsonValue, JsonObject } from './error-types.ts';

// ============================================
// IXC API REQUEST/RESPONSE
// ============================================

export interface IXCApiParams {
  ixcsoft?: string;
  qtype?: string;
  query?: string;
  oper?: string;
  page?: string;
  rp?: string;
  sortname?: string;
  sortorder?: string;
  grid_param?: string;
  [key: string]: string | undefined;
}

export interface IXCApiResponse<T = JsonValue> {
  ok: boolean;
  status: number;
  data: T;
  rawText?: string;
  ixcsoft?: string;
}

export interface IXCError extends Error {
  details?: JsonObject;
}

// ============================================
// IXC ENTITIES
// ============================================

export interface IXCCliente {
  id: string;
  razao: string;
  nome_fantasia?: string;
  fantasia?: string;
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
  status?: string;
  ativo?: string;
  bloqueado?: string;
  bloqueado_financeiro?: string;
  bloqueado_admin?: string;
  reducao?: string;
  [key: string]: JsonValue;
}

export interface IXCContrato {
  id: string;
  id_cliente: string;
  status: string;
  status_internet?: string;
  valor: number | string;
  plano?: string;
  velocidade?: string;
  data_contrato?: string;
  data_ativacao?: string;
  [key: string]: JsonValue;
}

export interface IXCRadusuario {
  id: string;
  id_cliente?: string;
  login: string;
  online: 'S' | 'N' | 'SS';
  framedipaddress?: string;
  ip?: string;
  acctstarttime?: string;
  acctinputoctets?: string;
  acctoutputoctets?: string;
  acctsessiontime?: string | number;
  upload_atual?: string;
  download_atual?: string;
  tempo_conexao?: string;
  mac?: string;
  signal_db?: number | null;
  ont_serial?: string;
  ultimo_online?: string;
  [key: string]: JsonValue;
}

export interface IXCTitulo {
  id: string;
  id_cliente: string;
  valor: number | string;
  data_vencimento: string;
  data_pagamento?: string;
  status: string;
  nosso_numero?: string;
  descricao?: string;
  [key: string]: JsonValue;
}

export interface IXCAtendimento {
  id: string;
  id_cliente: string;
  id_assunto?: string;
  assunto: string;
  descricao: string;
  status: 'aberto' | 'em_andamento' | 'fechado';
  prioridade?: 'baixa' | 'media' | 'alta';
  data_abertura: string;
  data_fechamento?: string;
  [key: string]: JsonValue;
}

// ============================================
// IXC COMPOSITE RESPONSES
// ============================================

export interface IXCCustomerStatus {
  id: string;
  nome: string;
  razao: string;
  status: string;
  bloqueado?: boolean;
  isOnline: boolean;
  pppoeLogin?: string;
  lastConnection?: string;
  contracts?: IXCContrato[];
  radusuarios?: IXCRadusuario[];
  activeContracts?: IXCContrato[];
  blockedContracts?: IXCContrato[];
  [key: string]: JsonValue;
}

export interface IXCListResponse<T = JsonValue> {
  type?: string;
  page?: number;
  total?: number;
  registros?: T[] | Record<string, T>;
  data?: T[] | T;
}

// ============================================
// IXC ACTION PAYLOADS
// ============================================

export interface IXCCustomerCreateData {
  razao: string;
  cnpj_cpf: string;
  email: string;
  celular: string;
  telefone?: string;
  endereco: string;
  numero?: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  data_nascimento?: string;
  id_cidade?: string;
  [key: string]: JsonValue;
}

export interface IXCAtendimentoCreateData {
  id_cliente: string;
  id_assunto: string;
  assunto: string;
  descricao: string;
  prioridade?: 'baixa' | 'media' | 'alta';
  status?: 'aberto';
  [key: string]: JsonValue;
}

export interface IXCContractCreateData {
  id_cliente: string;
  id_plano: string;
  valor: number;
  data_contrato?: string;
  data_ativacao?: string;
  [key: string]: JsonValue;
}

// ============================================
// IXC SEARCH OPTIONS
// ============================================

export interface IXCSearchOptions {
  mode?: 'cpf' | 'phone' | 'name';
  limit?: number;
  page?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
}
