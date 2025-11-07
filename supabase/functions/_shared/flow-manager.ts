/**
 * Flow Manager - Sistema de gerenciamento dinâmico de fluxos conversacionais
 * 
 * Busca e processa fluxos configurados no banco de dados (agent_flow_steps, agent_flow_subjects)
 * Substitui mensagens hardcoded por configurações flexíveis e editáveis
 */

export interface FlowStep {
  step_key: string;
  step_order: number;
  question: string;
  instruction: string;
  response_options: string[];
  next_step: Record<string, string> | null;
  step_tools: string[] | null;
  media_context: string | null;
  is_active: boolean;
}

export interface FlowSubject {
  subject_key: string;
  subject_name: string;
  default_tools: string[] | null;
  initial_step: string | null;
}

export interface FlowContext {
  agent_type: string;
  subject_key: string;
  current_step?: string | null;
  conversation_id: string;
}

/**
 * Busca todos os steps ativos de um subject específico
 */
export async function getFlowSteps(
  supabase: any,
  agent_type: string,
  subject_key: string
): Promise<FlowStep[]> {
  const { data, error } = await supabase
    .from('agent_flow_steps')
    .select('*')
    .eq('agent_type', agent_type)
    .eq('subject_key', subject_key)
    .eq('is_active', true)
    .order('step_order', { ascending: true });

  if (error) {
    console.error('Error fetching flow steps:', error);
    return [];
  }

  return data || [];
}

/**
 * Busca configuração do subject
 */
export async function getFlowSubject(
  supabase: any,
  agent_type: string,
  subject_key: string
): Promise<FlowSubject | null> {
  const { data, error } = await supabase
    .from('agent_flow_subjects')
    .select('*')
    .eq('agent_type', agent_type)
    .eq('subject_key', subject_key)
    .maybeSingle();

  if (error) {
    console.error('Error fetching flow subject:', error);
    return null;
  }

  return data;
}

/**
 * Busca um step específico por step_key
 */
export async function getFlowStepByKey(
  supabase: any,
  agent_type: string,
  subject_key: string,
  step_key: string
): Promise<FlowStep | null> {
  const { data, error } = await supabase
    .from('agent_flow_steps')
    .select('*')
    .eq('agent_type', agent_type)
    .eq('subject_key', subject_key)
    .eq('step_key', step_key)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Error fetching flow step:', error);
    return null;
  }

  return data;
}

/**
 * Determina o próximo step baseado na resposta do usuário
 */
export function getNextStep(
  currentStep: FlowStep,
  userResponse: string
): string | null {
  if (!currentStep.next_step) {
    return null;
  }

  // Normalizar resposta do usuário
  const normalized = userResponse.toLowerCase().trim();
  
  // Buscar correspondência exata primeiro
  if (currentStep.next_step[normalized]) {
    return currentStep.next_step[normalized];
  }

  // Buscar correspondência parcial nos response_options
  for (const option of currentStep.response_options) {
    if (normalized.includes(option.toLowerCase())) {
      return currentStep.next_step[option] || null;
    }
  }

  return null;
}

/**
 * Busca mensagens aprovadas de um cenário específico
 */
export async function getApprovedScenarioMessages(
  supabase: any,
  agent_type: string,
  subject_key: string,
  scenario_key?: string
): Promise<any[]> {
  const query = supabase
    .from('agent_flow_scenario_approvals')
    .select('scenario_key, variation_path, approved_messages, updated_at')
    .eq('agent_type', agent_type)
    .eq('subject_key', subject_key)
    .eq('status', 'approved')
    .not('approved_messages', 'is', null)
    .order('updated_at', { ascending: false });

  if (scenario_key) {
    query.eq('scenario_key', scenario_key);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    console.error('Error fetching approved messages:', error);
    return [];
  }

  return data?.[0]?.approved_messages || [];
}

/**
 * Monta o prompt completo para um step usando instruction + question
 */
export function buildStepPrompt(step: FlowStep, context?: Record<string, any>): string {
  let prompt = '';

  if (step.instruction) {
    prompt += `${step.instruction}\n\n`;
  }

  prompt += step.question;

  // Se houver opções de resposta, adicionar ao prompt
  if (step.response_options && step.response_options.length > 0) {
    const options = step.response_options.join(', ');
    prompt += `\n\n(Opções: ${options})`;
  }

  return prompt;
}

/**
 * Valida se a resposta do usuário está nas opções permitidas
 */
export function validateUserResponse(
  step: FlowStep,
  userResponse: string
): { valid: boolean; matched_option?: string } {
  if (!step.response_options || step.response_options.length === 0) {
    return { valid: true }; // Sem restrição de opções
  }

  const normalized = userResponse.toLowerCase().trim();

  for (const option of step.response_options) {
    if (normalized.includes(option.toLowerCase())) {
      return { valid: true, matched_option: option };
    }
  }

  return { valid: false };
}

/**
 * Busca o step inicial de um subject
 */
export async function getInitialStep(
  supabase: any,
  agent_type: string,
  subject_key: string
): Promise<FlowStep | null> {
  // Primeiro tentar buscar o initial_step definido no subject
  const subject = await getFlowSubject(supabase, agent_type, subject_key);
  
  if (subject?.initial_step) {
    return await getFlowStepByKey(supabase, agent_type, subject_key, subject.initial_step);
  }

  // Fallback: pegar o primeiro step por ordem
  const steps = await getFlowSteps(supabase, agent_type, subject_key);
  return steps[0] || null;
}

/**
 * Resolver tools efetivas (step_tools ou default_tools)
 */
export async function resolveStepTools(
  supabase: any,
  agent_type: string,
  subject_key: string,
  step_key?: string
): Promise<string[]> {
  // Se há step_key, buscar tools específicas do step
  if (step_key) {
    const step = await getFlowStepByKey(supabase, agent_type, subject_key, step_key);
    if (step?.step_tools && step.step_tools.length > 0) {
      return step.step_tools;
    }
  }

  // Fallback: buscar default_tools do subject
  const subject = await getFlowSubject(supabase, agent_type, subject_key);
  return subject?.default_tools || [];
}
