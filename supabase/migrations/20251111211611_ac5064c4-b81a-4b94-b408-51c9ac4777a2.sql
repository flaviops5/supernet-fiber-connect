-- Ativar cenários refatorados para 100% (ambiente de desenvolvimento)
UPDATE public.feature_flags 
SET 
  enabled = true, 
  rollout_percentage = 100,
  metadata = jsonb_set(
    metadata, 
    '{activated_at}', 
    to_jsonb(NOW()::text)
  ),
  updated_at = NOW()
WHERE flag_key = 'refactored_scenarios_rollout';