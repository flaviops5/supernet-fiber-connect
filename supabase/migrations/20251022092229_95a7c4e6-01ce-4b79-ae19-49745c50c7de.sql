-- Definir opções de resposta explícitas para gerar variações no simulador
UPDATE public.agent_flow_steps
SET response_options = '[
  {"label": "Sim, no 4G/5G funciona", "value": "sim", "next_step": "cenario_ipv6_confirma"},
  {"label": "Não, também não funciona", "value": "nao", "next_step": "cenario_ipv6_confirma"}
]'::jsonb,
    next_step_map = '{"sim": "cenario_ipv6_confirma", "nao": "cenario_ipv6_confirma"}'::jsonb,
    updated_at = now()
WHERE subject_key = 'ipv6_apps_moveis' AND step_key = 'cenario_ipv6_inicio';