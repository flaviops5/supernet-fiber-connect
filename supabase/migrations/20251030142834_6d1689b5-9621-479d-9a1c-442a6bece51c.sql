-- Correção Crítica: Adicionar RLS policies para rate_limit_tracking
-- Auditoria v1.0.0 - Fase 2
-- Issue: Tabela com RLS ativo mas sem policies (Linter INFO)

COMMENT ON TABLE public.rate_limit_tracking IS 
'Tracking de rate limits por ação e identificador. Sistema interno - acesso apenas via service_role.';

-- Policy 1: Service role pode ler tudo (para monitoramento)
CREATE POLICY "Service role can read all rate limit tracking"
ON public.rate_limit_tracking
FOR SELECT
TO service_role
USING (true);

-- Policy 2: Service role pode insertar (sistema interno)
CREATE POLICY "Service role can insert rate limit tracking"
ON public.rate_limit_tracking
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy 3: Service role pode atualizar (cleanup, reset)
CREATE POLICY "Service role can update rate limit tracking"
ON public.rate_limit_tracking
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 4: Service role pode deletar (cleanup automático)
CREATE POLICY "Service role can delete expired tracking"
ON public.rate_limit_tracking
FOR DELETE
TO service_role
USING (true);

-- Comentário explicativo sobre acesso restrito
COMMENT ON POLICY "Service role can read all rate limit tracking" ON public.rate_limit_tracking IS
'Acesso restrito a service_role. Esta tabela é gerenciada apenas por edge functions e processos internos.';
