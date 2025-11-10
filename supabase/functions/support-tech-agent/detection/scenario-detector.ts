/**
 * Scenario Detection Logic
 * 
 * Detecta qual cenário aplicar baseado em sinal óptico, flow state e contexto
 * 
 * ORDEM DE PRIORIDADE (crítico → menos crítico):
 * 1. Cenário A: TX/RX = 0 (sem sinal - equipamento off/desconectado)
 * 2. Cenário D: RX ≤ -28 dBm (sinal crítico - fibra com problema grave)
 * 3. Cenário C: RX entre -27 e -24 dBm (sinal fraco - atenuação/conector)
 * 4. Cenário B: RX > -24 dBm (sinal bom mas equipamento travado)
 * 5. Cenário E: Sinal OK mas problema de rede (WAN/Wi-Fi)
 */

import type { 
  ScenarioType, 
  ScenarioDetectionResult, 
  SignalData, 
  FlowState 
} from "../types/scenario-context.ts";

/**
 * Detecta qual cenário aplicar baseado no sinal óptico
 * 
 * @param signal - Dados do sinal óptico (TX/RX)
 * @param flowState - Estado atual do fluxo
 * @param massOutageActive - Se há mass outage ativo (priority override)
 * @returns Resultado da detecção com cenário, confiança e prioridade
 */
export function detectScenario(
  signal: SignalData | undefined | null,
  flowState: FlowState | undefined | null,
  massOutageActive: boolean = false
): ScenarioDetectionResult {
  // PRIORITY OVERRIDE: Mass Outage ativo
  if (massOutageActive) {
    return {
      scenario: null,
      confidence: 'high',
      reason: 'Mass outage ativo - prioridade sobre troubleshooting individual',
      priority: 0,
      shouldStartImmediately: false
    };
  }

  // Se já iniciou um cenário, manter continuidade
  const scenarioStarted = flowState?.scenario_started;
  if (scenarioStarted && ['A', 'B', 'C', 'D', 'E'].includes(scenarioStarted)) {
    return {
      scenario: scenarioStarted as ScenarioType,
      confidence: 'high',
      reason: `Continuando cenário ${scenarioStarted} já iniciado`,
      priority: -1, // Continuação tem prioridade máxima
      shouldStartImmediately: false
    };
  }

  // Se não há sinal disponível, não detectar cenário
  if (!signal) {
    return {
      scenario: null,
      confidence: 'low',
      reason: 'Sem dados de sinal disponíveis',
      priority: 999
    };
  }

  const tx = Number(signal.tx);
  const rx = Number(signal.rx);

  // Validar valores numéricos
  if (!Number.isFinite(tx) || !Number.isFinite(rx)) {
    return {
      scenario: null,
      confidence: 'low',
      reason: 'Valores de sinal inválidos (não numéricos)',
      priority: 999,
      signalData: { tx, rx }
    };
  }

  // ==========================================
  // CENÁRIO A: TX/RX = 0 (PRIORIDADE 1)
  // ==========================================
  if (tx === 0 && rx === 0) {
    return {
      scenario: 'A',
      confidence: 'high',
      reason: 'TX/RX = 0.00 - Equipamento sem sinal (desligado, desconectado ou sem energia)',
      priority: 1,
      signalData: { tx, rx },
      shouldStartImmediately: true
    };
  }

  // ==========================================
  // CENÁRIO D: RX CRÍTICO ≤ -28 dBm (PRIORIDADE 2)
  // ==========================================
  if (rx <= -28) {
    return {
      scenario: 'D',
      confidence: 'high',
      reason: `RX crítico (${rx} dBm ≤ -28) - Problema grave na fibra óptica`,
      priority: 2,
      signalData: { tx, rx },
      shouldStartImmediately: true
    };
  }

  // ==========================================
  // CENÁRIO C: SINAL FRACO -27 a -24 dBm (PRIORIDADE 3)
  // ==========================================
  if (rx >= -27 && rx <= -24) {
    return {
      scenario: 'C',
      confidence: 'high',
      reason: `Sinal fraco (${rx} dBm entre -27 e -24) - Atenuação ou conector solto`,
      priority: 3,
      signalData: { tx, rx },
      shouldStartImmediately: true
    };
  }

  // ==========================================
  // CENÁRIO B: SINAL BOM > -24 dBm (PRIORIDADE 4)
  // ==========================================
  if (rx > -24 && tx > 0) {
    // Verificar se não é caso de WAN/Wi-Fi (Cenário E)
    const hasWanIssue = flowState?.wan_issue === true;
    const hasWifiIssue = flowState?.wifi_issue === true;
    
    if (hasWanIssue || hasWifiIssue) {
      // Delegar para Cenário E
      return {
        scenario: 'E',
        confidence: 'medium',
        reason: `Sinal óptico bom (${rx} dBm) mas problema de rede detectado (WAN/Wi-Fi)`,
        priority: 5,
        signalData: { tx, rx },
        shouldStartImmediately: false
      };
    }

    return {
      scenario: 'B',
      confidence: 'high',
      reason: `Sinal bom (${rx} dBm > -24) com TX (${tx}) - Equipamento travado ou problema local`,
      priority: 4,
      signalData: { tx, rx },
      shouldStartImmediately: false // Pode fazer diagnóstico rápido primeiro
    };
  }

  // ==========================================
  // CENÁRIO E: FALLBACK (PRIORIDADE 5)
  // ==========================================
  // Se chegou aqui, sinal está OK mas cliente reporta problema
  // Possível issue de WAN/Wi-Fi
  return {
    scenario: 'E',
    confidence: 'low',
    reason: 'Sinal óptico OK mas cliente reporta problema - Possível issue WAN/Wi-Fi',
    priority: 5,
    signalData: { tx, rx },
    shouldStartImmediately: false
  };
}

