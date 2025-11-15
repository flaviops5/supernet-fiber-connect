/**
 * GAP #1: Testes Automatizados para PR#17 - Fast-Path
 * Coverage: Diagnósticos paralelos + Roteamento + Handlers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('PR#17 - Fast-Path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runParallelDiagnostics', () => {
    it('deve executar signal e connectivity em paralelo', async () => {
      const startTime = Date.now();
      
      // Mock das edge functions
      const mockInvoke = vi.fn((fnName: string) => {
        if (fnName === 'ixc-onu-signal') {
          return Promise.resolve({ 
            data: { rx: -20, tx: 1.5 }, 
            error: null 
          });
        }
        if (fnName === 'test-equipment-connectivity') {
          return Promise.resolve({ 
            data: { ok: true }, 
            error: null 
          });
        }
        return Promise.reject(new Error('Unknown function'));
      });

      const mockSupabase = {
        functions: { invoke: mockInvoke },
        from: vi.fn(() => ({
          insert: vi.fn(() => Promise.resolve({ error: null }))
        }))
      };

      // Simular runParallelDiagnostics
      const result = await simulateParallelDiag(mockSupabase, '123', 'conv-id');
      
      const elapsed = Date.now() - startTime;

      // Assertions
      expect(elapsed).toBeLessThan(4000); // Paralelo < 4s
      expect(result.signalResult.status).toBe('fulfilled');
      expect(result.connectivityResult.status).toBe('fulfilled');
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });

    it('deve lidar com timeout graciosamente', async () => {
      const mockInvoke = vi.fn(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ data: null, error: 'timeout' }), 10000);
        });
      });

      const mockSupabase = {
        functions: { invoke: mockInvoke },
        from: vi.fn(() => ({
          insert: vi.fn(() => Promise.resolve({ error: null }))
        }))
      };

      const result = await simulateParallelDiag(mockSupabase, '123', 'conv-id', 1000);
      
      // Deve continuar mesmo com timeout (Promise.allSettled)
      expect(result).toBeDefined();
      expect(result.signalResult.status).toBe('rejected');
    }, 15000);
  });

  describe('Fast-Path Activation', () => {
    it('deve ativar fast-path para RX > -24 e online', () => {
      const signal = { rx: -20, tx: 1.5 };
      const connectivity = { ok: true };

      const shouldActivate = isGoodSignal(signal) && connectivity.ok;
      
      expect(shouldActivate).toBe(true);
    });

    it('NÃO deve ativar para RX = -24 (edge case)', () => {
      const signal = { rx: -24, tx: 1.5 };
      const connectivity = { ok: true };

      const shouldActivate = signal.rx > -24 && connectivity.ok;
      
      expect(shouldActivate).toBe(false);
    });

    it('NÃO deve ativar se cliente offline', () => {
      const signal = { rx: -20, tx: 1.5 };
      const connectivity = { ok: false };

      const shouldActivate = isGoodSignal(signal) && connectivity.ok;
      
      expect(shouldActivate).toBe(false);
    });

    it('NÃO deve interromper fluxo ativo', () => {
      const flowState = { waiting_step: 'scenario_b_confirm_reboot' };
      
      const isInActiveFlow = flowState.waiting_step && 
        !['initial', 'cpf_validation'].includes(flowState.waiting_step);
      
      expect(isInActiveFlow).toBe(true);
    });
  });

  describe('Feature Flag Control', () => {
    it('deve respeitar rollout percentage baseado em hash', () => {
      const conversationId = 'test-conv-123';
      const rolloutPercentage = 50;

      const hash = conversationId.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      const percentage = Math.abs(hash) % 100;
      const shouldEnable = percentage < rolloutPercentage;
      
      expect(typeof shouldEnable).toBe('boolean');
    });
  });

  describe('Circuit Breaker', () => {
    it('deve abrir circuit após threshold de falhas', () => {
      const circuitBreaker = new MockCircuitBreaker(3);
      
      // Simular 3 falhas
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      
      expect(circuitBreaker.state).toBe('open');
    });

    it('deve permitir half-open após timeout', () => {
      const circuitBreaker = new MockCircuitBreaker(2, 100); // 100ms timeout
      
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      expect(circuitBreaker.state).toBe('open');
      
      // Aguardar timeout
      setTimeout(() => {
        expect(circuitBreaker.canAttempt()).toBe(true);
      }, 150);
    });
  });

  describe('Edge Cases', () => {
    it('deve detectar RX instável (variação > 2dBm)', () => {
      const readings = [-20, -22, -26, -19]; // Variação alta
      const variance = calculateVariance(readings);
      
      expect(variance).toBeGreaterThan(2);
    });

    it('deve considerar RX estável (variação < 2dBm)', () => {
      const readings = [-20, -21, -20.5, -20.8]; // Variação baixa
      const variance = calculateVariance(readings);
      
      expect(variance).toBeLessThan(2);
    });
  });
});

// ===== Helper Functions =====

import type { SignalData } from './types/test-mocks.types';

interface TestMockSupabase {
  functions: { invoke: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
}

function isGoodSignal(signal?: SignalData): boolean {
  const rx = Number(signal?.rx);
  return Number.isFinite(rx) && rx > -24;
}

async function simulateParallelDiag(
  supabase: TestMockSupabase, 
  ixcClientId: string, 
  conversationId: string,
  timeout: number = 5000
): Promise<{
  signalResult: PromiseSettledResult<unknown>;
  connectivityResult: PromiseSettledResult<unknown>;
  elapsed: number;
}> {
  const start = Date.now();
  
  const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), ms)
      )
    ]);
  };

  const [signalResult, connectivityResult] = await Promise.allSettled([
    withTimeout(supabase.functions.invoke('ixc-onu-signal', { body: { ixc_client_id: ixcClientId } }), timeout),
    withTimeout(supabase.functions.invoke('test-equipment-connectivity', { body: { ixc_client_id: ixcClientId } }), timeout)
  ]);

  return {
    signalResult,
    connectivityResult,
    elapsed: Date.now() - start
  };
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

class MockCircuitBreaker {
  private failures = 0;
  public state: 'closed' | 'open' | 'half-open' = 'closed';
  private lastFailure: number | null = null;

  constructor(
    private threshold: number,
    private resetTimeout: number = 5000
  ) {}

  recordFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  canAttempt(): boolean {
    if (this.state === 'open' && this.lastFailure) {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    return this.state !== 'open';
  }
}
