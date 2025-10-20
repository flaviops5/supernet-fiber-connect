-- Criar cenário DNS no agent_flow_steps

-- Step 1: Identificar problema DNS
INSERT INTO public.agent_flow_steps (
  agent_type,
  subject_key,
  step_key,
  step_order,
  question,
  instruction,
  awaits_response,
  response_options,
  next_step_map,
  is_active
) VALUES (
  'support-tech-agent',
  'dns',
  'dns_problema_inicio',
  1,
  'Entendi que alguns sites abrem e outros não. Isso pode ser um problema de DNS. O DNS funciona como uma "lista telefônica da internet", convertendo nomes de sites em endereços numéricos. Quando não funciona bem, alguns sites podem não abrir. Você tem mais de um roteador ou repetidor em sua casa/empresa?',
  'Explicar DNS de forma simples e verificar se cliente tem múltiplos equipamentos de rede.',
  true,
  '["Sim, tenho mais equipamentos", "Não, só tenho um roteador", "Não sei"]',
  '{
    "Sim, tenho mais equipamentos": "dns_desligar_rede",
    "Não, só tenho um roteador": "dns_unico_equipamento",
    "Não sei": "dns_desligar_rede"
  }',
  true
);

-- Step 2a: Procedimento com múltiplos equipamentos
INSERT INTO public.agent_flow_steps (
  agent_type,
  subject_key,
  step_key,
  step_order,
  question,
  instruction,
  awaits_response,
  response_options,
  next_step_map,
  is_active
) VALUES (
  'support-tech-agent',
  'dns',
  'dns_desligar_rede',
  2,
  'Vamos fazer o seguinte: desligue TODA a rede por 1 minuto, incluindo todos os roteadores, repetidores e celulares que estão com problema. Depois de 1 minuto, religue primeiro o roteador principal, aguarde 1 minuto e então religue os demais equipamentos. Me avise quando tiver feito isso.',
  'Instruir cliente a desligar toda a rede e religar na ordem correta.',
  true,
  '["Fiz o procedimento", "Preciso de ajuda para fazer isso"]',
  '{
    "Fiz o procedimento": "dns_verificar_resultado",
    "Preciso de ajuda para fazer isso": "dns_transferir_especialista"
  }',
  true
);

-- Step 2b: Procedimento com único equipamento
INSERT INTO public.agent_flow_steps (
  agent_type,
  subject_key,
  step_key,
  step_order,
  question,
  instruction,
  awaits_response,
  response_options,
  next_step_map,
  is_active
) VALUES (
  'support-tech-agent',
  'dns',
  'dns_unico_equipamento',
  2,
  'Vamos tentar reiniciar o roteador e seus dispositivos. Desligue o roteador e os celulares/computadores com problema por 1 minuto. Depois religue primeiro o roteador, aguarde 1 minuto e religue os outros dispositivos. Me avise quando terminar.',
  'Instruir reinicialização simples para cliente com apenas um roteador.',
  true,
  '["Fiz o procedimento", "Preciso de ajuda"]',
  '{
    "Fiz o procedimento": "dns_verificar_resultado",
    "Preciso de ajuda": "dns_transferir_especialista"
  }',
  true
);

-- Step 3: Verificar resultado
INSERT INTO public.agent_flow_steps (
  agent_type,
  subject_key,
  step_key,
  step_order,
  question,
  instruction,
  awaits_response,
  response_options,
  next_step_map,
  is_active
) VALUES (
  'support-tech-agent',
  'dns',
  'dns_verificar_resultado',
  3,
  'A navegação voltou ao normal? Todos os sites estão abrindo agora?',
  'Verificar se o procedimento resolveu o problema.',
  true,
  '["Sim, voltou ao normal", "Não, continua com problema", "Melhorou mas ainda tem alguns sites"]',
  '{
    "Sim, voltou ao normal": "dns_problema_resolvido",
    "Não, continua com problema": "dns_transferir_especialista",
    "Melhorou mas ainda tem alguns sites": "dns_transferir_especialista"
  }',
  true
);

-- Step 4a: Problema resolvido
INSERT INTO public.agent_flow_steps (
  agent_type,
  subject_key,
  step_key,
  step_order,
  question,
  instruction,
  awaits_response,
  response_options,
  next_step_map,
  is_active
) VALUES (
  'support-tech-agent',
  'dns',
  'dns_problema_resolvido',
  4,
  'Que ótimo! Fico feliz que resolvemos o problema. Posso ajudar em algo mais?',
  'Confirmar resolução e oferecer ajuda adicional.',
  true,
  '["Sim, preciso de mais ajuda", "Não, era só isso", "Obrigado"]',
  '{
    "Sim, preciso de mais ajuda": "end",
    "Não, era só isso": "end",
    "Obrigado": "end"
  }',
  true
);

-- Step 4b: Transferir para especialista
INSERT INTO public.agent_flow_steps (
  agent_type,
  subject_key,
  step_key,
  step_order,
  question,
  instruction,
  awaits_response,
  response_options,
  next_step_map,
  is_active
) VALUES (
  'support-tech-agent',
  'dns',
  'dns_transferir_especialista',
  4,
  'Vou transferir você para um especialista que poderá fazer configurações mais avançadas. Pode demorar até 2 minutos para iniciar o novo atendimento. Manteremos seu chamado aberto.',
  'Transferir para colaborador humano para análise mais detalhada. Usar função apropriada de transferência.',
  false,
  '[]',
  '{}',
  true
);