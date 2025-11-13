import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getOrCreateTraceId } from '../_shared/trace-id.ts';
import { createTimer } from '../_shared/duration-tracker.ts';
import { recordMetric } from '../_shared/metrics-helper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface RateLimitRequest {
  actionType: string;
  maxAttempts?: number;
  windowMinutes?: number;
  blockMinutes?: number;
}

interface RateLimitResponse {
  allowed: boolean;
  remainingAttempts?: number;
  blockedUntil?: string;
  retryAfterSeconds?: number;
  headers?: Record<string, string>;
}

Deno.serve(async (req) => {
  const timer = createTimer();
  const traceId = getOrCreateTraceId(req);
  let success = false;
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { actionType, maxAttempts = 5, windowMinutes = 15, blockMinutes = 60 }: RateLimitRequest = await req.json();

    if (!actionType) {
      return new Response(
        JSON.stringify({ error: 'actionType is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract client IP from headers
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     req.headers.get('x-real-ip') ||
                     null;

    console.log(`⏱️ Rate limit check: ${actionType} from IP ${clientIp}`);

    // Call rate limit function
    const { data, error } = await supabase.rpc('check_rate_limit_with_ip', {
      action_type_param: actionType,
      ip_address_param: clientIp,
      max_attempts: maxAttempts,
      window_minutes: windowMinutes,
      block_minutes: blockMinutes,
    });

    if (error) {
      console.error('❌ Rate limit error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = data as RateLimitResponse;
    
    // Build response headers
    const rateLimitHeaders = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': maxAttempts.toString(),
      'X-RateLimit-Remaining': (result.remainingAttempts || 0).toString(),
    };

    if (result.retryAfterSeconds) {
      rateLimitHeaders['Retry-After'] = Math.ceil(result.retryAfterSeconds).toString();
      rateLimitHeaders['X-RateLimit-Reset'] = new Date(Date.now() + result.retryAfterSeconds * 1000).toISOString();
    }

    const status = result.allowed ? 200 : 429;
    success = result.allowed;
    
    console.log(`${result.allowed ? '✅' : '⛔'} Rate limit ${result.allowed ? 'passed' : 'exceeded'}: ${actionType}`, { trace_id: traceId });

    return new Response(
      JSON.stringify({ ...result, trace_id: traceId }),
      { status, headers: rateLimitHeaders }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error, { trace_id: traceId });
    return new Response(
      JSON.stringify({ error: error.message, trace_id: traceId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } finally {
    const duration = timer.end();
    await recordMetric({
      agent_name: 'rate-limit-check',
      action_type: 'check_rate_limit',
      success,
      duration_ms: duration,
      metadata: { trace_id: traceId }
    }).catch(console.error);
  }
});
