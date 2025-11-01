-- PR#38.1 - Pré-requisitos Kanban: Auditoria + Colaboração + Métricas

-- =====================================================
-- 1️⃣ TABELA DE MEMBROS DE BOARDS (Colaboração)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.kanban_board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'editor', 'viewer', 'member')),
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(board_id, user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_kanban_board_members_board 
  ON public.kanban_board_members(board_id);
CREATE INDEX IF NOT EXISTS idx_kanban_board_members_user 
  ON public.kanban_board_members(user_id);

-- RLS
ALTER TABLE public.kanban_board_members ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins podem ver todos os membros"
  ON public.kanban_board_members FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Membros podem ver outros membros do mesmo board"
  ON public.kanban_board_members FOR SELECT
  USING (
    board_id IN (
      SELECT board_id FROM public.kanban_board_members 
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.kanban_boards 
      WHERE id = board_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Owners podem gerenciar membros"
  ON public.kanban_board_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.kanban_boards 
      WHERE id = board_id AND created_by = auth.uid()
    )
  );

-- =====================================================
-- 2️⃣ TABELA DE AUDITORIA
-- =====================================================

CREATE TABLE IF NOT EXISTS public.kanban_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  card_id uuid REFERENCES public.kanban_cards(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('card_created', 'card_moved', 'card_updated', 'card_deleted', 'card_assigned')),
  from_column_id uuid REFERENCES public.kanban_columns(id) ON DELETE SET NULL,
  to_column_id uuid REFERENCES public.kanban_columns(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_kanban_audit_board_created
  ON public.kanban_audit_logs(board_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kanban_audit_user_created
  ON public.kanban_audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kanban_audit_card
  ON public.kanban_audit_logs(card_id) WHERE card_id IS NOT NULL;

-- RLS
ALTER TABLE public.kanban_audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3️⃣ FUNÇÃO SECURITY DEFINER: is_board_member()
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_board_member(p_board_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Criador do board
  SELECT EXISTS (
    SELECT 1 FROM public.kanban_boards b
    WHERE b.id = p_board_id AND b.created_by = auth.uid()
  )
  -- Ou membro do board
  OR EXISTS (
    SELECT 1 FROM public.kanban_board_members m
    WHERE m.board_id = p_board_id AND m.user_id = auth.uid()
  )
  -- Ou admin
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_board_member(uuid) IS 
  'Verifica se o usuário autenticado é criador, membro ou admin do board. SECURITY DEFINER para evitar recursão RLS.';

-- =====================================================
-- 4️⃣ POLICIES RLS PARA AUDITORIA
-- =====================================================

CREATE POLICY "Admins podem ver toda auditoria"
  ON public.kanban_audit_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Membros podem ver auditoria de seus boards"
  ON public.kanban_audit_logs FOR SELECT
  USING (public.is_board_member(board_id));

CREATE POLICY "Sistema pode inserir auditoria"
  ON public.kanban_audit_logs FOR INSERT
  WITH CHECK (public.is_board_member(board_id));

-- =====================================================
-- 5️⃣ RPC: Métricas de Atividade de Usuários
-- =====================================================

CREATE OR REPLACE FUNCTION public.kanban_user_activity_log(
  p_board_id uuid,
  p_days int DEFAULT 7
)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  total_actions bigint,
  created_cards bigint,
  moved_cards bigint,
  updated_cards bigint,
  deleted_cards bigint,
  last_action_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validar acesso ao board
  IF NOT public.is_board_member(p_board_id) THEN
    RAISE EXCEPTION 'Access denied: user is not a member of this board';
  END IF;

  RETURN QUERY
  SELECT
    a.user_id,
    COALESCE(
      (SELECT name FROM public.profiles WHERE profiles.user_id = a.user_id),
      a.user_id::text
    ) AS user_name,
    COUNT(*)::bigint AS total_actions,
    COUNT(*) FILTER (WHERE a.action = 'card_created')::bigint AS created_cards,
    COUNT(*) FILTER (WHERE a.action = 'card_moved')::bigint AS moved_cards,
    COUNT(*) FILTER (WHERE a.action = 'card_updated')::bigint AS updated_cards,
    COUNT(*) FILTER (WHERE a.action = 'card_deleted')::bigint AS deleted_cards,
    MAX(a.created_at) AS last_action_at
  FROM public.kanban_audit_logs a
  WHERE a.board_id = p_board_id
    AND a.created_at > NOW() - (p_days || ' days')::interval
  GROUP BY a.user_id
  ORDER BY total_actions DESC;
END;
$$;

COMMENT ON FUNCTION public.kanban_user_activity_log(uuid, int) IS 
  'Retorna métricas de atividade por usuário em um board específico. Requer is_board_member().';

-- =====================================================
-- 6️⃣ TRIGGER: Adicionar criador como owner automático
-- =====================================================

CREATE OR REPLACE FUNCTION public.add_board_creator_as_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.kanban_board_members (board_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (board_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_add_board_creator_as_owner
  AFTER INSERT ON public.kanban_boards
  FOR EACH ROW
  EXECUTE FUNCTION public.add_board_creator_as_owner();

COMMENT ON TRIGGER trg_add_board_creator_as_owner ON public.kanban_boards IS 
  'Adiciona automaticamente o criador do board como owner na tabela kanban_board_members';