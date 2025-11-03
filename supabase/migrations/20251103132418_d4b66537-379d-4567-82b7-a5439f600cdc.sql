-- Tabela para tokens de acesso público ao calendário
CREATE TABLE public.calendar_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL, -- Nome da escola/contratante
  entity_filter JSONB, -- Filtro adicional (ex: municipio, etc)
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER NOT NULL DEFAULT 0
);

-- Índices para performance
CREATE INDEX idx_calendar_tokens_token ON public.calendar_access_tokens(token);
CREATE INDEX idx_calendar_tokens_board ON public.calendar_access_tokens(board_id);
CREATE INDEX idx_calendar_tokens_active ON public.calendar_access_tokens(is_active) WHERE is_active = true;

-- Função para validar e registrar acesso ao token
CREATE OR REPLACE FUNCTION public.validate_calendar_token(p_token TEXT)
RETURNS TABLE (
  board_id UUID,
  entity_name TEXT,
  entity_filter JSONB,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar estatísticas de acesso
  UPDATE public.calendar_access_tokens
  SET 
    last_accessed_at = now(),
    access_count = access_count + 1
  WHERE token = p_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  -- Retornar dados do token
  RETURN QUERY
  SELECT 
    t.board_id,
    t.entity_name,
    t.entity_filter,
    (t.is_active AND (t.expires_at IS NULL OR t.expires_at > now())) as is_valid
  FROM public.calendar_access_tokens t
  WHERE t.token = p_token;
END;
$$;

-- Função para buscar eventos por token
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
    ie.fotos
  FROM public.installation_events ie
  JOIN public.kanban_cards kc ON kc.id = ie.card_id
  WHERE ie.board_id = v_board_id
    AND ie.data_instalacao BETWEEN p_start AND p_end
    -- Aplicar filtro adicional se existir
    AND (
      v_entity_filter IS NULL 
      OR (v_entity_filter->>'municipio' IS NULL OR kc.municipio = (v_entity_filter->>'municipio'))
    )
  ORDER BY ie.data_instalacao ASC, ie.periodo ASC;
END;
$$;

-- RLS: Tokens são gerenciados apenas por admins/editores
ALTER TABLE public.calendar_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar tokens"
ON public.calendar_access_tokens
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'editor')
  )
);

-- Comentários
COMMENT ON TABLE public.calendar_access_tokens IS 'Tokens para acesso público ao calendário de instalações';
COMMENT ON FUNCTION public.validate_calendar_token IS 'Valida token e registra acesso';
COMMENT ON FUNCTION public.get_installation_events_by_token IS 'Busca eventos de instalação por token público';