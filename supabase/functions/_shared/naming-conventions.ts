/**
 * Naming Conventions - Sprint 3
 * Utilitários para padronização de nomenclaturas
 */

/**
 * Converte snake_case para camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converte camelCase para snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Converte objeto com chaves snake_case para camelCase
 */
export function objectToCamelCase<T = Record<string, unknown>>(obj: Record<string, unknown>): T {
  if (!obj || typeof obj !== 'object') return obj as T;
  
  if (Array.isArray(obj)) {
    return obj.map(item => objectToCamelCase(item)) as T;
  }
  
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    result[camelKey] = typeof value === 'object' && value !== null
      ? objectToCamelCase(value as Record<string, unknown>)
      : value;
  }
  
  return result as T;
}

/**
 * Converte objeto com chaves camelCase para snake_case
 */
export function objectToSnakeCase<T = Record<string, unknown>>(obj: Record<string, unknown>): T {
  if (!obj || typeof obj !== 'object') return obj as T;
  
  if (Array.isArray(obj)) {
    return obj.map(item => objectToSnakeCase(item)) as T;
  }
  
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    result[snakeKey] = typeof value === 'object' && value !== null
      ? objectToSnakeCase(value as Record<string, unknown>)
      : value;
  }
  
  return result as T;
}

/**
 * Padronização de nomes de edge functions
 * Padrão: kebab-case (ex: support-tech-agent)
 */
export function validateFunctionName(name: string): boolean {
  return /^[a-z][a-z0-9-]*[a-z0-9]$/.test(name);
}

/**
 * Padronização de nomes de tipos TypeScript
 * Padrão: PascalCase (ex: IXCCustomer)
 */
export function validateTypeName(name: string): boolean {
  return /^[A-Z][a-zA-Z0-9]*$/.test(name);
}

/**
 * Padronização de nomes de variáveis
 * Padrão: camelCase (ex: customerData)
 */
export function validateVariableName(name: string): boolean {
  return /^[a-z][a-zA-Z0-9]*$/.test(name);
}

/**
 * Padronização de nomes de constantes
 * Padrão: UPPER_SNAKE_CASE (ex: MAX_RETRIES)
 */
export function validateConstantName(name: string): boolean {
  return /^[A-Z][A-Z0-9_]*$/.test(name);
}
