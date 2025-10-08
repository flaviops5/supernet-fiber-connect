// ============================================
// SYSTEM HEALTH CHECK
// ============================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { getCircuitBreakerStatus } from "../_shared/ixc-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check Database
    const dbStartTime = Date.now();
    let dbStatus = 'healthy';
    let dbError = null;
    try {
      const { error } = await supabase.from('system_health').select('id').limit(1);
      if (error) throw error;
    } catch (error: any) {
      dbStatus = 'down';
      dbError = error.message;
    }
    const dbDuration = Date.now() - dbStartTime;

    // Check IXC Proxy
    const ixcStartTime = Date.now();
    let ixcStatus = 'healthy';
    let ixcError = null;
    try {
      const ixcResponse = await fetch(`${supabaseUrl}/functions/v1/ixc-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'POST',
          path: '/webservice/v1/cliente',
          body: { page: '1', rp: '1' }
        })
      });
      
      if (!ixcResponse.ok) {
        ixcStatus = 'degraded';
        ixcError = `HTTP ${ixcResponse.status}`;
      }
    } catch (error: any) {
      ixcStatus = 'down';
      ixcError = error.message;
    }
    const ixcDuration = Date.now() - ixcStartTime;

    // Check Circuit Breaker
    const circuitBreaker = getCircuitBreakerStatus();
    const circuitStatus = circuitBreaker.state === 'closed' ? 'healthy' : 
                         circuitBreaker.state === 'half-open' ? 'degraded' : 'down';

    // Calculate overall health
    const overallStatus = 
      dbStatus === 'down' || ixcStatus === 'down' ? 'down' :
      dbStatus === 'degraded' || ixcStatus === 'degraded' || circuitStatus === 'degraded' ? 'degraded' :
      'healthy';

    // Update system_health table
    await supabase.from('system_health').upsert([
      {
        component: 'database',
        status: dbStatus,
        last_check: new Date().toISOString(),
        metadata: { duration_ms: dbDuration },
        error_message: dbError
      },
      {
        component: 'ixc',
        status: ixcStatus,
        last_check: new Date().toISOString(),
        metadata: { duration_ms: ixcDuration },
        error_message: ixcError
      },
      {
        component: 'circuit_breaker',
        status: circuitStatus,
        last_check: new Date().toISOString(),
        metadata: circuitBreaker
      }
    ], { onConflict: 'component' });

    const totalDuration = Date.now() - startTime;

    const healthReport = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration_ms: totalDuration,
      dependencies: {
        database: {
          status: dbStatus,
          duration_ms: dbDuration,
          error: dbError
        },
        ixc: {
          status: ixcStatus,
          duration_ms: ixcDuration,
          error: ixcError
        },
        circuit_breaker: {
          status: circuitStatus,
          state: circuitBreaker.state,
          failures: circuitBreaker.failures,
          threshold: circuitBreaker.threshold
        }
      }
    };

    // Status code based on overall health
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 207 : 503;

    return new Response(
      JSON.stringify(healthReport),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Health check error:', error);
    
    return new Response(
      JSON.stringify({
        status: 'down',
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
