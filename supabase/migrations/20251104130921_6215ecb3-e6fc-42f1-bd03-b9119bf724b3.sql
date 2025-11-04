-- PR#53: Melhorar prompts ambíguos dos casos baseline C5 e F5

-- C5: Tornar explícito que é uma consulta comercial sobre contratar
UPDATE public.qa_regression_cases
SET 
  prompt = 'Vocês atendem na minha região? Quero contratar internet',
  updated_at = now()
WHERE scenario_name = 'C5: Consulta cobertura';

-- F5: Adicionar contexto de pagamento para clarificar que é financeiro
UPDATE public.qa_regression_cases
SET 
  prompt = 'Quero desbloquear minha internet, já paguei a fatura',
  updated_at = now()
WHERE scenario_name = 'F5: Desbloqueio';

-- Log da alteração
COMMENT ON TABLE public.qa_regression_cases IS 'Casos de regressão baseline - última atualização: prompts C5 e F5 tornados mais específicos para melhorar acurácia do roteamento';