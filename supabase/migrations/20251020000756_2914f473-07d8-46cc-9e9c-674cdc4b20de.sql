-- Criar tabela de assuntos de fluxo para agrupar cenários
CREATE TABLE IF NOT EXISTS public.agent_flow_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type agent_type NOT NULL,
  subject_key TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📁',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(agent_type, subject_key)
);

-- Adicionar campo subject_key na tabela de steps
ALTER TABLE public.agent_flow_steps 
ADD COLUMN IF NOT EXISTS subject_key TEXT;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_agent_flow_subjects_agent_type 
ON public.agent_flow_subjects(agent_type, is_active);

CREATE INDEX IF NOT EXISTS idx_agent_flow_steps_subject 
ON public.agent_flow_steps(agent_type, subject_key, is_active);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_agent_flow_subjects_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_flow_subjects_updated_at
  BEFORE UPDATE ON public.agent_flow_subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_flow_subjects_timestamp();

-- RLS Policies
ALTER TABLE public.agent_flow_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar assuntos de fluxo"
  ON public.agent_flow_subjects
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Editores podem visualizar e criar assuntos"
  ON public.agent_flow_subjects
  FOR SELECT
  USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Editores podem inserir assuntos"
  ON public.agent_flow_subjects
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

-- Inserir assuntos padrão para o Luan (support-tech-agent)
INSERT INTO public.agent_flow_subjects (agent_type, subject_key, subject_name, description, icon, display_order) VALUES
  ('support-tech-agent', 'energia', 'Energia', 'Problemas relacionados a oscilações e interrupções de energia', '⚡', 1),
  ('support-tech-agent', 'wifi', 'Wi-Fi', 'Problemas de conectividade, velocidade e alcance do Wi-Fi', '📶', 2),
  ('support-tech-agent', 'dns_conectividade', 'DNS/Conectividade', 'Problemas de DNS, offline e internet lenta', '🌐', 3),
  ('support-tech-agent', 'equipamento', 'Equipamento', 'Problemas com equipamentos, ONU e necessidade de reset', '🔧', 4)
ON CONFLICT (agent_type, subject_key) DO NOTHING;

COMMENT ON TABLE public.agent_flow_subjects IS 'Assuntos que agrupam cenários de fluxo por tema (Energia, Wi-Fi, DNS, etc)';
COMMENT ON COLUMN public.agent_flow_subjects.subject_key IS 'Chave única do assunto dentro do agente (ex: energia, wifi)';
COMMENT ON COLUMN public.agent_flow_steps.subject_key IS 'Relaciona o step ao assunto correspondente';