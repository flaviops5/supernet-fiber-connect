// ============================================
// METRICS HELPER - Registra métricas automaticamente
// ============================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import type { JsonObject } from "./error-types.ts";

export interface MetricData {
  agent_name: string;
  conversation_id?: string;
  action_type: string;
  success: boolean;
  duration_ms: number;
  error_message?: string;
  metadata?: JsonObject;
}

/**
 * Registra métrica no banco (não-bloqueante)
 */
export async function recordMetric(metric: MetricData) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Supabase credentials not found - skipping metrics');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { error } = await supabase
      .from('agent_metrics')
      .insert({
        agent_name: metric.agent_name,
        conversation_id: metric.conversation_id,
        action_type: metric.action_type,
        success: metric.success,
        duration_ms: metric.duration_ms,
        error_message: metric.error_message,
        metadata: metric.metadata || {}
      });

    if (error) {
      console.error('❌ Error recording metric:', error);
    }
  } catch (error) {
    // Não falhar se métricas falharem
    console.error('❌ Failed to record metric:', error);
  }
}

/**
 * Wrapper para executar ação e registrar métrica automaticamente
 */
export async function withMetrics<T>(
  agentName: string,
  actionType: string,
  fn: () => Promise<T>,
  conversationId?: string
): Promise<T> {
  const startTime = Date.now();
  let success = false;
  let errorMessage: string | undefined;
  let result: T;

  try {
    result = await fn();
    success = true;
    return result;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw error;
  } finally {
    const duration = Date.now() - startTime;
    
    // Registrar métrica em background (não esperar)
    recordMetric({
      agent_name: agentName,
      conversation_id: conversationId,
      action_type: actionType,
      success,
      duration_ms: duration,
      error_message: errorMessage
    }).catch(console.error);
  }
}

/**
 * Registra ação falhada no DLQ
 */
export async function recordFailedAction(
  agentName: string,
  clientCpf: string | undefined,
  actionType: string,
  actionPayload: JsonValue,
  errorMessage: string,
  actionLogId?: string
) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { error } = await supabase
      .from('failed_actions')
      .insert({
        action_log_id: actionLogId,
        agent_name: agentName,
        client_cpf: clientCpf,
        action_type: actionType,
        action_payload: actionPayload,
        error_message: errorMessage,
        status: 'pending'
      });

    if (error) {
      console.error('❌ Error recording failed action:', error);
    } else {
      console.log('📝 Failed action recorded in DLQ');
    }
  } catch (error) {
    console.error('❌ Failed to record failed action:', error);
  }
}
