-- 1. ASSOCIAR CENÁRIOS DE ENERGIA AO ASSUNTO 'energia'
UPDATE agent_flow_steps
SET subject_key = 'energia'
WHERE agent_type = 'support-tech-agent'
AND step_key LIKE '%cenario_a%';

-- 2. LIMPAR CENÁRIOS DE WI-FI ANTIGOS SE EXISTIREM
DELETE FROM agent_flow_steps
WHERE agent_type = 'support-tech-agent'
AND subject_key = 'wifi';

-- 3. CRIAR CENÁRIOS COMPLETOS DE WI-FI

-- ============================================
-- CENÁRIO 1: WI-FI LENTO
-- ============================================

INSERT INTO agent_flow_steps (agent_type, subject_key, step_key, step_order, question, instruction, awaits_response, response_options, next_step_map, metadata, is_active)
VALUES 
-- Início do cenário
('support-tech-agent', 'wifi', 'cenario_wifi_lento_inicio', 1,
 'Entendo que sua internet Wi-Fi está lenta. Para investigar melhor, me responda algumas questões rápidas. Você está conectado na rede 2.4 ou 5.8 GHz? (A rede 2.4 é mais lenta, não passa de 80 Mbps. A 5.8 é mais rápida mas alcança menos distância)',
 'Identificar qual rede Wi-Fi o cliente está usando',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Rede 2.4 GHz', 'value', 'rede_24', 'next_step', 'cenario_wifi_lento_24ghz'),
   jsonb_build_object('label', 'Rede 5.8 GHz', 'value', 'rede_58', 'next_step', 'cenario_wifi_lento_teste'),
   jsonb_build_object('label', 'Não sei qual rede', 'value', 'nao_sei', 'next_step', 'cenario_wifi_lento_orientar_rede')
 ),
 jsonb_build_object(
   'rede_24', 'cenario_wifi_lento_24ghz',
   'rede_58', 'cenario_wifi_lento_teste',
   'nao_sei', 'cenario_wifi_lento_orientar_rede'
 ),
 jsonb_build_object('category', 'wifi', 'scenario', 'lento'),
 true),

-- Cliente está na rede 2.4 - orientar mudança
('support-tech-agent', 'wifi', 'cenario_wifi_lento_24ghz', 2,
 'A rede 2.4 GHz é mais lenta mesmo, não passa de 80 Mbps. Vamos fazer um teste de velocidade? Saia da rede 2.4 e conecte-se na sua rede Wi-Fi 5.8, vá para perto do roteador e clique no link abaixo. Após o teste, me envie o print da tela.

https://www.speedtest.net/pt/server/60362

⚠️ Importante: na hora do teste, se houver outros equipamentos conectados, a velocidade não será a real.',
 'Solicitar teste de velocidade na rede 5.8',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Fiz o teste', 'value', 'teste_feito', 'next_step', 'cenario_wifi_lento_aguardar_resultado'),
   jsonb_build_object('label', 'Não tenho rede 5.8', 'value', 'sem_rede_58', 'next_step', 'cenario_wifi_lento_sem_58')
 ),
 jsonb_build_object(
   'teste_feito', 'cenario_wifi_lento_aguardar_resultado',
   'sem_rede_58', 'cenario_wifi_lento_sem_58'
 ),
 jsonb_build_object('category', 'wifi', 'scenario', 'lento'),
 true),

-- Cliente não tem equipamento com 5.8
('support-tech-agent', 'wifi', 'cenario_wifi_lento_sem_58', 3,
 'Entendo. Infelizmente seu equipamento não possui tecnologia Wi-Fi 5. A velocidade total do seu plano estará disponível assim que você obtiver um equipamento com Wi-Fi 5 ou superior. No momento, a velocidade ficará limitada a 80 Mbps pela rede 2.4.

Posso ajudar em algo mais?',
 'Explicar limitação técnica do equipamento do cliente',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Sim, preciso de ajuda', 'value', 'sim', 'next_step', 'finalizar'),
   jsonb_build_object('label', 'Não, obrigado', 'value', 'nao', 'next_step', 'finalizar')
 ),
 jsonb_build_object('sim', 'finalizar', 'nao', 'finalizar'),
 jsonb_build_object('category', 'wifi', 'scenario', 'lento'),
 true),

