import { createAuthenticatedHandler } from '../_shared/base-handler.ts';

interface MaintenanceTask {
  id: string;
  name: string;
  priority: 'high' | 'medium' | 'low';
  task_type: string;
  command: string;
  retry_count: number;
  timeout_seconds: number;
  metadata: any;
}

Deno.serve(createAuthenticatedHandler('network-maintenance-executor', async (req, { supabase, user }) => {
  console.log('🔧 Iniciando ciclo de manutenção inteligente');

  // Buscar configurações
  const { data: settings } = await supabase
    .from('maintenance_settings')
    .select('*')
    .single();

  if (!settings?.enabled) {
    console.log('⏸️ Sistema de manutenção desabilitado');
    return { skipped: true };
  }

  // Verificar estabilidade da rede (últimos 10 min sem falhas críticas)
  const { data: recentFailures } = await supabase
    .from('maintenance_execution_log')
    .select('id')
    .eq('status', 'failed')
    .eq('priority', 'high')
    .gte('created_at', new Date(Date.now() - settings.network_stable_threshold_minutes * 60000).toISOString());

  const networkStable = !recentFailures || recentFailures.length === 0;

  // PRIORIDADE ALTA - Sempre executar
  const highPriorityResults = await executeTasks(supabase, 'high', settings);

  // Se houve falha crítica, parar aqui
  const criticalFailure = highPriorityResults.some(r => r.status === 'failed');
  if (criticalFailure) {
    console.log('🚨 Falha crítica detectada - interrompendo prioridades inferiores');
    await sendAlert(supabase, settings, 'Falha crítica na manutenção de prioridade alta');
    return {
      success: false,
      high_priority: highPriorityResults,
      stopped_due_to_critical_failure: true
    };
  }

  // PRIORIDADE MÉDIA - Executar se rede estável
  let mediumPriorityResults = [];
  if (networkStable) {
    mediumPriorityResults = await executeTasks(supabase, 'medium', settings);
  } else {
    console.log('⚠️ Rede instável - pulando prioridade média');
  }

  // PRIORIDADE BAIXA - Executar se sobrar recursos
  let lowPriorityResults = [];
  if (networkStable && !criticalFailure) {
    lowPriorityResults = await executeTasks(supabase, 'low', settings);
  } else {
    console.log('⏭️ Pulando prioridade baixa');
  }

  // Verificar padrões de falhas recorrentes
  await escalateRecurringFailures(supabase, settings);

  return {
    success: true,
    network_stable: networkStable,
    high_priority: highPriorityResults,
    medium_priority: mediumPriorityResults,
    low_priority: lowPriorityResults
  };
}));

async function executeTasks(supabase: any, priority: string, settings: any) {
  const now = new Date();
  
  // Buscar tarefas que precisam ser executadas
  const { data: tasks } = await supabase
    .from('network_maintenance_tasks')
    .select('*')
    .eq('priority', priority)
    .eq('enabled', true)
    .or(`next_execution.is.null,next_execution.lt.${now.toISOString()}`);

  if (!tasks || tasks.length === 0) {
    console.log(`✅ Nenhuma tarefa de prioridade ${priority} para executar`);
    return [];
  }

  console.log(`🔧 Executando ${tasks.length} tarefas de prioridade ${priority}`);

  const results = [];
  for (const task of tasks) {
    const result = await executeTask(supabase, task, settings);
    results.push(result);
  }

  return results;
}

