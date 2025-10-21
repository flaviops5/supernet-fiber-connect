
-- Cenários para DNS (dns_conectividade)
INSERT INTO agent_flow_steps (agent_type, step_key, step_order, subject_key, question, instruction, response_options, next_step_map, tool_calls, awaits_response, is_active)
VALUES
-- Cenário 1: Site não abre mas WhatsApp funciona (problema DNS)
('support-tech-agent', 'cenario_dns_site_nao_abre_inicio', 900, 'dns_conectividade',
'Entendo que alguns sites não estão abrindo. Vamos investigar! Me diga: O WhatsApp e outros aplicativos estão funcionando normalmente?',
'Identificar se é problema de DNS (apps funcionam mas sites não)',
'[{"label": "Sim, WhatsApp funciona", "value": "sim_apps_funcionam", "next_step": "cenario_dns_confirmar_problema"}, {"label": "Não, nada funciona", "value": "nada_funciona", "next_step": "cenario_dns_problema_conexao"}]',
'{"sim_apps_funcionam": "cenario_dns_confirmar_problema", "nada_funciona": "cenario_dns_problema_conexao"}',
'[]', true, true),

('support-tech-agent', 'cenario_dns_confirmar_problema', 901, 'dns_conectividade',
'Perfeito! Isso indica um problema específico de DNS. Quando apps funcionam mas sites não abrem, geralmente é o DNS que está travado. Vou te ensinar a trocar o DNS para o Google (que é mais rápido e confiável). Você está usando Wi-Fi ou cabo de rede?',
'Orientar sobre troca de DNS baseado no tipo de conexão',
'[{"label": "Estou no Wi-Fi", "value": "wifi", "next_step": "cenario_dns_orientar_wifi"}, {"label": "Estou no cabo", "value": "cabo", "next_step": "cenario_dns_orientar_cabo"}]',
'{"wifi": "cenario_dns_orientar_wifi", "cabo": "cenario_dns_orientar_cabo"}',
'[]', true, true),

('support-tech-agent', 'cenario_dns_orientar_wifi', 902, 'dns_conectividade',
'Ótimo! Para trocar o DNS no Wi-Fi do Windows:
1️⃣ Abra as Configurações do Windows
2️⃣ Clique em "Rede e Internet"
3️⃣ Clique em "Wi-Fi" > "Propriedades da rede"
4️⃣ Em "Configurações de IP", clique em "Editar"
5️⃣ Selecione "Manual" e ative o IPv4
6️⃣ DNS preferencial: 8.8.8.8
7️⃣ DNS alternativo: 8.8.4.4
8️⃣ Salve e teste abrindo um site

Conseguiu fazer essas configurações?',
'Passo a passo para configurar DNS no Wi-Fi',
'[{"label": "Sim, funcionou!", "value": "funcionou", "next_step": "cenario_dns_sucesso"}, {"label": "Não consigo fazer", "value": "nao_consigo", "next_step": "cenario_dns_escalar"}]',
'{"funcionou": "cenario_dns_sucesso", "nao_consigo": "cenario_dns_escalar"}',
'[]', true, true),

('support-tech-agent', 'cenario_dns_orientar_cabo', 903, 'dns_conectividade',
'Perfeito! Para trocar o DNS no cabo de rede:
1️⃣ Abra o Painel de Controle
2️⃣ "Rede e Internet" > "Central de Rede e Compartilhamento"
3️⃣ Clique em "Ethernet" ou "Conexão local"
4️⃣ Clique em "Propriedades"
5️⃣ Selecione "Protocolo IP Versão 4 (TCP/IPv4)" e clique em "Propriedades"
6️⃣ Marque "Usar os seguintes endereços de servidor DNS"
7️⃣ DNS preferencial: 8.8.8.8
8️⃣ DNS alternativo: 8.8.4.4
9️⃣ Clique em OK e teste

Conseguiu realizar as configurações?',
'Passo a passo para configurar DNS no cabo',
'[{"label": "Sim, funcionou!", "value": "funcionou", "next_step": "cenario_dns_sucesso"}, {"label": "Não consigo", "value": "nao_consigo", "next_step": "cenario_dns_escalar"}]',
'{"funcionou": "cenario_dns_sucesso", "nao_consigo": "cenario_dns_escalar"}',
'[]', true, true),

