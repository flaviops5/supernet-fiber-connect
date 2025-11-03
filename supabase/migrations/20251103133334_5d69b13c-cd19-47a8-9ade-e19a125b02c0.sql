-- Fix functions to return fotos as text[] by converting JSONB arrays
CREATE OR REPLACE FUNCTION public.get_installation_events(
  p_board uuid,
  p_start date,
  p_end date
)
RETURNS TABLE (
  id uuid,
  card_id uuid,
  title text,
  municipio text,
  localizacao_url text,
  data_instalacao date,
  periodo text,
  status text,
  fotos text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ie.id,
    ie.card_id,
    kc.title,
    kc.municipio,
    kc.localizacao_url,
    ie.data_instalacao,
    ie.periodo::text,
    ie.status::text,
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(ie.fotos)), ARRAY[]::text[])
  FROM public.installation_events ie
  JOIN public.kanban_cards kc ON kc.id = ie.card_id
  WHERE ie.board_id = p_board
    AND ie.data_instalacao BETWEEN p_start AND p_end
  ORDER BY ie.data_instalacao ASC, ie.periodo ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_installation_events_by_token(
  p_token TEXT,
  p_start DATE,
  p_end DATE
)
RETURNS TABLE (
  id UUID,
  card_id UUID,
  title TEXT,
  municipio TEXT,
  localizacao_url TEXT,
  data_instalacao DATE,
  periodo TEXT,
  status TEXT,
  fotos TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_board_id UUID;
  v_entity_filter JSONB;
  v_is_valid BOOLEAN;
BEGIN
  -- Validar token
  SELECT vct.board_id, vct.entity_filter, vct.is_valid
  INTO v_board_id, v_entity_filter, v_is_valid
  FROM public.validate_calendar_token(p_token) vct;

  IF NOT v_is_valid THEN
    RAISE EXCEPTION 'Token inválido ou expirado';
  END IF;

  -- Retornar eventos filtrados
  RETURN QUERY
  SELECT 
    ie.id,
    ie.card_id,
    kc.title,
    kc.municipio,
    kc.localizacao_url,
    ie.data_instalacao,
    ie.periodo::text,
    ie.status::text,
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(ie.fotos)), ARRAY[]::text[])
  FROM public.installation_events ie
  JOIN public.kanban_cards kc ON kc.id = ie.card_id
  WHERE ie.board_id = v_board_id
    AND ie.data_instalacao BETWEEN p_start AND p_end
    AND (
      v_entity_filter IS NULL 
      OR (v_entity_filter->>'municipio' IS NULL OR kc.municipio = (v_entity_filter->>'municipio'))
    )
  ORDER BY ie.data_instalacao ASC, ie.periodo ASC;
END;
$$;