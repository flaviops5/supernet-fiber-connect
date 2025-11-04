/**
 * LOG SANITIZER - Remove dados sensíveis de logs
 * ============================================
 * Previne exposição de senhas, tokens, CPFs em logs
 */

import { redactPII } from './pii-redaction.ts';

// Campos que devem ser redacted em logs
const SENSITIVE_FIELDS = [
  'senha',
  'password',
  'token',
  'secret',
  'apikey',
  'api_key',
  'cpf',
  'rg',
  'email',
  'phone',
  'telefone',
  'cartao',
  'card',
  'cvv',
  'authorization',
  'bearer',
  'pix_key',
  'chave_pix',
  'account_number',
  'conta_bancaria'
];

/**
 * Sanitiza um objeto removendo dados sensíveis
 */
export function sanitizeForLog(obj: any, depth = 0): any {
  // Prevenir recursão infinita
  if (depth > 10) return '[Max Depth]';
  
  // Valores primitivos
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  
  // Arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLog(item, depth + 1));
  }
  
  // Objetos
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Verificar se é campo sensível
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      lowerKey.includes(field)
    );
    
    if (isSensitive) {
      // Redact completamente
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursivamente sanitizar objetos aninhados
      sanitized[key] = sanitizeForLog(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Trunca strings longas em logs para evitar overflow
 */
export function truncateForLog(str: string, maxLength = 500): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + `... (truncated ${str.length - maxLength} chars)`;
}

/**
 * Logger seguro que sanitiza automaticamente
 */
export const safeLog = {
  info: (message: string, data?: any) => {
    const redactedMessage = typeof message === 'string' ? redactPII(message, 'logs') : message;
    const sanitized = data ? sanitizeForLog(data) : undefined;
    console.log(redactedMessage, sanitized);
  },
  
  warn: (message: string, data?: any) => {
    const redactedMessage = typeof message === 'string' ? redactPII(message, 'logs') : message;
    const sanitized = data ? sanitizeForLog(data) : undefined;
    console.warn(redactedMessage, sanitized);
  },
  
  error: (message: string, error?: any) => {
    const redactedMessage = typeof message === 'string' ? redactPII(message, 'logs') : message;
    if (error instanceof Error) {
      console.error(redactedMessage, {
        name: error.name,
        message: redactPII(error.message, 'logs'),
        stack: error.stack?.split('\n').slice(0, 5).join('\n') // Limitar stack trace
      });
    } else {
      const sanitized = error ? sanitizeForLog(error) : undefined;
      console.error(redactedMessage, sanitized);
    }
  },
  
  /**
   * Log de dados IXC com sanitização especial
   */
  ixcData: (data: any) => {
    const sanitized = sanitizeForLog(data);
    const json = JSON.stringify(sanitized);
    const truncated = truncateForLog(json, 500);
    console.log('📦 IXC Data (sanitized):', truncated);
  }
};
