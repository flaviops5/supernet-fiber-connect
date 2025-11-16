-- ============================================
-- FASE 2.4 - BAIXAS (P3): Grupo 9
-- 9 tabelas: Infraestrutura & Logs
-- ============================================

-- ===========================================
-- GRUPO 9: Infraestrutura & Logs
-- ===========================================

-- kanban_board_members (Owner/Member read)
CREATE POLICY "Board members can view their board memberships"
ON public.kanban_board_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM kanban_board_members kbm
    WHERE kbm.board_id = kanban_board_members.board_id
    AND kbm.user_id = auth.uid()
    AND kbm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Board admins can insert members"
ON public.kanban_board_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM kanban_board_members kbm
    WHERE kbm.board_id = board_id
    AND kbm.user_id = auth.uid()
    AND kbm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Board admins can update members"
ON public.kanban_board_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM kanban_board_members kbm
    WHERE kbm.board_id = kanban_board_members.board_id
    AND kbm.user_id = auth.uid()
    AND kbm.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM kanban_board_members kbm
    WHERE kbm.board_id = kanban_board_members.board_id
    AND kbm.user_id = auth.uid()
    AND kbm.role IN ('owner', 'admin')
  )
);

-- equipment_reboot_blacklist (Admin only)
CREATE POLICY "Admins can view equipment_reboot_blacklist"
ON public.equipment_reboot_blacklist
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert equipment_reboot_blacklist"
ON public.equipment_reboot_blacklist
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update equipment_reboot_blacklist"
ON public.equipment_reboot_blacklist
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- maintenance_cron_control (System only - no policies for users)
-- Access only via service_role

-- maintenance_execution_log (Admin read)
CREATE POLICY "Admins can view maintenance_execution_log"
ON public.maintenance_execution_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- network_maintenance_tasks (Admin/Editor)
CREATE POLICY "Admin/Editor can view network_maintenance_tasks"
ON public.network_maintenance_tasks
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admin/Editor can insert network_maintenance_tasks"
ON public.network_maintenance_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admin/Editor can update network_maintenance_tasks"
ON public.network_maintenance_tasks
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

-- notification_targets (Admin only)
CREATE POLICY "Admins can view notification_targets"
ON public.notification_targets
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert notification_targets"
ON public.notification_targets
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notification_targets"
ON public.notification_targets
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- notification_targets_audit (Admin only)
CREATE POLICY "Admins can view notification_targets_audit"
ON public.notification_targets_audit
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- nps_stats (Admin/Editor read)
CREATE POLICY "Admin/Editor can view nps_stats"
ON public.nps_stats
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

-- email_settings (Admin only)
CREATE POLICY "Admins can view email_settings"
ON public.email_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert email_settings"
ON public.email_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update email_settings"
ON public.email_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));