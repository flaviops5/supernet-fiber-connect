/**
 * Fast Path Circuit Breaker
 * Proteção contra cascata de falhas no fast-path
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export class FastPathCircuitBreaker {
  private static instance: FastPathCircuitBreaker;
  private failures = 0;
  private threshold = 5; // 5 falhas consecutivas
  private resetTimeout = 300000; // 5 minutos
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private lastFailure: number | null = null;

  static getInstance(): FastPathCircuitBreaker {
    if (!FastPathCircuitBreaker.instance) {
      FastPathCircuitBreaker.instance = new FastPathCircuitBreaker();
    }
    return FastPathCircuitBreaker.instance;
  }

  async execute<T>(fn: () => Promise<T>, supabase: SupabaseClient, logger: any): Promise<T | null> {
    // Estado OPEN: não executar, retornar null imediatamente
    if (this.state === 'open') {
      if (this.lastFailure && Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
        logger.info('🔄 Circuit breaker: Tentando recuperação (half-open)');
      } else {
        logger.warn('⚠️ Circuit breaker: OPEN - fast-path desabilitado');
        return null;
      }
    }

    try {
      const result = await fn();
      
      // Sucesso: resetar contador
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
        logger.info('✅ Circuit breaker: Recuperado (closed)');
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();

      if (this.failures >= this.threshold) {
        this.state = 'open';
        
        // Notificar admins
        try {
          await supabase.from('system_alerts').insert({
            alert_type: 'fast_path_circuit_open',
            severity: 'high',
            message: `Fast-path desabilitado automaticamente após ${this.failures} falhas`,
            metadata: { error: String(error) }
          });
        } catch (alertError) {
          logger.error('Erro ao criar alerta de circuit breaker', alertError);
        }

        logger.error('🚨 Circuit breaker: OPEN - desabilitando fast-path', { 
          failures: this.failures 
        });
      }

      throw error;
    }
  }

  getState(): string {
    return this.state;
  }
}
