/**
 * HTML Sanitization Utilities
 * MISSÃO 4.1: Segurança Zero-XSS
 * Usa DOMPurify para prevenir ataques XSS
 */

import DOMPurify, { type Config } from 'dompurify';

/**
 * Configuração padrão de sanitização
 * Permite apenas tags seguras e atributos específicos
 */
const DEFAULT_CONFIG: Config = {
  ALLOWED_TAGS: [
    // Text formatting
    'p', 'br', 'strong', 'em', 'u', 'span', 'div',
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Lists
    'ul', 'ol', 'li',
    // Tables
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    // Links (sanitized)
    'a',
  ],
  ALLOWED_ATTR: [
    'class', 'id', 'style',
    'href', 'target', 'rel', // Links
    'colspan', 'rowspan', // Tables
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

/**
 * Configuração para emails (mais permissiva)
 */
const EMAIL_CONFIG: Config = {
  ...DEFAULT_CONFIG,
  ALLOWED_TAGS: [
    ...DEFAULT_CONFIG.ALLOWED_TAGS!,
    'img', 'hr', 'blockquote', 'pre', 'code',
  ],
  ALLOWED_ATTR: [
    ...DEFAULT_CONFIG.ALLOWED_ATTR!,
    'src', 'alt', 'width', 'height', // Images
  ],
};

/**
 * Sanitiza HTML removendo scripts maliciosos e tags perigosas
 * 
 * @param dirty - HTML potencialmente perigoso
 * @param config - Configuração customizada (opcional)
 * @returns HTML sanitizado e seguro
 * 
 * @example
 * ```typescript
 * const safeHTML = sanitizeHTML('<p>Texto seguro</p><script>alert("XSS")</script>');
 * // Retorna: '<p>Texto seguro</p>'
 * ```
 */
export function sanitizeHTML(
  dirty: string, 
  config: Config = DEFAULT_CONFIG
): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(dirty, config) as string;
}

/**
 * Sanitiza HTML para uso em emails
 * Permite mais tags como imagens e formatação avançada
 * 
 * @param dirty - HTML do email
 * @returns HTML sanitizado para email
 */
export function sanitizeEmailHTML(dirty: string): string {
  return sanitizeHTML(dirty, EMAIL_CONFIG);
}

/**
 * Sanitiza HTML para contratos e templates
 * Permite formatação rica mas remove scripts e eventos
 * 
 * @param dirty - HTML do contrato/template
 * @returns HTML sanitizado
 */
export function sanitizeContractHTML(dirty: string): string {
  return sanitizeHTML(dirty, {
    ...EMAIL_CONFIG,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

/**
 * Remove TODAS as tags HTML, deixando apenas texto puro
 * Útil para campos que não devem conter HTML
 * 
 * @param dirty - String com possível HTML
 * @returns Texto puro sem tags
 */
export function stripHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}

/**
 * Verifica se uma string contém HTML potencialmente perigoso
 * 
 * @param input - String a verificar
 * @returns true se contém HTML perigoso
 */
export function containsDangerousHTML(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const dangerous = [
    '<script', 'javascript:', 'onerror=', 'onclick=',
    'onload=', 'onmouseover=', '<iframe', '<object',
  ];

  return dangerous.some(pattern => 
    input.toLowerCase().includes(pattern)
  );
}
