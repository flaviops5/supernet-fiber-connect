import { createPublicHandler } from '../_shared/base-handler.ts';

interface AlertConfig {
  id: string;
  alert_type: string;
  threshold_value: number;
  window_minutes: number;
  notification_channels: string[];
  is_active: boolean;
}

Deno.serve(createPublicHandler('process-alerts', async (req, { supabase }) => {
  console.log('🔍 Processing alerts...');

    // Buscar configurações ativas
    const { data: configs, error: configError } = await supabase
      .from('alert_config')
      .select('*')
      .eq('is_active', true);

    if (configError) throw configError;

    const alerts: Array<{ id: string; type: string; message: string; severity: string; created_at: string }> = [];

    for (const config of (configs as AlertConfig[])) {
      console.log(`📊 Checking alert: ${config.alert_type}`);

      // Circuit Breaker Alerts
      if (config.alert_type === 'circuit_breaker_open') {
        const { data: metrics } = await supabase
          .from('ixc_metrics')
          .select('*')
          .eq('metric_name', 'circuit_breaker_state')
          .eq('metric_value', 'OPEN')
          .gte('created_at', new Date(Date.now() - config.window_minutes * 60000).toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (metrics && metrics.length > 0) {
          alerts.push({
            alert_config_id: config.id,
            alert_type: config.alert_type,
            severity: 'critical',
            message: `Circuit Breaker está ABERTO! Sistema IXC pode estar com problemas.`,
            metadata: { metrics: metrics[0] }
          });
        }
      }

      // High Error Rate
      if (config.alert_type === 'high_error_rate') {
        const { data: errors, count } = await supabase
          .from('agent_metrics')
          .select('*', { count: 'exact' })
          .eq('success', false)
          .gte('created_at', new Date(Date.now() - config.window_minutes * 60000).toISOString());

        if (count && count > config.threshold_value) {
          alerts.push({
            alert_config_id: config.id,
            alert_type: config.alert_type,
            severity: 'high',
            message: `Taxa de erro elevada: ${count} falhas nos últimos ${config.window_minutes} minutos`,
            metadata: { error_count: count, threshold: config.threshold_value }
          });
        }
      }

      // DLQ Size
      if (config.alert_type === 'dlq_size_exceeded') {
        const { data: dlq, count } = await supabase
          .from('action_log')
          .select('*', { count: 'exact' })
          .not('result', 'is', null)
          .contains('result', { success: false });

        if (count && count > config.threshold_value) {
          alerts.push({
            alert_config_id: config.id,
            alert_type: config.alert_type,
            severity: 'medium',
            message: `Dead Letter Queue com ${count} ações falhadas (threshold: ${config.threshold_value})`,
            metadata: { dlq_size: count, threshold: config.threshold_value }
          });
        }
      }

      // Mass Outage Detection
      if (config.alert_type === 'mass_outage_detected') {
        const { data: outages } = await supabase
          .from('mass_outage_events')
          .select('*')
          .eq('status', 'active')
          .gte('created_at', new Date(Date.now() - config.window_minutes * 60000).toISOString());

        if (outages && outages.length > 0) {
          for (const outage of outages) {
            alerts.push({
              alert_config_id: config.id,
              alert_type: config.alert_type,
              severity: 'critical',
              message: `Queda em massa detectada! ${outage.affected_count} clientes afetados`,
              metadata: { outage }
            });
          }
        }
      }
    }

    // Inserir alertas no histórico
    if (alerts.length > 0) {
      console.log(`🚨 Gerando ${alerts.length} alertas`);
      
      const { error: insertError } = await supabase
        .from('alert_history')
        .insert(alerts.map(a => ({
          ...a,
          notified_at: new Date().toISOString()
        })));

      if (insertError) throw insertError;

      // Notificar via canais configurados
      for (const alert of alerts) {
        const config = configs.find(c => c.id === alert.alert_config_id);
        if (config?.notification_channels.includes('email')) {
          console.log(`📧 Email notification: ${alert.message}`);
          // TODO: Implementar envio de email via Locaweb
        }
      }
    } else {
      console.log('✅ Nenhum alerta detectado');
    }

  return {
    success: true,
    alerts_generated: alerts.length,
    timestamp: new Date().toISOString()
  };
}));