-- Aguardar resultado do teste
('support-tech-agent', 'wifi', 'cenario_wifi_lento_aguardar_resultado', 4,
 'Perfeito! Por favor, me envie o print do resultado do teste para eu analisar.',
 'Aguardar imagem/resultado do teste de velocidade',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Download abaixo de 100 Mbps', 'value', 'abaixo_100', 'next_step', 'cenario_wifi_lento_problema_rede'),
   jsonb_build_object('label', 'Download entre 100-200 Mbps', 'value', 'entre_100_200', 'next_step', 'cenario_wifi_lento_sobrecarga'),
   jsonb_build_object('label', 'Download entre 300-500 Mbps', 'value', 'entre_300_500', 'next_step', 'cenario_wifi_lento_ok')
 ),
 jsonb_build_object(
   'abaixo_100', 'cenario_wifi_lento_problema_rede',
   'entre_100_200', 'cenario_wifi_lento_sobrecarga',
   'entre_300_500', 'cenario_wifi_lento_ok'
 ),
 jsonb_build_object('category', 'wifi', 'scenario', 'lento'),
 true),

-- Velocidade abaixo de 100 Mbps - problema na rede
('support-tech-agent', 'wifi', 'cenario_wifi_lento_problema_rede', 5,
 'Vi que a velocidade está abaixo de 100 Mbps na rede 5.8. Isso indica problemas na rede ou você ainda está conectado na 2.4 GHz, ou há muitos equipamentos consumindo banda.

Vou transferir você para um colaborador especializado que vai ajudar a resolver isso.',
 'Transferir para colaborador - problema na rede',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Ok, aguardo', 'value', 'ok', 'next_step', 'transferir_humano')
 ),
 jsonb_build_object('ok', 'transferir_humano'),
 jsonb_build_object('category', 'wifi', 'scenario', 'lento', 'action', 'transfer_to_human'),
 true),

-- Velocidade entre 100-200 Mbps - sobrecarga
('support-tech-agent', 'wifi', 'cenario_wifi_lento_sobrecarga', 6,
 'A velocidade entre 100-200 Mbps indica que a rede está sobrecarregada com muitos equipamentos ou o sinal está sofrendo interferência de outros roteadores próximos.

Vou transferir você para um colaborador que pode fazer ajustes específicos na configuração.',
 'Transferir para colaborador - sobrecarga/interferência',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Ok, aguardo', 'value', 'ok', 'next_step', 'transferir_humano')
 ),
 jsonb_build_object('ok', 'transferir_humano'),
 jsonb_build_object('category', 'wifi', 'scenario', 'lento', 'action', 'transfer_to_human'),
 true),

-- Velocidade OK (300-500 Mbps)
('support-tech-agent', 'wifi', 'cenario_wifi_lento_ok', 7,
 'Excelente! Os testes estão dentro do previsto (300-500 Mbps). Sua rede Wi-Fi está funcionando perfeitamente!

Posso ajudar em algo mais?',
 'Confirmar que está tudo OK',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Sim, preciso de ajuda', 'value', 'sim', 'next_step', 'finalizar'),
   jsonb_build_object('label', 'Não, obrigado', 'value', 'nao', 'next_step', 'finalizar')
 ),
 jsonb_build_object('sim', 'finalizar', 'nao', 'finalizar'),
 jsonb_build_object('category', 'wifi', 'scenario', 'lento'),
 true),

-- ============================================
-- CENÁRIO 2: SINAL NÃO PEGA EM ALGUM LUGAR
-- ============================================

('support-tech-agent', 'wifi', 'cenario_wifi_sinal_fraco_inicio', 1,
 'Entendo que o sinal Wi-Fi não pega bem em algum lugar da casa. Isso é comum por causa das diferenças entre as redes 2.4 e 5.8 GHz:

• Rede 2.4: alcance maior mas mais lenta (80 Mbps)
• Rede 5.8: mais rápida mas alcance menor (não atravessa paredes tão bem)

Também há concorrência de canais com outros roteadores próximos que pode causar interferência.

Vou transferir você para um colaborador com mais experiência que pode fazer configurações específicas. Pode demorar pelo menos 2 horas, mas manteremos o chamado aberto.',
 'Explicar diferenças de sinal e transferir',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Ok, aguardo', 'value', 'ok', 'next_step', 'transferir_humano')
 ),
 jsonb_build_object('ok', 'transferir_humano'),
 jsonb_build_object('category', 'wifi', 'scenario', 'sinal_fraco', 'action', 'transfer_to_human'),
 true),

