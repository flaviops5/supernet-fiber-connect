import { createProtectedHandler } from '../_shared/base-handler.ts';
import { createLogger } from '../_shared/logger.ts';

/**
 * Validate Production Readiness
 * Verifica se todas as configurações necessárias estão prontas para produção
 * REQUER AUTENTICAÇÃO ADMIN
 */

interface ValidationResult {
  category: string;
  check: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
  details?: string; // APENAS para logs internos, NUNCA exposto na resposta pública
}

Deno.serve(createProtectedHandler({
  functionName: 'validate-production-readiness',
  requireAuth: true,
  handler: async (req, context) => {
    const { supabase, user } = context;
    const logger = createLogger('validate-production-readiness', req.headers.get('x-request-id') || undefined);
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    
    // 🔒 Verificar se usuário é admin usando função SECURITY DEFINER
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });
    
    if (roleError || !isAdmin) {
      logger.warn('Tentativa de acesso não autorizado', { 
        user_id: user.id, 
        error: roleError?.message 
      });
      throw new Error('Acesso negado: apenas administradores podem executar esta validação');
    }
  logger.info('Executando validação de prontidão para produção');

  const results: ValidationResult[] = [];

  // 1. Validar Secrets/Environment Variables
  logger.info('Validando variáveis de ambiente');
  
  const requiredEnvVars = [
    'IXC_BASE_URL',
    'IXC_USER_ID', 
    'IXC_PASSWORD',
    'EVOLUTION_API_BASE_URL',
    'EVOLUTION_API_KEY',
    'OPENAI_API_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  for (const envVar of requiredEnvVars) {
    const value = Deno.env.get(envVar);
    if (!value) {
      // SEGURANÇA: details contém instruções gerais, não valores sensíveis
      results.push({
        category: 'Configuração',
        check: envVar,
        status: 'fail',
        message: `Variável ${envVar} não está configurada`,
        details: 'Configure esta variável nas Edge Functions secrets' // Apenas logs internos
      });
    } else {
      // SEGURANÇA: NUNCA logar ou retornar valores de secrets
      results.push({
        category: 'Configuração',
        check: envVar,
        status: 'pass',
        message: `${envVar} configurado`,
      });
    }
  }

  // 2. Testar conectividade IXC
  logger.info('Testando conectividade IXC');
  try {
    const ixcUrl = Deno.env.get('IXC_BASE_URL');
    const ixcUser = Deno.env.get('IXC_USER_ID');
    const ixcPass = Deno.env.get('IXC_PASSWORD');

    if (ixcUrl && ixcUser && ixcPass) {
      const testResponse = await fetch(`${ixcUrl}/webservice/v1/su_oss_chamado`, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(`${ixcUser}:${ixcPass}`),
          'Content-Type': 'application/json'
        }
      });

      if (testResponse.ok) {
        results.push({
          category: 'Integrações',
          check: 'IXC API',
          status: 'pass',
          message: 'IXC API respondendo corretamente'
        });
      } else {
        // SEGURANÇA: details omitido para não expor estrutura de API
        results.push({
          category: 'Integrações',
          check: 'IXC API',
          status: 'fail',
          message: `IXC API retornou status ${testResponse.status}`,
          details: 'Verifique credenciais e URL do IXC' // Apenas logs internos
        });
      }
    }
  } catch (err) {
    // SEGURANÇA: Log interno detalhado, mas details sanitizado para não expor stack traces
    logger.error('Erro ao testar IXC API', err);
    results.push({
      category: 'Integrações',
      check: 'IXC API',
      status: 'fail',
      message: 'Erro ao conectar com IXC',
      details: 'Falha de conectividade' // Stack trace completo apenas em logs
    });
  }

  // 3. Testar Evolution API
  logger.info('Testando Evolution API');
  try {
    const evolutionUrl = Deno.env.get('EVOLUTION_API_BASE_URL');
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');

    if (evolutionUrl && evolutionKey) {
      const testResponse = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': evolutionKey,
          'Content-Type': 'application/json'
        }
      });

      if (testResponse.ok) {
        results.push({
          category: 'Integrações',
          check: 'Evolution API',
          status: 'pass',
          message: 'Evolution API conectada'
        });
      } else {
        results.push({
          category: 'Integrações',
          check: 'Evolution API',
          status: 'fail',
          message: `Evolution API retornou status ${testResponse.status}`,
          details: 'Verifique a API key' // Não expõe detalhes da API
        });
      }
    }
  } catch (err) {
    // SEGURANÇA: Log detalhado interno, resposta sanitizada
    logger.error('Erro ao testar Evolution API', err);
    results.push({
      category: 'Integrações',
      check: 'Evolution API',
      status: 'fail',
      message: 'Erro ao conectar com Evolution API',
      details: 'Falha de conectividade' // Stack trace apenas em logs
    });
  }

  // 4. Verificar tabelas críticas
  logger.info('Verificando estrutura do banco');
  const criticalTables = [
    'conversations',
    'messages',
    'agent_metrics',
    'ixc_metrics',
    'circuit_breaker_state',
    'mass_outage_events',
    'agent_global_policies',
    'scenario_rollback_requests',
    'cron_execution_locks',
    'monitoring_thresholds'
  ];

  for (const table of criticalTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        // SEGURANÇA: Não expor mensagens de erro SQL
        logger.error(`Erro ao acessar tabela ${table}`, error);
        results.push({
          category: 'Database',
          check: `Tabela ${table}`,
          status: 'fail',
          message: `Tabela ${table} não acessível`,
          details: 'Erro de acesso ao banco' // Mensagem SQL apenas em logs
        });
      } else {
        results.push({
          category: 'Database',
          check: `Tabela ${table}`,
          status: 'pass',
          message: `Tabela ${table} OK`
        });
      }
    } catch (err) {
      // SEGURANÇA: Log detalhado interno
      logger.error(`Erro ao verificar tabela ${table}`, err);
      results.push({
        category: 'Database',
        check: `Tabela ${table}`,
        status: 'fail',
        message: `Erro ao acessar ${table}`,
        details: 'Falha de validação' // Stack trace apenas em logs
      });
    }
  }

  // 5. Verificar Edge Functions críticas
  logger.info('Verificando Edge Functions');
  const criticalFunctions = [
    'routing-agent',
    'support-tech-agent',
    'ixc-proxy',
    'system-health',
    'luan-auto-upgrade',
    'test-runner'
  ];

  for (const funcName of criticalFunctions) {
    // Nota: Não podemos chamar outras functions diretamente do Edge Runtime
    // Mas podemos verificar se estão deployadas consultando o dashboard
    results.push({
      category: 'Edge Functions',
      check: funcName,
      status: 'warning',
      message: `Verifique ${funcName} no dashboard`,
      details: 'Validação manual necessária'
    });
  }

  // 6. Verificar alertas ativos
  logger.info('Verificando alertas críticos');
  const { data: recentAlerts } = await supabase
    .from('alert_history')
    .select('*')
    .eq('severity', 'critical')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Última hora
    .limit(10);

  if (recentAlerts && recentAlerts.length > 0) {
    results.push({
      category: 'Monitoramento',
      check: 'Alertas Críticos',
      status: 'warning',
      message: `${recentAlerts.length} alertas críticos na última hora`,
      details: 'Revise alertas antes do deploy'
    });
  } else {
    results.push({
      category: 'Monitoramento',
      check: 'Alertas Críticos',
      status: 'pass',
      message: 'Nenhum alerta crítico recente'
    });
  }

  // 7. Verificar backup recente
  logger.info('Verificando backups');
  // Como não temos acesso direto aos backups do Supabase, apenas lembramos
  results.push({
    category: 'Backup',
    check: 'Backup Manual',
    status: 'warning',
    message: 'Backup manual obrigatório',
    details: 'Crie snapshot do banco antes do deploy via Supabase Dashboard'
  });

  // Calcular score geral
  const totalChecks = results.length;
  const passedChecks = results.filter(r => r.status === 'pass').length;
  const warningChecks = results.filter(r => r.status === 'warning').length;
  const failedChecks = results.filter(r => r.status === 'fail').length;

  const score = Math.round((passedChecks / totalChecks) * 100);
  
  const readinessStatus = failedChecks === 0 && warningChecks === 0 
    ? 'ready' 
    : failedChecks > 0 
      ? 'not_ready' 
      : 'ready_with_warnings';

  logger.info('Validação completa', { 
    passed: passedChecks, 
    total: totalChecks, 
    score 
  });

  // SEGURANÇA: Sanitizar results removendo detalhes sensíveis da resposta pública
  // Logs internos já contém tudo, aqui apenas retornamos summaries
  const sanitizedResults = results.map(result => {
    const sanitized: ValidationResult = {
      category: result.category,
      check: result.check,
      status: result.status,
      message: result.message
    };
    
    // NUNCA expor details que podem conter:
    // - Mensagens de erro de APIs externas
    // - Stack traces
    // - Credenciais parciais
    // - Estrutura interna do sistema
    // O campo details foi completamente removido da resposta pública
    
    return sanitized;
  });

  logger.info('Results sanitizados para resposta pública', {
    original_count: results.length,
    sanitized_count: sanitizedResults.length,
    removed_sensitive_details: true
  });

  return {
    status: readinessStatus,
    score,
    summary: {
      total_checks: totalChecks,
      passed: passedChecks,
      warnings: warningChecks,
      failed: failedChecks
    },
    results: sanitizedResults,
    timestamp: new Date().toISOString(),
    note: 'Detalhes sensíveis foram omitidos desta resposta. Consulte logs internos para informações completas.'
  };
  }
}));
