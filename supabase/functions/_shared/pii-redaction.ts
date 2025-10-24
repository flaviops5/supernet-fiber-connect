/**
 * PII Redaction Utility - Sprint 1
 * 
 * Implementa 3 níveis de mascaramento de dados pessoais (LGPD):
 * - logs: Mascaramento parcial para logs internos
 * - ai: Substituição por placeholders para prompts de IA
 * - audit: Redação completa para auditoria LGPD
 */

export type RedactionLevel = 'logs' | 'ai' | 'audit';

/**
 * Mascara/redaciona PII de acordo com o nível especificado
 */
export function redactPII(text: string, level: RedactionLevel): string {
  if (!text) return text;
  
  switch(level) {
    case 'logs':
      // Logs internos: mascara parcial (mantém formato, esconde dados)
      return text
        .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, 'XXX.XXX.XXX-XX')
        .replace(/\b\d{11}\b/g, 'XXXXXXXXXXX')
        .replace(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g, '(XX) XXXXX-XXXX')
        .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, (email) => {
          const [local, domain] = email.split('@');
          return `${local.slice(0, 2)}***@${domain}`;
        });
    
    case 'ai':
      // Prompts IA: substitui por placeholders (mantém contexto semântico)
      return text
        .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[CPF]')
        .replace(/\b\d{11}\b/g, '[CPF]')
        .replace(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g, '[PHONE]')
        .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[EMAIL]')
        .replace(/\b([A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜ][a-zàáâãäåçèéêëìíîïñòóôõöùúûü]+(?: [A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜ][a-zàáâãäåçèéêëìíîïñòóôõöùúûü]+)+)\b/g, '[NOME]');
    
    case 'audit':
      // Auditoria LGPD: redação completa e irreversível
      return text
        .replace(/\b([A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜ][a-zàáâãäåçèéêëìíîïñòóôõöùúûü]+(?: [A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜ][a-zàáâãäåçèéêëìíîïñòóôõöùúûü]+)+)\b/g, '[REDACTED]')
        .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[REDACTED]')
        .replace(/\b\d{11}\b/g, '[REDACTED]')
        .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[REDACTED]')
        .replace(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g, '[REDACTED]');
    
    default:
      return text;
  }
}

/**
 * Mascara um objeto JSON recursivamente
 */
export function redactPIIObject(
  obj: any,
  level: RedactionLevel,
  sensitiveFields: string[] = ['cpf', 'phone', 'email', 'name', 'customer_name', 'customer_cpf', 'customer_phone', 'customer_email']
): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactPIIObject(item, level, sensitiveFields));
  }

  const redacted: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const issensitive = sensitiveFields.some(field => 
      key.toLowerCase().includes(field.toLowerCase())
    );
    
    if (issensitive && typeof value === 'string') {
      redacted[key] = redactPII(value, level);
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactPIIObject(value, level, sensitiveFields);
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

/**
 * Extrai CPF de texto (para validação)
 */
export function extractCPF(text: string): string | null {
  const cpfMatch = text.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/) || 
                   text.match(/\b\d{11}\b/);
  return cpfMatch ? cpfMatch[0].replace(/\D/g, '') : null;
}

/**
 * Extrai telefone de texto (para validação)
 */
export function extractPhone(text: string): string | null {
  const phoneMatch = text.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);
  return phoneMatch ? phoneMatch[0].replace(/\D/g, '') : null;
}

/**
 * Valida se um texto contém PII não mascarado
 */
export function containsUnmaskedPII(text: string): boolean {
  if (!text) return false;
  
  // Verifica CPF não mascarado
  if (/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/.test(text) || /\b\d{11}\b/.test(text)) {
    return true;
  }
  
  // Verifica email não mascarado
  if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(text)) {
    return true;
  }
  
  // Verifica telefone não mascarado
  if (/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/.test(text)) {
    return true;
  }
  
  return false;
}
