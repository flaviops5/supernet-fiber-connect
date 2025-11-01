-- PR#39 – RPC: conferência de importações recentes
CREATE OR REPLACE FUNCTION public.kanban_import_summary(p_board_id uuid, p_limit int DEFAULT 10)
RETURNS TABLE (
  column_name text,
  total_imported bigint,
  last_import timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Verify board access
  IF NOT public.is_board_member(p_board_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    c.title AS column_name,
    COUNT(k.id) AS total_imported,
    MAX(k.created_at) AS last_import
  FROM kanban_cards k
  JOIN kanban_columns c ON c.id = k.column_id
  WHERE c.board_id = p_board_id
  GROUP BY c.title
  ORDER BY last_import DESC NULLS LAST
  LIMIT p_limit;
END $$;