-- Adicionar políticas RLS para admins acessarem todos os Kanban boards
-- As políticas existentes dos usuários normais permanecem inalteradas

-- Políticas para kanban_boards (admins podem ver e gerenciar todos os boards)
CREATE POLICY "Admins podem ver todos os boards"
ON public.kanban_boards
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar todos os boards"
ON public.kanban_boards
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem deletar todos os boards"
ON public.kanban_boards
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Políticas para kanban_columns (admins podem ver e gerenciar todas as colunas)
CREATE POLICY "Admins podem ver todas as colunas"
ON public.kanban_columns
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar todas as colunas"
ON public.kanban_columns
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem deletar todas as colunas"
ON public.kanban_columns
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem criar colunas em qualquer board"
ON public.kanban_columns
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Políticas para kanban_cards (admins podem ver e gerenciar todos os cards)
CREATE POLICY "Admins podem ver todos os cards"
ON public.kanban_cards
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar todos os cards"
ON public.kanban_cards
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem deletar todos os cards"
ON public.kanban_cards
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem criar cards em qualquer board"
ON public.kanban_cards
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));