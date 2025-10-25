/**
 * Structured Logger - Sprint 2
 * Logger centralizado com níveis, contexto e persistência
 * Uso: import { createLogger } from '../_shared/logger.ts'
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { redactPII } from './pii-redaction.ts';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogContext {
  functionName: string;
  requestId?: string;
  userId?: string;
  clientCpf?: string;
  [key: string]: unknown;
}

export interface LogMetadata {
  duration_ms?: number;
  error?: unknown;
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context: LogContext;
  metadata?: LogMetadata;
  timestamp: string;
}

/**
 * Cria cliente Supabase para persistência de logs
 */
function getSupabaseClient() {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      console.warn("⚠️ Supabase credentials not found - logs won't be persisted");
      return null;
    }
    return createClient(url, key);
  } catch (error) {
    console.error("⚠️ Failed to initialize Supabase client:", error);
    return null;
  }
}

/**
 * Formata entrada de log para console
 */
function formatLogForConsole(entry: LogEntry): string {
  const emoji = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    critical: '🔥'
  }[entry.level];

  const contextStr = `[${entry.context.functionName}${entry.context.requestId ? `:${entry.context.requestId.slice(0, 8)}` : ''}]`;
  
  return `${emoji} ${contextStr} ${entry.message}`;
}

/**
 * Persiste log no banco de dados
 */
async function persistLog(entry: LogEntry, supabase: ReturnType<typeof createClient> | null): Promise<void> {
  if (!supabase) return;

  try {
    // Redactar PII antes de persistir
    const sanitizedMetadata = entry.metadata 
      ? redactPII(JSON.stringify(entry.metadata), 'logs')
      : '{}';

    await supabase.from('monitoring_logs').insert({
      level: entry.level,
      message: redactPII(entry.message, 'logs'),
      metadata: JSON.parse(sanitizedMetadata),
      agent_name: entry.context.functionName,
      timestamp: entry.timestamp,
    });
  } catch (error) {
    console.error("❌ Failed to persist log:", error);
  }
}

/**
 * Logger estruturado
 */
export class Logger {
  private context: LogContext;
  private supabase: ReturnType<typeof createClient> | null;

  constructor(context: LogContext) {
    this.context = context;
    this.supabase = getSupabaseClient();
  }

  private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
    const entry: LogEntry = {
      level,
      message,
      context: this.context,
      metadata,
      timestamp: new Date().toISOString(),
    };

    // Console output
    const consoleMsg = formatLogForConsole(entry);
    const metaStr = metadata ? JSON.stringify(metadata, null, 2) : '';

    switch (level) {
      case 'debug':
      case 'info':
        console.log(consoleMsg, metaStr);
        break;
      case 'warn':
        console.warn(consoleMsg, metaStr);
        break;
      case 'error':
      case 'critical':
        console.error(consoleMsg, metaStr);
        break;
    }

    // Persistir apenas warn, error e critical
    if (['warn', 'error', 'critical'].includes(level)) {
      persistLog(entry, this.supabase).catch(console.error);
    }
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: LogMetadata): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: LogMetadata): void {
    this.log('error', message, metadata);
  }

  critical(message: string, metadata?: LogMetadata): void {
    this.log('critical', message, metadata);
  }

  /**
   * Log de timing para operações
   */
  time(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.info(`⏱️ ${label}`, { duration_ms: Math.round(duration) });
    };
  }

  /**
   * Cria child logger com contexto adicional
   */
  child(additionalContext: Partial<LogContext>): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }
}

/**
 * Factory function para criar logger
 */
export function createLogger(functionName: string, requestId?: string): Logger {
  return new Logger({ functionName, requestId });
}

/**
 * Helper para criar logger a partir de Request
 */
export function createLoggerFromRequest(functionName: string, req: Request): Logger {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  return createLogger(functionName, requestId);
}
