import { createPublicHandler } from '../_shared/base-handler.ts';

/**
 * Webhook Alerts - Envia alertas críticos para webhook externo
 * Processa alertas do sistema e notifica via HTTP POST
 */

interface AlertPayload {
  alert_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

Deno.serve(createPublicHandler('webhook-alerts', async (req, { supabase }) => {
  console.log('🚨 Processing webhook alerts...');

  // Buscar configuração do webhook
  const { data: settings } = await supabase
    .from('company_settings')
    .select('webhook_url, webhook_secret')
    .single();

  if (!settings?.webhook_url) {
    console.log('⚠️ Webhook URL não configurada, pulando envio');
    return { success: true, message: 'Webhook não configurado', alerts_sent: 0 };
  }

  // Buscar alertas pendentes (últimos 5 minutos que não foram enviados)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  const { data: alerts, error } = await supabase
    .from('alert_history')
    .select('*')
    .gte('created_at', fiveMinutesAgo)
    .is('webhook_sent_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to fetch alerts: ${error.message}`);
  }

  if (!alerts || alerts.length === 0) {
    console.log('✅ Nenhum alerta pendente para enviar');
    return { success: true, message: 'Nenhum alerta pendente', alerts_sent: 0 };
  }

  console.log(`📤 Enviando ${alerts.length} alertas para webhook`);

  let sentCount = 0;
  const errors: string[] = [];

  for (const alert of alerts) {
    try {
      const payload: AlertPayload = {
        alert_type: alert.alert_type,
        severity: alert.severity || 'info',
        message: alert.message,
        details: alert.context || {},
        timestamp: alert.created_at
      };

      // Enviar para webhook
      const response = await fetch(settings.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': settings.webhook_secret || '',
          'X-Alert-ID': alert.id
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Marcar como enviado
        await supabase
          .from('alert_history')
          .update({ 
            webhook_sent_at: new Date().toISOString(),
            webhook_response_status: response.status
          })
          .eq('id', alert.id);

        sentCount++;
        console.log(`✅ Alerta ${alert.id} enviado com sucesso`);
      } else {
        throw new Error(`Webhook returned status ${response.status}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`❌ Erro ao enviar alerta ${alert.id}:`, errorMsg);
      errors.push(`${alert.id}: ${errorMsg}`);

      // Registrar falha
      await supabase
        .from('alert_history')
        .update({ 
          webhook_error: errorMsg,
          webhook_retry_count: (alert.webhook_retry_count || 0) + 1
        })
        .eq('id', alert.id);
    }
  }

  console.log(`✅ Webhook alerts processados: ${sentCount}/${alerts.length} enviados`);

  return {
    success: true,
    alerts_sent: sentCount,
    alerts_failed: errors.length,
    errors: errors.length > 0 ? errors : undefined
  };
}));
