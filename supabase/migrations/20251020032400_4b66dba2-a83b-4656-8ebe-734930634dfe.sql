
-- Criar todos os cenários de WiFi que estão faltando
-- Cada cenário representa um caminho completo de conversação

-- ============================================
-- CENÁRIO: WiFi - App não abre
-- ============================================
INSERT INTO agent_flow_scenario_approvals (agent_type, scenario_key, subject_key, variation_path, status, notes) VALUES
('support-tech-agent', 'cenario_wifi_app_nao_abre', 'wifi', 'outros_funcionam->sim', 'approved', 'App específico não abre, outros funcionam → cliente vai reinstalar → resolve'),
('support-tech-agent', 'cenario_wifi_app_nao_abre', 'wifi', 'outros_funcionam->insiste->ok', 'approved', 'App específico não abre → cliente insiste que é internet → transfere'),
('support-tech-agent', 'cenario_wifi_app_nao_abre', 'wifi', 'nenhum_abre->funcionou', 'approved', 'Nenhum app abre → reinicia → funciona'),
('support-tech-agent', 'cenario_wifi_app_nao_abre', 'wifi', 'nenhum_abre->nao_funcionou->sim', 'approved', 'Nenhum app abre → reinicia → não funciona → sites abrem → problema no app'),
('support-tech-agent', 'cenario_wifi_app_nao_abre', 'wifi', 'nenhum_abre->nao_funcionou->nao->ok', 'approved', 'Nenhum app abre → reinicia → não funciona → sites também não abrem → transfere');

-- ============================================
-- CENÁRIO: WiFi - Cai e volta
-- ============================================
INSERT INTO agent_flow_scenario_approvals (agent_type, scenario_key, subject_key, variation_path, status, notes) VALUES
('support-tech-agent', 'cenario_wifi_cai_volta', 'wifi', 'encontrou_problema->resolveu', 'approved', 'Wi-Fi cai e volta → encontrou mal contato → resolveu'),
('support-tech-agent', 'cenario_wifi_cai_volta', 'wifi', 'encontrou_problema->continua->ok', 'approved', 'Wi-Fi cai e volta → encontrou mal contato mas ainda cai → transfere'),
('support-tech-agent', 'cenario_wifi_cai_volta', 'wifi', 'nao_encontrou->ok', 'approved', 'Wi-Fi cai e volta → não encontrou problema → transfere');

-- ============================================
-- CENÁRIO: WiFi - Lento
-- ============================================
INSERT INTO agent_flow_scenario_approvals (agent_type, scenario_key, subject_key, variation_path, status, notes) VALUES
('support-tech-agent', 'cenario_wifi_lento', 'wifi', 'rede_24->teste_feito->abaixo_100->ok', 'approved', 'Wi-Fi lento → rede 2.4 → teste abaixo 100 Mbps → problema rede → transfere'),
('support-tech-agent', 'cenario_wifi_lento', 'wifi', 'rede_24->teste_feito->entre_100_200->ok', 'approved', 'Wi-Fi lento → rede 2.4 → teste 100-200 Mbps → sobrecarga → transfere'),
('support-tech-agent', 'cenario_wifi_lento', 'wifi', 'rede_24->teste_feito->entre_300_500->sim', 'approved', 'Wi-Fi lento → rede 2.4 → teste 300-500 Mbps → velocidade OK → cliente confirma'),
('support-tech-agent', 'cenario_wifi_lento', 'wifi', 'rede_24->teste_feito->entre_300_500->nao', 'approved', 'Wi-Fi lento → rede 2.4 → teste 300-500 Mbps → velocidade OK → finaliza'),
('support-tech-agent', 'cenario_wifi_lento', 'wifi', 'rede_24->sem_rede_58->sim', 'approved', 'Wi-Fi lento → rede 2.4 → não tem 5.8 → precisa ajuda'),
('support-tech-agent', 'cenario_wifi_lento', 'wifi', 'rede_24->sem_rede_58->nao', 'approved', 'Wi-Fi lento → rede 2.4 → não tem 5.8 → não precisa ajuda'),
('support-tech-agent', 'cenario_wifi_lento_sem_5.8', 'wifi', 'rede_58->teste_feito->abaixo_100->ok', 'approved', 'Wi-Fi lento → rede 5.8 → teste abaixo 100 Mbps → problema rede → transfere'),
('support-tech-agent', 'cenario_wifi_lento_sem_5.8', 'wifi', 'rede_58->teste_feito->entre_100_200->ok', 'approved', 'Wi-Fi lento → rede 5.8 → teste 100-200 Mbps → sobrecarga → transfere'),
('support-tech-agent', 'cenario_wifi_lento_sem_5.8', 'wifi', 'rede_58->teste_feito->entre_300_500->sim', 'approved', 'Wi-Fi lento → rede 5.8 → teste 300-500 Mbps → velocidade OK → cliente confirma'),
('support-tech-agent', 'cenario_wifi_lento_sem_5.8', 'wifi', 'rede_58->teste_feito->entre_300_500->nao', 'approved', 'Wi-Fi lento → rede 5.8 → teste 300-500 Mbps → velocidade OK → finaliza');

