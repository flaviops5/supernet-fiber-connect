
-- CAMPAIGN CONTENT
CREATE TABLE IF NOT EXISTS public.campaign_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  channel text NOT NULL,
  subject text,
  body text NOT NULL,
  template_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read campaign_content" ON public.campaign_content FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage campaign_content" ON public.campaign_content FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- CAMPAIGN STATS
CREATE TABLE IF NOT EXISTS public.campaign_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  total_recipients integer DEFAULT 0,
  total_sent integer DEFAULT 0,
  delivery_rate numeric DEFAULT 0,
  reply_rate numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read campaign_stats" ON public.campaign_stats FOR SELECT TO authenticated USING (true);

-- PROJECTION SETTINGS
CREATE TABLE IF NOT EXISTS public.projection_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.projection_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read projection_settings" ON public.projection_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage projection_settings" ON public.projection_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- CASH FLOW PROJECTIONS
CREATE TABLE IF NOT EXISTS public.cash_flow_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projection_date date NOT NULL,
  scenario text DEFAULT 'base',
  projected_revenue numeric DEFAULT 0,
  projected_costs numeric DEFAULT 0,
  projected_profit numeric DEFAULT 0,
  actual_revenue numeric,
  actual_costs numeric,
  actual_profit numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_flow_projections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read cash_flow" ON public.cash_flow_projections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage cash_flow" ON public.cash_flow_projections FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- CEP COVERAGE
CREATE TABLE IF NOT EXISTS public.cep_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cep text NOT NULL,
  neighborhood text,
  city text DEFAULT 'Brasília',
  state text DEFAULT 'DF',
  region text,
  available boolean DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cep_coverage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read cep_coverage" ON public.cep_coverage FOR SELECT USING (true);

