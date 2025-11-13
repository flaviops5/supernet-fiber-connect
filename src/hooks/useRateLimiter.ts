import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RateLimitConfig {
  actionType: string;
  maxAttempts?: number;
  windowMinutes?: number;
  blockMinutes?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts?: number;
  blockedUntil?: string;
  retryAfterSeconds?: number;
}

/**
 * Hook para controle de rate limiting unificado
 * 
 * Configurações padrão por tipo de ação:
 * - login: 5 tentativas/15min, bloqueio de 60min
 * - cpf_search: 10 tentativas/15min, bloqueio de 30min
 * - file_upload: 3 tentativas/10min, bloqueio de 60min
 * - password_reset: 3 tentativas/60min, bloqueio de 120min
 */
export const useRateLimiter = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<RateLimitResult | null>(null);

  const presetConfigs: Record<string, RateLimitConfig> = {
    login: {
      actionType: 'login',
      maxAttempts: 5,
      windowMinutes: 15,
      blockMinutes: 60,
    },
    cpf_search: {
      actionType: 'cpf_search',
      maxAttempts: 10,
      windowMinutes: 15,
      blockMinutes: 30,
    },
    file_upload: {
      actionType: 'file_upload',
      maxAttempts: 3,
      windowMinutes: 10,
      blockMinutes: 60,
    },
    password_reset: {
      actionType: 'password_reset',
      maxAttempts: 3,
      windowMinutes: 60,
      blockMinutes: 120,
    },
  };

  /**
   * Verifica se a ação está permitida pelo rate limiter
   * @param config Configuração do rate limit ou nome preset
   * @returns Resultado da verificação
   */
  const checkRateLimit = async (
    config: RateLimitConfig | keyof typeof presetConfigs
  ): Promise<RateLimitResult> => {
    setIsChecking(true);

    try {
      // Usar preset se for string
      const rateLimitConfig = typeof config === 'string' 
        ? presetConfigs[config] 
        : config;

      if (!rateLimitConfig) {
        throw new Error(`Unknown rate limit preset: ${config}`);
      }

      const { data, error } = await supabase.functions.invoke('rate-limit-check', {
        body: rateLimitConfig,
      });

      if (error) throw error;

      const result = data as RateLimitResult;
      setLastResult(result);

      // Mostrar toast se bloqueado
      if (!result.allowed) {
        const minutes = Math.ceil((result.retryAfterSeconds || 0) / 60);
        toast.error(
          `Muitas tentativas. Tente novamente em ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`,
          {
            duration: 5000,
          }
        );
      }

      return result;
    } catch (error) {
      console.error('❌ Rate limit check error:', error);
      
      // Em caso de erro, permitir por segurança (fail-open)
      toast.error('Erro ao verificar limite de requisições');
      
      return {
        allowed: true,
        remainingAttempts: 0,
      };
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * Wrapper para executar ação com rate limit
   * @param config Configuração do rate limit
   * @param action Função a executar se rate limit permitir
   * @returns Resultado da ação ou undefined se bloqueado
   */
  const withRateLimit = async <T>(
    config: RateLimitConfig | keyof typeof presetConfigs,
    action: () => Promise<T>
  ): Promise<T | undefined> => {
    const result = await checkRateLimit(config);

    if (!result.allowed) {
      return undefined;
    }

    return await action();
  };

  return {
    checkRateLimit,
    withRateLimit,
    isChecking,
    lastResult,
    presetConfigs,
  };
};
