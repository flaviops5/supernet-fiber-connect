/**
 * Test Mock Types
 * Tipos para mocks de testes Vitest
 */

import type { Mock } from 'vitest';

export interface MockSupabaseClient {
  functions: {
    invoke: Mock;
  };
  from: Mock;
}

export interface MockQueryBuilder {
  select: Mock;
  insert: Mock;
  update: Mock;
  delete: Mock;
  eq: Mock;
  single: Mock;
  order: Mock;
  limit: Mock;
}

export interface SignalData {
  rx?: number;
  tx?: number;
  serial?: string;
  status?: string;
}

export interface PaymentOption {
  type: string;
  description?: string;
  value?: number;
}

export interface TestedFunction {
  name: string;
  status: 'success' | 'failed';
  time_ms?: number;
  error?: string;
}

export interface ConversationData {
  cpf_masked: string;
  customer_name?: string;
  [key: string]: unknown;
}

export interface FlowStep {
  type: string;
  description?: string;
  order?: number;
}
