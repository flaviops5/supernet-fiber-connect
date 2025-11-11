/**
 * Fast Path Feature Flag
 * Verificar se fast-path está habilitado com rollout gradual
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Verificar se fast-path está habilitado
 * Suporta rollout gradual baseado em hash do conversation_id
 */
export async function isFastPathEnabled(supabase: SupabaseClient, conversation_id: string): Promise<boolean> {
  try {
    const { data: flag, error } = await supabase
      .from('feature_flags')
      .select('enabled, rollout_percentage')
      .eq('flag_key', 'pr17_fast_path')
      .single();

    if (error || !flag) return true; // Default: ativado se não encontrar flag

    if (!flag.enabled) return false;

    // Rollout gradual baseado em hash do conversation_id
    if (flag.rollout_percentage < 100) {
      const hash = conversation_id.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const percentage = Math.abs(hash) % 100;
      return percentage < flag.rollout_percentage;
    }

    return true;
  } catch (err) {
    // Em caso de erro, ativar por padrão (fail-open)
    return true;
  }
}

/**
 * Verificar estabilidade do sinal
 * Analisa últimas leituras para detectar RX instável
 */
export async function hasStableSignal(supabase: SupabaseClient, ixc_client_id: string): Promise<boolean> {
  try {
    const { data: recentReadings } = await supabase
      .from('registros_de_monitoramento')
      .select('detalhes')
      .eq('acao', 'parallel_diag_finished')
      .order('created_at', { ascending: false })
      .limit(3);

    if (!recentReadings || recentReadings.length < 2) return true;

    const rxValues = recentReadings
      .map((r: any) => Number(r.detalhes?.signal_rx))
      .filter((v: number) => !isNaN(v));

    if (rxValues.length < 2) return true;

    // Calcular variância
    const mean = rxValues.reduce((a: number, b: number) => a + b, 0) / rxValues.length;
    const variance = Math.sqrt(
      rxValues.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / rxValues.length
    );

    return variance < 2; // Variação < 2 dBm = estável
  } catch (error) {
    // Em caso de erro, assumir estável
    return true;
  }
}
