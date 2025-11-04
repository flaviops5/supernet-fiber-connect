-- Criar tabela kb_scenarios para testes LLM
CREATE TABLE public.kb_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  expected_agent TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.kb_scenarios ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Admins podem gerenciar cenários de teste"
  ON public.kb_scenarios
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editores podem visualizar cenários"
  ON public.kb_scenarios
  FOR SELECT
  USING (has_role(auth.uid(), 'editor'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

-- Inserir cenários de teste iniciais
INSERT INTO public.kb_scenarios (category, name, prompt, expected_agent, metadata) VALUES
  -- Cenários Técnicos
  ('technical', 'Cliente Offline - Sem Energia', 'Minha internet caiu e o modem está apagado', 'luan', '{"severity": "high", "expected_tools": ["test_equipment_connectivity"]}'::jsonb),
  ('technical', 'Cliente Offline - Sem Conexão', 'Não tenho internet, o modem está ligado mas não conecta', 'luan', '{"severity": "high", "expected_tools": ["get_onu_signal_status"]}'::jsonb),
  ('technical', 'Equipamento Travado', 'Internet muito lenta, sites não abrem', 'luan', '{"severity": "medium", "expected_tools": ["reboot_client_equipment"]}'::jsonb),
  ('technical', 'Sinal Fraco', 'Internet cai toda hora, fica instável', 'luan', '{"severity": "high", "expected_tools": ["get_onu_signal_status"]}'::jsonb),
  ('technical', 'Lentidão', 'Internet está muito devagar, demora pra carregar', 'luan', '{"severity": "medium", "expected_tools": ["test_equipment_connectivity"]}'::jsonb),
  
  -- Cenários Financeiros
  ('financial', 'Boleto em Aberto', 'Preciso do boleto pra pagar', 'julia', '{"severity": "low", "expected_tools": ["send_payment_to_customer"]}'::jsonb),
  ('financial', 'Negociação de Débito', 'Estou com boletos atrasados, posso negociar?', 'julia', '{"severity": "medium", "expected_tools": ["ixc_client_lookup"]}'::jsonb),
  ('financial', 'PIX para Pagamento', 'Pode me enviar o PIX para pagamento?', 'julia', '{"severity": "low", "expected_tools": ["send_payment_to_customer"]}'::jsonb),
  ('financial', 'Dúvida sobre Fatura', 'Por que minha conta veio mais cara esse mês?', 'julia', '{"severity": "low", "expected_tools": ["ixc_client_lookup"]}'::jsonb),
  
  -- Cenários Comerciais
  ('sales', 'Novo Cliente - Consulta', 'Quero contratar internet fibra', 'vicente', '{"severity": "high", "expected_tools": ["chatbot_cep_lookup"]}'::jsonb),
  ('sales', 'Upgrade de Plano', 'Quero aumentar minha velocidade', 'vicente', '{"severity": "medium", "expected_tools": []}'::jsonb),
  ('sales', 'Cancelamento', 'Quero cancelar meu plano', 'vicente', '{"severity": "high", "expected_tools": []}'::jsonb),
  ('sales', 'Consulta de Cobertura', 'Vocês atendem na minha região?', 'vicente', '{"severity": "medium", "expected_tools": ["chatbot_cep_lookup"]}'::jsonb),
  
  -- Cenários Ambíguos (teste de roteamento)
  ('mixed', 'Problema Genérico', 'Tô com problema aqui', 'cloe', '{"severity": "medium", "note": "Deve solicitar mais informações"}'::jsonb),
  ('mixed', 'Múltiplas Intenções', 'Internet caiu e também preciso do boleto', 'cloe', '{"severity": "high", "note": "Deve priorizar técnico primeiro"}'::jsonb);

-- Criar índices para performance
CREATE INDEX idx_kb_scenarios_category ON public.kb_scenarios(category);
CREATE INDEX idx_kb_scenarios_active ON public.kb_scenarios(is_active);
CREATE INDEX idx_kb_scenarios_expected_agent ON public.kb_scenarios(expected_agent);