/**
 * KPI Logger - Sistema de métricas non-blocking
 * 
 * IMPORTANTE: Todas as chamadas são fire-and-forget para não bloquear
 * o atendimento ao cliente em caso de falha.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type KPIEntry = {
  action: string;
  fluxo?: string;
  conversation_id: string;
  scenario_completed?: "A" | "B" | "C" | "D";
  hybrid_mode?: "ON" | "OFF";
  resolved?: boolean;
  escalated?: boolean;
  ticket_id?: string | number | null;
  rx_dbm?: number | null;
  tx_dbm?: number | null;
  extras?: Record<string, unknown>;
  timestamp?: string;
};

/**
 * Registra KPI de forma non-blocking
 * NUNCA bloqueia o fluxo principal - fire and forget
 */
export function kpiLog(entry: KPIEntry): void {
  // Fire-and-forget: executa em background sem bloquear
  Promise.resolve().then(async () => {
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const payload = {
        acao: entry.action ?? "kpi_update",
        fluxo: entry.fluxo ?? "support-tech",
        conversation_id: entry.conversation_id,
        detalhes: {
          scenario_completed: entry.scenario_completed ?? null,
          hybrid_mode: entry.hybrid_mode ?? null,
          resolved: entry.resolved ?? null,
          escalated: entry.escalated ?? null,
          ticket_id: entry.ticket_id ?? null,
          rx_dbm: entry.rx_dbm ?? null,
          tx_dbm: entry.tx_dbm ?? null,
          ...(entry.extras ?? {}),
        },
        timestamp: entry.timestamp ?? new Date().toISOString(),
      };

      const { error } = await supabase
        .from("registros_de_monitoramento")
        .insert(payload);

      if (error) {
        console.error("⚠️ KPI log failed (non-blocking):", error.message);
      }
    } catch (e) {
      // Falha silenciosa - não deve interromper o atendimento
      console.error("⚠️ KPI log exception (non-blocking):", e);
    }
  });
}
