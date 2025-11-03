-- Drop políticas problemáticas
DROP POLICY IF EXISTS "Membros podem ver outros membros do mesmo board" ON kanban_board_members;
DROP POLICY IF EXISTS "Owners podem gerenciar membros" ON kanban_board_members;
DROP POLICY IF EXISTS "Admins podem ver todos os membros" ON kanban_board_members;

-- Criar função security definer para verificar se usuário é membro de um board
CREATE OR REPLACE FUNCTION public.is_board_member(_board_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM kanban_board_members
    WHERE board_id = _board_id
      AND user_id = _user_id
  );
$$;

-- Criar função security definer para verificar se usuário é owner de um board
CREATE OR REPLACE FUNCTION public.is_board_owner(_board_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM kanban_boards
    WHERE id = _board_id
      AND created_by = _user_id
  );
$$;

-- Recriar políticas usando as funções security definer
CREATE POLICY "Membros podem ver outros membros do mesmo board"
ON kanban_board_members
FOR SELECT
USING (
  public.is_board_member(board_id, auth.uid()) OR
  public.is_board_owner(board_id, auth.uid()) OR
  public.has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Owners podem gerenciar membros"
ON kanban_board_members
FOR ALL
USING (
  public.is_board_owner(board_id, auth.uid()) OR
  public.has_role(auth.uid(), 'admin'::user_role)
);

-- Garantir que a função has_role também está usando security definer corretamente
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;