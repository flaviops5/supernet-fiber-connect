-- ===================================================================
-- SEGURANÇA: RLS Policy adicional para mass_outage_events
-- ===================================================================

-- Política que permite INSERT/UPDATE apenas via service_role
-- Isso protege contra acessos não autorizados, mesmo que alguém 
-- obtenha a anon key
CREATE POLICY "Only service role can manage mass outage events"
ON public.mass_outage_events
FOR ALL
TO authenticated
USING (
  -- Verificar se a requisição veio com service_role
  -- auth.role() retorna 'service_role' apenas para chamadas com service_role key
  auth.role() = 'service_role'
)
WITH CHECK (
  auth.role() = 'service_role'
);

-- Política de leitura para admins e editores (não afetada pela de cima)
CREATE POLICY "Admins and editors can view mass outage events"
ON public.mass_outage_events
FOR SELECT
TO authenticated
USING (
  auth.role() = 'service_role' OR
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'editor'::user_role)
);

-- Comentário de segurança
COMMENT ON POLICY "Only service role can manage mass outage events" 
ON public.mass_outage_events IS 
'Política de segurança: Apenas chamadas com service_role key (CRON jobs e edge functions internas) podem criar/atualizar eventos de queda em massa. Isso previne manipulação não autorizada mesmo que a anon key seja comprometida.';