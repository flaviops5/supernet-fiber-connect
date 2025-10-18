-- Ajustes específicos no fluxo do agente Luan

-- 1. Atualizar saudacao_inicial (remover pergunta redundante)
UPDATE agent_flow_steps
SET question = 'Olá! 👋 Sou o Luan, do Suporte Técnico da SUPERNET. Vou te ajudar a resolver o problema com sua internet o mais rápido possível.',
    instruction = 'Saudação inicial. A Cloé já informou qual é o problema, não pergunte novamente. Seja direto e parta para o diagnóstico.'
WHERE step_key = 'saudacao_inicial'
  AND agent_type = 'support-tech-agent';

-- 2. Atualizar cenario_a_verificar_luz_vermelha (remover PON)
UPDATE agent_flow_steps
SET question = 'Perfeito! Agora, consegue ver uma luz chamada LOS no equipamento? Se estiver vermelha piscando, me avise. 🔴',
    instruction = 'Verificar especificamente a luz LOS. A luz LOS quando está vermelha piscando indica problema na fibra ou conectores. Se estiver apagada, há sinal na ONU.'
WHERE step_key = 'cenario_a_verificar_luz_vermelha'
  AND agent_type = 'support-tech-agent';

-- 3. Atualizar cenario_a_explicar_luz_pon (remover PON e corrigir informação sobre LOS)
UPDATE agent_flow_steps
SET question = 'A luz LOS geralmente fica na frente ou lateral do equipamento. Ela fica sempre vermelha piscando quando há problema na fibra ou nos conectores. Se estiver apagada, significa que há sinal na ONU. Você consegue ver essa luz? Está vermelha piscando ou apagada?',
    instruction = 'Explicar sobre a luz LOS: sempre vermelha piscando quando há problema (não vermelha OU piscando). Apagada = sinal OK. Vermelha piscando = problema na fibra ou conectores.',
    response_options = '{"0": "vermelha_piscando", "1": "apagada", "2": "nao_encontro"}'::jsonb
WHERE step_key = 'cenario_a_explicar_luz_pon'
  AND agent_type = 'support-tech-agent';

-- 4. Atualizar cenario_a_aguardar_reinicio (trocar "Funcionou?" por "me avise se deu certo")
UPDATE agent_flow_steps
SET question = '⏳ Aguarde cerca de 2 minutos para o equipamento reiniciar completamente. Quando as luzes pararem de piscar e ficarem estáveis, teste a internet novamente e me avise se deu certo.',
    instruction = 'Aguardar que o cliente teste após o reinício. Não perguntar diretamente "Funcionou?", deixar o cliente responder naturalmente.'
WHERE step_key = 'cenario_a_aguardar_reinicio'
  AND agent_type = 'support-tech-agent';

-- 5. Atualizar cenario_a_agendar_visita (mudar para abertura de OS)
UPDATE agent_flow_steps
SET question = 'Entendo a situação. Pelo que identificamos, precisamos de uma visita técnica em sua residência para resolver. Vou abrir um atendimento e passar para o setor de logística. Pode demorar um pouco para responder, mas a OS eu já vou abrir agora.',
    instruction = 'Informar que vai abrir OS e transferir para logística. Não perguntar período preferido, apenas avisar sobre o processo.',
    tool_calls = '[{"tool": "criar_atendimento_ixc", "description": "Abrir OS no IXC para visita técnica"}]'::jsonb,
    response_options = '{"0": "ok_aguardo", "1": "tenho_duvida"}'::jsonb,
    next_step_map = '{"ok_aguardo": "encerramento_com_os", "tenho_duvida": "esclarecer_duvida_os"}'::jsonb
WHERE step_key = 'cenario_a_agendar_visita'
  AND agent_type = 'support-tech-agent';