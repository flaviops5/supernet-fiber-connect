-- Corrigir a função get_installation_events para retornar fotos como text[]
DROP FUNCTION IF EXISTS public.get_installation_events(uuid, date, date);

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
    ie.fotos
  FROM public.installation_events ie
  JOIN public.kanban_cards kc ON kc.id = ie.card_id
  WHERE ie.board_id = p_board
    AND ie.data_instalacao BETWEEN p_start AND p_end
  ORDER BY ie.data_instalacao ASC, ie.periodo ASC;
END;
$$;