('support-tech-agent', 'cenario_dns_problema_conexao', 904, 'dns_conectividade',
'Se nada está funcionando (nem WhatsApp, nem sites), não é problema de DNS, mas sim de conexão com a internet. Vou verificar seu sinal agora.',
'Quando não é DNS mas problema de conexão geral',
'[{"label": "Ok, verifique", "value": "verificar", "next_step": "finalizar"}]',
'{"verificar": "finalizar"}',
'["consultar_sinal_onu"]', true, true),

('support-tech-agent', 'cenario_dns_sucesso', 905, 'dns_conectividade',
'🎉 Excelente! O problema estava no DNS mesmo. Agora você está usando o DNS do Google que é muito mais rápido e estável. Seus sites devem estar abrindo normalmente agora. Posso ajudar em algo mais?',
'Confirmar sucesso na resolução do problema DNS',
'[{"label": "Sim, preciso de ajuda", "value": "sim", "next_step": "finalizar"}, {"label": "Não, obrigado!", "value": "nao", "next_step": "finalizar"}]',
'{"sim": "finalizar", "nao": "finalizar"}',
'[]', true, true),

('support-tech-agent', 'cenario_dns_escalar', 906, 'dns_conectividade',
'Sem problemas! Vou abrir um chamado técnico para que nossa equipe entre em contato e faça essa configuração remotamente com você. Em breve você receberá o retorno.',
'Escalar para suporte técnico quando cliente não consegue configurar',
'[{"label": "Ok, obrigado", "value": "ok", "next_step": "finalizar"}]',
'{"ok": "finalizar"}',
'["abrir_chamado"]', true, true);

-- Cenários para IPV6
INSERT INTO agent_flow_steps (agent_type, step_key, step_order, subject_key, question, instruction, response_options, next_step_map, tool_calls, awaits_response, is_active)
VALUES
-- Cenário 1: Problema com IPV6 (YouTube, Discord, etc não funcionam)
('support-tech-agent', 'cenario_ipv6_servicos_nao_funcionam_inicio', 950, 'IPV6',
'Entendo sua situação. Me conta: Quais serviços ou sites especificamente não estão funcionando?',
'Identificar quais serviços estão com problema relacionado a IPV6',
'[{"label": "YouTube não carrega", "value": "youtube", "next_step": "cenario_ipv6_confirmar_problema"}, {"label": "Discord não conecta", "value": "discord", "next_step": "cenario_ipv6_confirmar_problema"}, {"label": "Vários sites não abrem", "value": "varios_sites", "next_step": "cenario_ipv6_confirmar_problema"}]',
'{"youtube": "cenario_ipv6_confirmar_problema", "discord": "cenario_ipv6_confirmar_problema", "varios_sites": "cenario_ipv6_confirmar_problema"}',
'[]', true, true),

('support-tech-agent', 'cenario_ipv6_confirmar_problema', 951, 'IPV6',
'Entendi! Esse problema geralmente está relacionado ao IPV6. Alguns sites e serviços ainda não funcionam bem com essa tecnologia mais nova. A solução é desabilitar o IPV6 temporariamente. Você está acessando pelo computador, celular ou tablet?',
'Orientar sobre desabilitação do IPV6',
'[{"label": "Computador Windows", "value": "windows", "next_step": "cenario_ipv6_desabilitar_windows"}, {"label": "Celular/Tablet", "value": "mobile", "next_step": "cenario_ipv6_desabilitar_roteador"}, {"label": "Computador Mac", "value": "mac", "next_step": "cenario_ipv6_desabilitar_mac"}]',
'{"windows": "cenario_ipv6_desabilitar_windows", "mobile": "cenario_ipv6_desabilitar_roteador", "mac": "cenario_ipv6_desabilitar_mac"}',
'[]', true, true),

('support-tech-agent', 'cenario_ipv6_desabilitar_windows', 952, 'IPV6',
'Perfeito! Para desabilitar o IPV6 no Windows:

1️⃣ Aperte as teclas Windows + R
2️⃣ Digite: ncpa.cpl e aperte Enter
3️⃣ Clique com botão direito na sua conexão (Wi-Fi ou Ethernet)
4️⃣ Clique em "Propriedades"
5️⃣ Desmarque a caixa "Protocolo IP Versão 6 (TCP/IPv6)"
6️⃣ Clique em OK
7️⃣ Reinicie o computador
8️⃣ Teste os sites/serviços novamente

Conseguiu realizar esses passos?',
'Passo a passo desabilitar IPV6 no Windows',
'[{"label": "Sim, funcionou!", "value": "funcionou", "next_step": "cenario_ipv6_sucesso"}, {"label": "Não consigo fazer", "value": "nao_consigo", "next_step": "cenario_ipv6_escalar"}]',
'{"funcionou": "cenario_ipv6_sucesso", "nao_consigo": "cenario_ipv6_escalar"}',
'[]', true, true),

