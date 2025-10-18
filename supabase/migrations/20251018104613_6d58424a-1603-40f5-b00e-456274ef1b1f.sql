-- Melhorias no Fluxo do Luan (Support Tech Agent)

-- 1. Adicionar saudação inicial e apresentação (step_order 0)
INSERT INTO agent_flow_steps (
  agent_type, step_key, step_order, question, instruction, 
  response_options, next_step_map, awaits_response, is_active
) VALUES (
  'support-tech-agent', 
  'saudacao_inicial', 
  0,
  'Olá! 👋 Sou o Luan, do Suporte Técnico da SUPERNET. Vou te ajudar a resolver o problema com sua internet. Para começar, me conta: sua internet está sem conexão no momento?',
  'Seja cordial e empático. Esta é a primeira interação, então estabeleça confiança.',
  '["sim", "nao", "parcial"]',
  '{"sim": "cenario_a_verificar_luzes", "nao": "cenario_outras_duvidas", "parcial": "cenario_a_verificar_luzes"}',
  true,
  true
);

-- 2. Atualizar step_order dos steps existentes (+1)
UPDATE agent_flow_steps 
SET step_order = step_order + 1 
WHERE agent_type = 'support-tech-agent' AND step_order >= 1;

-- 3. Adicionar opção "não sei" para verificação de luzes
UPDATE agent_flow_steps
SET 
  response_options = '["sim", "nao", "nao_sei"]',
  next_step_map = '{"sim": "cenario_a_verificar_luz_vermelha", "nao": "cenario_a_verificar_energia", "nao_sei": "cenario_a_explicar_luzes"}',
  question = 'Consegue ver as luzes do seu equipamento (roteador/modem)? 💡',
  instruction = 'Pergunte de forma clara. Se o cliente não souber, vamos orientá-lo.'
WHERE step_key = 'cenario_a_verificar_luzes';

-- 4. Criar step para explicar como identificar as luzes
INSERT INTO agent_flow_steps (
  agent_type, step_key, step_order, question, instruction,
  response_options, next_step_map, awaits_response, is_active
) VALUES (
  'support-tech-agent',
  'cenario_a_explicar_luzes',
  2,
  'Sem problemas! O equipamento é uma caixinha preta ou branca com luzinhas coloridas. Geralmente fica perto do local onde a fibra entra na casa. Conseguiu localizar?',
  'Seja didático e paciente. Use linguagem simples.',
  '["sim", "nao"]',
  '{"sim": "cenario_a_verificar_luzes", "nao": "cenario_a_oferecer_ligacao"}',
  true,
  true
);

-- 5. Melhorar instrução do step de verificar energia
UPDATE agent_flow_steps
SET 
  instruction = 'Seja paciente e detalhista. Oriente o cliente a verificar: 1) Se o cabo de energia está bem conectado, 2) Se a tomada está funcionando (pode testar com outro aparelho), 3) Se há luz na tomada.',
  question = 'Vamos verificar a energia. O roteador (caixinha com antenas) está conectado na tomada e ligado? A tomada está funcionando? ⚡'
WHERE step_key = 'cenario_a_verificar_energia';

-- 6. Adicionar opção "não sei" para luz vermelha (PON)
UPDATE agent_flow_steps
SET
  response_options = '["sim", "nao", "nao_sei"]',
  next_step_map = '{"sim": "cenario_a_aguardando_manipulacao", "nao": "cenario_a_transferir_sem_luz_vermelha", "nao_sei": "cenario_a_explicar_luz_pon"}',
  question = 'Perfeito! Agora, consegue ver uma luz chamada PON ou LOS no equipamento? Se estiver vermelha ou piscando, me avise. 🔴'
WHERE step_key = 'cenario_a_verificar_luz_vermelha';

-- 7. Criar step para explicar luz PON
INSERT INTO agent_flow_steps (
  agent_type, step_key, step_order, question, instruction,
  response_options, next_step_map, awaits_response, is_active
) VALUES (
  'support-tech-agent',
  'cenario_a_explicar_luz_pon',
  5,
  'A luz PON/LOS geralmente fica na frente ou lateral do equipamento. Quando está vermelha ou piscando, indica problema na fibra. Você consegue ver essa luz? Se sim, está vermelha, verde ou apagada?',
  'Explique com calma. As opções são: vermelha (problema), verde (ok), apagada (sem energia/problema grave).',
  '["vermelha", "verde", "apagada", "nao_vejo"]',
  '{"vermelha": "cenario_a_aguardando_manipulacao", "verde": "cenario_a_verificar_resultado_manipulacao", "apagada": "cenario_a_verificar_energia", "nao_vejo": "cenario_a_oferecer_ligacao"}',
  true,
  true
);

-- 8. Adicionar step para oferecer ligação quando há muita dificuldade
INSERT INTO agent_flow_steps (
  agent_type, step_key, step_order, question, instruction,
  response_options, next_step_map, awaits_response, is_active
) VALUES (
  'support-tech-agent',
  'cenario_a_oferecer_ligacao',
  8,
  'Entendo que está difícil identificar por aqui. Vou transferir você para um atendimento por ligação, onde podemos te orientar passo a passo de forma mais rápida. Pode ser?',
  'Seja empático. O cliente pode estar frustrado. Ofereça a ligação como solução, não como problema.',
  '["sim", "nao"]',
  '{"sim": "transferir_ligacao", "nao": "cenario_a_agendar_visita"}',
  true,
  true
);

