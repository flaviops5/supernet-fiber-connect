-- PR#37 - Auditoria Visual: Melhorar RPC kanban_board_stats com filtros

-- Atualizar RPC para aceitar filtros opcionais de pesquisa e período
CREATE OR REPLACE FUNCTION public.kanban_board_stats(
  p_board_id uuid,
  p_search text DEFAULT NULL,
  p_periodo text DEFAULT NULL
)
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
        AND (p_search IS NULL OR p_search = '' OR 
             k.title ILIKE '%'||p_search||'%' OR 
             k.description ILIKE '%'||p_search||'%')
        AND (p_periodo IS NULL OR p_periodo = '' OR 
             k.periodo ILIKE '%'||p_periodo||'%')
    ),
    'cards_por_coluna', (
      SELECT json_agg(
        json_build_object(
          'column_id', c.id, 
          'column_name', c.name,
          'column_color', c.color,
          'count', COUNT(k.*)
        ) ORDER BY c.position
      )
      FROM kanban_columns c 
      LEFT JOIN kanban_cards k ON k.column_id = c.id
        AND (p_search IS NULL OR p_search = '' OR 
             k.title ILIKE '%'||p_search||'%' OR 
             k.description ILIKE '%'||p_search||'%')
        AND (p_periodo IS NULL OR p_periodo = '' OR 
             k.periodo ILIKE '%'||p_periodo||'%')
      WHERE c.board_id = p_board_id 
      GROUP BY c.id, c.name, c.color, c.position
    ),
    'cards_por_prioridade', (
      SELECT json_agg(
        json_build_object(
          'priority', priority,
          'count', count
        )
      )
      FROM (
        SELECT 
          COALESCE(k.priority, 'medium') as priority,
          COUNT(*) as count
        FROM kanban_cards k
        JOIN kanban_columns c ON c.id = k.column_id
        WHERE c.board_id = p_board_id
          AND (p_search IS NULL OR p_search = '' OR 
               k.title ILIKE '%'||p_search||'%' OR 
               k.description ILIKE '%'||p_search||'%')
          AND (p_periodo IS NULL OR p_periodo = '' OR 
               k.periodo ILIKE '%'||p_periodo||'%')
        GROUP BY COALESCE(k.priority, 'medium')
        ORDER BY 
          CASE COALESCE(k.priority, 'medium')
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
            ELSE 5
          END
      ) sub
    ),
    'recentes_7d', (
      SELECT COUNT(*) 
      FROM kanban_cards k
      JOIN kanban_columns c ON c.id = k.column_id
      WHERE c.board_id = p_board_id 
        AND k.created_at >= NOW() - INTERVAL '7 days'
        AND (p_search IS NULL OR p_search = '' OR 
             k.title ILIKE '%'||p_search||'%' OR 
             k.description ILIKE '%'||p_search||'%')
        AND (p_periodo IS NULL OR p_periodo = '' OR 
             k.periodo ILIKE '%'||p_periodo||'%')
    ),
    'atualizados_hoje', (
      SELECT COUNT(*) 
      FROM kanban_cards k
      JOIN kanban_columns c ON c.id = k.column_id
      WHERE c.board_id = p_board_id 
        AND k.created_at::date = current_date
        AND (p_search IS NULL OR p_search = '' OR 
             k.title ILIKE '%'||p_search||'%' OR 
             k.description ILIKE '%'||p_search||'%')
        AND (p_periodo IS NULL OR p_periodo = '' OR 
             k.periodo ILIKE '%'||p_periodo||'%')
    ),
    'urgentes', (
      SELECT COUNT(*) 
      FROM kanban_cards k
      JOIN kanban_columns c ON c.id = k.column_id
      WHERE c.board_id = p_board_id 
        AND k.priority = 'urgent'
        AND (p_search IS NULL OR p_search = '' OR 
             k.title ILIKE '%'||p_search||'%' OR 
             k.description ILIKE '%'||p_search||'%')
        AND (p_periodo IS NULL OR p_periodo = '' OR 
             k.periodo ILIKE '%'||p_periodo||'%')
    ),
    'total_colunas', (
      SELECT COUNT(*) 
      FROM kanban_columns 
      WHERE board_id = p_board_id
    ),
    'media_por_coluna', (
      SELECT ROUND(
        (SELECT COUNT(*)::numeric FROM kanban_cards k 
         JOIN kanban_columns c ON c.id = k.column_id 
         WHERE c.board_id = p_board_id) / 
        NULLIF((SELECT COUNT(*) FROM kanban_columns WHERE board_id = p_board_id), 0),
        1
      )
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Atualizar comentário da função
COMMENT ON FUNCTION public.kanban_board_stats(uuid, text, text) IS 
  'Retorna métricas agregadas de um board Kanban com filtros opcionais de pesquisa e período';