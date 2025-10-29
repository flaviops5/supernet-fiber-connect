/**
 * Helper para atualizar estado de fluxo do agente
 * 
 * PR #13 OTIMIZADO ✅: Fonte única de verdade para flow_state
 * - Todos os dados são salvos APENAS em agent_flow_states
 * - Não há mais duplicação em conversations.metadata.flow_state
 * 
 * PR #15 OTIMIZADO ✅: Validação de campos
 * - Valida se os campos existem na tabela agent_flow_states
 * - Loga warnings para campos inexistentes
 * - Previne erros silenciosos
 * 
 * Campos válidos em agent_flow_states:
 * - conversation_id (PK)
 * - waiting_step, context_warnings, transferred_to_human
 * - scenario_started, scenario_completed, irritation_score
 * - loop_count, transfer_reason, hybrid_mode_active
 * - ixc_client_id, last_agent_question
 * - created_at, updated_at
 */

const VALID_FLOW_STATE_FIELDS = new Set([
  'conversation_id',
  'waiting_step',
  'context_warnings',
  'transferred_to_human',
  'scenario_started',
  'scenario_completed',
  'irritation_score',
  'loop_count',
  'transfer_reason',
  'hybrid_mode_active',
  'ixc_client_id',
  'last_agent_question',
  'created_at',
  'updated_at'
]);

export async function updateFlowState(
  supabaseAdmin: any,
  ctx: { conversation_id: string; flowState?: any },
  newState: Record<string, any>
) {
  const conversation_id = ctx.conversation_id;
  const currentFlowState = ctx.flowState || {};

  // PR #15 ✅: Validar campos antes de salvar
  const invalidFields = Object.keys(newState).filter(
    field => !VALID_FLOW_STATE_FIELDS.has(field)
  );

  if (invalidFields.length > 0) {
    console.warn(
      `⚠️ updateFlowState: Campos inexistentes em agent_flow_states foram ignorados:`,
      invalidFields,
      `\nSe você precisa salvar esses dados, adicione as colunas na tabela agent_flow_states primeiro.`
    );
  }

  // Filtrar apenas campos válidos
  const validNewState = Object.keys(newState)
    .filter(field => VALID_FLOW_STATE_FIELDS.has(field))
    .reduce((obj, key) => {
      obj[key] = newState[key];
      return obj;
    }, {} as Record<string, any>);

  const mergedState = {
    ...currentFlowState,
    ...validNewState,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseAdmin
    .from("agent_flow_states")
    .upsert({
      conversation_id,
      ...mergedState
    });

  if (error) {
    console.error("❌ updateFlowState failed", error);
  }

  // 🔄 Atualiza o estado em memória imediatamente
  ctx.flowState = mergedState;

  return mergedState;
}
