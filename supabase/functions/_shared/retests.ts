// PR #19 — Retests Helper
// C1 ✅: 100% fire-and-forget, não bloqueia fluxo principal

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Registra resultado de retest de forma non-blocking
 * NUNCA bloqueia o fluxo principal - fire and forget
 */
export function logRetest(
  supabaseAdmin: SupabaseClient,
  {
    conversation_id,
    ixc_client_id,
    step,
    before_ok,
    after_ok,
    latency_ms_before,
    latency_ms_after
  }: {
    conversation_id: string,
    ixc_client_id?: string,
    step: 'post_reboot'|'post_optical'|'post_route',
    before_ok?: boolean,
    after_ok?: boolean,
    latency_ms_before?: number,
    latency_ms_after?: number
  }
) {
  // C3 ✅: Validação de inputs
  if (!conversation_id?.trim()) {
    console.warn('⚠️ logRetest: conversation_id inválido');
    return;
  }

  // Validar step
  const validSteps: Array<'post_reboot'|'post_optical'|'post_route'> = ['post_reboot', 'post_optical', 'post_route'];
  if (!validSteps.includes(step)) {
    console.warn(`⚠️ logRetest: step inválido: ${step}`);
    return;
  }

  // C3 ✅: Validação de latências
  if (latency_ms_before != null && (!Number.isFinite(latency_ms_before) || latency_ms_before < 0 || latency_ms_before > 10000)) {
    console.warn(`⚠️ logRetest: latency_ms_before fora do range (0-10000ms): ${latency_ms_before}`);
    latency_ms_before = undefined;
  }

  if (latency_ms_after != null && (!Number.isFinite(latency_ms_after) || latency_ms_after < 0 || latency_ms_after > 10000)) {
    console.warn(`⚠️ logRetest: latency_ms_after fora do range (0-10000ms): ${latency_ms_after}`);
    latency_ms_after = undefined;
  }

  // C1 ✅: Fire-and-forget
  Promise.resolve().then(async () => {
    try {
      await supabaseAdmin.from('support_retests').insert({
        conversation_id,
        ixc_client_id: ixc_client_id || null,
        step,
        before_ok: before_ok != null ? Boolean(before_ok) : null,
        after_ok: after_ok != null ? Boolean(after_ok) : null,
        latency_ms_before: latency_ms_before != null ? Math.round(latency_ms_before) : null,
        latency_ms_after: latency_ms_after != null ? Math.round(latency_ms_after) : null
      });
    } catch (e) {
      console.error('⚠️ Retest insert failed (non-blocking):', e);
    }
  });
}
