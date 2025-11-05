import { createPublicHandler } from '../_shared/base-handler.ts';
import { withTimeout } from '../_shared/async-utils.ts';

Deno.serve(createPublicHandler('system-health', async (req, { supabase }) => {
  console.log('🏥 Running comprehensive health check...');

    // 1. Database Connection (with 2s timeout)
    const { data: dbCheck, error: dbError } = await withTimeout(
      supabase.from('company_settings').select('id').limit(1),
      2000,
      'db-check'
    ).catch(() => ({ data: null, error: { message: 'Timeout' } }));

    // 2. Circuit Breaker Status (with 1s timeout)
    const { data: cbMetrics } = await withTimeout(
      supabase
        .from('ixc_metrics')
        .select('*')
        .eq('metric_name', 'circuit_breaker_state')
        .order('created_at', { ascending: false })
        .limit(1),
      1000,
      'circuit-breaker-check'
    ).catch(() => ({ data: null }));

    const circuitBreakerStatus = cbMetrics?.[0]?.metric_value || 'CLOSED';

    // 3. Agent Availability (with 1s timeout)
    const { data: onlineAgents, count: agentCount } = await withTimeout(
      supabase
        .from('agent_presence')
        .select('*', { count: 'exact' })
        .eq('status', 'online'),
      1000,
      'agent-check'
    ).catch(() => ({ data: null, count: 0 }));

    // 4. Pending Conversations (with 1s timeout)
    const { data: pendingConvs, count: pendingCount } = await withTimeout(
      supabase
        .from('conversations')
        .select('*', { count: 'exact' })
        .eq('status', 'waiting'),
      1000,
      'conversation-check'
    ).catch(() => ({ data: null, count: 0 }));

    // 5. DLQ Size (with 1s timeout)
    const { data: dlqActions, count: dlqCount } = await withTimeout(
      supabase
        .from('action_log')
        .select('*', { count: 'exact' })
        .contains('result', { success: false }),
      1000,
      'dlq-check'
    ).catch(() => ({ data: null, count: 0 }));

    // 6. Active Mass Outages (with 1s timeout)
    const { data: activeOutages, count: outageCount } = await withTimeout(
      supabase
        .from('mass_outage_events')
        .select('*', { count: 'exact' })
        .eq('status', 'active'),
      1000,
      'outage-check'
    ).catch(() => ({ data: null, count: 0 }));

    // 7. Evolution API Status (with 5s timeout)
    let evolutionStatus = 'unknown';
    let evolutionDetails = '';
    try {
      const evolutionBaseUrl = Deno.env.get('EVOLUTION_API_BASE_URL');
      const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
      
      if (!evolutionBaseUrl || !evolutionApiKey) {
        evolutionStatus = 'warning';
        evolutionDetails = 'Credenciais não configuradas';
      } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
          // Primeiro tenta o endpoint de instâncias
          const response = await fetch(`${evolutionBaseUrl}/instance/fetchInstances`, {
            method: 'GET',
            headers: {
              'apikey': evolutionApiKey,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            evolutionStatus = 'healthy';
            evolutionDetails = 'Conectado com sucesso';
          } else {
            // Se falhar, tenta um endpoint mais simples
            const fallbackResponse = await fetch(`${evolutionBaseUrl}/`, {
              method: 'GET',
              headers: { 'apikey': evolutionApiKey },
              signal: controller.signal
            });
            
            if (fallbackResponse.ok) {
              evolutionStatus = 'healthy';
              evolutionDetails = 'API respondendo (endpoint alternativo)';
            } else {
              evolutionStatus = 'warning';
              evolutionDetails = `Status ${response.status}`;
            }
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          evolutionStatus = 'warning';
          evolutionDetails = fetchError.name === 'AbortError' ? 'Timeout' : (fetchError as any).message;
        }
      }
    } catch (error) {
      evolutionStatus = 'warning';
      evolutionDetails = error.message;
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
          ? `✅ Evolution API conectada${evolutionDetails ? ` - ${evolutionDetails}` : ''}`
          : `⚠️ Evolution API: ${evolutionDetails || 'com problemas'}`,
        details: evolutionDetails
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