-- ============================================
-- CENÁRIO 3: APLICATIVO NÃO ABRE
-- ============================================

('support-tech-agent', 'wifi', 'cenario_wifi_app_nao_abre_inicio', 1,
 'Entendo que um aplicativo específico não está abrindo. Para isolar o problema, me diga: outros aplicativos estão funcionando normalmente no seu dispositivo?',
 'Verificar se é problema isolado do app',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Sim, outros apps funcionam', 'value', 'outros_funcionam', 'next_step', 'cenario_wifi_app_problema_app'),
   jsonb_build_object('label', 'Não, nenhum abre', 'value', 'nenhum_abre', 'next_step', 'cenario_wifi_app_reiniciar')
 ),
 jsonb_build_object(
   'outros_funcionam', 'cenario_wifi_app_problema_app',
   'nenhum_abre', 'cenario_wifi_app_reiniciar'
 ),
 jsonb_build_object('category', 'wifi', 'scenario', 'app_nao_abre'),
 true),

-- Outros apps funcionam - problema no app específico
('support-tech-agent', 'wifi', 'cenario_wifi_app_problema_app', 2,
 'Se outros aplicativos funcionam, o problema está no aplicativo específico, não na internet. Pode ser:

• Problema temporário no servidor do app
• App desatualizado
• Falta de espaço no celular
• Permissões bloqueadas

Recomendo:
1. Atualizar o celular
2. Atualizar o aplicativo
3. Verificar espaço disponível

O funcionamento dos aplicativos não depende apenas de internet, mas de vários fatores como capacidade de armazenamento, segurança e permissões.

Isso ajudou?',
 'Orientar sobre problema no aplicativo',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Sim, vou tentar isso', 'value', 'sim', 'next_step', 'finalizar'),
   jsonb_build_object('label', 'Acho que é problema da internet', 'value', 'insiste', 'next_step', 'cenario_wifi_app_transferir')
 ),
 jsonb_build_object('sim', 'finalizar', 'insiste', 'cenario_wifi_app_transferir'),
 jsonb_build_object('category', 'wifi', 'scenario', 'app_nao_abre'),
 true),

-- Cliente insiste que é da internet
('support-tech-agent', 'wifi', 'cenario_wifi_app_transferir', 3,
 'Entendo sua preocupação. Vou transferir você para um colaborador que pode fazer uma análise mais detalhada.',
 'Transferir para análise mais detalhada',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Ok, aguardo', 'value', 'ok', 'next_step', 'transferir_humano')
 ),
 jsonb_build_object('ok', 'transferir_humano'),
 jsonb_build_object('category', 'wifi', 'scenario', 'app_nao_abre', 'action', 'transfer_to_human'),
 true),

-- Nenhum app abre - reiniciar celular
('support-tech-agent', 'wifi', 'cenario_wifi_app_reiniciar', 4,
 'Se nenhum aplicativo está abrindo, vamos tentar reiniciar o celular primeiro. Por favor, desligue e ligue novamente o aparelho.

Depois me avise se funcionou.',
 'Solicitar reinicialização do dispositivo',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Funcionou!', 'value', 'funcionou', 'next_step', 'finalizar'),
   jsonb_build_object('label', 'Ainda não funciona', 'value', 'nao_funcionou', 'next_step', 'cenario_wifi_app_verificar_internet')
 ),
 jsonb_build_object('funcionou', 'finalizar', 'nao_funcionou', 'cenario_wifi_app_verificar_internet'),
 jsonb_build_object('category', 'wifi', 'scenario', 'app_nao_abre'),
 true),

