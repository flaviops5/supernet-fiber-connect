-- Adicionar coluna response_variations à tabela tech_flow_steps
ALTER TABLE public.tech_flow_steps
ADD COLUMN response_variations jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.tech_flow_steps.response_variations IS 'Mapeia cada opção de resposta para um array de variações/sinônimos que o cliente pode usar';

-- Exemplo de estrutura:
-- {
--   "sim": ["sim", "s", "yes", "ok", "isso mesmo", "exato", "correto", "positivo"],
--   "não": ["não", "n", "no", "nao", "negativo"]
-- }

-- Adicionar algumas variações padrão para os passos existentes
UPDATE public.tech_flow_steps
SET response_variations = jsonb_build_object(
  'sim', '["sim", "s", "yes", "ok", "isso mesmo", "exato", "correto", "positivo", "ta ligado", "está ligado"]'::jsonb,
  'não', '["não", "n", "no", "nao", "negativo", "não é isso", "ta desligado", "está desligado", "não está"]'::jsonb
)
WHERE step_key IN ('verificar_luzes', 'verificar_energia');

UPDATE public.tech_flow_steps
SET response_variations = jsonb_build_object(
  'sim', '["sim", "s", "yes", "ok", "resolveu", "funcionou", "consegui"]'::jsonb,
  'não', '["não", "n", "no", "nao", "não resolveu", "continua", "ainda não", "não funcionou"]'::jsonb
)
WHERE step_key = 'aguardar_resolucao_energia';

UPDATE public.tech_flow_steps
SET response_variations = jsonb_build_object(
  'sim_vermelho', '["sim", "s", "yes", "vermelho", "vermelha", "ta piscando", "está piscando", "piscando vermelho"]'::jsonb,
  'não', '["não", "n", "no", "nao", "não tem", "sem luz vermelha", "não está piscando"]'::jsonb
)
WHERE step_key = 'verificar_luz_vermelha';

UPDATE public.tech_flow_steps
SET response_variations = jsonb_build_object(
  'verde', '["verde", "ficou verde", "agora está verde", "parou de piscar", "luz verde"]'::jsonb,
  'vermelho', '["vermelho", "ainda vermelho", "continua vermelha", "não mudou", "ainda piscando"]'::jsonb
)
WHERE step_key = 'verificar_resultado_manipulacao';

UPDATE public.tech_flow_steps
SET response_variations = jsonb_build_object(
  'sim', '["sim", "s", "yes", "consigo", "ta funcionando", "está funcionando", "resolveu"]'::jsonb,
  'não', '["não", "n", "no", "nao", "não consigo", "não abre", "não carrega", "lento"]'::jsonb
)
WHERE step_key = 'verificar_navegacao';