-- ============================================
-- CENÁRIO: WiFi - Redes sumiram
-- ============================================
INSERT INTO agent_flow_scenario_approvals (agent_type, scenario_key, subject_key, variation_path, status, notes) VALUES
('support-tech-agent', 'cenario_wifi_redes_sumiram', 'wifi', 'apenas_celular->voltou', 'approved', 'Redes sumiram → só celular → modo avião → voltou'),
('support-tech-agent', 'cenario_wifi_redes_sumiram', 'wifi', 'apenas_celular->nao_voltou->aguardou->voltou', 'approved', 'Redes sumiram → só celular → modo avião não resolveu → reinicia roteador → voltou'),
('support-tech-agent', 'cenario_wifi_redes_sumiram', 'wifi', 'apenas_celular->nao_voltou->aguardou->nao_voltou->sim->ok', 'approved', 'Redes sumiram → só celular → modo avião não resolveu → reinicia roteador → não voltou → tem rede padrão → transfere configuração'),
('support-tech-agent', 'cenario_wifi_redes_sumiram', 'wifi', 'apenas_celular->nao_voltou->aguardou->nao_voltou->nao->ok', 'approved', 'Redes sumiram → só celular → modo avião não resolveu → reinicia roteador → não voltou → não tem rede padrão → transfere'),
('support-tech-agent', 'cenario_wifi_redes_sumiram', 'wifi', 'apenas_tv->voltou', 'approved', 'Redes sumiram → só TV → reinicia TV → voltou'),
('support-tech-agent', 'cenario_wifi_redes_sumiram', 'wifi', 'apenas_tv->nao_voltou->aguardou->voltou', 'approved', 'Redes sumiram → só TV → reinicia TV não resolveu → reinicia roteador → voltou'),
('support-tech-agent', 'cenario_wifi_redes_sumiram', 'wifi', 'todos->aguardou->voltou', 'approved', 'Redes sumiram → todos equipamentos → reinicia roteador → voltou'),
('support-tech-agent', 'cenario_wifi_redes_sumiram', 'wifi', 'todos->aguardou->nao_voltou->sim->ok', 'approved', 'Redes sumiram → todos equipamentos → reinicia roteador → não voltou → tem rede padrão → transfere');

-- ============================================
-- CENÁRIO: WiFi - Senha
-- ============================================
INSERT INTO agent_flow_scenario_approvals (agent_type, scenario_key, subject_key, variation_path, status, notes) VALUES
('support-tech-agent', 'cenario_wifi_senha', 'wifi', 'dados_informados->ok', 'approved', 'Esqueceu senha → informa dados → aguarda atendimento humano');

-- ============================================
-- CENÁRIO: WiFi - Sinal fraco
-- ============================================
INSERT INTO agent_flow_scenario_approvals (agent_type, scenario_key, subject_key, variation_path, status, notes) VALUES
('support-tech-agent', 'cenario_wifi_sinal_fraco', 'wifi', 'ok', 'approved', 'Sinal fraco em algum lugar → explica diferença 2.4 e 5.8 → transfere para configuração');

-- ============================================
-- CENÁRIO: WiFi - TV Box lento
-- ============================================
INSERT INTO agent_flow_scenario_approvals (agent_type, scenario_key, subject_key, variation_path, status, notes) VALUES
('support-tech-agent', 'cenario_wifi_tvbox', 'wifi', 'teste_feito->velocidade_ok->sim', 'approved', 'TV Box lento → faz teste → velocidade OK → precisa ajuda com TV Box'),
('support-tech-agent', 'cenario_wifi_tvbox', 'wifi', 'teste_feito->velocidade_ok->nao', 'approved', 'TV Box lento → faz teste → velocidade OK → não precisa ajuda'),
('support-tech-agent', 'cenario_wifi_tvbox', 'wifi', 'teste_feito->velocidade_baixa->ok', 'approved', 'TV Box lento → faz teste → velocidade baixa → transfere'),
('support-tech-agent', 'cenario_wifi_tvbox', 'wifi', 'insiste->ok', 'approved', 'TV Box lento → insiste que é internet sem fazer teste → transfere');

-- ============================================
-- CENÁRIO: WiFi - Um equipamento não navega
-- ============================================
INSERT INTO agent_flow_scenario_approvals (agent_type, scenario_key, subject_key, variation_path, status, notes) VALUES
('support-tech-agent', 'cenario_wifi_um_equipamento', 'wifi', 'outros_funcionam->funcionou', 'approved', 'Um equipamento não navega → outros funcionam → reinicia → resolve'),
('support-tech-agent', 'cenario_wifi_um_equipamento', 'wifi', 'outros_funcionam->nao_funcionou->entendeu', 'approved', 'Um equipamento não navega → outros funcionam → reinicia → não resolve → explica que é problema do equipamento → entende'),
('support-tech-agent', 'cenario_wifi_um_equipamento', 'wifi', 'outros_funcionam->nao_funcionou->transferir', 'approved', 'Um equipamento não navega → outros funcionam → reinicia → não resolve → quer falar com humano'),
('support-tech-agent', 'cenario_wifi_um_equipamento', 'wifi', 'nenhum_funciona->ok', 'approved', 'Um equipamento não navega → nenhum funciona → transfere para técnico');