-- Verificar conexão com internet
('support-tech-agent', 'wifi', 'cenario_wifi_app_verificar_internet', 5,
 'Vamos verificar a conexão com a internet. Por favor, tente abrir algum site que você goste no navegador (Chrome, Safari, etc).

O site carregou normalmente?',
 'Testar navegação web',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Sim, sites abrem normalmente', 'value', 'sim', 'next_step', 'cenario_wifi_app_problema_app'),
   jsonb_build_object('label', 'Não, sites também não abrem', 'value', 'nao', 'next_step', 'cenario_wifi_app_transferir')
 ),
 jsonb_build_object('sim', 'cenario_wifi_app_problema_app', 'nao', 'cenario_wifi_app_transferir'),
 jsonb_build_object('category', 'wifi', 'scenario', 'app_nao_abre'),
 true),

-- ============================================
-- CENÁRIO 4: TV BOX / IPTV TRAVANDO
-- ============================================

('support-tech-agent', 'wifi', 'cenario_wifi_tvbox_inicio', 1,
 'Entendo que sua TV Box está travando. É importante saber que muitos serviços de TV Box e IPTV operam sem autorização da ANATEL e distribuem conteúdo através de servidores na Ásia e África.

Essas empresas geralmente:
• Não possuem CNPJ
• Não têm endereço físico
• Não possuem infraestrutura adequada

Isso causa instabilidade frequente, independente da internet.

Vamos fazer um teste de velocidade para verificar sua internet:

https://www.speedtest.net/pt/server/60362

Por favor, faça o teste e me envie o resultado.',
 'Explicar sobre serviços não homologados e solicitar teste',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Fiz o teste', 'value', 'teste_feito', 'next_step', 'cenario_wifi_tvbox_analisar'),
   jsonb_build_object('label', 'Tenho certeza que é da internet', 'value', 'insiste', 'next_step', 'cenario_wifi_tvbox_transferir')
 ),
 jsonb_build_object('teste_feito', 'cenario_wifi_tvbox_analisar', 'insiste', 'cenario_wifi_tvbox_transferir'),
 jsonb_build_object('category', 'wifi', 'scenario', 'tvbox'),
 true),

-- Analisar resultado do teste
('support-tech-agent', 'wifi', 'cenario_wifi_tvbox_analisar', 2,
 'Qual foi o resultado do teste de velocidade?',
 'Analisar velocidade para confirmar que internet está OK',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Acima de 100 Mbps', 'value', 'velocidade_ok', 'next_step', 'cenario_wifi_tvbox_confirmar'),
   jsonb_build_object('label', 'Abaixo de 100 Mbps', 'value', 'velocidade_baixa', 'next_step', 'cenario_wifi_tvbox_transferir')
 ),
 jsonb_build_object('velocidade_ok', 'cenario_wifi_tvbox_confirmar', 'velocidade_baixa', 'cenario_wifi_tvbox_transferir'),
 jsonb_build_object('category', 'wifi', 'scenario', 'tvbox'),
 true),

-- Velocidade OK - problema é no serviço
('support-tech-agent', 'wifi', 'cenario_wifi_tvbox_confirmar', 3,
 'Como a velocidade está boa (acima de 100 Mbps), confirmo que o problema não é na sua internet, mas sim na instabilidade do serviço de TV Box que você está usando.

Posso ajudar em algo mais relacionado à sua internet?',
 'Confirmar que problema não é na SUPERNET',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Sim, preciso de ajuda', 'value', 'sim', 'next_step', 'finalizar'),
   jsonb_build_object('label', 'Não, obrigado', 'value', 'nao', 'next_step', 'finalizar')
 ),
 jsonb_build_object('sim', 'finalizar', 'nao', 'finalizar'),
 jsonb_build_object('category', 'wifi', 'scenario', 'tvbox'),
 true),

-- Cliente insiste - transferir
('support-tech-agent', 'wifi', 'cenario_wifi_tvbox_transferir', 4,
 'Entendo. Vou transferir você para um colaborador que pode fazer uma análise mais detalhada.',
 'Transferir para análise detalhada',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Ok, aguardo', 'value', 'ok', 'next_step', 'transferir_humano')
 ),
 jsonb_build_object('ok', 'transferir_humano'),
 jsonb_build_object('category', 'wifi', 'scenario', 'tvbox', 'action', 'transfer_to_human'),
 true),

