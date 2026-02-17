/**
 * ============================================================
 * ONU Signal Analyzer - Módulo Reutilizável
 * ============================================================
 * 
 * Módulo PURO (zero dependências externas) para classificação
 * e diagnóstico de potência óptica TX/RX de ONUs.
 * 
 * COMO USAR NO SEU SAAS:
 * 1. Copie este arquivo para o seu projeto
 * 2. Importe as funções que precisa
 * 3. Passe os valores TX/RX obtidos da API IXC
 * 
 * Exemplo:
 *   import { analyzeOnuSignal } from './onu-signal-analyzer';
 *   const result = analyzeOnuSignal({ tx: 1.2, rx: -18.5 });
 *   console.log(result.diagnosis);    // "Sinal óptico dentro dos padrões ideais"
 *   console.log(result.rx.level);     // "Excelente"
 *   console.log(result.rx.emoji);     // "🟢"
 */

// ============================================================
// TYPES
// ============================================================

export type SignalQuality = 'critical' | 'weak' | 'acceptable' | 'excellent' | 'ideal' | 'saturated' | 'low' | 'unknown';

export interface SignalInterpretation {
  status: SignalQuality;
  level: string;
  message: string;
  emoji: string;
}

export interface SignalReading {
  value: number;
  unit: 'dBm';
  status: SignalQuality;
  level: string;
  message: string;
  emoji: string;
}

export type EquipmentStatus = 'online' | 'offline' | 'unknown';

export interface OnuSignalInput {
  tx: number | null;
  rx: number | null;
}

export interface OnuSignalResult {
  equipmentStatus: EquipmentStatus;
  isOffline: boolean;
  rx: SignalReading | null;
  tx: SignalReading | null;
  diagnosis: string;
  recommendedAction: string;
  /** Severidade geral: 0 = OK, 1 = atenção, 2 = problema, 3 = crítico */
  severity: 0 | 1 | 2 | 3;
}

// ============================================================
// CLASSIFICADORES
// ============================================================

/**
 * Classifica potência RX (Recepção) em dBm
 * 
 * Faixas:
 *   > -8 dBm       → Saturado (risco de dano)
 *   -8 a -20 dBm   → Excelente
 *   -20 a -25 dBm  → Aceitável
 *   -25 a -28 dBm  → Fraco
 *   < -28 dBm      → Crítico
 */
export function classifyRX(rx: number): SignalInterpretation {
  if (rx > -8) {
    return { status: 'saturated', level: 'Saturado', message: 'Risco de dano ao equipamento', emoji: '🔴' };
  }
  if (rx >= -20) {
    return { status: 'excellent', level: 'Excelente', message: 'Sinal ideal', emoji: '🟢' };
  }
  if (rx >= -25) {
    return { status: 'acceptable', level: 'Aceitável', message: 'Funcionando, mas atenção', emoji: '🟡' };
  }
  if (rx >= -28) {
    return { status: 'weak', level: 'Fraco', message: 'Risco de instabilidade', emoji: '🟠' };
  }
  return { status: 'critical', level: 'Crítico', message: 'Problema grave de sinal', emoji: '🔴' };
}

/**
 * Classifica potência TX (Transmissão) em dBm
 * 
 * Faixas:
 *   > 2 dBm     → Alto demais (saturação)
 *   0 a 2 dBm   → Ideal
 *   -2 a 0 dBm  → Aceitável
 *   < -2 dBm    → Baixo
 */
export function classifyTX(tx: number): SignalInterpretation {
  if (tx > 2) {
    return { status: 'saturated', level: 'Alto demais', message: 'Risco de saturação', emoji: '🔴' };
  }
  if (tx >= 0) {
    return { status: 'ideal', level: 'Ideal', message: 'Transmissão perfeita', emoji: '🟢' };
  }
  if (tx >= -2) {
    return { status: 'acceptable', level: 'Aceitável', message: 'Funcionando normalmente', emoji: '🟡' };
  }
  return { status: 'low', level: 'Baixo', message: 'Verificar equipamento', emoji: '🟠' };
}

// ============================================================
// ANALISADOR PRINCIPAL
// ============================================================

