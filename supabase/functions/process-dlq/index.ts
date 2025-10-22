import { createPublicHandler } from "../_shared/base-handler.ts";

Deno.serve(createPublicHandler('process-dlq', async (req, { supabase }) => {

    console.log('🔄 Processing Dead Letter Queue...');

    // Buscar ações falhadas dos últimos 7 dias
    const { data: failedActions, error: fetchError } = await supabase
      .from('action_log')
      .select('*')
      .not('result', 'is', null)
      .contains('result', { success: false })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })
      .limit(50); // Processar 50 por vez

    if (fetchError) throw fetchError;

    console.log(`📊 Found ${failedActions?.length || 0} failed actions to retry`);

    let successCount = 0;
    let failCount = 0;

    for (const action of failedActions || []) {
      console.log(`🔄 Retrying action ${action.id} (${action.action_type})`);

      try {
        let retryResult: any = null;

        // Retry baseado no tipo de ação
        switch (action.action_type) {
          case 'send_whatsapp':
            retryResult = await retryWhatsApp(supabase, action);
            break;
          
          case 'send_email':
            retryResult = await retryEmail(supabase, action);
            break;
          
          case 'create_ixc_ticket':
            retryResult = await retryIXCTicket(supabase, action);
            break;
          
          case 'reboot_equipment':
            retryResult = await retryReboot(supabase, action);
            break;
          
          default:
            console.log(`⚠️ Unknown action type: ${action.action_type}`);
            continue;
        }

        if (retryResult?.success) {
          successCount++;
          
          // Atualizar action_log com sucesso
          await supabase
            .from('action_log')
            .update({
              result: {
                success: true,
                retried_at: new Date().toISOString(),
                retry_result: retryResult
              }
            })
            .eq('id', action.id);
          
          console.log(`✅ Action ${action.id} retried successfully`);
        } else {
          failCount++;
          console.log(`❌ Action ${action.id} retry failed:`, retryResult?.error);
        }

      } catch (error) {
        failCount++;
        console.error(`❌ Error retrying action ${action.id}:`, error);
      }

      // Delay entre retries para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  console.log(`✅ DLQ processing complete: ${successCount} success, ${failCount} failed`);

  return {
    success: true,
    processed: (failedActions?.length || 0),
    success_count: successCount,
    fail_count: failCount,
    timestamp: new Date().toISOString()
  };
}));

async function retryWhatsApp(supabase: any, action: any) {
  const { phone, message } = action.action_payload;
  
  const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
    body: { phone, message }
  });

  return { success: !error, data, error };
}

async function retryEmail(supabase: any, action: any) {
  const { to, subject, html } = action.action_payload;
  
  const { data, error } = await supabase.functions.invoke('send-locaweb-email', {
    body: { to, subject, html }
  });

  return { success: !error, data, error };
}

async function retryIXCTicket(supabase: any, action: any) {
  const { client_id, assunto, descricao } = action.action_payload;
  
  const { data, error } = await supabase.functions.invoke('ixc-proxy', {
    body: {
      endpoint: '/webservice/v1/su_oss_chamado',
      method: 'POST',
      data: {
        id_cliente: client_id,
        id_assunto: assunto,
        descricao
      }
    }
  });

  return { success: !error, data, error };
}

async function retryReboot(supabase: any, action: any) {
  const { client_id, equipment_id } = action.action_payload;
  
  // Implementar lógica de reboot via IXC
  console.log(`🔄 Reboot retry for equipment ${equipment_id} of client ${client_id}`);
  
  return { success: false, error: 'Reboot retry not implemented yet' };
}
