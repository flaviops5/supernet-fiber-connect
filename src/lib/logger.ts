/**
 * Structured Logger
 * Centraliza logs com níveis distintos e sanitização automática
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMetadata {
  [key: string]: unknown;
}

// Lista de chaves sensíveis que devem ser redacted
const SENSITIVE_KEYS = ['password', 'token', 'apikey', 'secret', 'cpf', 'email', 'phone'];

/**
 * Sanitiza objetos removendo dados sensíveis
 */
function sanitizeMetadata(meta?: LogMetadata): LogMetadata | undefined {
  if (!meta) return undefined;

  const sanitized: LogMetadata = {};
  
  for (const [key, value] of Object.entries(meta)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some(k => lowerKey.includes(k));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMetadata(value as LogMetadata);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Formata timestamp no formato ISO
 */
function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Logger estruturado com níveis e sanitização
 */
export const logger = {
  /**
   * Debug logs - apenas em desenvolvimento
   */
  debug: (message: string, meta?: LogMetadata) => {
    if (import.meta.env.DEV) {
      const sanitized = sanitizeMetadata(meta);
      console.log(`[DEBUG ${timestamp()}]`, message, sanitized || '');
    }
  },

  /**
   * Info logs - operações normais
   */
  info: (message: string, meta?: LogMetadata) => {
    const sanitized = sanitizeMetadata(meta);
    console.info(`[INFO ${timestamp()}]`, message, sanitized || '');
  },

  /**
   * Warning logs - situações anormais mas não críticas
   */
  warn: (message: string, meta?: LogMetadata) => {
    const sanitized = sanitizeMetadata(meta);
    console.warn(`[WARN ${timestamp()}]`, message, sanitized || '');
  },

  /**
   * Error logs - falhas críticas
   */
  error: (message: string, error?: Error | unknown, meta?: LogMetadata) => {
    const sanitized = sanitizeMetadata(meta);
    
    if (error instanceof Error) {
      console.error(`[ERROR ${timestamp()}]`, message, {
        error: error.message,
        stack: error.stack,
        ...sanitized
      });
    } else {
      console.error(`[ERROR ${timestamp()}]`, message, error, sanitized || '');
    }
  }
};

/**
 * Logger específico para edge functions
 * Inclui context da função automaticamente
 */
export function createEdgeFunctionLogger(functionName: string) {
  return {
    debug: (message: string, meta?: LogMetadata) => 
      logger.debug(`[${functionName}] ${message}`, meta),
    info: (message: string, meta?: LogMetadata) => 
      logger.info(`[${functionName}] ${message}`, meta),
    warn: (message: string, meta?: LogMetadata) => 
      logger.warn(`[${functionName}] ${message}`, meta),
    error: (message: string, error?: Error | unknown, meta?: LogMetadata) => 
      logger.error(`[${functionName}] ${message}`, error, meta)
  };
}
