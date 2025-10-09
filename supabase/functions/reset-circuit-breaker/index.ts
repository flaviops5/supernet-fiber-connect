import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resetCircuitBreaker, getCircuitBreakerStatus } from '../_shared/ixc-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // Verificar se usuário é admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roleData, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
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
        user_id: user.id,
        before: statusBefore,
        after: statusAfter,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Circuit breaker resetado com sucesso',
        before: statusBefore,
        after: statusAfter
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error resetting circuit breaker:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