/**
 * Verifica se sinal é zero (TX = 0 e RX = 0)
 */
export function isZeroSignal(signal?: SignalData | null): boolean {
  if (!signal) return false;
  const tx = Number(signal.tx);
  const rx = Number(signal.rx);
  return tx === 0 && rx === 0;
}

/**
 * Verifica se sinal é crítico (RX ≤ -28 dBm)
 */
export function isCriticalSignal(signal?: SignalData | null): boolean {
  if (!signal) return false;
  const rx = Number(signal.rx);
  return Number.isFinite(rx) && rx <= -28;
}

/**
 * Verifica se sinal é fraco (RX entre -27 e -24 dBm)
 */
export function isWeakSignal(signal?: SignalData | null): boolean {
  if (!signal) return false;
  const rx = Number(signal.rx);
  return Number.isFinite(rx) && rx >= -27 && rx <= -24;
}

/**
 * Verifica se sinal é bom (RX > -24 dBm)
 */
export function isGoodSignal(signal?: SignalData | null): boolean {
  if (!signal) return false;
  const rx = Number(signal.rx);
  return Number.isFinite(rx) && rx > -24;
}

/**
 * Determina se deve usar código refatorado ou inline legado
 * baseado em feature flag e rollout percentage
 */
export async function shouldUseRefactoredScenario(
  supabase: any,
  scenario: ScenarioType,
  conversation_id: string
): Promise<boolean> {
  if (!scenario) return false;

  try {
    const { data: flag, error } = await supabase
      .from('feature_flags')
      .select('enabled, rollout_percentage')
      .eq('flag_key', `refactored_scenario_${scenario.toLowerCase()}`)
      .maybeSingle();

    if (error || !flag) {
      // Flag não encontrada: tentar flag global
      const { data: globalFlag } = await supabase
        .from('feature_flags')
        .select('enabled, rollout_percentage')
        .eq('flag_key', 'refactored_scenarios')
        .maybeSingle();

      if (!globalFlag) return false; // Default: usar código inline legado
      
      if (!globalFlag.enabled) return false;

      // Rollout gradual baseado em hash do conversation_id
      if (globalFlag.rollout_percentage < 100) {
        const hash = conversation_id.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        const percentage = Math.abs(hash) % 100;
        return percentage < globalFlag.rollout_percentage;
      }

      return true;
    }

    if (!flag.enabled) return false;

    // Rollout gradual baseado em hash
    if (flag.rollout_percentage < 100) {
      const hash = conversation_id.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const percentage = Math.abs(hash) % 100;
      return percentage < flag.rollout_percentage;
    }

    return true;
  } catch (err) {
    // Em caso de erro, usar código inline legado (fail-safe)
    return false;
  }
}

/**
 * Valida se um cenário pode ser iniciado dado o contexto atual
 */
export function canStartScenario(
  scenario: ScenarioType,
  flowState: FlowState | null | undefined,
  signal: SignalData | null | undefined
): { canStart: boolean; reason: string } {
  if (!scenario) {
    return { canStart: false, reason: 'Cenário não especificado' };
  }

  // Não iniciar se já há um cenário em andamento diferente
  const currentScenario = flowState?.scenario_started;
  if (currentScenario && currentScenario !== scenario) {
    return { 
      canStart: false, 
      reason: `Cenário ${currentScenario} já em andamento` 
    };
  }

  // Não iniciar se já completou este cenário
  const completedScenario = flowState?.scenario_completed;
  if (completedScenario === scenario) {
    return { 
      canStart: false, 
      reason: `Cenário ${scenario} já foi completado` 
    };
  }

  // Validações específicas por cenário
  switch (scenario) {
    case 'A':
    case 'D':
      // Cenários críticos podem sempre iniciar
      return { canStart: true, reason: 'Cenário crítico - iniciar imediatamente' };
    
    case 'B':
    case 'C':
      // Verificar se há sinal disponível
      if (!signal) {
        return { 
          canStart: false, 
          reason: 'Sinal não disponível para diagnóstico' 
        };
      }
      return { canStart: true, reason: 'Condições adequadas' };
    
    case 'E':
      // Cenário E pode iniciar se outros já foram descartados
      return { canStart: true, reason: 'Fallback para diagnóstico WAN/Wi-Fi' };
    
    default:
      return { canStart: false, reason: 'Cenário desconhecido' };
  }
}
