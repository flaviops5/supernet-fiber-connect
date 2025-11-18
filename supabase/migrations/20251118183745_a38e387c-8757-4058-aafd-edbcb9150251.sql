-- Fix recursive RLS policies on kanban_board_members
-- The previous policies referenced kanban_board_members inside their own policy
-- expressions, causing "infinite recursion detected in policy" errors.

BEGIN;

-- Drop old recursive policies if they exist
DROP POLICY IF EXISTS "Board admins can insert members" ON public.kanban_board_members;
DROP POLICY IF EXISTS "Board admins can update members" ON public.kanban_board_members;
DROP POLICY IF EXISTS "Board members can view their board memberships" ON public.kanban_board_members;

-- Simple, non-recursive policies: users can manage only their own memberships

CREATE POLICY "kanban_members_select_own"
ON public.kanban_board_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "kanban_members_insert_own"
ON public.kanban_board_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "kanban_members_update_own"
ON public.kanban_board_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

COMMIT;