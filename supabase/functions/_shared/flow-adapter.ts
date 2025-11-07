/**
 * Flow Adapter - Ponte entre flows hardcoded e flows do banco
 * 
 * Permite migração gradual mantendo compatibilidade com código existente
 * Prioriza flows do banco quando disponíveis, fallback para hardcoded
 */

import { 
  getFlowSteps, 
  getFlowStepByKey, 
  getFlowSubject,
  buildStepPrompt,
  FlowStep 
} from "./flow-manager.ts";

/**
 * Mapeamento de cenários hardcoded para subjects/steps do banco
 */
const SCENARIO_MAPPING: Record<string, { subject: string; step: string }> = {
  // Cenário A - Energia
  'cenario_a_verificar_luzes': { subject: 'energia', step: 'cenario_a_verificar_luzes' },
  'cenario_a_explicar_luzes': { subject: 'energia', step: 'cenario_a_explicar_luzes' },
  'cenario_a_verificar_energia': { subject: 'energia', step: 'cenario_a_verificar_energia' },
  'cenario_a_sem_energia': { subject: 'energia', step: 'cenario_a_sem_energia' },
  'cenario_a_verificar_luz_vermelha': { subject: 'energia', step: 'cenario_a_verificar_luz_vermelha' },
  'cenario_a_manipular_conector': { subject: 'energia', step: 'cenario_a_manipular_conector' },
  'cenario_a_verificar_resultado': { subject: 'energia', step: 'cenario_a_verificar_resultado' },
  'cenario_a_verificar_navegacao': { subject: 'energia', step: 'cenario_a_verificar_navegacao' },
  
  // Cenário B - Equipamento travado
  'scenario_b_wait_restart': { subject: 'energia', step: 'scenario_b_wait_restart' },
  
  // Cenário C - Sinal fraco
  'scenario_c_check_instability': { subject: 'wifi', step: 'scenario_c_check_instability' },
  
  // Cenário D - Sinal crítico
  'scenario_d_open_ticket': { subject: 'energia', step: 'scenario_d_open_ticket' },
  
  // Fast-path
  'fast_path_check_experience': { subject: 'wifi', step: 'fast_path_check_experience' },
};

/**
 * Busca mensagem do banco ou retorna fallback hardcoded
 */
export async function getStepMessage(
  supabase: any,
  agent_type: string,
  flowStateKey: string,
  fallbackMessage: string,
  context?: Record<string, any>
): Promise<string> {
  // Verificar se há mapeamento para este flowState
  const mapping = SCENARIO_MAPPING[flowStateKey];
  
  if (!mapping) {
    // Sem mapeamento - usar fallback
    return fallbackMessage;
  }

  try {
    // Tentar buscar step do banco
    const step = await getFlowStepByKey(
      supabase,
      agent_type,
      mapping.subject,
      mapping.step
    );

    if (step) {
      // Usar mensagem do banco
      const message = buildStepPrompt(step, context);
      console.log(`✅ Usando mensagem do banco para ${flowStateKey}`);
      return message;
    }
  } catch (error) {
    console.warn(`Erro ao buscar step do banco para ${flowStateKey}:`, error);
  }

  // Fallback para mensagem hardcoded
  console.log(`⚠️ Usando fallback hardcoded para ${flowStateKey}`);
  return fallbackMessage;
}

/**
 * Busca configurações de um cenário específico
 */
export async function getScenarioConfig(
  supabase: any,
  agent_type: string,
  scenario: 'A' | 'B' | 'C' | 'D' | 'E'
): Promise<{
  subject_key: string;
  initial_step: string;
  steps: FlowStep[];
} | null> {
  // Mapear cenário para subject
  const subjectMap: Record<string, string> = {
    'A': 'energia',
    'B': 'energia',
    'C': 'wifi',
    'D': 'energia',
    'E': 'wifi'
  };

  const subject_key = subjectMap[scenario];
  if (!subject_key) return null;

  try {
    const subject = await getFlowSubject(supabase, agent_type, subject_key);
    const steps = await getFlowSteps(supabase, agent_type, subject_key);

    if (!subject || steps.length === 0) {
      return null;
    }

    // Determinar step inicial baseado no cenário
    let initial_step = subject.initial_step || steps[0]?.step_key;
    
    // Para cenários específicos, sobrescrever initial_step
    if (scenario === 'A') {
      initial_step = 'cenario_a_verificar_luzes';
    } else if (scenario === 'B') {
      initial_step = 'scenario_b_wait_restart';
    } else if (scenario === 'C') {
      initial_step = 'scenario_c_check_instability';
    }

    return {
      subject_key,
      initial_step,
      steps
    };
  } catch (error) {
    console.error(`Erro ao buscar config do cenário ${scenario}:`, error);
    return null;
  }
}

/**
 * Helper: Substitui variáveis em templates de mensagem
 */
export function interpolateMessage(
  template: string,
  variables: Record<string, any>
): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(placeholder, String(value));
  }
  
  return result;
}

/**
 * Verifica se um cenário tem configuração no banco
 */
export async function hasScenarioInDatabase(
  supabase: any,
  agent_type: string,
  scenario: string
): Promise<boolean> {
  const mapping = SCENARIO_MAPPING[scenario];
  if (!mapping) return false;

  try {
    const step = await getFlowStepByKey(
      supabase,
      agent_type,
      mapping.subject,
      mapping.step
    );
    return !!step;
  } catch {
    return false;
  }
}

/**
 * Busca próximas perguntas de um cenário (para preview/planejamento)
 */
export async function getScenarioSteps(
  supabase: any,
  agent_type: string,
  subject_key: string,
  startStep?: string
): Promise<FlowStep[]> {
  const allSteps = await getFlowSteps(supabase, agent_type, subject_key);
  
  if (!startStep) {
    return allSteps;
  }

  // Retornar steps a partir do startStep
  const startIndex = allSteps.findIndex(s => s.step_key === startStep);
  if (startIndex === -1) {
    return allSteps;
  }

  return allSteps.slice(startIndex);
}
