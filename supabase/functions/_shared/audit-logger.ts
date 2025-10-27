/**
 * Audit Logger
 * Centraliza logging de auditoria em registros_de_monitoramento
 */

interface LogAuditParams {
  action: string;
  conversation_id?: string;
  fluxo?: string;
  detalhes?: Record<string, unknown>;
  supabaseClient: any;
}

/**
 * Registra evento de auditoria no banco
 */
export async function logAudit({
  action,
  conversation_id,
  fluxo = "support-tech",
  detalhes = {},
  supabaseClient
}: LogAuditParams): Promise<void> {
  try {
    await supabaseClient
      .from("registros_de_monitoramento")
      .insert({
        acao: action,
        fluxo,
        conversation_id,
        detalhes,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error("❌ Erro ao registrar auditoria:", error);
  }
}
