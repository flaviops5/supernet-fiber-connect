/**
 * Refactoring Rollout Feature Flag
 * Controla rollout gradual dos cenários refatorados vs código inline
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Verifica se deve usar cenários refatorados para esta conversa
 * 
 * Suporta rollout gradual baseado em hash do conversation_id:
 * - 0-10%: Apenas 10% das conversas usam código refatorado
 * - 10-50%: 50% das conversas
 * - 50-100%: Todas as conversas
 * 
 * @param supabase Cliente Supabase
 * @param conversation_id ID da conversa
 * @returns true se deve usar código refatorado, false para usar inline
 */
export async function shouldUseRefactoredScenarios(
  supabase: SupabaseClient,
  conversation_id: string
): Promise<boolean> {
  try {
    // Buscar feature flag do banco
    const { data: flag } = await supabase
      .from('feature_flags')
      .select('enabled, rollout_percentage')
      .eq('flag_key', 'refactored_scenarios_rollout')
      .maybeSingle();

    // Se flag não existe ou está desabilitada, usar inline (safe default)
    if (!flag || !flag.enabled) {
      return false;
    }

    // Se rollout é 100%, sempre usar refatorado
    const rolloutPct = flag.rollout_percentage ?? 100;
    if (rolloutPct >= 100) {
      return true;
    }

    // Se rollout é 0%, sempre usar inline
    if (rolloutPct <= 0) {
      return false;
    }

    // Rollout gradual: hash do conversation_id determina se esta conversa usa refatorado
    const hash = simpleHash(conversation_id);
    const bucket = hash % 100; // Bucket 0-99
    
    return bucket < rolloutPct;
  } catch (error) {
    // Note: We don't have access to logger here, but this is a rare error case
    // that should be caught by monitoring. Using console.error as fallback.
    console.error('Erro ao verificar feature flag refactored_scenarios_rollout', error);
    // Em caso de erro, usar código inline (safe default)
    return false;
  }
}

/**
 * Hash simples para distribuição uniforme
 * Converte string em número 0-99
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Verifica status atual da feature flag (para logs/debug)
 */
export async function getRefactoringRolloutStatus(
  supabase: SupabaseClient
): Promise<{ enabled: boolean; rollout_percentage: number }> {
  try {
    const { data: flag } = await supabase
      .from('feature_flags')
      .select('enabled, rollout_percentage')
      .eq('flag_key', 'refactored_scenarios_rollout')
      .maybeSingle();

    return {
      enabled: flag?.enabled ?? false,
      rollout_percentage: flag?.rollout_percentage ?? 0
    };
  } catch (error) {
    return { enabled: false, rollout_percentage: 0 };
  }
}
