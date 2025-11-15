/**
 * Flow Manager
 * Gerenciamento centralizado de flow_state e navegação entre cenários
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { FlowState } from "../types/database.types.ts";
import type { JsonObject, JsonValue } from "../../../_shared/error-types.ts";

export interface FlowContext {
  conversation_id: string;
  flowState: FlowState;
}

/**
 * Normalizar flow_state para evitar espalhar string em chaves '0','1',...
 */
export function normalizeFlowState(rawFlowState: unknown): FlowState {
  if (typeof rawFlowState === "string") {
    return { continue: rawFlowState };
  }
  if (!rawFlowState || typeof rawFlowState !== "object" || Array.isArray(rawFlowState)) {
    return {};
  }
  return rawFlowState;
}

/**
 * Atualizar flow_state da conversa
 */
export async function updateFlowState(
  supabase: SupabaseClient,
  context: FlowContext,
  updates: FlowState
): Promise<void> {
  const { conversation_id, flowState } = context;

  // Buscar metadata atual
  const { data: current } = await supabase
    .from("conversations")
    .select("metadata")
    .eq("id", conversation_id)
    .single();

  const currentMeta = (current?.metadata as JsonObject) || {};
  const currentFlow = normalizeFlowState(currentMeta.flow_state as FlowState);

  // Merge updates
  const newFlowState = {
    ...currentFlow,
    ...updates
  };

  await supabase
    .from("conversations")
    .update({
      metadata: {
        ...currentMeta,
        flow_state: newFlowState
      }
    })
    .eq("id", conversation_id);
}

/**
 * Obter waiting_step atual
 */
export function getWaitingStep(flowState: FlowState): string | null {
  return flowState?.waiting_step || null;
}

/**
 * Obter scenario atual
 */
export function getCurrentScenario(flowState: FlowState): string | null {
  return flowState?.scenario_started || flowState?.scenario || null;
}

/**
 * Verificar se está em um cenário específico
 */
export function isInScenario(flowState: FlowState, scenario: string): boolean {
  const current = getCurrentScenario(flowState);
  return current === scenario;
}

/**
 * Definir waiting_step
 */
export async function setWaitingStep(
  supabase: SupabaseClient,
  conversationId: string,
  step: string,
  extra: JsonObject = {}
): Promise<void> {
  const { data: current } = await supabase
    .from("conversations")
    .select("metadata")
    .eq("id", conversationId)
    .single();

  const meta = (current?.metadata as JsonObject) || {};
  const flowState = normalizeFlowState(meta.flow_state as FlowState);

  await supabase
    .from("conversations")
    .update({
      metadata: {
        ...meta,
        flow_state: {
          ...flowState,
          ...extra,
          waiting_step: step
        }
      }
    })
    .eq("id", conversationId);
}

/**
 * Limpar waiting_step
 */
export async function clearWaitingStep(
  supabase: SupabaseClient,
  conversationId: string
): Promise<void> {
  const { data: current } = await supabase
    .from("conversations")
    .select("metadata")
    .eq("id", conversationId)
    .single();

  const meta = (current?.metadata as JsonObject) || {};
  const flowState = normalizeFlowState(meta.flow_state as FlowState);

  await supabase
    .from("conversations")
    .update({
      metadata: {
        ...meta,
        flow_state: {
          ...flowState,
          waiting_step: null
        }
      }
    })
    .eq("id", conversationId);
}