-- ============================================
-- CENÁRIO 5: APENAS UM EQUIPAMENTO NÃO NAVEGA
-- ============================================

('support-tech-agent', 'wifi', 'cenario_wifi_um_equipamento_inicio', 1,
 'Entendo que um equipamento específico não está navegando. Para isolar o problema, me diga: outros equipamentos (pelo menos 2) estão navegando normalmente na sua rede Wi-Fi?',
 'Verificar se problema é isolado a um equipamento',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Sim, outros navegam', 'value', 'outros_funcionam', 'next_step', 'cenario_wifi_um_equipamento_isolado'),
   jsonb_build_object('label', 'Não, nenhum navega', 'value', 'nenhum_funciona', 'next_step', 'cenario_wifi_um_equipamento_problema_rede')
 ),
 jsonb_build_object('outros_funcionam', 'cenario_wifi_um_equipamento_isolado', 'nenhum_funciona', 'cenario_wifi_um_equipamento_problema_rede'),
 jsonb_build_object('category', 'wifi', 'scenario', 'um_equipamento'),
 true),

-- Problema isolado no equipamento
('support-tech-agent', 'wifi', 'cenario_wifi_um_equipamento_isolado', 2,
 'Se outros equipamentos estão navegando normalmente, o problema não é com a internet, mas sim com esse equipamento específico.

Possíveis causas:
• Senha Wi-Fi incorreta
• Antena interna do equipamento com problema
• Configurações do dispositivo

Vamos tentar algumas soluções:
1. Verifique se está digitando a senha corretamente (maiúsculas/minúsculas)
2. Reinicie o equipamento
3. "Esqueça" a rede Wi-Fi e conecte novamente

Conseguiu resolver?',
 'Orientar troubleshooting do equipamento',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Sim, funcionou!', 'value', 'funcionou', 'next_step', 'finalizar'),
   jsonb_build_object('label', 'Não funcionou', 'value', 'nao_funcionou', 'next_step', 'cenario_wifi_um_equipamento_confirmar')
 ),
 jsonb_build_object('funcionou', 'finalizar', 'nao_funcionou', 'cenario_wifi_um_equipamento_confirmar'),
 jsonb_build_object('category', 'wifi', 'scenario', 'um_equipamento'),
 true),

-- Confirmar que não é problema da internet
('support-tech-agent', 'wifi', 'cenario_wifi_um_equipamento_confirmar', 3,
 'Como outros equipamentos estão funcionando perfeitamente, posso confirmar que o problema não é na internet SUPERNET, mas sim nesse equipamento específico.

O equipamento possui antenas internas que captam o sinal Wi-Fi, e é possível que elas tenham parado de funcionar.

Recomendo verificar com um técnico de eletrônicos ou tentar em outro Wi-Fi para confirmar.

Posso ajudar em algo mais?',
 'Confirmar diagnóstico final',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Entendi, obrigado', 'value', 'entendeu', 'next_step', 'finalizar'),
   jsonb_build_object('label', 'Quero falar com alguém', 'value', 'transferir', 'next_step', 'transferir_humano')
 ),
 jsonb_build_object('entendeu', 'finalizar', 'transferir', 'transferir_humano'),
 jsonb_build_object('category', 'wifi', 'scenario', 'um_equipamento'),
 true),

-- Nenhum equipamento funciona - problema na rede
('support-tech-agent', 'wifi', 'cenario_wifi_um_equipamento_problema_rede', 4,
 'Se nenhum equipamento está navegando, o problema é com a rede Wi-Fi. Vou investigar isso para você.',
 'Redirecionar para fluxo de troubleshooting de rede',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Ok', 'value', 'ok', 'next_step', 'transferir_humano')
 ),
 jsonb_build_object('ok', 'transferir_humano'),
 jsonb_build_object('category', 'wifi', 'scenario', 'um_equipamento', 'action', 'transfer_to_human'),
 true),

-- ============================================
-- CENÁRIO 6: REDES 2.4 E 5.8 NÃO APARECEM
-- ============================================