/**
 * Analisa sinal ONU completo (TX + RX) e retorna diagnóstico
 * 
 * @example
 * const result = analyzeOnuSignal({ tx: 1.2, rx: -18.5 });
 * // result.diagnosis → "Sinal óptico dentro dos padrões ideais"
 * // result.severity → 0
 * 
 * @example
 * const result = analyzeOnuSignal({ tx: 0, rx: 0 });
 * // result.isOffline → true
 * // result.diagnosis → "Equipamento OFFLINE detectado (TX: 0.00 / RX: 0.00)"
 */
export function analyzeOnuSignal(input: OnuSignalInput): OnuSignalResult {
  const { tx, rx } = input;

  // Sem dados
  if (tx === null && rx === null) {
    return {
      equipmentStatus: 'unknown',
      isOffline: false,
      rx: null,
      tx: null,
      diagnosis: 'Não foi possível obter leitura do sinal',
      recommendedAction: 'Verificar conexão com equipamento',
      severity: 2,
    };
  }

  // Offline: TX e RX = 0
  const isOffline = tx === 0 && rx === 0;
  if (isOffline) {
    return {
      equipmentStatus: 'offline',
      isOffline: true,
      rx: rx !== null ? { value: rx, unit: 'dBm', status: 'critical', level: 'Offline', message: 'Sem sinal', emoji: '⚫' } : null,
      tx: tx !== null ? { value: tx, unit: 'dBm', status: 'critical', level: 'Offline', message: 'Sem sinal', emoji: '⚫' } : null,
      diagnosis: 'Equipamento OFFLINE detectado (TX: 0.00 / RX: 0.00)',
      recommendedAction: 'Confirmar problema de ENERGIA - Verificar se equipamento está ligado, fonte de alimentação e cabos de energia',
      severity: 3,
    };
  }

  // Classificar individualmente
  const rxInterp = rx !== null ? classifyRX(rx) : null;
  const txInterp = tx !== null ? classifyTX(tx) : null;

  // Diagnóstico combinado
  let diagnosis: string;
  let action: string;
  let severity: 0 | 1 | 2 | 3;

  const rxCritical = rxInterp?.status === 'critical' || rxInterp?.status === 'saturated';
  const txCritical = txInterp?.status === 'saturated';
  const rxWeak = rxInterp?.status === 'weak';
  const rxGood = rxInterp?.status === 'excellent';
  const txGood = txInterp?.status === 'ideal';

  if (rxCritical || txCritical) {
    diagnosis = 'Problema crítico de sinal detectado';
    action = 'Abrir atendimento URGENTE para inspeção da rede óptica';
    severity = 3;
  } else if (rxWeak) {
    diagnosis = 'Sinal de recepção fraco detectado';
    action = 'Abrir atendimento para verificar cabo/conector';
    severity = 2;
  } else if (rxGood && txGood) {
    diagnosis = 'Sinal óptico dentro dos padrões ideais';
    action = 'Problema não está relacionado ao sinal - investigar outras causas';
    severity = 0;
  } else {
    diagnosis = 'Sinal funcionando, mas requer atenção';
    action = 'Monitorar e considerar inspeção preventiva';
    severity = 1;
  }

  return {
    equipmentStatus: 'online',
    isOffline: false,
    rx: rx !== null && rxInterp ? { value: rx, unit: 'dBm', ...rxInterp } : null,
    tx: tx !== null && txInterp ? { value: tx, unit: 'dBm', ...txInterp } : null,
    diagnosis,
    recommendedAction: action,
    severity,
  };
}

// ============================================================
// HELPERS EXTRAS
// ============================================================

/**
 * Formata resultado para exibição em texto (chat, terminal, etc.)
 */
export function formatSignalReport(result: OnuSignalResult): string {
  const lines: string[] = [];
  
  lines.push(`📡 Status: ${result.equipmentStatus.toUpperCase()}`);
  
  if (result.rx) {
    lines.push(`RX: ${result.rx.emoji} ${result.rx.value} dBm (${result.rx.level})`);
  }
  if (result.tx) {
    lines.push(`TX: ${result.tx.emoji} ${result.tx.value} dBm (${result.tx.level})`);
  }
  
  lines.push(`Diagnóstico: ${result.diagnosis}`);
  lines.push(`Ação: ${result.recommendedAction}`);
  
  return lines.join('\n');
}

/**
 * Verifica se o sinal precisa de atenção (severity >= 2)
 */
export function needsAttention(result: OnuSignalResult): boolean {
  return result.severity >= 2;
}

/**
 * Verifica se é urgente (severity === 3)
 */
export function isUrgent(result: OnuSignalResult): boolean {
  return result.severity === 3;
}
