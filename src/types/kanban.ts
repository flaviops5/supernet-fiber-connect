/**
 * Tipos do módulo Kanban
 */

export interface KanbanBoard {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface KanbanColumn {
  id: string;
  board_id: string;
  title: string;
  position: number;
  limit?: number;
  created_at: string;
  updated_at: string;
}

export interface KanbanCard {
  id: string;
  board_id: string;
  column_id: string;
  title: string;
  description?: string | null;
  position: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  labels?: string[];
  assigned_to?: string | null;
  due_date?: string | null;
  conversation_id?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface KanbanLabel {
  id: string;
  board_id: string;
  name: string;
  color: string;
  created_at: string;
}
