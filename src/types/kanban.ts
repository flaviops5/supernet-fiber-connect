/**
 * Tipos do módulo Kanban
 */

export interface KanbanBoard {
  id: string;
  title: string;
  description?: string;
  created_by: string;
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
  created_at: string;
}

export interface KanbanLabel {
  id: string;
  board_id: string;
  name: string;
  color: string;
  created_at: string;
}
