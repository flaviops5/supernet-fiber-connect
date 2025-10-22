import { createPublicHandler } from '../_shared/base-handler.ts';

Deno.serve(createPublicHandler('graylog-logs-export', async (req, { supabase }) => {
  // Autenticação básica via query param ou header
  const url = new URL(req.url);
  const authToken = url.searchParams.get('token') || req.headers.get('x-graylog-token');
  const expectedToken = Deno.env.get('GRAYLOG_TOKEN') || Deno.env.get('CRON_SECRET');
  
  if (!authToken || authToken !== expectedToken) {
    throw new Error('Unauthorized');
  }

  // Parâmetros de filtro
  const level = url.searchParams.get('level'); // INFO, WARN, ERROR
  const source = url.searchParams.get('source'); // nome do agente/função
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);
  const since = url.searchParams.get('since'); // ISO timestamp

  // Query builder
  let query = supabase
    .from('monitoring_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 1000)); // máximo 1000

  if (level) {
    query = query.eq('level', level.toUpperCase());
  }

  if (source) {
    query = query.eq('source', source);
  }

  if (since) {
    query = query.gte('created_at', since);
  }

  const { data: logs, error } = await query;

  if (error) {
    console.error('❌ Erro ao buscar logs:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  // Formatar logs para Graylog (GELF format simplificado)
  const gelfLogs = logs.map(log => ({
    version: '1.1',
    host: 'supernet-omnichannel',
    short_message: log.message,
    full_message: JSON.stringify(log.context || {}),
    timestamp: new Date(log.created_at).getTime() / 1000,
    level: mapLevelToSyslog(log.level),
    _source: log.source,
    _log_id: log.id,
    _duration_ms: log.duration_ms,
    _created_by: log.created_by,
    ...log.context
  }));

  return {
    total: gelfLogs.length,
    logs: gelfLogs,
    timestamp: new Date().toISOString()
  };
}));

// Mapear níveis do sistema para syslog (usado pelo Graylog)
function mapLevelToSyslog(level: string): number {
  const mapping: Record<string, number> = {
    'ERROR': 3,   // Error
    'WARN': 4,    // Warning
    'INFO': 6,    // Informational
    'DEBUG': 7    // Debug
  };
  return mapping[level?.toUpperCase()] || 6;
}
