-- PR#36 - Auditoria Técnica Kanban: Performance e Segurança

-- Índices compostos para ordenação eficiente
CREATE INDEX IF NOT EXISTS idx_kanban_cards_column_pos
  ON public.kanban_cards (column_id, position);

CREATE INDEX IF NOT EXISTS idx_kanban_columns_board_pos
  ON public.kanban_columns (board_id, position);

-- RPC para métricas de dashboard (evita múltiplas queries)
CREATE OR REPLACE FUNCTION public.kanban_board_stats(p_board_id uuid)
RETURNS json 
LANGUAGE plpgsql 
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  result json;
BEGIN
  SELECT json_build_object(
    'total_cards', (
      SELECT COUNT(*) 
      FROM kanban_cards k 
      JOIN kanban_columns c ON c.id = k.column_id 
      WHERE c.board_id = p_board_id
    ),
    'cards_por_coluna', (
      SELECT json_agg(
        json_build_object(
          'column_id', c.id, 
          'column_name', c.name,
          'count', COUNT(k.*)
        ) ORDER BY c.position
      )
      FROM kanban_columns c 
      LEFT JOIN kanban_cards k ON k.column_id = c.id
      WHERE c.board_id = p_board_id 
      GROUP BY c.id, c.name, c.position
    ),
    'atualizados_hoje', (
      SELECT COUNT(*) 
      FROM kanban_cards k
      JOIN kanban_columns c ON c.id = k.column_id
      WHERE c.board_id = p_board_id 
        AND k.created_at::date = current_date
    ),
    'total_columns', (
      SELECT COUNT(*) 
      FROM kanban_columns 
      WHERE board_id = p_board_id
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION public.kanban_board_stats(uuid) IS 
  'Retorna métricas agregadas de um board Kanban em uma única chamada';

COMMENT ON INDEX public.idx_kanban_cards_column_pos IS 
  'Otimiza ordenação de cards dentro de colunas';

COMMENT ON INDEX public.idx_kanban_columns_board_pos IS 
  'Otimiza ordenação de colunas dentro de boards';