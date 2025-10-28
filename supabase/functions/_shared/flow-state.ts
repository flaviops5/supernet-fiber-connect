/**
 * Helper para atualizar estado de fluxo do agente
 */

export async function updateFlowState(
  supabaseAdmin: any,
  ctx: { conversation_id: string; flowState?: any },
  newState: Record<string, any>
) {
  const conversation_id = ctx.conversation_id;

  const currentFlowState = ctx.flowState || {};

  const mergedState = {
    ...currentFlowState,
    ...newState,
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
