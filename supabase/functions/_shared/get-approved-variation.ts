/**
 * Busca variações aprovadas do banco de dados
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getApprovedScenarioReply(
  supabaseAdmin: SupabaseClient,
  agent: string,
  scenarioKey: string
) {
  const { data, error } = await supabaseAdmin
    .from("agent_flow_scenario_approvals")
    .select("id, text, approved_messages")
    .eq("agent_type", `${agent}-agent`)
    .eq("scenario_key", scenarioKey)
    .eq("status", "approved")
    .maybeSingle();

  if (!error && data) {
    // Se há mensagens aprovadas estruturadas, retornar a primeira
    if (data.approved_messages && Array.isArray(data.approved_messages) && data.approved_messages.length > 0) {
      const firstMessage = data.approved_messages[0];
      return {
        id: data.id,
        text: firstMessage.question || firstMessage.text || data.text || "Estou verificando aqui para seguirmos corretamente 👍"
      };
    }
    
    // Senão, retornar o campo text direto
    return {
      id: data.id,
      text: data.text || "Estou verificando aqui para seguirmos corretamente 👍"
    };
  }

  // Fallback genérico
  return {
    id: "fallback",
    text: "Estou verificando aqui para seguirmos corretamente 👍",
  };
}