('support-tech-agent', 'cenario_ipv6_desabilitar_mac', 953, 'IPV6',
'Ótimo! Para desabilitar o IPV6 no Mac:

1️⃣ Abra "Preferências do Sistema"
2️⃣ Clique em "Rede"
3️⃣ Selecione sua conexão (Wi-Fi ou Ethernet)
4️⃣ Clique em "Avançado"
5️⃣ Vá na aba "TCP/IP"
6️⃣ Em "Configurar IPv6", selecione "Desligado"
7️⃣ Clique em OK e depois em "Aplicar"
8️⃣ Teste os sites/serviços

Conseguiu fazer?',
'Passo a passo desabilitar IPV6 no Mac',
'[{"label": "Sim, funcionou!", "value": "funcionou", "next_step": "cenario_ipv6_sucesso"}, {"label": "Não consegui", "value": "nao_consigo", "next_step": "cenario_ipv6_escalar"}]',
'{"funcionou": "cenario_ipv6_sucesso", "nao_consigo": "cenario_ipv6_escalar"}',
'[]', true, true),

('support-tech-agent', 'cenario_ipv6_desabilitar_roteador', 954, 'IPV6',
'Como você está no celular/tablet, o melhor é desabilitar o IPV6 direto no roteador para afetar todos os dispositivos. 

Você tem acesso ao roteador para fazer login nele?',
'Verificar se cliente tem acesso ao roteador',
'[{"label": "Sim, tenho acesso", "value": "sim_acesso", "next_step": "cenario_ipv6_orientar_roteador"}, {"label": "Não sei acessar", "value": "nao_acesso", "next_step": "cenario_ipv6_escalar"}]',
'{"sim_acesso": "cenario_ipv6_orientar_roteador", "nao_acesso": "cenario_ipv6_escalar"}',
'[]', true, true),

('support-tech-agent', 'cenario_ipv6_orientar_roteador', 955, 'IPV6',
'Ótimo! Para desabilitar no roteador:

1️⃣ Acesse: 192.168.1.1 no navegador
2️⃣ Login: admin / Senha: admin (ou a senha do seu roteador)
3️⃣ Procure por "Configurações Avançadas" ou "Advanced"
4️⃣ Entre em "IPv6"
5️⃣ Desabilite o IPV6 (geralmente há um botão ON/OFF)
6️⃣ Salve as configurações
7️⃣ O roteador vai reiniciar
8️⃣ Aguarde 2 minutos e teste

Conseguiu?',
'Orientar desabilitar IPV6 no roteador',
'[{"label": "Sim, funcionou!", "value": "funcionou", "next_step": "cenario_ipv6_sucesso"}, {"label": "Não encontrei a opção", "value": "nao_encontrei", "next_step": "cenario_ipv6_escalar"}]',
'{"funcionou": "cenario_ipv6_sucesso", "nao_encontrei": "cenario_ipv6_escalar"}',
'[]', true, true),

('support-tech-agent', 'cenario_ipv6_sucesso', 956, 'IPV6',
'🎉 Perfeito! O IPV6 foi desabilitado com sucesso. Agora os serviços que estavam com problema (YouTube, Discord, etc) devem funcionar normalmente. Posso ajudar em mais alguma coisa?',
'Confirmar sucesso na resolução do problema IPV6',
'[{"label": "Sim, preciso de ajuda", "value": "sim", "next_step": "finalizar"}, {"label": "Não, está tudo certo!", "value": "nao", "next_step": "finalizar"}]',
'{"sim": "finalizar", "nao": "finalizar"}',
'[]', true, true),

('support-tech-agent', 'cenario_ipv6_escalar', 957, 'IPV6',
'Sem problemas! Vou abrir um chamado técnico para que nossa equipe entre em contato e faça essa configuração remotamente com você. Em breve você receberá o retorno do técnico.',
'Escalar para suporte técnico quando cliente não consegue desabilitar IPV6',
'[{"label": "Ok, obrigado!", "value": "ok", "next_step": "finalizar"}]',
'{"ok": "finalizar"}',
'["abrir_chamado"]', true, true);
