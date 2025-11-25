import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RateLimitResult {
  allowed: boolean;
  blockedUntil?: Date;
  remainingAttempts: number;
}

export const useRateLimit = () => {
  const [isChecking, setIsChecking] = useState(false);

  const checkRateLimit = useCallback(async (
    actionType: string,
    maxAttempts: number = 5,
    windowMinutes: number = 15,
    blockMinutes: number = 60
  ): Promise<RateLimitResult> => {
    try {
      setIsChecking(true);
      
      const { data, error } = await supabase.rpc('check_rate_limit', {
        action_type_param: actionType,
        max_attempts: maxAttempts,
        window_minutes: windowMinutes,
        block_minutes: blockMinutes
      });

      if (error) throw error;

      const result = data as { allowed: boolean; blocked_until?: string; remaining_attempts?: number };
      return {
        allowed: result.allowed,
        blockedUntil: result.blocked_until ? new Date(result.blocked_until) : undefined,
        remainingAttempts: result.remaining_attempts || 0
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // Em caso de erro, permitir por segurança mas log
      return {
        allowed: true,
        remainingAttempts: maxAttempts
      };
    } finally {
      setIsChecking(false);
    }
  }, []);

  const formatBlockedTime = (blockedUntil: Date): string => {
    const now = new Date();
    const diff = blockedUntil.getTime() - now.getTime();
    const minutes = Math.ceil(diff / 60000);
    
    if (minutes <= 1) return 'menos de 1 minuto';
    if (minutes < 60) return `${minutes} minutos`;
    
    const hours = Math.ceil(minutes / 60);
    if (hours === 1) return '1 hora';
    return `${hours} horas`;
  };

  return {
    checkRateLimit,
    isChecking,
    formatBlockedTime
  };
};