-- Corrigir estrutura das tabelas Kanban

-- Adicionar coluna board_id em kanban_cards (necessária para queries)
ALTER TABLE public.kanban_cards 
ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public.kanban_boards(id) ON DELETE CASCADE;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_kanban_cards_board_id ON public.kanban_cards(board_id);

-- Renomear title para name em kanban_columns (frontend espera 'name')
ALTER TABLE public.kanban_columns 
RENAME COLUMN title TO name;

-- Adicionar coluna limit_cards em kanban_columns
ALTER TABLE public.kanban_columns 
ADD COLUMN IF NOT EXISTS limit_cards INTEGER;

-- Criar tabela kanban_automations
CREATE TABLE IF NOT EXISTS public.kanban_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em kanban_automations
ALTER TABLE public.kanban_automations ENABLE ROW LEVEL SECURITY;

-- Policies para kanban_automations
CREATE POLICY "Usuários podem ver automações de seus boards"
  ON public.kanban_automations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.kanban_boards
      WHERE kanban_boards.id = kanban_automations.board_id
      AND kanban_boards.created_by = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar automações em seus boards"
  ON public.kanban_automations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.kanban_boards
      WHERE kanban_boards.id = kanban_automations.board_id
      AND kanban_boards.created_by = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar automações de seus boards"
  ON public.kanban_automations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.kanban_boards
      WHERE kanban_boards.id = kanban_automations.board_id
      AND kanban_boards.created_by = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar automações de seus boards"
  ON public.kanban_automations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.kanban_boards
      WHERE kanban_boards.id = kanban_automations.board_id
      AND kanban_boards.created_by = auth.uid()
    )
  );

-- Atualizar board_id em kanban_cards existentes (se houver)
UPDATE public.kanban_cards
SET board_id = (
  SELECT board_id 
  FROM public.kanban_columns 
  WHERE kanban_columns.id = kanban_cards.column_id
)
WHERE board_id IS NULL;