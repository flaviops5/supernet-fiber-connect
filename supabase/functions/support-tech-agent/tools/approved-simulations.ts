/**
 * Approved Simulations Cache
 * Sistema de cache para mensagens aprovadas do banco de dados
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Cache de simulações aprovadas (5 minutos)
const simulationCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Buscar exemplos de simulações aprovadas para incluir no contexto
 * Retorna array de mensagens aprovadas para usar no fluxo
 */
export async function getApprovedSimulations(
  supabase: SupabaseClient, 
  subject: string
): Promise<any[]> {
  const cacheKey = `approved_simulations_${subject}`;
  const cached = simulationCache.get(cacheKey);
  
  // Verificar cache
  if (
    cached &&
    Date.now() - cached.timestamp < CACHE_DURATION &&
    Array.isArray(cached.data) && cached.data.length > 0
  ) {
    return cached.data;
  }
  
  // Buscar do banco
  const { data: approvals, error } = await supabase
    .from('agent_flow_scenario_approvals')
    .select('scenario_key, variation_path, approved_messages, updated_at')
    .eq('agent_type', 'support-tech-agent')
    .eq('subject_key', subject)
    .eq('status', 'approved')
    .not('approved_messages', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1);
  
  let messages: any[] = [];
  if (!error && approvals && approvals.length > 0) {
    messages = approvals[0].approved_messages || [];
  }
  
  // Fallback inteligente: se não houver mensagens aprovadas, usar perguntas dos steps ativos
  if (!messages || messages.length === 0) {
    const { data: steps, error: stepsError } = await supabase
      .from('agent_flow_steps')
      .select('step_key, question')
      .eq('agent_type', 'support-tech-agent')
      .eq('subject_key', subject)
      .eq('is_active', true);
    
    if (!stepsError && steps && steps.length > 0) {
      messages = steps
        .filter((s: any) => s.step_key && s.question)
        .map((s: any) => ({ step_key: s.step_key, question: s.question }));
    }
  }
  
  // Atualizar cache
  simulationCache.set(cacheKey, {
    data: messages,
    timestamp: Date.now()
  });
  
  return messages;
}

/**
 * Buscar a pergunta aprovada para um step específico
 */
export function getApprovedQuestionForStep(
  approvedMessages: any[], 
  stepKey: string
): string | null {
  if (!approvedMessages || approvedMessages.length === 0) return null;
  
  const message = approvedMessages.find((msg: any) => msg.step_key === stepKey);
  const question: string | null = message?.question || null;
  
  return question;
}

/**
 * Limpar cache (útil para testes ou quando houver updates)
 */
export function clearSimulationCache(subject?: string): void {
  if (subject) {
    simulationCache.delete(`approved_simulations_${subject}`);
  } else {
    simulationCache.clear();
  }
}
