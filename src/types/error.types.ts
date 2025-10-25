/**
 * Error Types
 * Sprint 10 - Fase 2: Substituir error: any
 */

import type { JsonObject } from './common.types';

export interface ErrorWithDetails extends Error {
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

export interface ValidationError extends ErrorWithDetails {
  field: string;
  rule: string;
}

export interface NetworkError extends ErrorWithDetails {
  url: string;
  method: string;
  status: number;
}

export type ErrorHandler = (error: ErrorWithDetails) => void;

/**
 * Type guard para verificar se um erro tem detalhes
 */
export function isErrorWithDetails(error: unknown): error is ErrorWithDetails {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as ErrorWithDetails).code === 'string'
  );
}

/**
 * Converte qualquer erro para ErrorWithDetails de forma segura
 * 
 * @example
 * try {
 *   await fetchData();
 * } catch (error) {
 *   const err = parseError(error);
 *   console.error(err.message, err.code);
 * }
 */
export function parseError(error: unknown): ErrorWithDetails {
  if (isErrorWithDetails(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    return {
      ...error,
      name: error.name,
      message: error.message,
      code: 'UNKNOWN_ERROR',
    } as ErrorWithDetails;
  }
  
  return {
    name: 'Error',
    message: String(error),
    code: 'UNEXPECTED_ERROR',
  } as ErrorWithDetails;
}

/**
 * Converte erro para formato IXC API
 * Re-usa IXCApiError de ixc-extended.types
 */
export function parseIXCError(error: unknown, endpoint?: string): {
  message: string;
  code?: string;
  details?: JsonObject;
  statusCode?: number;
  endpoint?: string;
} {
  const baseError = parseError(error);
  return {
    message: baseError.message,
    code: baseError.code,
    details: baseError.details as JsonObject | undefined,
    statusCode: baseError.statusCode,
    endpoint,
  };
}