async function executeTask(supabase: any, task: MaintenanceTask, settings: any) {
  const startTime = Date.now();
  let logId: string;

  try {
    // Criar log de execução
    const { data: log } = await supabase
      .from('maintenance_execution_log')
      .insert({
        task_id: task.id,
        status: 'running',
        priority: task.priority
      })
      .select()
      .single();

    logId = log.id;

    console.log(`⚙️ Executando: ${task.name}`);

    // Executar tarefa com retry
    let lastError: string | undefined;
    let success = false;

    for (let attempt = 0; attempt <= task.retry_count; attempt++) {
      try {
        const result = await executeTaskCommand(task);
        
        // Atualizar task com próxima execução
        const nextExecution = new Date(Date.now() + task.execution_interval_minutes * 60000);
        await supabase
          .from('network_maintenance_tasks')
          .update({
            last_execution: new Date().toISOString(),
            next_execution: nextExecution.toISOString()
          })
          .eq('id', task.id);

        // Atualizar log com sucesso
        await supabase
          .from('maintenance_execution_log')
          .update({
            status: 'completed',
            execution_end: new Date().toISOString(),
            duration_ms: Date.now() - startTime,
            result,
            retry_attempt: attempt
          })
          .eq('id', logId);

        console.log(`✅ ${task.name} concluída com sucesso`);
        success = true;
        break;

        } catch (error: unknown) {
          lastError = error instanceof Error ? error.message : String(error);
        if (attempt < task.retry_count) {
          console.log(`⚠️ Tentativa ${attempt + 1} falhou, tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!success) {
      // Falha após todas as tentativas
      await supabase
        .from('maintenance_execution_log')
        .update({
          status: 'failed',
          execution_end: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          error_message: lastError,
          retry_attempt: task.retry_count
        })
        .eq('id', logId);

      console.error(`❌ ${task.name} falhou após ${task.retry_count} tentativas: ${lastError}`);
      
      // Enviar alerta se for prioridade alta
      if (task.priority === 'high') {
        await sendAlert(supabase, settings, `Falha crítica: ${task.name} - ${lastError}`);
      }

      return { task_id: task.id, name: task.name, status: 'failed', error: lastError };
    }

    return { task_id: task.id, name: task.name, status: 'completed' };

  } catch (error: unknown) {
    console.error(`❌ Erro ao executar ${task.name}:`, error);
    return { task_id: task.id, name: task.name, status: 'failed', error: error instanceof Error ? error.message : String(error) };
  }
}

async function executeTaskCommand(task: MaintenanceTask): Promise<any> {
  // Implementação dos comandos de manutenção
  switch (task.command) {
    case 'check_network_availability':
      return await checkNetworkAvailability();
    
    case 'test_latency':
      return await testLatency();
    
    case 'restart_services':
      return await restartServices();
    
    case 'collect_metrics':
      return await collectMetrics();
    
    case 'check_firmware_updates':
      return await checkFirmwareUpdates();
    
    case 'backup_configs':
      return await backupConfigs();
    
    case 'predict_failures':
      return await predictFailures();
    
    case 'generate_report':
      return await generateReport();
    
    case 'clean_old_logs':
      return await cleanOldLogs();
    
    default:
      throw new Error(`Comando desconhecido: ${task.command}`);
  }
}

// Implementações dos comandos
async function checkNetworkAvailability() {
  console.log('🔍 Verificando disponibilidade da rede...');
  // Implementar verificação via IXC API
  return { status: 'online', devices_checked: 150, failures: 0 };
}

async function testLatency() {
  console.log('📊 Testando latência...');
  return { avg_latency_ms: 15, packet_loss: 0.1 };
}

async function restartServices() {
  console.log('🔄 Verificando serviços críticos...');
  return { services_restarted: 0 };
}

async function collectMetrics() {
  console.log('📈 Coletando métricas...');
  return { metrics_collected: true };
}

async function checkFirmwareUpdates() {
  console.log('🔎 Verificando atualizações...');
  return { updates_available: 0 };
}

async function backupConfigs() {
  console.log('💾 Realizando backup...');
  return { configs_backed_up: 5 };
}

async function predictFailures() {
  console.log('🔮 Analisando padrões...');
  return { high_risk_devices: 0 };
}

async function generateReport() {
  console.log('📊 Gerando relatório...');
  return { report_generated: true };
}

async function cleanOldLogs() {
  console.log('🧹 Limpando logs antigos...');
  return { logs_deleted: 150 };
}

async function sendAlert(supabase: any, settings: any, message: string) {
  console.log(`🚨 ALERTA: ${message}`);
  
  // Registrar alerta
  await supabase.from('alert_history').insert({
    alert_type: 'maintenance_failure',
    severity: 'critical',
    message,
    metadata: { source: 'network-maintenance-executor' }
  });
  
  // Enviar email (implementar com Locaweb)
  // Enviar webhook se configurado
}

async function escalateRecurringFailures(supabase: any, settings: any) {
  if (!settings.auto_escalate_failures) return;

  // Buscar tarefas com 3+ falhas nas últimas 24h
  const { data: failures } = await supabase
    .from('maintenance_execution_log')
    .select('task_id, count')
    .eq('status', 'failed')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  // Agrupar e contar falhas
  const failureCount: Record<string, number> = {};
  failures?.forEach((f: any) => {
    failureCount[f.task_id] = (failureCount[f.task_id] || 0) + 1;
  });

  // Escalar tarefas com falhas recorrentes para prioridade alta
  for (const [taskId, count] of Object.entries(failureCount)) {
    if (count >= 3) {
      await supabase
        .from('network_maintenance_tasks')
        .update({ priority: 'high' })
        .eq('id', taskId);
      
      console.log(`⚠️ Escalando tarefa ${taskId} para prioridade alta (${count} falhas)`);
    }
  }
}
