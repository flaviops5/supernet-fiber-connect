-- Tabela de configurações de escalonamento
CREATE TABLE public.escalation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL DEFAULT 'explicit' CHECK (mode IN ('explicit', 'silent')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de regras de escalonamento
CREATE TABLE public.escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_department agent_department NOT NULL,
  to_department agent_department NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  conditions JSONB NOT NULL DEFAULT '{}',
  auto_escalate_after_minutes INTEGER,
  require_keywords TEXT[],
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de histórico de escalonamento
CREATE TABLE public.escalation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  from_department agent_department NOT NULL,
  to_department agent_department NOT NULL,
  from_agent_id UUID REFERENCES auth.users(id),
  to_agent_id UUID REFERENCES auth.users(id),
  rule_id UUID REFERENCES public.escalation_rules(id),
  escalation_type TEXT NOT NULL CHECK (escalation_type IN ('explicit', 'silent', 'manual')),
  reason TEXT,
  customer_notified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.escalation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_history ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar configurações
CREATE POLICY "Admins can manage escalation settings"
ON public.escalation_settings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Editors podem ver configurações
CREATE POLICY "Editors can view escalation settings"
ON public.escalation_settings FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

-- Admins podem gerenciar regras
CREATE POLICY "Admins can manage escalation rules"
ON public.escalation_rules FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Editors podem ver regras ativas
CREATE POLICY "Editors can view active escalation rules"
ON public.escalation_rules FOR SELECT
TO authenticated
USING ((enabled = true) AND (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin')));

-- Agents podem ver histórico
CREATE POLICY "Agents can view escalation history"
ON public.escalation_history FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

-- Agents podem inserir histórico
CREATE POLICY "Agents can insert escalation history"
ON public.escalation_history FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

-- Inserir configuração padrão
INSERT INTO public.escalation_settings (mode, enabled) VALUES ('explicit', true);

-- Inserir regras padrão de escalonamento
INSERT INTO public.escalation_rules (from_department, to_department, priority, description, conditions) VALUES
  ('comercial', 'tecnico', 1, 'Vendas para Técnico quando cliente relata problema técnico', '{"keywords": ["não funciona", "caiu", "lento", "problema", "defeito"]}'),
  ('comercial', 'financeiro', 2, 'Vendas para Financeiro quando cliente menciona pagamento', '{"keywords": ["boleto", "pagar", "débito", "fatura", "atraso"]}'),
  ('comercial', 'logistica', 3, 'Vendas para Logística quando precisa agendar instalação', '{"keywords": ["agendar", "instalação", "técnico", "visita", "quando vem"]}'),
  ('tecnico', 'financeiro', 1, 'Técnico para Financeiro quando detecta bloqueio por inadimplência', '{"keywords": ["bloqueado", "suspenso", "inadimplente", "pagamento"]}'),
  ('financeiro', 'comercial', 1, 'Financeiro para Vendas quando cliente quer mudar/contratar plano', '{"keywords": ["mudar plano", "upgrade", "contratar", "novo plano"]}')