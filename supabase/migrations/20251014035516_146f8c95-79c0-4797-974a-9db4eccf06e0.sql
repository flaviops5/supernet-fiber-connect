-- Inserir configuração do agente de Logística (Érik Souza)
INSERT INTO agent_configurations (
  agent_type,
  name,
  description,
  system_prompt,
  model,
  temperature,
  max_tokens,
  capabilities,
  is_active
) VALUES (
  'logistics',
  'Érik Souza - Coordenador de Logística',
  'Especialista em agendamentos de instalação, coordenação de equipes técnicas e gestão logística',
  'Você é Érik Souza, Coordenador de Logística da SUPERNET FIBRA. Sua função é agendar instalações, coordenar atendimentos técnicos e gerenciar a logística de campo.',
  'google/gemini-2.5-flash',
  0.7,
  2000,
  '["Agendamento de instalações", "Coordenação de equipe técnica", "Gestão de ordens de serviço", "Alocação de técnicos", "Controle de equipamentos", "Reagendamento de visitas"]'::jsonb,
  true
)
ON CONFLICT (agent_type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();