('support-tech-agent', 'wifi', 'cenario_wifi_redes_sumiram_inicio', 1,
 'Entendo que as redes Wi-Fi não estão aparecendo. Me diga: isso está acontecendo apenas no seu celular, na TV ou em TODOS os equipamentos?',
 'Identificar abrangência do problema',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Apenas no celular', 'value', 'apenas_celular', 'next_step', 'cenario_wifi_redes_modo_aviao'),
   jsonb_build_object('label', 'Apenas na TV', 'value', 'apenas_tv', 'next_step', 'cenario_wifi_redes_reiniciar_tv'),
   jsonb_build_object('label', 'Em todos os equipamentos', 'value', 'todos', 'next_step', 'cenario_wifi_redes_problema_roteador')
 ),
 jsonb_build_object(
   'apenas_celular', 'cenario_wifi_redes_modo_aviao',
   'apenas_tv', 'cenario_wifi_redes_reiniciar_tv',
   'todos', 'cenario_wifi_redes_problema_roteador'
 ),
 jsonb_build_object('category', 'wifi', 'scenario', 'redes_sumiram'),
 true),

-- Apenas no celular - modo avião
('support-tech-agent', 'wifi', 'cenario_wifi_redes_modo_aviao', 2,
 'Se é apenas no celular, vamos tentar duas soluções:

1️⃣ Coloque o celular em MODO AVIÃO por 45 segundos, depois desative
OU
2️⃣ Reinicie o smartphone

Depois me avise: as redes voltaram a aparecer?',
 'Orientar reset de rede do celular',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Sim, voltaram!', 'value', 'voltou', 'next_step', 'finalizar'),
   jsonb_build_object('label', 'Não, ainda não aparecem', 'value', 'nao_voltou', 'next_step', 'cenario_wifi_redes_problema_roteador')
 ),
 jsonb_build_object('voltou', 'finalizar', 'nao_voltou', 'cenario_wifi_redes_problema_roteador'),
 jsonb_build_object('category', 'wifi', 'scenario', 'redes_sumiram'),
 true),

-- Apenas na TV - reiniciar
('support-tech-agent', 'wifi', 'cenario_wifi_redes_reiniciar_tv', 3,
 'Se é apenas na TV, vamos reiniciá-la. Desligue da tomada, aguarde 30 segundos e ligue novamente.

As redes voltaram a aparecer?',
 'Orientar reinicialização da TV',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Sim, voltaram!', 'value', 'voltou', 'next_step', 'finalizar'),
   jsonb_build_object('label', 'Não, ainda não aparecem', 'value', 'nao_voltou', 'next_step', 'cenario_wifi_redes_problema_roteador')
 ),
 jsonb_build_object('voltou', 'finalizar', 'nao_voltou', 'cenario_wifi_redes_problema_roteador'),
 jsonb_build_object('category', 'wifi', 'scenario', 'redes_sumiram'),
 true),

-- Problema no roteador - reiniciar
('support-tech-agent', 'wifi', 'cenario_wifi_redes_problema_roteador', 4,
 'Vou fazer alguns procedimentos iniciais aqui. Agora, por favor:

1️⃣ DESLIGUE o roteador da tomada
2️⃣ AGUARDE 60 segundos completos
3️⃣ LIGUE novamente

Aguarde 1 minuto para o equipamento sincronizar.

Me avise quando ligar.',
 'Orientar reinicialização do roteador',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Liguei, aguardei 1 minuto', 'value', 'aguardou', 'next_step', 'cenario_wifi_redes_verificar_retorno')
 ),
 jsonb_build_object('aguardou', 'cenario_wifi_redes_verificar_retorno'),
 jsonb_build_object('category', 'wifi', 'scenario', 'redes_sumiram'),
 true),

-- Verificar se voltou
('support-tech-agent', 'wifi', 'cenario_wifi_redes_verificar_retorno', 5,
 'As redes Wi-Fi voltaram a aparecer?',
 'Verificar se reinicialização resolveu',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Sim, voltaram!', 'value', 'voltou', 'next_step', 'finalizar'),
   jsonb_build_object('label', 'Não, ainda não aparecem', 'value', 'nao_voltou', 'next_step', 'cenario_wifi_redes_verificar_rede_padrao')
 ),
 jsonb_build_object('voltou', 'finalizar', 'nao_voltou', 'cenario_wifi_redes_verificar_rede_padrao'),
 jsonb_build_object('category', 'wifi', 'scenario', 'redes_sumiram'),
 true),

