-- Criar enum para categorias de template
CREATE TYPE kanban_template_category AS ENUM ('development', 'marketing', 'sales', 'custom');

-- Criar tabela de quadros Kanban
CREATE TABLE public.kanban_boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de colunas
CREATE TABLE public.kanban_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  color TEXT,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de cards
CREATE TABLE public.kanban_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  column_id UUID NOT NULL REFERENCES public.kanban_columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de templates
CREATE TABLE public.kanban_board_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category kanban_template_category NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  structure JSONB NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_board_templates ENABLE ROW LEVEL SECURITY;

-- Policies para kanban_boards
CREATE POLICY "Usuários podem ver seus próprios boards"
  ON public.kanban_boards FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Usuários podem criar seus próprios boards"
  ON public.kanban_boards FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Usuários podem atualizar seus próprios boards"
  ON public.kanban_boards FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Usuários podem deletar seus próprios boards"
  ON public.kanban_boards FOR DELETE
  USING (auth.uid() = created_by);

-- Policies para kanban_columns
CREATE POLICY "Usuários podem ver colunas de seus boards"
  ON public.kanban_columns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.kanban_boards
      WHERE kanban_boards.id = kanban_columns.board_id
      AND kanban_boards.created_by = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar colunas em seus boards"
  ON public.kanban_columns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.kanban_boards
      WHERE kanban_boards.id = kanban_columns.board_id
      AND kanban_boards.created_by = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar colunas de seus boards"
  ON public.kanban_columns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.kanban_boards
      WHERE kanban_boards.id = kanban_columns.board_id
      AND kanban_boards.created_by = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar colunas de seus boards"
  ON public.kanban_columns FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.kanban_boards
      WHERE kanban_boards.id = kanban_columns.board_id
      AND kanban_boards.created_by = auth.uid()
    )
  );

-- Policies para kanban_cards
CREATE POLICY "Usuários podem ver cards de seus boards"
  ON public.kanban_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.kanban_columns
      JOIN public.kanban_boards ON kanban_boards.id = kanban_columns.board_id
      WHERE kanban_columns.id = kanban_cards.column_id
      AND kanban_boards.created_by = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar cards em seus boards"
  ON public.kanban_cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.kanban_columns
      JOIN public.kanban_boards ON kanban_boards.id = kanban_columns.board_id
      WHERE kanban_columns.id = kanban_cards.column_id
      AND kanban_boards.created_by = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar cards de seus boards"
  ON public.kanban_cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.kanban_columns
      JOIN public.kanban_boards ON kanban_boards.id = kanban_columns.board_id
      WHERE kanban_columns.id = kanban_cards.column_id
      AND kanban_boards.created_by = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar cards de seus boards"
  ON public.kanban_cards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.kanban_columns
      JOIN public.kanban_boards ON kanban_boards.id = kanban_columns.board_id
      WHERE kanban_columns.id = kanban_cards.column_id
      AND kanban_boards.created_by = auth.uid()
    )
  );

-- Policies para templates (públicos, todos podem ver)
CREATE POLICY "Templates públicos são visíveis para todos"
  ON public.kanban_board_templates FOR SELECT
  USING (is_public = true);

-- Triggers para updated_at
CREATE TRIGGER update_kanban_boards_updated_at
  BEFORE UPDATE ON public.kanban_boards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir templates padrão
INSERT INTO public.kanban_board_templates (name, description, category, structure) VALUES
('Desenvolvimento Ágil', 'Template para gerenciar sprints e tarefas de desenvolvimento', 'development', 
  '{"columns": [
    {"title": "Backlog", "color": "#gray"},
    {"title": "To Do", "color": "#blue"},
    {"title": "Em Progresso", "color": "#yellow"},
    {"title": "Em Revisão", "color": "#purple"},
    {"title": "Concluído", "color": "#green"}
  ]}'::jsonb
),
('Marketing', 'Template para campanhas e projetos de marketing', 'marketing',
  '{"columns": [
    {"title": "Ideias", "color": "#blue"},
    {"title": "Planejamento", "color": "#purple"},
    {"title": "Em Execução", "color": "#yellow"},
    {"title": "Publicado", "color": "#green"}
  ]}'::jsonb
),
('Vendas', 'Template para pipeline de vendas', 'sales',
  '{"columns": [
    {"title": "Leads", "color": "#blue"},
    {"title": "Contato Inicial", "color": "#purple"},
    {"title": "Proposta", "color": "#yellow"},
    {"title": "Negociação", "color": "#orange"},
    {"title": "Fechado", "color": "#green"}
  ]}'::jsonb
);