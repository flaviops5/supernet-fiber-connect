
-- Remove cenários antigos de DNS (incorretos)
DELETE FROM agent_flow_steps 
WHERE subject_key = 'dns_conectividade' 
AND step_key LIKE 'cenario_%';

-- Cenário 1: Início - Explicar DNS e orientar limpeza de cache
INSERT INTO agent_flow_steps (
  agent_type, step_key, step_order, subject_key,
  question, instruction, response_options, next_step_map,
  tool_calls, awaits_response, is_active
) VALUES (
  'support-tech-agent',
  'cenario_dns_inicio',
  1,
  'dns_conectividade',
  'Entendo que alguns sites não estão abrindo. Vamos resolver isso! Primeiro, vamos limpar o cache do navegador. Você está usando Windows ou Mac?',
  'Identificar sistema operacional para orientar limpeza de cache',
  '[
    {"label": "Windows", "value": "windows", "next_step": "cenario_dns_limpar_cache_windows"},
    {"label": "Mac", "value": "mac", "next_step": "cenario_dns_limpar_cache_mac"}
  ]'::jsonb,
  '{"windows": "cenario_dns_limpar_cache_windows", "mac": "cenario_dns_limpar_cache_mac"}'::jsonb,
  '[]'::jsonb,
  true,
  true
);

-- Cenário 2: Limpar cache Windows
INSERT INTO agent_flow_steps (
  agent_type, step_key, step_order, subject_key,
  question, instruction, response_options, next_step_map,
  tool_calls, awaits_response, is_active
) VALUES (
  'support-tech-agent',
  'cenario_dns_limpar_cache_windows',
  2,
  'dns_conectividade',
  'No Windows, vamos limpar o cache do navegador:

🔹 **Google Chrome:** Pressione Ctrl + Shift + Delete
🔹 **Microsoft Edge:** Pressione Ctrl + Shift + Delete
🔹 **Firefox:** Pressione Ctrl + Shift + Delete

Depois de abrir a janela, marque "Imagens e arquivos em cache" e clique em "Limpar dados".

Teste acessar os sites novamente. Funcionou?',
  'Orientar limpeza de cache no Windows',
  '[
    {"label": "Sim, funcionou!", "value": "funcionou", "next_step": "cenario_dns_sucesso"},
    {"label": "Não, continua igual", "value": "nao_funcionou", "next_step": "cenario_dns_reiniciar"}
  ]'::jsonb,
  '{"funcionou": "cenario_dns_sucesso", "nao_funcionou": "cenario_dns_reiniciar"}'::jsonb,
  '[]'::jsonb,
  true,
  true
);

-- Cenário 3: Limpar cache Mac
INSERT INTO agent_flow_steps (
  agent_type, step_key, step_order, subject_key,
  question, instruction, response_options, next_step_map,
  tool_calls, awaits_response, is_active
) VALUES (
  'support-tech-agent',
  'cenario_dns_limpar_cache_mac',
  3,
  'dns_conectividade',
  'No Mac, vamos limpar o cache do navegador:

🔹 **Safari:** Pressione Command + Option + E
🔹 **Google Chrome:** Pressione Command + Shift + Delete
🔹 **Firefox:** Pressione Command + Shift + Delete

Depois de abrir a janela, marque "Imagens e arquivos em cache" e clique em "Limpar dados".

Teste acessar os sites novamente. Funcionou?',
  'Orientar limpeza de cache no Mac',
  '[
    {"label": "Sim, funcionou!", "value": "funcionou", "next_step": "cenario_dns_sucesso"},
    {"label": "Não, continua igual", "value": "nao_funcionou", "next_step": "cenario_dns_reiniciar"}
  ]'::jsonb,
  '{"funcionou": "cenario_dns_sucesso", "nao_funcionou": "cenario_dns_reiniciar"}'::jsonb,
  '[]'::jsonb,
  true,
  true
);

-- Cenário 4: Reiniciar computador
INSERT INTO agent_flow_steps (
  agent_type, step_key, step_order, subject_key,
  question, instruction, response_options, next_step_map,
  tool_calls, awaits_response, is_active
) VALUES (
  'support-tech-agent',
  'cenario_dns_reiniciar',
  4,
  'dns_conectividade',
  'Sem problemas! Vamos para o próximo passo: reiniciar o computador. Isso ajuda a renovar as configurações de rede.

Por favor, reinicie seu computador e teste novamente. Depois me avise se funcionou. 

Conseguiu resolver após reiniciar?',
  'Solicitar reinicialização do computador',
  '[
    {"label": "Sim, funcionou!", "value": "funcionou", "next_step": "cenario_dns_sucesso"},
    {"label": "Não, continua com problema", "value": "nao_funcionou", "next_step": "cenario_dns_escalar"}
  ]'::jsonb,
  '{"funcionou": "cenario_dns_sucesso", "nao_funcionou": "cenario_dns_escalar"}'::jsonb,
  '[]'::jsonb,
  true,
  true
);

-- Cenário 5: Sucesso
INSERT INTO agent_flow_steps (
  agent_type, step_key, step_order, subject_key,
  question, instruction, response_options, next_step_map,
  tool_calls, awaits_response, is_active
) VALUES (
  'support-tech-agent',
  'cenario_dns_sucesso',
  5,
  'dns_conectividade',
  '🎉 Que ótimo! Fico feliz que tenha funcionado. Os sites devem estar abrindo normalmente agora. 

Posso ajudar em algo mais?',
  'Confirmar resolução do problema',
  '[
    {"label": "Sim, preciso de ajuda", "value": "sim", "next_step": "finalizar"},
    {"label": "Não, obrigado!", "value": "nao", "next_step": "finalizar"}
  ]'::jsonb,
  '{"sim": "finalizar", "nao": "finalizar"}'::jsonb,
  '[]'::jsonb,
  true,
  true
);

-- Cenário 6: Escalar para humano
INSERT INTO agent_flow_steps (
  agent_type, step_key, step_order, subject_key,
  question, instruction, response_options, next_step_map,
  tool_calls, awaits_response, is_active
) VALUES (
  'support-tech-agent',
  'cenario_dns_escalar',
  6,
  'dns_conectividade',
  'Entendo. Nesse caso, vou transferir você para um técnico especializado que poderá fazer uma análise mais detalhada. 

Aguarde um momento enquanto faço a transferência. ⏳',
  'Transferir para técnico humano',
  '[
    {"label": "Ok, obrigado", "value": "ok", "next_step": "finalizar"}
  ]'::jsonb,
  '{"ok": "finalizar"}'::jsonb,
  '["abrir_chamado"]'::jsonb,
  true,
  true
);