-- CEP PLANS
CREATE TABLE IF NOT EXISTS public.cep_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cep_coverage_id uuid REFERENCES public.cep_coverage(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE,
  available boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cep_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read cep_plans" ON public.cep_plans FOR SELECT USING (true);

-- COVERAGE AREAS
CREATE TABLE IF NOT EXISTS public.coverage_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  coordinates jsonb,
  polygon jsonb,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coverage_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read coverage_areas" ON public.coverage_areas FOR SELECT USING (true);

-- HERO SETTINGS
CREATE TABLE IF NOT EXISTS public.hero_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  subtitle text,
  cta_text text,
  cta_link text,
  background_image text,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hero_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read hero_settings" ON public.hero_settings FOR SELECT USING (true);
CREATE POLICY "Admin manage hero_settings" ON public.hero_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- HERO SLIDES
CREATE TABLE IF NOT EXISTS public.hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  subtitle text,
  image_url text,
  cta_text text,
  cta_link text,
  display_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read hero_slides" ON public.hero_slides FOR SELECT USING (true);
CREATE POLICY "Admin manage hero_slides" ON public.hero_slides FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- EMAIL SETTINGS
CREATE TABLE IF NOT EXISTS public.email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text DEFAULT 'smtp',
  smtp_host text,
  smtp_port integer DEFAULT 587,
  smtp_user text,
  smtp_password text,
  from_email text,
  from_name text DEFAULT 'SUPERNET FIBRA',
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read email_settings" ON public.email_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage email_settings" ON public.email_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- EMAIL TEMPLATES
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  variables text[] DEFAULT '{}',
  category text DEFAULT 'general',
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read email_templates" ON public.email_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage email_templates" ON public.email_templates FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- CONTRACT TEMPLATES
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content text NOT NULL,
  plan_type text,
  version text DEFAULT '1.0',
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read contract_templates" ON public.contract_templates FOR SELECT TO authenticated USING (true);

-- SIGNED CONTRACTS
CREATE TABLE IF NOT EXISTS public.signed_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.contract_templates(id),
  customer_name text NOT NULL,
  customer_cpf text NOT NULL,
  customer_email text,
  plan_id uuid REFERENCES public.plans(id),
  signed_at timestamptz,
  signature_data text,
  status text DEFAULT 'pending',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.signed_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read signed_contracts" ON public.signed_contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert signed_contracts" ON public.signed_contracts FOR INSERT TO authenticated WITH CHECK (true);

-- NOTIFICATION TEMPLATES
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  channel text DEFAULT 'whatsapp',
  template text NOT NULL,
  variables text[] DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read notification_templates" ON public.notification_templates FOR SELECT TO authenticated USING (true);

-- NOTIFICATION TARGETS
CREATE TABLE IF NOT EXISTS public.notification_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.notification_templates(id),
  target_type text DEFAULT 'all',
  target_filters jsonb DEFAULT '{}',
  sent_at timestamptz,
  status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read notification_targets" ON public.notification_targets FOR SELECT TO authenticated USING (true);

-- NPS RESPONSES
CREATE TABLE IF NOT EXISTS public.nps_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score integer NOT NULL CHECK (score >= 0 AND score <= 10),
  comment text,
  customer_name text,
  customer_cpf text,
  department text,
  agent_name text,
  conversation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read nps_responses" ON public.nps_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public insert nps_responses" ON public.nps_responses FOR INSERT WITH CHECK (true);

-- NPS STATS (materialized view as table)
CREATE TABLE IF NOT EXISTS public.nps_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL,
  period_date date NOT NULL,
  total_responses integer DEFAULT 0,
  promoters integer DEFAULT 0,
  passives integer DEFAULT 0,
  detractors integer DEFAULT 0,
  nps_score numeric DEFAULT 0,
  avg_score numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nps_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read nps_stats" ON public.nps_stats FOR SELECT TO authenticated USING (true);

-- KNOWLEDGE BASE
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'geral',
  tags text[] DEFAULT '{}',
  agent_types text[] DEFAULT '{}',
  source text,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read knowledge_base" ON public.knowledge_base FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage knowledge_base" ON public.knowledge_base FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- DOCUMENTS
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  file_url text,
  category_id uuid,
  author text,
  version text DEFAULT '1.0',
  status text DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read documents" ON public.documents FOR SELECT TO authenticated USING (true);

-- DOCUMENT CATEGORIES
CREATE TABLE IF NOT EXISTS public.document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  parent_id uuid,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read document_categories" ON public.document_categories FOR SELECT TO authenticated USING (true);

-- AGENT FLOW STEPS
CREATE TABLE IF NOT EXISTS public.agent_flow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type text NOT NULL,
  subject_key text,
  step_order integer DEFAULT 0,
  step_type text DEFAULT 'question',
  question text,
  instruction text,
  response_options jsonb DEFAULT '[]',
  next_step_map jsonb DEFAULT '{}',
  step_tools text[] DEFAULT '{}',
  step_media jsonb DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_flow_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read agent_flow_steps" ON public.agent_flow_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage agent_flow_steps" ON public.agent_flow_steps FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- AGENT FLOW SUBJECTS
CREATE TABLE IF NOT EXISTS public.agent_flow_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type text NOT NULL,
  subject_key text NOT NULL,
  subject_name text NOT NULL,
  description text,
  default_tools text[] DEFAULT '{}',
  default_media jsonb DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agent_type, subject_key)
);
ALTER TABLE public.agent_flow_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read agent_flow_subjects" ON public.agent_flow_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage agent_flow_subjects" ON public.agent_flow_subjects FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- AGENT FLOW STATES
CREATE TABLE IF NOT EXISTS public.agent_flow_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid,
  agent_type text NOT NULL,
  current_step_id uuid,
  state_data jsonb DEFAULT '{}',
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_flow_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read agent_flow_states" ON public.agent_flow_states FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert agent_flow_states" ON public.agent_flow_states FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update agent_flow_states" ON public.agent_flow_states FOR UPDATE TO authenticated USING (true);

