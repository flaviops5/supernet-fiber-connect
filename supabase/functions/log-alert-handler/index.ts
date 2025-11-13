// Edge Function para enviar alertas via WhatsApp quando logs críticos são detectados
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getOrCreateTraceId } from '../_shared/trace-id.ts';
import { createTimer } from '../_shared/duration-tracker.ts';
import { recordMetric } from '../_shared/metrics-helper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogEntry {
  id: string;
  level: string;
  message: string;
  metadata: any;
  context: string;
  correlation_id?: string;
  timestamp: string;
}

Deno.serve(async (req) => {
  const timer = createTimer();
  const traceId = getOrCreateTraceId(req);
  let success = false;
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar logs de erro dos últimos 5 minutos que ainda não foram notificados
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: errorLogs, error: fetchError } = await supabase
      .from('monitoring_logs')
      .select('*')
      .eq('level', 'error')
      .gte('log_timestamp', fiveMinutesAgo)
      .is('alerted_at', null)
      .order('log_timestamp', { ascending: false })
      .limit(10);

    if (fetchError) {
      console.error('❌ Erro ao buscar logs:', fetchError);
      throw fetchError;
    }

    if (!errorLogs || errorLogs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, alertsSent: 0, message: 'Nenhum erro novo para alertar' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 ${errorLogs.length} erros encontrados para alertar`);

    // Buscar responsáveis de alerta ativos
    const { data: alertContacts, error: contactsError } = await supabase
      .from('responsaveis_alerta')
      .select('*')
      .eq('ativo', true);

    if (contactsError || !alertContacts || alertContacts.length === 0) {
      console.warn('⚠️ Nenhum contato de alerta configurado');
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum contato de alerta configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let alertsSent = 0;
    const errors: string[] = [];

    // Agrupar erros por contexto para evitar spam
    const errorsByContext = errorLogs.reduce((acc, log) => {
      const context = log.context || 'unknown';
      if (!acc[context]) acc[context] = [];
      acc[context].push(log);
      return acc;
    }, {} as Record<string, any[]>);

    // Enviar alertas para cada grupo de erro
    for (const [context, logs] of Object.entries(errorsByContext)) {
      const firstLog = logs[0];
      const count = logs.length;
      
      const message = `🚨 *ALERTA DE ERRO CRÍTICO*\n\n` +
        `📍 Contexto: ${context}\n` +
        `⚠️ Ocorrências: ${count}\n` +
        `📝 Mensagem: ${firstLog.message}\n` +
        `🔗 CorrelationID: ${firstLog.correlation_id || 'N/A'}\n` +
        `⏰ Timestamp: ${new Date(firstLog.log_timestamp).toLocaleString('pt-BR')}\n\n` +
        `${firstLog.metadata ? `📦 Metadata: ${JSON.stringify(firstLog.metadata, null, 2).substring(0, 200)}...` : ''}`;

      // Enviar para responsáveis de alerta (filtrar por tipo se existir)
      for (const contact of alertContacts) {
        try {
          const { error: sendError } = await supabase.functions.invoke('send-whatsapp-message', {
            body: {
              phone: contact.telefone,
              message: message
            }
          });

          if (sendError) {
            console.error(`❌ Erro ao enviar para ${contact.nome}:`, sendError);
            errors.push(`Falha ao enviar para ${contact.nome}`);
          } else {
            console.log(`✅ Alerta enviado para ${contact.nome} (${contact.telefone})`);
            alertsSent++;
          }
        } catch (err) {
          console.error(`❌ Exceção ao enviar para ${contact.nome}:`, err);
          errors.push(`Exceção ao enviar para ${contact.nome}`);
        }
      }

      // Marcar logs como alertados
      const logIds = logs.map(l => l.id);
      await supabase
        .from('monitoring_logs')
        .update({ alerted_at: new Date().toISOString() })
        .in('id', logIds);
    }

    console.log(`✅ ${alertsSent} alertas enviados com sucesso`, { trace_id: traceId });

    success = alertsSent > 0;
    return new Response(
      JSON.stringify({
        success: true,
        alertsSent,
        errorsCount: errorLogs.length,
        contextsAlerted: Object.keys(errorsByContext).length,
        errors: errors.length > 0 ? errors : undefined,
        trace_id: traceId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro no log-alert-handler:', error, { trace_id: traceId });
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', trace_id: traceId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } finally {
    const duration = timer.end();
    await recordMetric({
      agent_name: 'log-alert-handler',
      action_type: 'send_alerts',
      success,
      duration_ms: duration,
      metadata: { trace_id: traceId }
    }).catch(console.error);
  }
});
