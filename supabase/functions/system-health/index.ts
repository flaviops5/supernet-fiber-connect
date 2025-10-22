import { createPublicHandler } from '../_shared/base-handler.ts';

Deno.serve(createPublicHandler('system-health', async (req, { supabase }) => {
  console.log('🏥 Running comprehensive health check...');

    // 1. Database Connection
    const { data: dbCheck, error: dbError } = await supabase
      .from('company_settings')
      .select('id')
      .limit(1);

    // 2. Circuit Breaker Status
    const { data: cbMetrics } = await supabase
      .from('ixc_metrics')
      .select('*')
      .eq('metric_name', 'circuit_breaker_state')
      .order('created_at', { ascending: false })
      .limit(1);

    const circuitBreakerStatus = cbMetrics?.[0]?.metric_value || 'CLOSED';

    // 3. Agent Availability
    const { data: onlineAgents, count: agentCount } = await supabase
      .from('agent_presence')
      .select('*', { count: 'exact' })
      .eq('status', 'online');

    // 4. Pending Conversations
    const { data: pendingConvs, count: pendingCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('status', 'waiting');

    // 5. DLQ Size
    const { data: dlqActions, count: dlqCount } = await supabase
      .from('action_log')
      .select('*', { count: 'exact' })
      .contains('result', { success: false });

    // 6. Active Mass Outages
    const { data: activeOutages, count: outageCount } = await supabase
      .from('mass_outage_events')
      .select('*', { count: 'exact' })
      .eq('status', 'active');

    // 7. Evolution API Status
    let evolutionStatus = 'unknown';
    try {
      const evolutionBaseUrl = Deno.env.get('EVOLUTION_API_BASE_URL');
      const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
      
      const response = await fetch(`${evolutionBaseUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey!,
          'Content-Type': 'application/json'
        }
      });
      
      evolutionStatus = response.ok ? 'healthy' : 'error';
    } catch {
      evolutionStatus = 'error';
    }

    const checks = {
      database: {
        status: dbError ? 'error' : 'healthy',
        message: dbError ? dbError.message : 'Connected',
        timestamp: new Date().toISOString()
      },
      circuit_breaker: {
        status: circuitBreakerStatus === 'OPEN' ? 'error' : 'healthy',
        state: circuitBreakerStatus,
        message: circuitBreakerStatus === 'OPEN' 
          ? '🚨 Circuit Breaker ABERTO - IXC pode estar com problemas'
          : 'Circuit Breaker funcionando normalmente'
      },
      agents: {
        status: (agentCount || 0) > 0 ? 'healthy' : 'warning',
        online_count: agentCount || 0,
        message: `${agentCount || 0} agentes online`
      },
      conversations: {
        status: (pendingCount || 0) > 50 ? 'warning' : 'healthy',
        pending_count: pendingCount || 0,
        message: `${pendingCount || 0} conversas aguardando`
      },
      dlq: {
        status: (dlqCount || 0) > 100 ? 'warning' : 'healthy',
        failed_actions: dlqCount || 0,
        message: `${dlqCount || 0} ações falhadas na DLQ`
      },
      mass_outage: {
        status: (outageCount || 0) > 0 ? 'error' : 'healthy',
        active_outages: outageCount || 0,
        message: outageCount 
          ? `🚨 ${outageCount} queda(s) em massa ativa(s)`
          : 'Nenhuma queda em massa detectada'
      },
      evolution_api: {
        status: evolutionStatus,
        message: evolutionStatus === 'healthy' 
          ? 'Evolution API conectada'
          : '⚠️ Evolution API com problemas'
      }
    };

    // Determine overall status
    const hasError = Object.values(checks).some((c: any) => c.status === 'error');
    const hasWarning = Object.values(checks).some((c: any) => c.status === 'warning');
    
    const overallStatus = hasError ? 'error' : hasWarning ? 'warning' : 'healthy';

    const responseData = {
      status: overallStatus,
      checks,
      summary: {
        total_checks: Object.keys(checks).length,
        healthy: Object.values(checks).filter((c: any) => c.status === 'healthy').length,
        warnings: Object.values(checks).filter((c: any) => c.status === 'warning').length,
        errors: Object.values(checks).filter((c: any) => c.status === 'error').length
      },
      timestamp: new Date().toISOString()
    };

  console.log('✅ Health check completed:', responseData.summary);

  return responseData;
}));
