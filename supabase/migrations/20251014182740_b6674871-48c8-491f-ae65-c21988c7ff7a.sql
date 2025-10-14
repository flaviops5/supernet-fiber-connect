-- Inserir regra routing -> tecnico (idempotente)
INSERT INTO public.escalation_rules (from_department, to_department, priority, conditions, enabled)
SELECT 'routing', 'tecnico', 1, '{"keywords":["suporte","técnico","roteador","internet"]}'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.escalation_rules
  WHERE from_department='routing' AND to_department='tecnico'
);