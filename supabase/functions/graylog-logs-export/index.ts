import { createAuthenticatedHandler } from '../_shared/base-handler.ts';
import { createLogger } from '../_shared/structured-logger.ts';

Deno.serve(createAuthenticatedHandler('graylog-logs-export', async (req, { supabase, user }) => {
  const logger = createLogger('graylog-logs-export', req);
  
  const url = new URL(req.url);
  
  // Parâmetros de filtro
  const level = url.searchParams.get('level'); // INFO, WARN, ERROR
  const source = url.searchParams.get('source'); // nome do agente/função
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);
  const since = url.searchParams.get('since'); // ISO timestamp

  logger.info('Exporting logs to Graylog format', { level, source, limit, since });

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
    logger.error('Failed to fetch logs from database', { error: error.message });
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
