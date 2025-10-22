-- Remove cenários antigos de IPv6
DELETE FROM public.agent_flow_steps
WHERE subject_key = 'ipv6_apps_moveis';

-- Cenário IPv6: Início
INSERT INTO public.agent_flow_steps (
  subject_key, step_key, question, instruction, awaits_response, next_step_map, step_order, is_active
) VALUES (
  'ipv6_apps_moveis',
  'cenario_ipv6_inicio',
  'Entendo que alguns aplicativos não estão abrindo no seu celular quando conectado no Wi-Fi. Isso funciona normalmente quando você está usando a rede móvel (4G/5G)?',
  'Identificar se o problema ocorre apenas no Wi-Fi e funciona na rede móvel',
  true,
  '{"sim": "cenario_ipv6_confirma", "funciona": "cenario_ipv6_confirma", "yes": "cenario_ipv6_confirma", "nao": "cenario_ipv6_confirma", "no": "cenario_ipv6_confirma"}'::jsonb,
  1,
  true
);

-- Cenário IPv6: Confirmação e escalar
INSERT INTO public.agent_flow_steps (
  subject_key, step_key, question, instruction, awaits_response, step_order, is_active
) VALUES (
  'ipv6_apps_moveis',
  'cenario_ipv6_confirma',
  'Perfeito, isso indica um problema com IPv6 no seu roteador. Para resolver, precisamos desativar o IPv6 nas configurações do equipamento. Vou transferir você para um de nossos técnicos que vai te ajudar com isso agora mesmo. Um momento, por favor.',
  '[ESCALAR_PARA_HUMANO] Problema identificado: IPv6. Cliente relata que apps não abrem no Wi-Fi mas funcionam na rede móvel. Solução: desativar IPv6 no roteador.',
  false,
  2,
  true
);