-- Verificar se rede padrão aparece
('support-tech-agent', 'wifi', 'cenario_wifi_redes_verificar_rede_padrao', 6,
 'Na lista de redes Wi-Fi disponíveis, aparece alguma rede chamada "Mercusys", "TP Link" ou "Huawei"?',
 'Verificar se roteador perdeu configuração',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Sim, aparece uma dessas', 'value', 'sim', 'next_step', 'cenario_wifi_redes_perdeu_config'),
   jsonb_build_object('label', 'Não aparece nenhuma', 'value', 'nao', 'next_step', 'cenario_wifi_redes_transferir')
 ),
 jsonb_build_object('sim', 'cenario_wifi_redes_perdeu_config', 'nao', 'cenario_wifi_redes_transferir'),
 jsonb_build_object('category', 'wifi', 'scenario', 'redes_sumiram'),
 true),

-- Roteador perdeu configuração
('support-tech-agent', 'wifi', 'cenario_wifi_redes_perdeu_config', 7,
 'Quando aparece uma rede com esses nomes, significa que o roteador perdeu a configuração. Isso geralmente acontece por picos de energia.

Você tem um notebook ou PC em casa para reconfigurarmos juntos?',
 'Oferecer reconfiguração ou OS',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Sim, tenho', 'value', 'sim', 'next_step', 'cenario_wifi_redes_transferir_config'),
   jsonb_build_object('label', 'Não tenho', 'value', 'nao', 'next_step', 'cenario_wifi_redes_abrir_os'),
   jsonb_build_object('label', 'Eu consigo configurar', 'value', 'sei_configurar', 'next_step', 'cenario_wifi_redes_transferir_config')
 ),
 jsonb_build_object('sim', 'cenario_wifi_redes_transferir_config', 'nao', 'cenario_wifi_redes_abrir_os', 'sei_configurar', 'cenario_wifi_redes_transferir_config'),
 jsonb_build_object('category', 'wifi', 'scenario', 'redes_sumiram'),
 true),

-- Transferir para reconfiguração
('support-tech-agent', 'wifi', 'cenario_wifi_redes_transferir_config', 8,
 'Perfeito! Vou transferir você para um colaborador que vai ajudar na reconfiguração.',
 'Transferir para reconfiguração',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Ok, aguardo', 'value', 'ok', 'next_step', 'transferir_humano')
 ),
 jsonb_build_object('ok', 'transferir_humano'),
 jsonb_build_object('category', 'wifi', 'scenario', 'redes_sumiram', 'action', 'transfer_to_human'),
 true),

-- Abrir OS para visita técnica
('support-tech-agent', 'wifi', 'cenario_wifi_redes_abrir_os', 9,
 'Sem problemas. Vou abrir uma Ordem de Serviço para nossa equipe visitar o local e reconfigurar o roteador.

Você será contatado para agendarmos a visita.',
 'Informar abertura de OS',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Ok, obrigado', 'value', 'ok', 'next_step', 'transferir_humano')
 ),
 jsonb_build_object('ok', 'transferir_humano'),
 jsonb_build_object('category', 'wifi', 'scenario', 'redes_sumiram', 'action', 'transfer_to_human'),
 true),

-- Transferir - problema não identificado
('support-tech-agent', 'wifi', 'cenario_wifi_redes_transferir', 10,
 'Vou transferir você para um colaborador que vai fazer uma análise mais detalhada da situação.',
 'Transferir para análise detalhada',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Ok, aguardo', 'value', 'ok', 'next_step', 'transferir_humano')
 ),
 jsonb_build_object('ok', 'transferir_humano'),
 jsonb_build_object('category', 'wifi', 'scenario', 'redes_sumiram', 'action', 'transfer_to_human'),
 true),

-- ============================================
-- CENÁRIO 7: ALTERAR/RECUPERAR SENHA WI-FI
-- ============================================

