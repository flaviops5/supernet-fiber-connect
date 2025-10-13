/**
 * Structured Logger para Edge Functions
 * 
 * Fornece logging consistente com níveis apropriados e context tracking.
 * Todos os logs incluem timestamp, correlation_id e contexto estruturado.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  correlation_id?: string;
  user_id?: string;
  function_name?: string;
  request_id?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context: LogContext;
  metadata?: Record<string, any>;
}

/**
 * Classe principal de logging estruturado
 */
export class StructuredLogger {
  private context: LogContext;
  private functionName: string;

  constructor(functionName: string, initialContext: LogContext = {}) {
    this.functionName = functionName;
    this.context = {
      function_name: functionName,
      correlation_id: initialContext.correlation_id || crypto.randomUUID(),
      ...initialContext,
    };
  }

  /**
   * Adiciona contexto adicional ao logger
   */
  withContext(additionalContext: LogContext): StructuredLogger {
    return new StructuredLogger(this.functionName, {
      ...this.context,
      ...additionalContext,
    });
  }

  /**
   * Log de debug (desenvolvimento)
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata);
  }

  /**
   * Log de informação (operacional)
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata);
  }

  /**
   * Log de aviso (atenção necessária)
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata);
  }

  /**
   * Log de erro (ação necessária)
   */
  error(message: string, error?: Error | unknown, metadata?: Record<string, any>): void {
    const errorMetadata = {
      ...metadata,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    };
    this.log('error', message, errorMetadata);
  }

  /**
   * Log de performance (duração de operações)
   */
  performance(operation: string, durationMs: number, metadata?: Record<string, any>): void {
    this.info(`Performance: ${operation}`, {
      ...metadata,
      duration_ms: durationMs,
      operation,
    });
  }

  /**
   * Método privado de logging
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      metadata,
    };

    const logMessage = this.formatLogEntry(entry);

    switch (level) {
      case 'debug':
      case 'info':
        console.log(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage);
        break;
    }
  }

  /**
   * Formata entrada de log para console
   */
  private formatLogEntry(entry: LogEntry): string {
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    }[entry.level];

    const parts = [
      `${emoji} [${entry.level.toUpperCase()}]`,
      `[${entry.context.function_name}]`,
      `[${entry.context.correlation_id?.substring(0, 8)}]`,
      entry.message,
    ];

    if (entry.metadata) {
      parts.push(JSON.stringify(entry.metadata));
    }

    return parts.join(' ');
  }

  /**
   * Retorna o correlation_id atual
   */
  getCorrelationId(): string {
    return this.context.correlation_id || '';
  }
}

/**
 * Helper para criar logger com correlation_id da requisição
 */
export function createLogger(
  functionName: string,
  req?: Request
): StructuredLogger {
  const correlationId = req?.headers.get('x-correlation-id') || 
                       req?.headers.get('x-request-id') ||
                       crypto.randomUUID();

  return new StructuredLogger(functionName, {
    correlation_id: correlationId,
    request_id: correlationId,
  });
}

/**
 * Helper para medir tempo de operação
 */
export async function measureTime<T>(
  logger: StructuredLogger,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logger.performance(operation, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`${operation} failed after ${duration}ms`, error);
    throw error;
  }
}
