/**
 * Helper para atualizar estado de fluxo do agente
 */

export async function updateFlowState(
  supabaseAdmin: any,
  ctx: { conversation_id: string; flowState?: any },
  patch: Record<string, unknown>
) {
  const { conversation_id } = ctx;

  const now = new Date();
  const lastInteraction = ctx.flowState?.last_interaction
    ? new Date(ctx.flowState.last_interaction)
    : now;

  const minutesWithoutReply = Math.floor(
    (now.getTime() - lastInteraction.getTime()) / 60000
  );

  const newState = {
    ...patch,
    last_interaction: now.toISOString(),
    minutesWithoutReply,
  };

  await supabaseAdmin
    .from("agent_flow_states")
    .update(newState)
    .eq("conversation_id", conversation_id);

  return newState;
}
