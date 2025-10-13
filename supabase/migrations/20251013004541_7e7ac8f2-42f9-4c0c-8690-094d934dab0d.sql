-- Criar tabela de cache para dados PON/CTO (raramente mudam)
CREATE TABLE IF NOT EXISTS public.ixc_cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para busca por expiração
CREATE INDEX IF NOT EXISTS idx_ixc_cache_expires_at ON public.ixc_cache(expires_at);

-- RLS: apenas funções Edge podem acessar
ALTER TABLE public.ixc_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage cache"
  ON public.ixc_cache
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Função para limpar cache expirado (executar via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ixc_cache
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;