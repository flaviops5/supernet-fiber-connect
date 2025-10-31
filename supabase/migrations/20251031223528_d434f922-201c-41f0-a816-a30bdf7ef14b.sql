-- Reverter mudanças: remover função RPC e política RLS adicionadas

-- Remover função RPC
DROP FUNCTION IF EXISTS public.get_auth_user_id_by_email(text);

-- Remover política de INSERT para admins
DROP POLICY IF EXISTS "Admins podem criar boards" ON public.kanban_boards;