/**
 * PR#27 - Audit Logger (Fire-and-Forget)
 * Logs estruturados não-bloqueantes em registros_de_monitoramento
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { defer, withTimeout } from "./async-utils.ts";

let _svc: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (_svc) return _svc;
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  _svc = createClient(url, key, { auth: { persistSession: false } });
  return _svc!;
}

// COMPATIBILIDADE DUPLA: suporta tanto `action` quanto `acao`
type AuditEvent = {
  action?: string;
  acao?: string;
  fluxo: string;
  conversation_id?: string;
  detalhes?: Record<string, unknown>;
  supabaseClient?: ReturnType<typeof createClient>; // legado
};

/**
 * Log de auditoria fire-and-forget (não bloqueia).
 * CRÍTICO: Aceita tanto `action` quanto `acao` para compatibilidade total
 */
export function logAudit(evt: AuditEvent): void {
  const client = evt.supabaseClient || getClient();
  
  // Prioriza `acao`, fallback para `action`
  const acaoValue = evt.acao || evt.action;
  if (!acaoValue) {
    console.warn("⚠️ logAudit: nem action nem acao fornecido");
    return;
  }
  
  defer(async () => {
    await withTimeout(
      client.from("registros_de_monitoramento").insert([{
        acao: acaoValue,
        fluxo: evt.fluxo,
        conversation_id: evt.conversation_id ?? null,
        detalhes: evt.detalhes ?? {}
      }]),
      2500,
      "logAudit"
    ).catch(() => {});
  });
}

/**
 * Versão síncrona para casos críticos
 */
export async function logAuditSync(evt: AuditEvent): Promise<void> {
  const client = evt.supabaseClient || getClient();
  const acaoValue = evt.acao || evt.action;
  
  if (!acaoValue) {
    throw new Error("logAuditSync: nem action nem acao fornecido");
  }
  
  await client.from("registros_de_monitoramento").insert([{
    acao: acaoValue,
    fluxo: evt.fluxo,
    conversation_id: evt.conversation_id ?? null,
    detalhes: evt.detalhes ?? {}
  }]);
}

