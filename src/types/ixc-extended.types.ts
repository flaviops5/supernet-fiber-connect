/**
 * IXC Extended Types
 * Tipos estendidos para integração IXC
 */

import type { JsonObject } from './common.types';

export interface IXCApiParams {
  ixcsoft?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface IXCSearchOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  fields?: string[];
}

export interface IXCTitulo {
  id: string;
  id_cliente: string;
  valor: string | number;
  data_vencimento: string;
  data_pagamento?: string;
  status: string;
  nosso_numero?: string;
  descricao?: string;
}

export interface IXCContrato {
  id: string;
  id_cliente: string;
  status: string;
  valor: number;
  plano?: string;
  velocidade?: string;
  data_contrato?: string;
  data_ativacao?: string;
}

export interface IXCClienteFull {
  id: string;
  razao: string;
  cnpj_cpf: string;
  email?: string;
  celular?: string;
  telefone?: string;
  whatsapp?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  status?: string;
  bloqueado?: 'S' | 'N';
  bloqueado_admin?: 'S' | 'N';
  bloqueado_financeiro?: 'S' | 'N';
  reducao?: 'S' | 'N';
}

export interface IXCRadusuarioFull {
  id: string;
  id_cliente?: string;
  login: string;
  online: 'S' | 'N' | 'SS';
  ultimo_online?: string;
  ip?: string;
  mac?: string;
  signal_db?: number | null;
  ont_serial?: string;
  config_mismatch?: boolean;
  framedipaddress?: string;
  acctsessiontime?: number;
}

export interface IXCAtendimento {
  id: string;
  id_cliente: string;
  assunto: string;
  descricao: string;
  status: 'aberto' | 'em_andamento' | 'fechado';
  prioridade: 'baixa' | 'media' | 'alta';
  data_abertura: string;
  data_fechamento?: string;
}

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
}

export interface IXCAtendimentoCreateData {
  id_cliente: string;
  id_assunto: string;
  assunto: string;
  descricao: string;
  prioridade?: 'baixa' | 'media' | 'alta';
  status?: 'aberto';
}

export interface IXCApiError {
  message: string;
  code?: string;
  details?: JsonObject;
  statusCode?: number;
}
