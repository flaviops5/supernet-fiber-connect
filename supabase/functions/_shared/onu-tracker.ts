// PR #19 — ONU Tracker Helper
// C1 ✅: 100% fire-and-forget, não bloqueia fluxo principal

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Registra snapshot de ONU de forma non-blocking
 * NUNCA bloqueia o fluxo principal - fire and forget
 */
export function trackOnuSnapshot(supabaseAdmin: SupabaseClient, {
  conversation_id,
  ixc_client_id,
  onu_serial,
  rx_dbm,
  tx_dbm,
  status,
  source = 'signal_tool'
}: {
  conversation_id?: string,
  ixc_client_id?: string,
  onu_serial?: string | null,
  rx_dbm?: number | null,
  tx_dbm?: number | null,
  status?: 'ok'|'weak'|'critical'|'unknown',
  source?: 'signal_tool'|'manual'
}) {
  // C3 ✅: Validação de inputs
  if (!ixc_client_id?.trim()) {
    console.warn('⚠️ trackOnuSnapshot: ixc_client_id inválido');
    return;
  }

  if (!onu_serial?.trim()) {
    console.warn('⚠️ trackOnuSnapshot: onu_serial inválido');
    return;
  }

  // C3 ✅: Validação de range de RX/TX
  if (rx_dbm != null && !Number.isFinite(rx_dbm)) {
    console.warn(`⚠️ trackOnuSnapshot: rx_dbm não é número: ${rx_dbm}`);
    rx_dbm = null;
  }

  if (rx_dbm != null && (rx_dbm < -40 || rx_dbm > 0)) {
    console.warn(`⚠️ trackOnuSnapshot: rx_dbm fora do range esperado (-40 a 0): ${rx_dbm}`);
  }

  if (tx_dbm != null && !Number.isFinite(tx_dbm)) {
    console.warn(`⚠️ trackOnuSnapshot: tx_dbm não é número: ${tx_dbm}`);
    tx_dbm = null;
  }

  if (tx_dbm != null && (tx_dbm < -10 || tx_dbm > 10)) {
    console.warn(`⚠️ trackOnuSnapshot: tx_dbm fora do range esperado (-10 a 10): ${tx_dbm}`);
  }

  // Validar status
  const validStatuses: Array<'ok'|'weak'|'critical'|'unknown'> = ['ok', 'weak', 'critical', 'unknown'];
  const finalStatus = (status && validStatuses.includes(status)) ? status : 'unknown';

  // C1 ✅: Fire-and-forget
  Promise.resolve().then(async () => {
    try {
      await supabaseAdmin.from('onu_tracking_events').insert({
        conversation_id: conversation_id || null,
        ixc_client_id,
        onu_serial,
        rx_dbm: rx_dbm != null ? Number(rx_dbm) : null,
        tx_dbm: tx_dbm != null ? Number(tx_dbm) : null,
        status: finalStatus,
        source: source || 'signal_tool'
      });
    } catch (e) {
      console.error('⚠️ ONU track failed (non-blocking):', e);
    }
  });
}