-- AGENT PRESENCE
CREATE TABLE IF NOT EXISTS public.agent_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type text NOT NULL,
  agent_name text,
  status text DEFAULT 'offline',
  last_seen timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read agent_presence" ON public.agent_presence FOR SELECT TO authenticated USING (true);

-- AGENT DEPARTMENT ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.agent_department_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  department text NOT NULL,
  is_primary boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_department_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read dept_assignments" ON public.agent_department_assignments FOR SELECT TO authenticated USING (true);

-- AI CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  agent_type text DEFAULT 'routing',
  title text,
  status text DEFAULT 'active',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read ai_conversations" ON public.ai_conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert ai_conversations" ON public.ai_conversations FOR INSERT TO authenticated WITH CHECK (true);

-- AI MESSAGES
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read ai_messages" ON public.ai_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert ai_messages" ON public.ai_messages FOR INSERT TO authenticated WITH CHECK (true);

-- CONVERSATION MESSAGES
CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  sender_name text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read conversation_messages" ON public.conversation_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert conversation_messages" ON public.conversation_messages FOR INSERT TO authenticated WITH CHECK (true);

-- MONITORING LOGS
CREATE TABLE IF NOT EXISTS public.monitoring_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text DEFAULT 'info',
  message text,
  metadata jsonb DEFAULT '{}',
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.monitoring_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read monitoring_logs" ON public.monitoring_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert monitoring_logs" ON public.monitoring_logs FOR INSERT TO authenticated WITH CHECK (true);

-- SYSTEM ALERTS
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text,
  severity text DEFAULT 'info',
  status text DEFAULT 'active',
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read system_alerts" ON public.system_alerts FOR SELECT TO authenticated USING (true);

-- FEATURE FLAGS
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  enabled boolean DEFAULT false,
  config jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read feature_flags" ON public.feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage feature_flags" ON public.feature_flags FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- EQUIPMENT REBOOTS
CREATE TABLE IF NOT EXISTS public.equipment_reboots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_cpf text,
  pppoe_login text,
  status text DEFAULT 'pending',
  result text,
  initiated_by text,
  conversation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.equipment_reboots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read equipment_reboots" ON public.equipment_reboots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert equipment_reboots" ON public.equipment_reboots FOR INSERT TO authenticated WITH CHECK (true);

-- AUTO REBOOT SETTINGS
CREATE TABLE IF NOT EXISTS public.auto_reboot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean DEFAULT true,
  max_attempts integer DEFAULT 3,
  cooldown_minutes integer DEFAULT 30,
  blacklist_duration_hours integer DEFAULT 24,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.auto_reboot_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read auto_reboot_settings" ON public.auto_reboot_settings FOR SELECT TO authenticated USING (true);

-- EQUIPMENT REBOOT BLACKLIST
CREATE TABLE IF NOT EXISTS public.equipment_reboot_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pppoe_login text NOT NULL,
  reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.equipment_reboot_blacklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read reboot_blacklist" ON public.equipment_reboot_blacklist FOR SELECT TO authenticated USING (true);

-- INSTALLATION APPOINTMENTS
CREATE TABLE IF NOT EXISTS public.installation_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_cpf text,
  customer_phone text,
  address text,
  cep text,
  plan_id uuid REFERENCES public.plans(id),
  scheduled_date date,
  scheduled_period text DEFAULT 'manha',
  technician text,
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.installation_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read installations" ON public.installation_appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert installations" ON public.installation_appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update installations" ON public.installation_appointments FOR UPDATE TO authenticated USING (true);

