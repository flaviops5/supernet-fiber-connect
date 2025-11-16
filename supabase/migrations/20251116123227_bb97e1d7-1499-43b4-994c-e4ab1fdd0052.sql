-- ============================================
-- FASE 2.1: RLS Policies - Tabelas Críticas (P0)
-- Grupo 1-3: 14 tabelas com dados sensíveis
-- ============================================

-- ============================================
-- GRUPO 1: CONVERSAÇÕES & MENSAGENS (4 tabelas)
-- ============================================

-- 1. conversations
CREATE POLICY "Admin/Editor can view conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admin/Editor can insert conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admin/Editor can update conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

-- DELETE bloqueado (audit trail / LGPD)

-- 2. conversation_messages
CREATE POLICY "Admin/Editor can view messages"
ON public.conversation_messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admin/Editor can insert messages"
ON public.conversation_messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

-- UPDATE/DELETE bloqueados (integridade de auditoria)

-- 3. conversation_transfers
CREATE POLICY "Admin/Editor can view transfers"
ON public.conversation_transfers
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admin/Editor can insert transfers"
ON public.conversation_transfers
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

-- UPDATE/DELETE bloqueados (audit trail)

-- 4. conversation_feedback
CREATE POLICY "Admin/Editor can view feedback"
ON public.conversation_feedback
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admin/Editor can insert feedback"
ON public.conversation_feedback
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

-- UPDATE/DELETE bloqueados (integridade de dados)

-- ============================================
-- GRUPO 2: HISTÓRICO DE AÇÕES (6 tabelas)
-- ============================================

-- 5. action_log (Admin only - audit trail crítico)
CREATE POLICY "Admins can view action log"
ON public.action_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- INSERT/UPDATE/DELETE via service_role apenas

-- 6. escalation_history
CREATE POLICY "Admin/Editor can view escalation history"
ON public.escalation_history
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admin/Editor can insert escalation history"
ON public.escalation_history
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

-- UPDATE/DELETE bloqueados (audit trail)

-- 7. routing_feedback (Admin only - métricas de IA)
CREATE POLICY "Admins can view routing feedback"
ON public.routing_feedback
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert routing feedback"
ON public.routing_feedback
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- UPDATE/DELETE bloqueados (integridade de treino)

-- 8. customer_contact_history
CREATE POLICY "Admin/Editor can view contact history"
ON public.customer_contact_history
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admin/Editor can insert contact history"
ON public.customer_contact_history
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

-- UPDATE/DELETE bloqueados (LGPD compliance)

-- 9. failed_actions (Admin only - debug crítico)
CREATE POLICY "Admins can view failed actions"
ON public.failed_actions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert failed actions"
ON public.failed_actions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- UPDATE/DELETE bloqueados (audit trail)

-- 10. training_dataset (Admin only - dados de treino com PII)
CREATE POLICY "Admins can view training dataset"
ON public.training_dataset
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage training dataset"
ON public.training_dataset
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- GRUPO 3: FINANCEIRO (4 tabelas)
-- ============================================

-- 11. payment_notifications
CREATE POLICY "Admin/Editor can view payment notifications"
ON public.payment_notifications
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admin/Editor can insert payment notifications"
ON public.payment_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

-- UPDATE/DELETE bloqueados (compliance financeiro)

-- 12. nps_responses
CREATE POLICY "Admin/Editor can view nps responses"
ON public.nps_responses
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admin/Editor can insert nps responses"
ON public.nps_responses
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

-- UPDATE/DELETE bloqueados (integridade de métricas)

-- 13. nps_history (Admin only - dados históricos)
CREATE POLICY "Admins can view nps history"
ON public.nps_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- INSERT via service_role apenas
-- UPDATE/DELETE bloqueados (audit trail)

-- 14. cash_flow_projections (Admin only - dados financeiros sensíveis)
CREATE POLICY "Admins can view cash flow projections"
ON public.cash_flow_projections
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage cash flow projections"
ON public.cash_flow_projections
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- LOG DE AUDITORIA
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ FASE 2.1 COMPLETA';
  RAISE NOTICE '   - 14 tabelas críticas protegidas';
  RAISE NOTICE '   - Grupo 1: Conversações (4 tabelas)';
  RAISE NOTICE '   - Grupo 2: Histórico de Ações (6 tabelas)';
  RAISE NOTICE '   - Grupo 3: Financeiro (4 tabelas)';
  RAISE NOTICE '   - Score esperado: 87 → 92 (+5 pontos)';
END $$;