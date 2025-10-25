/**
 * Tipos centralizados para Error Handling
 * Uso: import { IXCError, parseJSON } from '../_shared/error-types.ts'
 */

// ============================================
// JSON TYPES
// ============================================

export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonArray = JsonValue[];

// ============================================
// INTERFACES DE ERRO
// ============================================

export interface IXCError {
  type?: 'error';
  message: string;
  code?: string;
  details?: JsonValue;
}

export interface EdgeFunctionError extends Error {
  code?: string;
  statusCode: number;
  details?: JsonValue;
}

export interface APIError {
  message: string;
  status: number;
  code?: string;
  details?: JsonValue;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse JSON com tratamento de erro robusto
 * @returns Objeto parseado ou null em caso de erro
 */
export function parseJSON<T = JsonValue>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Parse JSON que lança erro se falhar
 * @throws Error com mensagem descritiva
 */
export function parseJSONStrict<T = JsonValue>(text: string, context = 'JSON'): T {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    const preview = text.substring(0, 100);
    throw new Error(`Failed to parse ${context}: ${preview}...`);
  }
}

/**
 * Verifica se um erro é do tipo IXCError
 */
export function isIXCError(error: unknown): error is IXCError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as IXCError).message === 'string'
  );
}

/**
 * Extrai mensagem de erro de forma segura
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (isIXCError(error)) {
    return error.message;
  }
  return 'Unknown error';
}

/**
 * Cria um erro tipado para Edge Functions
 */
export function createEdgeFunctionError(
  message: string,
  statusCode = 500,
  code?: string,
  details?: JsonValue
): EdgeFunctionError {
  const error = new Error(message) as EdgeFunctionError;
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}
