// ============================================
// RETRY FAILED ACTIONS - DLQ Processor
// ============================================
import { createPublicHandler } from "../_shared/base-handler.ts";

Deno.serve(createPublicHandler('retry-failed-actions', async (req, { supabase }) => {
  console.log('🔄 Starting DLQ retry processor...');
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  // Buscar ações falhadas pendentes
  const { data: failedActions, error: fetchError } = await supabase
    .from('failed_actions')
    .select('*')
    .eq('status', 'pending')
    .lt('retry_count', 3) // Apenas se não excedeu max retries
    .order('created_at', { ascending: true })
    .limit(10);

  if (fetchError) throw fetchError;

  if (!failedActions || failedActions.length === 0) {
    console.log('✅ No failed actions to retry');
    return { message: 'No pending actions', processed: 0 };
  }

  console.log(`📋 Found ${failedActions.length} failed actions to retry`);

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    abandoned: 0
  };

  // Processar cada ação
  for (const action of failedActions) {
    results.processed++;

    console.log(`🔄 Retrying action ${action.id} (${action.action_type}) - attempt ${action.retry_count + 1}/3`);

    try {
      // Atualizar status para 'retrying'
      await supabase
        .from('failed_actions')
        .update({
          status: 'retrying',
          last_retry_at: new Date().toISOString()
        })
        .eq('id', action.id);

      // Tentar executar novamente via IXC Proxy
      const retryResponse = await fetch(`${supabaseUrl}/functions/v1/ixc-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.action_payload)
      });

      if (retryResponse.ok) {
        // ✅ Sucesso!
        console.log(`✅ Action ${action.id} succeeded on retry`);
        results.succeeded++;

        await supabase
          .from('failed_actions')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString()
          })
          .eq('id', action.id);

      } else {
        // ❌ Falhou novamente
        const newRetryCount = action.retry_count + 1;
        const shouldAbandon = newRetryCount >= action.max_retries;

        console.log(`❌ Action ${action.id} failed again (${newRetryCount}/${action.max_retries})`);

        if (shouldAbandon) {
          results.abandoned++;
          await supabase
            .from('failed_actions')
            .update({
              status: 'abandoned',
              retry_count: newRetryCount
            })
            .eq('id', action.id);

          // Criar alerta para ação abandonada
          await supabase.from('alert_history').insert({
            alert_type: 'failed_action_abandoned',
            message: `Action ${action.action_type} for client ${action.client_cpf} abandoned after ${newRetryCount} retries`,
            severity: 'critical',
            metadata: { action_id: action.id, agent: action.agent_name }
          });

        } else {
          results.failed++;
          await supabase
            .from('failed_actions')
            .update({
              status: 'pending',
              retry_count: newRetryCount,
              last_retry_at: new Date().toISOString()
            })
            .eq('id', action.id);
        }
      }

    } catch (error: any) {
      console.error(`❌ Error retrying action ${action.id}:`, error);
      results.failed++;

      await supabase
        .from('failed_actions')
        .update({
          status: 'pending',
          retry_count: action.retry_count + 1,
          error_message: error.message
        })
        .eq('id', action.id);
    }
  }

  console.log('📊 DLQ processing complete:', results);

  return {
    message: 'DLQ processing complete',
    results
  };
}));
