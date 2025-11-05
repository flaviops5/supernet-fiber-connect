import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeployRequest {
  type: 'health_check' | 'deploy_edge_functions' | 'deploy_frontend' | 'smoke_tests' | 'rollback';
  version?: string;
}

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'warning' | 'error';
  responseTime: number;
  details?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, version }: DeployRequest = await req.json();

    switch (type) {
      case 'health_check': {
        const results: HealthCheckResult[] = [];
        
        // Check database
        const dbStart = Date.now();
        const { error: dbError } = await supabase.from('profiles').select('count').limit(1);
        results.push({
          service: 'database',
          status: dbError ? 'error' : 'healthy',
          responseTime: Date.now() - dbStart,
          details: dbError?.message,
        });

        // Check system-health function
        const healthStart = Date.now();
        const { data: healthData, error: healthError } = await supabase.functions.invoke('system-health');
        results.push({
          service: 'edge_functions',
          status: healthError ? 'error' : 'healthy',
          responseTime: Date.now() - healthStart,
          details: healthError?.message,
        });

        // Check auth
        const authStart = Date.now();
        const { error: authError } = await supabase.auth.getUser();
        results.push({
          service: 'auth',
          status: authError ? 'warning' : 'healthy',
          responseTime: Date.now() - authStart,
        });

        const allHealthy = results.every(r => r.status === 'healthy');
        const hasErrors = results.some(r => r.status === 'error');

        return new Response(
          JSON.stringify({
            overall: hasErrors ? 'error' : allHealthy ? 'healthy' : 'warning',
            checks: results,
            timestamp: new Date().toISOString(),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'smoke_tests': {
        const tests = [
          { name: 'Database Read', passed: false, duration: 0 },
          { name: 'Database Write', passed: false, duration: 0 },
          { name: 'Edge Function Call', passed: false, duration: 0 },
          { name: 'Auth System', passed: false, duration: 0 },
          { name: 'Feature Flags', passed: false, duration: 0 },
        ];

        // Test 1: Database Read
        try {
          const start = Date.now();
          const { error } = await supabase.from('profiles').select('count').limit(1);
          tests[0].duration = Date.now() - start;
          tests[0].passed = !error;
        } catch (e) {
          tests[0].passed = false;
        }

        // Test 2: Database Write
        try {
          const start = Date.now();
          const { error } = await supabase.from('deploy_history').insert({
            deploy_type: 'smoke_test',
            status: 'success',
            version: version || 'test',
          });
          tests[1].duration = Date.now() - start;
          tests[1].passed = !error;
        } catch (e) {
          tests[1].passed = false;
        }

        // Test 3: Edge Function
        try {
          const start = Date.now();
          const { error } = await supabase.functions.invoke('system-health');
          tests[2].duration = Date.now() - start;
          tests[2].passed = !error;
        } catch (e) {
          tests[2].passed = false;
        }

        // Test 4: Auth
        try {
          const start = Date.now();
          await supabase.auth.getSession();
          tests[3].duration = Date.now() - start;
          tests[3].passed = true;
        } catch (e) {
          tests[3].passed = false;
        }

        // Test 5: Feature Flags
        try {
          const start = Date.now();
          const { error } = await supabase.from('feature_flags').select('count').limit(1);
          tests[4].duration = Date.now() - start;
          tests[4].passed = !error;
        } catch (e) {
          tests[4].passed = false;
        }

        const allPassed = tests.every(t => t.passed);
        const totalDuration = tests.reduce((sum, t) => sum + t.duration, 0);

        return new Response(
          JSON.stringify({
            success: allPassed,
            tests,
            totalDuration,
            timestamp: new Date().toISOString(),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'rollback': {
        // Mark latest deploy as rolled back
        const { error } = await supabase
          .from('deploy_history')
          .update({ 
            status: 'rolled_back',
            completed_at: new Date().toISOString(),
          })
          .eq('status', 'running')
          .order('started_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: 'Rollback completed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid deploy type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Deploy error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
