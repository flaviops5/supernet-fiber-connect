/**
 * PR#27 - KPI Logger (Fire-and-Forget)
 * Log não-bloqueante de métricas em registros_de_monitoramento
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { defer, withTimeout } from "./async-utils.ts";

// Mantém TODOS os campos existentes para compatibilidade 100%
type KPIEntry = {
  action: string;
  fluxo?: string;
  conversation_id: string;
  scenario_completed?: "A" | "B" | "C" | "D" | "E";
  hybrid_mode?: "ON" | "OFF";
  resolved?: boolean;
  escalated?: boolean;
  ticket_id?: string | number | null;
  rx_dbm?: number | null;
  tx_dbm?: number | null;
  extras?: Record<string, unknown>;
  timestamp?: string;
};

let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (_client) return _client;
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client!;
}

/**
 * Log de KPI fire-and-forget (não bloqueia o atendimento).
 * CRÍTICO: Mantém formato exato do `acao` (sem prefixo) para compatibilidade com dashboards
 */
export function kpiLog(entry: KPIEntry): void {
  defer(async () => {
    const supabase = getClient();
    
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

    await withTimeout(
      supabase.from("registros_de_monitoramento").insert(payload),
      2500,
      "kpiLog"
    ).catch((e) => {
      console.error("⚠️ KPI log failed (non-blocking):", e);
    });
  });
}

/**
 * Versão síncrona para casos de teste/diagnóstico
 */
export async function kpiLogSync(entry: KPIEntry): Promise<void> {
  const supabase = getClient();
  
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

  await supabase.from("registros_de_monitoramento").insert(payload);
}

