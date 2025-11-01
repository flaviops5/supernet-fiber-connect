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

  // Campos estendidos para instalações
  municipio?: string | null;
  localizacao_url?: string | null;
  links_texto?: string | null;
  data_instalacao?: string | null; // yyyy-mm-dd
  periodo?: 'manhã' | 'tarde' | 'noite' | null;
  provedor_local?: string | null;
  telefone?: string | null;
}

export interface InstallationEvent {
  id: string;
  card_id: string;
  board_id: string;
  data_instalacao: string; // date
  periodo: 'manhã' | 'tarde' | 'noite';
  status: 'agendado' | 'em_execucao' | 'finalizado' | 'reagendado';
  fotos: string[];
  change_reason?: string | null;
  previous_event_id?: string | null;
  created_by?: string | null;
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
