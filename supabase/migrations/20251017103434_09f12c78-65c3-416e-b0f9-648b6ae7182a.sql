-- Create table for tech flow configuration
CREATE TABLE public.tech_flow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_key TEXT NOT NULL UNIQUE,
  step_order INTEGER NOT NULL,
  question TEXT NOT NULL,
  instruction TEXT,
  awaits_response BOOLEAN DEFAULT true,
  response_options JSONB DEFAULT '[]'::jsonb,
  tool_calls JSONB DEFAULT '[]'::jsonb,
  next_step_map JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tech_flow_steps ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage tech flow steps"
  ON public.tech_flow_steps
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Editors can view
CREATE POLICY "Editors can view tech flow steps"
  ON public.tech_flow_steps
  FOR SELECT
  USING (
    has_role(auth.uid(), 'editor'::user_role) OR 
    has_role(auth.uid(), 'admin'::user_role)
  );

-- Insert Scenario A flow
INSERT INTO public.tech_flow_steps (step_key, step_order, question, instruction, awaits_response, response_options, tool_calls, next_step_map, metadata) VALUES
('cenario_a_verificar_luzes', 1, 
 'As luzes do seu equipamento estão acesas? 💡', 
 NULL, 
 true,
 '["sim", "nao"]'::jsonb,
 '[]'::jsonb,
 '{"sim": "cenario_a_verificar_luz_vermelha", "nao": "cenario_a_verificar_energia"}'::jsonb,
 '{"scenario": "A", "icon": "💡"}'::jsonb),

('cenario_a_verificar_energia', 2,
 'O equipamento está ligado na tomada? ⚡',
 'Aperte bem as pontas do cabo na tomada e no equipamento. Se estiver em uma régua, verifique se ela está ligada. Mexa nos cabos para ver se tem algo com mal contato.',
 true,
 '["sim", "nao"]'::jsonb,
 '[]'::jsonb,
 '{"sim": "cenario_a_verificar_luz_vermelha", "nao": "cenario_a_sem_energia"}'::jsonb,
 '{"scenario": "A", "icon": "⚡"}'::jsonb),

('cenario_a_sem_energia', 3,
 'Conseguiu resolver o problema de energia?',
 'Verifique se há energia elétrica na sua casa. Teste outras tomadas. Se necessário, verifique o disjuntor.',
 true,
 '["sim", "nao"]'::jsonb,
 '[]'::jsonb,
 '{"sim": "cenario_a_verificar_luz_vermelha", "nao": "cenario_a_transferir_energia"}'::jsonb,
 '{"scenario": "A", "icon": "⚡"}'::jsonb),

('cenario_a_verificar_luz_vermelha', 4,
 'Há uma luz vermelha piscando no equipamento (LOS/PON)? 🔴',
 NULL,
 true,
 '["sim", "nao"]'::jsonb,
 '[{"name": "criar_atendimento_ixc", "condition": "nao", "params": {"priority": "high", "subject": "Equipamento offline sem sinal óptico"}}]'::jsonb,
 '{"sim": "cenario_a_aguardando_manipulacao", "nao": "cenario_a_transferir_sem_luz_vermelha"}'::jsonb,
 '{"scenario": "A", "icon": "🔴"}'::jsonb),

('cenario_a_aguardando_manipulacao', 5,
 'A luz vermelha parou de piscar e ficou verde? 🟢',
 'Vou te ensinar a mexer no conector da fibra óptica:\n\n1. Localize o cabo fino (fibra) conectado ao equipamento\n2. Gire DELICADAMENTE o conector para a esquerda e direita (não force!)\n3. Empurre o conector para dentro com cuidado\n4. Observe se a luz vermelha para de piscar\n\n⚠️ IMPORTANTE: Não puxe o cabo! Apenas gire e empurre o conector.',
 true,
 '["sim", "nao"]'::jsonb,
 '[{"name": "test-equipment-connectivity", "condition": "sim"}]'::jsonb,
 '{"sim": "cenario_a_verificar_resultado_manipulacao", "nao": "cenario_a_transferir_luz_vermelha_persistente"}'::jsonb,
 '{"scenario": "A", "icon": "🔧"}'::jsonb),

('cenario_a_verificar_resultado_manipulacao', 6,
 'Consegue acessar a internet normalmente agora? 🌐',
 NULL,
 true,
 '["sim", "nao"]'::jsonb,
 '[]'::jsonb,
 '{"sim": "cenario_a_resolvido", "nao": "cenario_a_transferir_online_mas_nao_navega"}'::jsonb,
 '{"scenario": "A", "icon": "🌐"}'::jsonb);

-- Create trigger for updated_at
CREATE TRIGGER update_tech_flow_steps_updated_at
  BEFORE UPDATE ON public.tech_flow_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();