-- ============================================
-- FASE 2.2 - ALTAS (P1): Grupos 4 e 5
-- 16 tabelas: Configurações de Sistema + Métricas
-- ============================================

-- ===========================================
-- GRUPO 4: Configurações de Sistema (Admin Only)
-- ===========================================

-- agent_flow_steps
CREATE POLICY "Admins can view agent_flow_steps"
ON public.agent_flow_steps
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert agent_flow_steps"
ON public.agent_flow_steps
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update agent_flow_steps"
ON public.agent_flow_steps
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- agent_flow_subjects
CREATE POLICY "Admins can view agent_flow_subjects"
ON public.agent_flow_subjects
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert agent_flow_subjects"
ON public.agent_flow_subjects
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update agent_flow_subjects"
ON public.agent_flow_subjects
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- agent_flow_scenario_approvals
CREATE POLICY "Admins can view agent_flow_scenario_approvals"
ON public.agent_flow_scenario_approvals
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert agent_flow_scenario_approvals"
ON public.agent_flow_scenario_approvals
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update agent_flow_scenario_approvals"
ON public.agent_flow_scenario_approvals
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- agent_scenarios_versions
CREATE POLICY "Admins can view agent_scenarios_versions"
ON public.agent_scenarios_versions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert agent_scenarios_versions"
ON public.agent_scenarios_versions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- agent_scenarios_rollback_log
CREATE POLICY "Admins can view agent_scenarios_rollback_log"
ON public.agent_scenarios_rollback_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert agent_scenarios_rollback_log"
ON public.agent_scenarios_rollback_log
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update agent_scenarios_rollback_log"
ON public.agent_scenarios_rollback_log
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- escalation_settings
CREATE POLICY "Admins can view escalation_settings"
ON public.escalation_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert escalation_settings"
ON public.escalation_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update escalation_settings"
ON public.escalation_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- alert_config
CREATE POLICY "Admins can view alert_config"
ON public.alert_config
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert alert_config"
ON public.alert_config
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update alert_config"
ON public.alert_config
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- alert_history
CREATE POLICY "Admins can view alert_history"
ON public.alert_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert alert_history"
ON public.alert_history
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- auto_reboot_settings
CREATE POLICY "Admins can view auto_reboot_settings"
ON public.auto_reboot_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert auto_reboot_settings"
ON public.auto_reboot_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update auto_reboot_settings"
ON public.auto_reboot_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- financial_config
CREATE POLICY "Admins can view financial_config"
ON public.financial_config
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert financial_config"
ON public.financial_config
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update financial_config"
ON public.financial_config
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- maintenance_settings
CREATE POLICY "Admins can view maintenance_settings"
ON public.maintenance_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert maintenance_settings"
ON public.maintenance_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update maintenance_settings"
ON public.maintenance_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- projection_settings
CREATE POLICY "Admins can view projection_settings"
ON public.projection_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert projection_settings"
ON public.projection_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update projection_settings"
ON public.projection_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===========================================
-- GRUPO 5: Métricas & Monitoramento (Admin/Editor read)
-- ===========================================

-- agent_metrics
CREATE POLICY "Admin/Editor can view agent_metrics"
ON public.agent_metrics
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admins can insert agent_metrics"
ON public.agent_metrics
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- equipment_reboots
CREATE POLICY "Admin/Editor can view equipment_reboots"
ON public.equipment_reboots
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admins can insert equipment_reboots"
ON public.equipment_reboots
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- outage_notifications
CREATE POLICY "Admin/Editor can view outage_notifications"
ON public.outage_notifications
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admins can insert outage_notifications"
ON public.outage_notifications
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- system_health
CREATE POLICY "Admin/Editor can view system_health"
ON public.system_health
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admins can insert system_health"
ON public.system_health
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));