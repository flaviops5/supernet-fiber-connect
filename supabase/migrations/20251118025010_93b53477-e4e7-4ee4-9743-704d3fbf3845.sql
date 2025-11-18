-- Tabela de lock para detect-mass-outage
CREATE TABLE IF NOT EXISTS public.mass_outage_detection_lock (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  locked_by TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT single_lock CHECK (id = 'singleton')
);

-- Índice para facilitar limpeza de locks expirados
CREATE INDEX IF NOT EXISTS idx_mass_outage_lock_expires 
ON public.mass_outage_detection_lock(expires_at);

-- Função para adquirir lock
CREATE OR REPLACE FUNCTION acquire_mass_outage_lock(
  p_locked_by TEXT,
  p_ttl_seconds INTEGER DEFAULT 300
) RETURNS BOOLEAN AS $$
DECLARE
  v_acquired BOOLEAN := FALSE;
BEGIN
  -- Limpar locks expirados
  DELETE FROM mass_outage_detection_lock 
  WHERE expires_at < NOW();
  
  -- Tentar inserir novo lock
  INSERT INTO mass_outage_detection_lock (
    id,
    locked_by,
    expires_at,
    metadata
  ) VALUES (
    'singleton',
    p_locked_by,
    NOW() + (p_ttl_seconds || ' seconds')::INTERVAL,
    jsonb_build_object(
      'acquired_at', NOW(),
      'ttl_seconds', p_ttl_seconds
    )
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING TRUE INTO v_acquired;
  
  RETURN COALESCE(v_acquired, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Função para liberar lock
CREATE OR REPLACE FUNCTION release_mass_outage_lock(
  p_locked_by TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_released BOOLEAN := FALSE;
BEGIN
  DELETE FROM mass_outage_detection_lock
  WHERE id = 'singleton' 
    AND locked_by = p_locked_by
  RETURNING TRUE INTO v_released;
  
  RETURN COALESCE(v_released, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS
ALTER TABLE public.mass_outage_detection_lock ENABLE ROW LEVEL SECURITY;

-- Policy para service role apenas
CREATE POLICY "Service role can manage locks"
ON public.mass_outage_detection_lock
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);