-- INSTALLATION EVENTS
CREATE TABLE IF NOT EXISTS public.installation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.installation_appointments(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.installation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read installation_events" ON public.installation_events FOR SELECT TO authenticated USING (true);

-- INSTALL PHOTOS
CREATE TABLE IF NOT EXISTS public.install_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.installation_appointments(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  description text,
  photo_type text DEFAULT 'before',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.install_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read install_photos" ON public.install_photos FOR SELECT TO authenticated USING (true);

-- MASS OUTAGE EVENTS
CREATE TABLE IF NOT EXISTS public.mass_outage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  affected_count integer DEFAULT 0,
  description text,
  estimated_resolution timestamptz,
  status text DEFAULT 'active',
  protocol text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mass_outage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read mass_outage" ON public.mass_outage_events FOR SELECT TO authenticated USING (true);

-- ESCALATION RULES
CREATE TABLE IF NOT EXISTS public.escalation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  condition_type text NOT NULL,
  condition_value jsonb DEFAULT '{}',
  action_type text NOT NULL,
  action_value jsonb DEFAULT '{}',
  priority integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read escalation_rules" ON public.escalation_rules FOR SELECT TO authenticated USING (true);

-- ESCALATION SETTINGS
CREATE TABLE IF NOT EXISTS public.escalation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department text NOT NULL,
  max_wait_minutes integer DEFAULT 15,
  auto_escalate boolean DEFAULT true,
  escalate_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.escalation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read escalation_settings" ON public.escalation_settings FOR SELECT TO authenticated USING (true);

-- FLOW SIMULATIONS
CREATE TABLE IF NOT EXISTS public.flow_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type text NOT NULL,
  path_description text,
  conversation_transcript jsonb DEFAULT '[]',
  quality_score numeric DEFAULT 0,
  issues text[] DEFAULT '{}',
  suggestions text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flow_simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read flow_simulations" ON public.flow_simulations FOR SELECT TO authenticated USING (true);

-- MEDIA REPOSITORY
CREATE TABLE IF NOT EXISTS public.media_repository (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_url text NOT NULL,
  file_type text DEFAULT 'image',
  context text,
  tags text[] DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.media_repository ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read media_repository" ON public.media_repository FOR SELECT TO authenticated USING (true);

-- MEDIA USAGE LOGS
CREATE TABLE IF NOT EXISTS public.media_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid REFERENCES public.media_repository(id),
  agent_type text,
  conversation_id uuid,
  context text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.media_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read media_usage_logs" ON public.media_usage_logs FOR SELECT TO authenticated USING (true);

-- MESSAGE SHORTCUTS
CREATE TABLE IF NOT EXISTS public.message_shortcuts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcut text NOT NULL UNIQUE,
  message text NOT NULL,
  category text DEFAULT 'geral',
  department text,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.message_shortcuts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read message_shortcuts" ON public.message_shortcuts FOR SELECT TO authenticated USING (true);

-- CLOSURE MESSAGES
CREATE TABLE IF NOT EXISTS public.closure_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department text NOT NULL,
  message text NOT NULL,
  condition_type text DEFAULT 'default',
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.closure_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read closure_messages" ON public.closure_messages FOR SELECT TO authenticated USING (true);

-- PAYMENT NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.payment_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_cpf text,
  customer_name text,
  notification_type text DEFAULT 'reminder',
  channel text DEFAULT 'whatsapp',
  amount numeric,
  due_date date,
  sent_at timestamptz,
  status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read payment_notifications" ON public.payment_notifications FOR SELECT TO authenticated USING (true);

-- REGISTROS DE MONITORAMENTO
CREATE TABLE IF NOT EXISTS public.registros_de_monitoramento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  descricao text,
  severidade text DEFAULT 'info',
  dados jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.registros_de_monitoramento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read registros" ON public.registros_de_monitoramento FOR SELECT TO authenticated USING (true);

-- USER ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read activity_logs" ON public.user_activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert activity_logs" ON public.user_activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- KANBAN BOARDS
CREATE TABLE IF NOT EXISTS public.kanban_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kanban_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read kanban_boards" ON public.kanban_boards FOR SELECT TO authenticated USING (true);

-- KANBAN COLUMNS
CREATE TABLE IF NOT EXISTS public.kanban_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer DEFAULT 0,
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read kanban_columns" ON public.kanban_columns FOR SELECT TO authenticated USING (true);

-- KANBAN BOARD MEMBERS
CREATE TABLE IF NOT EXISTS public.kanban_board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  user_id uuid,
  role text DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kanban_board_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read kanban_members" ON public.kanban_board_members FOR SELECT TO authenticated USING (true);

-- ATLAS INSIGHTS
CREATE TABLE IF NOT EXISTS public.atlas_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type text NOT NULL,
  title text NOT NULL,
  description text,
  data jsonb DEFAULT '{}',
  severity text DEFAULT 'info',
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.atlas_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read atlas_insights" ON public.atlas_insights FOR SELECT TO authenticated USING (true);

-- MAINTENANCE SETTINGS
CREATE TABLE IF NOT EXISTS public.maintenance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb DEFAULT '{}',
  description text,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.maintenance_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read maintenance_settings" ON public.maintenance_settings FOR SELECT TO authenticated USING (true);

-- MAINTENANCE CRON CONTROL
CREATE TABLE IF NOT EXISTS public.maintenance_cron_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_name text NOT NULL UNIQUE,
  last_run timestamptz,
  next_run timestamptz,
  status text DEFAULT 'active',
  config jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.maintenance_cron_control ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read maintenance_cron" ON public.maintenance_cron_control FOR SELECT TO authenticated USING (true);

-- MAINTENANCE EXECUTION LOG
CREATE TABLE IF NOT EXISTS public.maintenance_execution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_name text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text DEFAULT 'running',
  result jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.maintenance_execution_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read maintenance_log" ON public.maintenance_execution_log FOR SELECT TO authenticated USING (true);

-- NETWORK MAINTENANCE TASKS
CREATE TABLE IF NOT EXISTS public.network_maintenance_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  region text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  status text DEFAULT 'planned',
  impact_level text DEFAULT 'low',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.network_maintenance_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read network_maintenance" ON public.network_maintenance_tasks FOR SELECT TO authenticated USING (true);

-- UNIFIED DOCUMENTATION
CREATE TABLE IF NOT EXISTS public.unified_documentation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'geral',
  subcategory text,
  tags text[] DEFAULT '{}',
  version text DEFAULT '1.0',
  status text DEFAULT 'published',
  author text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unified_documentation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read unified_docs" ON public.unified_documentation FOR SELECT TO authenticated USING (true);

-- CALENDAR ACCESS TOKENS
CREATE TABLE IF NOT EXISTS public.calendar_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  provider text DEFAULT 'google',
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.calendar_access_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own tokens" ON public.calendar_access_tokens FOR SELECT USING (auth.uid() = user_id);

-- SUPPORT LOOPS
CREATE TABLE IF NOT EXISTS public.support_loops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid,
  customer_cpf text,
  loop_count integer DEFAULT 0,
  issue_type text,
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_loops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read support_loops" ON public.support_loops FOR SELECT TO authenticated USING (true);

-- SUPPORT CRITICAL CLUSTERS
CREATE TABLE IF NOT EXISTS public.support_critical_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text,
  cluster_type text NOT NULL,
  affected_count integer DEFAULT 0,
  severity text DEFAULT 'medium',
  status text DEFAULT 'active',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_critical_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read critical_clusters" ON public.support_critical_clusters FOR SELECT TO authenticated USING (true);

-- SUPPORT POWER LOSS CLUSTERS
CREATE TABLE IF NOT EXISTS public.support_power_loss_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text,
  affected_count integer DEFAULT 0,
  status text DEFAULT 'active',
  detected_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_power_loss_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read power_loss" ON public.support_power_loss_clusters FOR SELECT TO authenticated USING (true);

-- KPI REGIONS LAST 24H (materialized view as table)
CREATE TABLE IF NOT EXISTS public.kpi_regions_last_24h (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  total_tickets integer DEFAULT 0,
  resolved_tickets integer DEFAULT 0,
  avg_resolution_minutes numeric DEFAULT 0,
  satisfaction_score numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kpi_regions_last_24h ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read kpi_regions" ON public.kpi_regions_last_24h FOR SELECT TO authenticated USING (true);
