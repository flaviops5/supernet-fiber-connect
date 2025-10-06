// ============================================
// METRICS COLLECTOR - Processa e agrega métricas
// ============================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { timeWindow = '1h' } = await req.json().catch(() => ({}));
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calcular janela de tempo
    const windowMinutes = timeWindow === '1h' ? 60 : timeWindow === '6h' ? 360 : timeWindow === '24h' ? 1440 : 60;
    const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    // Buscar métricas
    const { data: metrics, error: metricsError } = await supabase
      .from('agent_metrics')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (metricsError) throw metricsError;

    // Agregar por agente
    const byAgent: Record<string, any> = {};
    
    metrics?.forEach(m => {
      if (!byAgent[m.agent_name]) {
        byAgent[m.agent_name] = {
          total: 0,
          success: 0,
          failed: 0,
          avg_duration_ms: 0,
          max_duration_ms: 0,
          min_duration_ms: Infinity,
          durations: []
        };
      }
      
      const agent = byAgent[m.agent_name];
      agent.total++;
      if (m.success) agent.success++;
      else agent.failed++;
      
      agent.durations.push(m.duration_ms);
      agent.max_duration_ms = Math.max(agent.max_duration_ms, m.duration_ms);
      agent.min_duration_ms = Math.min(agent.min_duration_ms, m.duration_ms);
    });

    // Calcular médias e taxas
    Object.keys(byAgent).forEach(agentName => {
      const agent = byAgent[agentName];
      agent.avg_duration_ms = Math.round(agent.durations.reduce((a: number, b: number) => a + b, 0) / agent.durations.length);
      agent.success_rate = ((agent.success / agent.total) * 100).toFixed(2) + '%';
      agent.error_rate = ((agent.failed / agent.total) * 100).toFixed(2) + '%';
      delete agent.durations; // Limpar array temporário
    });

    // Métricas globais
    const totalRequests = metrics?.length || 0;
    const successfulRequests = metrics?.filter(m => m.success).length || 0;
    const failedRequests = metrics?.filter(m => !m.success).length || 0;
    const avgDuration = metrics?.length 
      ? Math.round(metrics.reduce((sum, m) => sum + m.duration_ms, 0) / metrics.length)
      : 0;

    // Buscar alertas recentes
    const { data: alerts } = await supabase
      .from('alert_history')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10);

    // Buscar ações falhadas (DLQ)
    const { data: failedActions } = await supabase
      .from('failed_actions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    // Buscar status do sistema
    const { data: systemHealth } = await supabase
      .from('system_health')
      .select('*')
      .order('last_check', { ascending: false })
      .limit(10);

    const report = {
      time_window: timeWindow,
      period: {
        start: since,
        end: new Date().toISOString()
      },
      summary: {
        total_requests: totalRequests,
        successful_requests: successfulRequests,
        failed_requests: failedRequests,
        success_rate: totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(2) + '%' : '0%',
        error_rate: totalRequests > 0 ? ((failedRequests / totalRequests) * 100).toFixed(2) + '%' : '0%',
        avg_duration_ms: avgDuration
      },
      by_agent: byAgent,
      recent_alerts: alerts || [],
      failed_actions: {
        pending: failedActions?.length || 0,
        items: failedActions || []
      },
      system_health: systemHealth || []
    };

    // Verificar se há alertas para disparar
    const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
    if (errorRate > 5) {
      console.warn(`⚠️ ERROR RATE HIGH: ${errorRate.toFixed(2)}% (threshold: 5%)`);
      // TODO: Enviar notificação
    }

    if (avgDuration > 5000) {
      console.warn(`⚠️ SLOW RESPONSE: ${avgDuration}ms (threshold: 5000ms)`);
      // TODO: Enviar notificação
    }

    return new Response(
      JSON.stringify(report),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Metrics collector error:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
