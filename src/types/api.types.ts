/**
 * API Response Types
 * Sprint 10 - Fase 3: Tipar API responses
 */

import type { IXCContract } from './ixc.types';
import type { ApiResponse, PaginationParams } from './common.types';

// Re-export para conveniência
export type { ApiResponse, PaginationParams, IXCContract };

export interface IXCResponse<T = unknown> {
  registros: T[];
  total: number;
  page?: number;
  per_page?: number;
}

export interface EdgeFunctionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, unknown>;
}

export interface IXCCustomerData {
  id: string;
  razao: string;
  cnpj_cpf: string;
  email?: string;
  celular?: string;
  telefone?: string;
  endereco?: string;
  [key: string]: unknown;
}

export interface IXCFinancialTitle {
  id: string;
  id_cliente: string;
  valor: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: string;
  nosso_numero?: string;
  [key: string]: unknown;
}

export interface IXCPlan {
  id: string;
  grupo: string;
  valor_venda: number;
  download?: string;
  upload?: string;
  [key: string]: unknown;
}

export interface DiagnosticData {
  client?: IXCCustomerData;
  contracts?: IXCContract[];
  titles?: IXCFinancialTitle[];
  equipment?: Record<string, unknown>[];
}
