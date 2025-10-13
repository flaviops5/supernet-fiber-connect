/**
 * Circuit Breaker Pattern - Sprint 2
 * 
 * Implementa proteção contra cascatas de erro em integrações externas
 * Estados: CLOSED (normal) -> OPEN (bloqueado) -> HALF_OPEN (teste)
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Número de falhas para abrir
  successThreshold: number;       // Sucessos em half-open para fechar
  timeout: number;                // Tempo em ms antes de tentar half-open
  halfOpenAttempts: number;       // Tentativas permitidas em half-open
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = 0;
  private halfOpenCount = 0;
  
  private config: CircuitBreakerConfig;
  private name: string;

  constructor(name: string, config?: Partial<CircuitBreakerConfig>) {
    this.name = name;
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      successThreshold: config?.successThreshold ?? 3,
      timeout: config?.timeout ?? 30000, // 30s
      halfOpenAttempts: config?.halfOpenAttempts ?? 3,
    };
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    // OPEN: Rejeita imediatamente até timeout
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const waitTime = Math.ceil((this.nextAttempt - Date.now()) / 1000);
        throw new Error(
          `Circuit breaker OPEN for ${this.name} - aguarde ${waitTime}s`
        );
      }
      // Timeout expirou: tenta half-open
      this.transitionToHalfOpen();
    }

    // HALF_OPEN: Permite tentativas limitadas
    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenCount >= this.config.halfOpenAttempts) {
        throw new Error(
          `Circuit breaker HALF_OPEN limit reached for ${this.name}`
        );
      }
      this.halfOpenCount++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      console.log(
        `✅ Circuit breaker ${this.name} HALF_OPEN success ${this.successCount}/${this.config.successThreshold}`
      );

      // Se atingiu threshold de sucesso, fecha o circuito
      if (this.successCount >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    console.error(
      `❌ Circuit breaker ${this.name} failure ${this.failureCount}/${this.config.failureThreshold}`
    );

    if (this.state === 'HALF_OPEN') {
      // Falha em half-open: volta para OPEN imediatamente
      this.transitionToOpen();
      return;
    }

    // CLOSED: Se atingiu threshold, abre o circuito
    if (
      this.state === 'CLOSED' &&
      this.failureCount >= this.config.failureThreshold
    ) {
      this.transitionToOpen();
    }
  }

  private transitionToOpen(): void {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.config.timeout;
    this.halfOpenCount = 0;
    
    console.error(
      `🚨 Circuit breaker ${this.name} OPENED - aguarde ${this.config.timeout / 1000}s`
    );
  }

  private transitionToHalfOpen(): void {
    this.state = 'HALF_OPEN';
    this.successCount = 0;
    this.halfOpenCount = 0;
    
    console.warn(
      `⚠️ Circuit breaker ${this.name} HALF_OPEN - tentando recuperação`
    );
  }

  private transitionToClosed(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCount = 0;
    
    console.log(
      `✅ Circuit breaker ${this.name} CLOSED - operação normal`
    );
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt > 0 ? new Date(this.nextAttempt) : null,
    };
  }

  // Permite reset manual (útil para testes e manutenção)
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = 0;
    this.halfOpenCount = 0;
    console.log(`🔄 Circuit breaker ${this.name} resetado manualmente`);
  }
}

// Singleton para Lovable AI
let lovableCircuitBreaker: CircuitBreaker | null = null;

export function getLovableCircuitBreaker(): CircuitBreaker {
  if (!lovableCircuitBreaker) {
    lovableCircuitBreaker = new CircuitBreaker('lovable-ai', {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 30000, // 30s
      halfOpenAttempts: 3,
    });
  }
  return lovableCircuitBreaker;
}

// Singleton para IXC API
let ixcCircuitBreaker: CircuitBreaker | null = null;

export function getIXCCircuitBreaker(): CircuitBreaker {
  if (!ixcCircuitBreaker) {
    ixcCircuitBreaker = new CircuitBreaker('ixc-api', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 60000, // 1min
      halfOpenAttempts: 2,
    });
  }
  return ixcCircuitBreaker;
}
