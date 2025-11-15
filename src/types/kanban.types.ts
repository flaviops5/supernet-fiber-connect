/**
 * Kanban Types
 * Tipos para sistema de Kanban/Board
 */

import type { JsonObject } from './common.types';

export interface BoardMembership {
  board_id: string;
  user_id: string;
  role?: string;
  created_at?: string;
}

export interface KanbanBoard {
  id: string;
  title: string;
  created_at: string;
  created_by?: string;
  metadata?: JsonObject;
}

export interface CalendarEvent {
  id: string;
  title: string;
  municipio?: string;
  data_instalacao: string;
  status: string;
  metadata?: JsonObject;
}
