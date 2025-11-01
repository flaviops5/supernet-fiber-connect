/**
 * Notification Types - PR#47
 * Tipos para gerenciamento de notificações
 */

export type NotificationTargetType = 'instalacao' | 'financeiro' | 'comercial' | 'tecnico';

export interface NotificationTarget {
  id: string;
  nome: string;
  telefone: string;
  tipo: NotificationTargetType;
  ativo: boolean;
  observacoes?: string | null;
  created_at: string;
  created_by?: string | null;
  updated_at?: string;
  updated_by?: string | null;
}

export interface NotificationTargetAudit {
  id: string;
  target_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  changed_by?: string | null;
  changed_at: string;
}

export interface NotificationTargetFormData {
  nome: string;
  telefone: string;
  tipo: NotificationTargetType;
  observacoes?: string;
}