('support-tech-agent', 'wifi', 'cenario_wifi_senha_inicio', 1,
 'Entendo que você precisa de ajuda com a senha do Wi-Fi. Por motivos de segurança, não guardamos essa informação em nosso banco de dados, mas vou te ajudar.

Para confirmar sua identidade, preciso de algumas informações:
• Nome completo
• CPF
• Data de nascimento

Pode me passar essas informações?',
 'Solicitar dados para validação de identidade',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Informei os dados', 'value', 'dados_informados', 'next_step', 'cenario_wifi_senha_aguardar')
 ),
 jsonb_build_object('dados_informados', 'cenario_wifi_senha_aguardar'),
 jsonb_build_object('category', 'wifi', 'scenario', 'senha'),
 true),

-- Aguardar validação
('support-tech-agent', 'wifi', 'cenario_wifi_senha_aguardar', 2,
 'Perfeito! Preciso de pelo menos 10 minutos para processar essa solicitação.

Vou transferir você para um colaborador que vai retornar com a informação.',
 'Transferir para validação e recuperação de senha',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Ok, aguardo', 'value', 'ok', 'next_step', 'transferir_humano')
 ),
 jsonb_build_object('ok', 'transferir_humano'),
 jsonb_build_object('category', 'wifi', 'scenario', 'senha', 'action', 'transfer_to_human'),
 true),

-- ============================================
-- CENÁRIO 8: WI-FI CAI E VOLTA
-- ============================================

('support-tech-agent', 'wifi', 'cenario_wifi_cai_volta_inicio', 1,
 'Entendo que o Wi-Fi está caindo e voltando constantemente. Isso geralmente indica problema de energia ou mal contato.

Vamos fazer algumas verificações:

1️⃣ Aperte TODOS os cabos de energia
2️⃣ Confira as tomadas e réguas
3️⃣ Balançe os cabos que ligam o equipamento procurando mal contato
4️⃣ Verifique se a tomada na parede está frouxa
5️⃣ Enquanto faz isso, fique de olho no equipamento para ver se ele desliga

Conseguiu fazer essas verificações?',
 'Orientar verificação de alimentação elétrica',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Sim, encontrei mal contato', 'value', 'encontrou_problema', 'next_step', 'cenario_wifi_cai_volta_resolver'),
   jsonb_build_object('label', 'Não encontrei nada de errado', 'value', 'nao_encontrou', 'next_step', 'cenario_wifi_cai_volta_transferir')
 ),
 jsonb_build_object('encontrou_problema', 'cenario_wifi_cai_volta_resolver', 'nao_encontrou', 'cenario_wifi_cai_volta_transferir'),
 jsonb_build_object('category', 'wifi', 'scenario', 'cai_volta'),
 true),

-- Encontrou mal contato - resolver
('support-tech-agent', 'wifi', 'cenario_wifi_cai_volta_resolver', 2,
 'Ótimo! Corrija o mal contato que você identificou e observe se o problema continua.

Depois de alguns minutos, me avise: o Wi-Fi parou de cair?',
 'Aguardar correção do problema',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Sim, parou de cair!', 'value', 'resolveu', 'next_step', 'finalizar'),
   jsonb_build_object('label', 'Ainda está caindo', 'value', 'continua', 'next_step', 'cenario_wifi_cai_volta_transferir')
 ),
 jsonb_build_object('resolveu', 'finalizar', 'continua', 'cenario_wifi_cai_volta_transferir'),
 jsonb_build_object('category', 'wifi', 'scenario', 'cai_volta'),
 true),

-- Não encontrou problema - transferir
('support-tech-agent', 'wifi', 'cenario_wifi_cai_volta_transferir', 3,
 'Vou transferir você para um colaborador especializado que vai fazer uma análise mais detalhada da rede.',
 'Transferir para análise técnica',
 true,
 jsonb_build_array(
   jsonb_build_object('label', 'Ok, aguardo', 'value', 'ok', 'next_step', 'transferir_humano')
 ),
 jsonb_build_object('ok', 'transferir_humano'),
 jsonb_build_object('category', 'wifi', 'scenario', 'cai_volta', 'action', 'transfer_to_human'),
 true);