-- 9. Melhorar step de resultado da manipulação
UPDATE agent_flow_steps
SET
  next_step_map = '{"sim": "cenario_a_resolvido", "nao": "cenario_a_tentar_reinicio"}',
  question = 'A luz ficou verde? Agora tenta acessar a internet (abre um site ou aplicativo). Funcionou? 🌐'
WHERE step_key = 'cenario_a_verificar_resultado_manipulacao';

-- 10. Criar step para tentar reinício quando luz verde mas sem internet
INSERT INTO agent_flow_steps (
  agent_type, step_key, step_order, question, instruction,
  response_options, next_step_map, awaits_response, is_active
) VALUES (
  'support-tech-agent',
  'cenario_a_tentar_reinicio',
  10,
  'A luz está ok, mas a internet não funciona. Vamos tentar reiniciar o equipamento: 1) Desconecte o cabo de energia por 30 segundos, 2) Conecte novamente, 3) Aguarde 2 minutos. Pode fazer isso?',
  'Seja claro e sequencial. Esse é um passo crítico para resolver muitos problemas.',
  '["sim", "nao"]',
  '{"sim": "cenario_a_aguardar_reinicio", "nao": "cenario_a_agendar_visita"}',
  true,
  true
);

-- 11. Criar step para aguardar reinício
INSERT INTO agent_flow_steps (
  agent_type, step_key, step_order, question, instruction,
  response_options, next_step_map, awaits_response, is_active
) VALUES (
  'support-tech-agent',
  'cenario_a_aguardar_reinicio',
  11,
  '⏳ Aguarde cerca de 2 minutos para o equipamento reiniciar completamente. Quando as luzes pararem de piscar e ficarem estáveis, testa a internet novamente. Funcionou?',
  'Dê tempo ao cliente. Não apresse. Reinícios levam tempo.',
  '["sim", "nao", "ainda_reiniciando"]',
  '{"sim": "cenario_a_resolvido", "nao": "cenario_a_agendar_visita", "ainda_reiniciando": "cenario_a_aguardar_reinicio"}',
  true,
  true
);

-- 12. Criar step para agendar visita técnica
INSERT INTO agent_flow_steps (
  agent_type, step_key, step_order, question, instruction,
  response_options, next_step_map, awaits_response, is_active
) VALUES (
  'support-tech-agent',
  'cenario_a_agendar_visita',
  12,
  'Entendo a situação. Pelo que identificamos, precisamos de uma visita técnica para resolver. Vou agendar um técnico para ir até você. Qual período é melhor: manhã (8h-12h) ou tarde (13h-18h)?',
  'Seja resolutivo e empático. O cliente já tentou várias coisas e está frustrado. Mostre que a visita técnica é a solução definitiva.',
  '["manha", "tarde", "qualquer"]',
  '{"manha": "transferir_logistica", "tarde": "transferir_logistica", "qualquer": "transferir_logistica"}',
  true,
  true
);

-- 13. Criar step para outras dúvidas (quando cliente diz que internet funciona)
INSERT INTO agent_flow_steps (
  agent_type, step_key, step_order, question, instruction,
  response_options, next_step_map, awaits_response, is_active
) VALUES (
  'support-tech-agent',
  'cenario_outras_duvidas',
  13,
  'Que bom que a internet está funcionando! Em que posso ajudar então? Tem alguma dúvida sobre velocidade, configuração do Wi-Fi ou outro assunto técnico?',
  'O cliente pode ter outras dúvidas. Seja receptivo e ofereça ajuda.',
  '["velocidade", "wifi", "outros", "nada"]',
  '{"velocidade": "transferir_suporte_avancado", "wifi": "ajuda_wifi", "outros": "transferir_suporte_avancado", "nada": "encerrar_cordial"}',
  true,
  true
);

-- 14. Adicionar response_variations para tornar conversas mais naturais
UPDATE agent_flow_steps
SET response_variations = '{
  "greeting": [
    "Olá! 👋 Tudo bem?",
    "Oi! 😊 Prazer em atender!",
    "E aí! Como vai?"
  ],
  "confirmation": [
    "Perfeito! ✅",
    "Entendido! 👍",
    "Ok, vamos lá! 🚀"
  ],
  "waiting": [
    "Aguarde um momento... ⏳",
    "Deixa eu verificar isso pra você 🔍",
    "Um segundo, por favor 📋"
  ],
  "empathy": [
    "Entendo sua frustração 😔",
    "Sei que é chato quando a internet não funciona 😕",
    "Vamos resolver isso juntos! 💪"
  ],
  "success": [
    "Ótimo! 🎉",
    "Conseguimos! ✨",
    "Pronto! Problema resolvido! 🎊"
  ]
}'
WHERE agent_type = 'support-tech-agent';