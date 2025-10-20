-- Adicionar coluna subject_key na tabela de aprovações
ALTER TABLE agent_flow_scenario_approvals
ADD COLUMN subject_key TEXT;

-- Criar índice para melhor performance
CREATE INDEX idx_approvals_subject_key ON agent_flow_scenario_approvals(subject_key);

-- Atualizar todas as aprovações existentes para associar ao assunto "energia"
-- Assumindo que todas as 101 aprovações existentes são de energia
UPDATE agent_flow_scenario_approvals
SET subject_key = 'energia'
WHERE subject_key IS NULL;

-- Criar cenários de Wi-Fi baseados na documentação
-- Cenário 1: Wi-Fi Lento
INSERT INTO agent_flow_steps (agent_type, subject_key, step_key, step_order, question, instruction, awaits_response, response_options, next_step_map, metadata, is_active)
VALUES 
('support-tech-agent', 'wifi', 'wifi_slow_start', 1, 
 'Entendo que sua internet Wi-Fi está lenta. Vamos verificar algumas coisas para resolver isso. Primeiro, quantos dispositivos estão conectados ao Wi-Fi agora?',
 'Iniciar diagnóstico de Wi-Fi lento. Perguntar sobre quantidade de dispositivos conectados.',
 true,
 jsonb_build_array(
   jsonb_build_object('label', '1-3 dispositivos', 'value', 'few_devices', 'next_step', 'wifi_slow_router_position'),
   jsonb_build_object('label', '4-7 dispositivos', 'value', 'medium_devices', 'next_step', 'wifi_slow_interference'),
   jsonb_build_object('label', '8+ dispositivos', 'value', 'many_devices', 'next_step', 'wifi_slow_overload')
 ),
 jsonb_build_object(
   'few_devices', 'wifi_slow_router_position',
   'medium_devices', 'wifi_slow_interference',
   'many_devices', 'wifi_slow_overload'
 ),
 jsonb_build_object('category', 'wifi', 'scenario', 'slow'),
 true),

('support-tech-agent', 'wifi', 'wifi_slow_router_position', 2,
 'Onde está localizado seu roteador? Ele está em local central da casa?',
 'Verificar posicionamento do roteador para poucos dispositivos.',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Sim, está centralizado', 'value', 'centralized', 'next_step', 'wifi_slow_distance_check'),
   jsonb_build_object('label', 'Não, está em canto/quarto', 'value', 'not_centralized', 'next_step', 'wifi_slow_reposition')
 ),
 jsonb_build_object(
   'centralized', 'wifi_slow_distance_check',
   'not_centralized', 'wifi_slow_reposition'
 ),
 jsonb_build_object('category', 'wifi', 'scenario', 'slow'),
 true),

('support-tech-agent', 'wifi', 'wifi_slow_reposition', 3,
 'Recomendo reposicionar o roteador para um local mais central da casa, longe de paredes grossas e objetos metálicos. Isso pode melhorar significativamente o sinal. Consegue fazer esse teste?',
 'Orientar sobre reposicionamento do roteador.',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Sim, vou reposicionar', 'value', 'will_reposition', 'next_step', 'wifi_slow_test_speed'),
   jsonb_build_object('label', 'Não posso mover agora', 'value', 'cannot_reposition', 'next_step', 'wifi_slow_alternative')
 ),
 jsonb_build_object(
   'will_reposition', 'wifi_slow_test_speed',
   'cannot_reposition', 'wifi_slow_alternative'
 ),
 jsonb_build_object('category', 'wifi', 'scenario', 'slow'),
 true),

-- Cenário 2: Não Conecta no Wi-Fi
('support-tech-agent', 'wifi', 'wifi_no_connect_start', 1,
 'Vi que você está com dificuldade para conectar no Wi-Fi. O nome da rede Wi-Fi aparece na lista de redes disponíveis do seu dispositivo?',
 'Iniciar diagnóstico de conexão Wi-Fi. Verificar se a rede aparece.',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Sim, aparece mas não conecta', 'value', 'visible_no_connect', 'next_step', 'wifi_no_connect_password'),
   jsonb_build_object('label', 'Não aparece na lista', 'value', 'not_visible', 'next_step', 'wifi_no_connect_broadcast'),
   jsonb_build_object('label', 'Aparece mas pede senha errada', 'value', 'wrong_password', 'next_step', 'wifi_no_connect_verify_password')
 ),
 jsonb_build_object(
   'visible_no_connect', 'wifi_no_connect_password',
   'not_visible', 'wifi_no_connect_broadcast',
   'wrong_password', 'wifi_no_connect_verify_password'
 ),
 jsonb_build_object('category', 'wifi', 'scenario', 'no_connect'),
 true),

('support-tech-agent', 'wifi', 'wifi_no_connect_password', 2,
 'Você está usando a senha correta? A senha padrão geralmente está na etiqueta do roteador. Ela diferencia maiúsculas de minúsculas.',
 'Verificar se senha está correta.',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Tenho certeza que a senha está certa', 'value', 'password_correct', 'next_step', 'wifi_no_connect_device_issue'),
   jsonb_build_object('label', 'Vou verificar a senha novamente', 'value', 'verify_password', 'next_step', 'wifi_no_connect_test')
 ),
 jsonb_build_object(
   'password_correct', 'wifi_no_connect_device_issue',
   'verify_password', 'wifi_no_connect_test'
 ),
 jsonb_build_object('category', 'wifi', 'scenario', 'no_connect'),
 true),

('support-tech-agent', 'wifi', 'wifi_no_connect_device_issue', 3,
 'Vamos testar com outro dispositivo. Consegue tentar conectar com outro celular ou notebook?',
 'Verificar se é problema específico do dispositivo.',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Testei, outros conectam normalmente', 'value', 'other_devices_ok', 'next_step', 'wifi_no_connect_device_config'),
   jsonb_build_object('label', 'Nenhum dispositivo conecta', 'value', 'no_device_connects', 'next_step', 'wifi_no_connect_router_issue')
 ),
 jsonb_build_object(
   'other_devices_ok', 'wifi_no_connect_device_config',
   'no_device_connects', 'wifi_no_connect_router_issue'
 ),
 jsonb_build_object('category', 'wifi', 'scenario', 'no_connect'),
 true);