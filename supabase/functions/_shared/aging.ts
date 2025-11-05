// PR #19 — Aging Helper
// C1 ✅: 100% fire-and-forget, não bloqueia fluxo principal

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { JsonObject } from "./error-types.ts";

/**
 * Marca evento de aging de forma non-blocking
 * NUNCA bloqueia o fluxo principal - fire and forget
 */
export function markAgingEvent(supabaseAdmin: SupabaseClient, {
  conversation_id,
  step,
  meta = {}
}: {
  conversation_id: string,
  step: string,
  meta?: JsonObject
}) {
  // C3 ✅: Validação de inputs
  if (!conversation_id?.trim()) {
    console.warn('⚠️ markAgingEvent: conversation_id inválido');
    return;
  }

  if (!step?.trim()) {
    console.warn('⚠️ markAgingEvent: step inválido');
    return;
  }

  // Validar step conhecido (lista de steps válidos)
  const validSteps = [
    'start', 
    'scenario_a_start', 'scenario_b_start', 'scenario_c_start', 'scenario_d_start',
    'reboot_requested', 'signal_checked', 'ticket_opened', 'resolved',
    'scenario_a_check_power', 'scenario_b_request_reboot', 'scenario_c_optical_check'
  ];
  
  if (!validSteps.includes(step)) {
    console.warn(`⚠️ markAgingEvent: step desconhecido: ${step}`);
    // Não retorna - permite steps novos, mas loga warning
  }

  // C1 ✅: Fire-and-forget
  Promise.resolve().then(async () => {
    try {
      await supabaseAdmin.from('support_aging_events').insert({
        conversation_id,
        step,
        meta: meta || {},
        fluxo: 'support-tech'
      });
    } catch (e) {
      console.error('⚠️ Aging insert failed (non-blocking):', e);
    }
  });
}
