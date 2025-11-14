/**
 * Flow Executor - Executa steps de fluxo usando interpretação híbrida
 * 
 * Processa respostas do usuário, executa tools configuradas e determina próximo passo
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { JsonObject, JsonValue } from "./error-types.ts";
import { hybridInterpret } from "./ai-response-interpreter.ts";
import { textReplyWithContext } from "./replies.ts";
import { 
  FlowStep, 
  getFlowStepByKey, 
  getNextStep, 
  buildStepPrompt,
  validateUserResponse,
  resolveStepTools 
} from "./flow-manager.ts";

export interface ExecutionContext {
  supabase: SupabaseClient;
  logger: { info: (msg: string, meta?: JsonObject) => void; error: (msg: string, meta?: JsonObject) => void };
  conversation_id: string;
  agent_type: string;
  subject_key: string;
  customer_name: string;
  ixc_client_id?: string;
  user_message: string;
  current_step_key?: string;
  flowState?: JsonObject;
}

export interface ExecutionResult {
  response_message: string;
  next_step_key?: string;
  needs_escalation?: boolean;
  escalation_reason?: string;
  tools_executed?: JsonObject;
  media_context?: string;
}

/**
 * Executa um step completo do fluxo
 */
export async function executeFlowStep(
  ctx: ExecutionContext,
  step: FlowStep
): Promise<ExecutionResult> {
  const { supabase, logger, conversation_id, user_message, flowState } = ctx;

  logger.info('Executando flow step', {
    step_key: step.step_key,
    question: step.question.substring(0, 50)
  });

  // 1. Construir prompt do step
  const prompt = buildStepPrompt(step, {
    customer_name: ctx.customer_name
  });

  // 2. Validar resposta do usuário (se houver opções)
  const validation = validateUserResponse(step, user_message);
  
  if (!validation.valid && user_message.trim() !== '') {
    // Resposta inválida - pedir clarificação
    return {
      response_message: `Desculpe, não entendi. ${step.question}`,
      next_step_key: step.step_key // Manter no mesmo step
    };
  }

  // 3. Interpretar resposta usando sistema híbrido
  interface InterpretationResult {
    result: string;
    confidence: number;
    method: string;
  }
  let interpretation: InterpretationResult | null = null;
  
  if (step.response_options && step.response_options.length > 0) {
    // Preparar detectores baseados nas opções
    const regexDetectors: Record<string, RegExp> = {};
    const similarityPhrases: Record<string, string[]> = {};

    for (const option of step.response_options) {
      const optionNormalized = option.toLowerCase();
      regexDetectors[option] = new RegExp(`\\b${optionNormalized}\\b`, 'i');
      similarityPhrases[option] = [option, optionNormalized];
    }

    interpretation = await hybridInterpret(user_message, {
      regexDetectors,
      similarityPhrases,
      aiContext: {
        expectedAction: step.instruction || 'Responder a pergunta',
        previousAgentMessage: step.question
      }
    });

    logger.info('Interpretação híbrida', {
      result: interpretation.result,
      confidence: interpretation.confidence,
      method: interpretation.method
    });
  }

  // 4. Determinar próximo step
  const matchedOption = validation.matched_option || interpretation?.result;
  const nextStepKey = getNextStep(step, matchedOption || user_message);

  logger.info('Determinando próximo step', {
    current_step: step.step_key,
    matched_option: matchedOption,
    next_step: nextStepKey
  });

  // 5. Executar tools se configuradas
  let toolsExecuted: Record<string, JsonValue> = {};
  const stepTools = await resolveStepTools(
    supabase,
    ctx.agent_type,
    ctx.subject_key,
    step.step_key
  );

  if (stepTools.length > 0) {
    logger.info('Executando tools configuradas', { tools: stepTools });
    
    // Aqui você pode integrar com executeConfiguredTools existente
    // toolsExecuted = await executeTools(supabase, logger, stepTools, ctx);
  }

  // 6. Montar resposta
  let responseMessage = prompt;

  // Se há próximo step, buscar e adicionar ao contexto
  if (nextStepKey) {
    const nextStep = await getFlowStepByKey(
      supabase,
      ctx.agent_type,
      ctx.subject_key,
      nextStepKey
    );

    if (nextStep) {
      responseMessage = buildStepPrompt(nextStep);
    }
  }

  // 7. Salvar contexto atualizado
  await textReplyWithContext(
    supabase,
    { conversation_id, flowState },
    responseMessage,
    { 
      current_step: nextStepKey || step.step_key,
      last_response: matchedOption 
    },
    step.media_context || undefined
  );

  return {
    response_message: responseMessage,
    next_step_key: nextStepKey || undefined,
    tools_executed: toolsExecuted,
    media_context: step.media_context || undefined
  };
}

/**
 * Processa resposta do usuário e determina ação
 */
export async function processUserResponse(
  ctx: ExecutionContext
): Promise<ExecutionResult> {
  const { supabase, logger, agent_type, subject_key, current_step_key } = ctx;

  // Se não há step atual, buscar step inicial
  if (!current_step_key) {
    const steps = await supabase
      .from('agent_flow_steps')
      .select('*')
      .eq('agent_type', agent_type)
      .eq('subject_key', subject_key)
      .eq('is_active', true)
      .order('step_order', { ascending: true })
      .limit(1);

    if (!steps.data || steps.data.length === 0) {
      logger.error('Nenhum step encontrado para subject', { subject_key });
      return {
        response_message: 'Desculpe, ocorreu um erro ao processar sua solicitação.',
        needs_escalation: true,
        escalation_reason: 'no_steps_configured'
      };
    }

    const initialStep = steps.data[0];
    return await executeFlowStep(ctx, initialStep);
  }

  // Buscar step atual
  const currentStep = await getFlowStepByKey(
    supabase,
    agent_type,
    subject_key,
    current_step_key
  );

  if (!currentStep) {
    logger.error('Step não encontrado', { step_key: current_step_key });
    return {
      response_message: 'Desculpe, ocorreu um erro ao processar sua resposta.',
      needs_escalation: true,
      escalation_reason: 'step_not_found'
    };
  }

  // Executar step
  return await executeFlowStep(ctx, currentStep);
}
