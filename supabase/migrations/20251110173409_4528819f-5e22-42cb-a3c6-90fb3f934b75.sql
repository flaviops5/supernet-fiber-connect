-- Criar feature flag para cenários refatorados
INSERT INTO public.feature_flags (
  flag_key,
  enabled,
  rollout_percentage,
  created_at,
  updated_at
) VALUES (
  'USE_REFACTORED_SCENARIOS',
  true,
  10,
  now(),
  now()
)
ON CONFLICT (flag_key) 
DO UPDATE SET
  enabled = EXCLUDED.enabled,
  rollout_percentage = EXCLUDED.rollout_percentage,
  updated_at = now();

-- Comentário: Feature flag para controlar rollout dos cenários refatorados (A, B, C, D, E)
-- Começando com 10% para validação inicial