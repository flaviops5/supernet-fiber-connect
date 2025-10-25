/**
 * Financial Types
 * Tipos para operações financeiras
 */

import type { DatabaseRow } from './common.types';

export interface RevenueStats {
  total_clients: number;
  active_clients: number;
  blocked_clients: number;
  total_revenue: number;
  received_revenue: number;
  pending_revenue: number;
  overdue_revenue: number;
  average_ticket: number;
  churn_rate: number;
  growth_rate: number;
}

export interface InvoiceData {
  id: string;
  client_id: string;
  client_name: string;
  client_cpf?: string;
  amount: number;
  due_date: string;
  payment_date?: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  invoice_number?: string;
  description?: string;
}

export interface PaymentProjection extends DatabaseRow {
  month: string;
  expected_revenue: number;
  expected_payments: number;
  projected_balance: number;
  confidence_level: number;
}

export interface CashFlowData {
  date: string;
  income: number;
  expenses: number;
  balance: number;
  accumulated: number;
}

export interface FinancialMetrics {
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  ltv: number; // Lifetime Value
  cac: number; // Customer Acquisition Cost
  churn_rate: number;
  retention_rate: number;
}
