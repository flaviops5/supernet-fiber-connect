// ============================================
// RATE LIMITER - Proteção por CPF
// ============================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: Date;
  blockedUntil?: Date;
}

const MAX_REQUESTS_PER_MINUTE = 10;
const WINDOW_MINUTES = 1;
const BLOCK_MINUTES = 5;

/**
 * Verifica rate limit para um CPF
 */
export async function checkRateLimit(cpf: string): Promise<RateLimitResult> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Supabase credentials not found - skipping rate limit');
      return { allowed: true, remaining: MAX_REQUESTS_PER_MINUTE };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000);

    // Buscar registro ativo para este CPF
    const { data: existing } = await supabase
      .from('rate_limit_tracking')
      .select('*')
      .eq('cpf', cpf)
      .gte('window_start', windowStart.toISOString())
      .maybeSingle();

    // Verificar se está bloqueado
    if (existing?.blocked_until) {
      const blockedUntil = new Date(existing.blocked_until);
      if (blockedUntil > now) {
        console.warn(`🚫 Rate limit: CPF ${cpf} blocked until ${blockedUntil.toISOString()}`);
        return {
          allowed: false,
          remaining: 0,
          blockedUntil
        };
      }
    }

    // Se não existe registro recente, criar novo
    if (!existing) {
      await supabase
        .from('rate_limit_tracking')
        .insert({
          cpf,
          window_start: now.toISOString(),
          request_count: 1
        });

      return {
        allowed: true,
        remaining: MAX_REQUESTS_PER_MINUTE - 1
      };
    }

    // Incrementar contador
    const newCount = existing.request_count + 1;

    if (newCount > MAX_REQUESTS_PER_MINUTE) {
      // Bloquear por BLOCK_MINUTES
      const blockedUntil = new Date(now.getTime() + BLOCK_MINUTES * 60 * 1000);
      
      await supabase
        .from('rate_limit_tracking')
        .update({
          request_count: newCount,
          blocked_until: blockedUntil.toISOString()
        })
        .eq('id', existing.id);

      console.warn(`🚫 Rate limit exceeded: CPF ${cpf} blocked for ${BLOCK_MINUTES} minutes`);

      return {
        allowed: false,
        remaining: 0,
        blockedUntil
      };
    }

    // Incrementar contador
    await supabase
      .from('rate_limit_tracking')
      .update({
        request_count: newCount
      })
      .eq('id', existing.id);

    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_MINUTE - newCount
    };

  } catch (error) {
    console.error('❌ Error checking rate limit:', error);
    // Em caso de erro, permitir (fail-open)
    return { allowed: true, remaining: MAX_REQUESTS_PER_MINUTE };
  }
}

/**
 * Formata tempo de bloqueio para mensagem amigável
 */
export function formatBlockedTime(blockedUntil: Date): string {
  const now = new Date();
  const diffMs = blockedUntil.getTime() - now.getTime();
  const diffMinutes = Math.ceil(diffMs / 60000);
  
  if (diffMinutes <= 1) return 'menos de 1 minuto';
  if (diffMinutes < 60) return `${diffMinutes} minutos`;
  
  const hours = Math.ceil(diffMinutes / 60);
  return `${hours} hora${hours > 1 ? 's' : ''}`;
}
