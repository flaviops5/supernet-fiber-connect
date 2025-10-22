import { createProtectedHandler } from "../_shared/base-handler.ts";
import { resetCircuitBreaker, getCircuitBreakerStatus } from '../_shared/ixc-client.ts';

Deno.serve(createProtectedHandler({
  functionName: 'reset-circuit-breaker',
  requireAuth: true,
  enableRateLimit: false,
  
  handler: async (req, { supabase, user }) => {
    // Verificar se usuário é admin
    const { data: roleData, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user!.id,
      _role: 'admin'
    });

    if (roleError || !roleData) {
      throw new Error('Unauthorized - Admin access required');
    }

    // Obter status ANTES do reset
    const statusBefore = getCircuitBreakerStatus();

    // Resetar circuit breaker
    resetCircuitBreaker();

    // Obter status DEPOIS do reset
    const statusAfter = getCircuitBreakerStatus();

    // Log da ação
    await supabase.from('action_log').insert({
      agent_name: 'system',
      action_type: 'circuit_breaker_reset',
      action_payload: {
        user_id: user!.id,
        before: statusBefore,
        after: statusAfter,
        timestamp: new Date().toISOString()
      }
    });

    return {
      success: true,
      message: 'Circuit breaker resetado com sucesso',
      before: statusBefore,
      after: statusAfter
    };
  }
}));
