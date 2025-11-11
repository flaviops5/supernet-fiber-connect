-- Migration: Feature Flag para Rollout Gradual de Cenários Refatorados
-- Fase 2: Adiciona controle de rollout gradual dos cenários refatorados
-- Nota: A tabela feature_flags já existe com coluna flag_key

-- Inserir feature flag para rollout de cenários refatorados
INSERT INTO public.feature_flags (flag_key, enabled, rollout_percentage, metadata)
VALUES (
  'refactored_scenarios_rollout',
  false,
  0,
  jsonb_build_object(
    'description', 'Controla rollout gradual dos cenários refatorados (A, B, C, D, E) vs código inline',
    'rollout_plan', '10% → 25% → 50% → 75% → 100%',
    'phase', 2
  )
)
ON CONFLICT (flag_key) DO UPDATE
SET 
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- Inserir/atualizar flag do fast-path
INSERT INTO public.feature_flags (flag_key, enabled, rollout_percentage, metadata)
VALUES (
  'pr17_fast_path',
  true,
  100,
  jsonb_build_object(
    'description', 'Fast-path para Cenário B: pula reinicialização quando sinal está bom e estável',
    'phase', 1
  )
)
ON CONFLICT (flag_key) DO UPDATE
SET 
  metadata = EXCLUDED.metadata,
  updated_at = NOW();