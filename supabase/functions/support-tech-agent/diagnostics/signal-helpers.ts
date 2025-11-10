/**
 * Signal Analysis Helpers
 * Funções para análise de sinal TX/RX e classificação de cenários
 */

export interface SignalData {
  tx?: number | null;
  rx?: number | null;
}

/**
 * Detecta sinal fraco baseado em TX/RX
 * RX fraco típico entre ~ -27 e -30 dBm
 */
export function isWeakFromTxRx(tx?: number | null, rx?: number | null): boolean {
  if (typeof rx === "number" && rx <= -27 && rx > -32) return true;
  return false;
}

/**
 * Verifica se o sinal está bom (RX > -24 dBm)
 */
export function isGoodSignal(signal?: SignalData): boolean {
  const rx = Number(signal?.rx);
  return Number.isFinite(rx) && rx > -24;
}

/**
 * Verifica se TX/RX estão zerados (equipamento desligado ou desconectado)
 */
export function isZeroSignal(signal?: SignalData): boolean {
  const rx = Number(signal?.rx);
  const tx = Number(signal?.tx);
  return (tx === 0 || tx === 0.0) && (rx === 0 || rx === 0.0);
}

/**
 * Classifica cenário baseado em TX/RX
 */
export function classifySignalScenario(tx?: number, rx?: number): {
  scenario: "A" | "B" | "C" | "D" | "unknown";
  description: string;
} {
  const txNum = Number(tx);
  const rxNum = Number(rx);
  
  if (txNum === 0 && rxNum === 0) {
    return {
      scenario: "A",
      description: "TX/RX zero - Equipment disconnected or powered off"
    };
  }
  
  if (rxNum > -24 && txNum > 0) {
    return {
      scenario: "B",
      description: "Good signal but equipment stuck - Needs reboot"
    };
  }
  
  if (rxNum >= -30 && rxNum <= -27) {
    return {
      scenario: "C",
      description: "Weak signal - Optical connector issue"
    };
  }
  
  if (rxNum < -30) {
    return {
      scenario: "D",
      description: "Critical RX - Fiber optic problem"
    };
  }
  
  return {
    scenario: "unknown",
    description: "Signal pattern not recognized"
  };
}
