/**
 * Standardized Error Handler for Edge Functions
 * Centraliza tratamento de erros com logging estruturado
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface EdgeFunctionError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

export class StandardError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(code: string, message: string, statusCode = 500, details?: any) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'StandardError';
  }
}

/**
 * CORS headers padronizados
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Trata erros de forma padronizada e retorna Response
 */
export function handleEdgeFunctionError(
  error: unknown,
  functionName: string,
  logToSupabase = true
): Response {
  console.error(`❌ [${functionName}] Error:`, error);

  let errorResponse: EdgeFunctionError;

  if (error instanceof StandardError) {
    errorResponse = {
      code: error.code,
      message: error.message,
      details: error.details,
      statusCode: error.statusCode
    };
  } else if (error instanceof Error) {
    errorResponse = {
      code: 'INTERNAL_ERROR',
      message: error.message,
      statusCode: 500
    };
  } else {
    errorResponse = {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      statusCode: 500
    };
  }

  // Log to Supabase monitoring_logs
  if (logToSupabase) {
    logErrorToSupabase(functionName, errorResponse).catch(console.error);
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: errorResponse
    }),
    {
      status: errorResponse.statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Salva erro no monitoring_logs
 */
async function logErrorToSupabase(
  functionName: string,
  error: EdgeFunctionError
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Supabase credentials not found for error logging');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from('monitoring_logs').insert({
      level: 'error',
      agent_name: functionName,
      message: error.message,
      metadata: {
        code: error.code,
        details: error.details,
        statusCode: error.statusCode
      }
    });
  } catch (logError) {
    console.error('❌ Failed to log error to Supabase:', logError);
  }
}

/**
 * Wrapper para executar funções com tratamento de erro padronizado
 */
export async function withErrorHandler<T>(
  functionName: string,
  fn: () => Promise<T>
): Promise<T | Response> {
  try {
    return await fn();
  } catch (error) {
    return handleEdgeFunctionError(error, functionName);
  }
}

/**
 * Cria erro de validação (400)
 */
export function ValidationError(message: string, details?: any): StandardError {
  return new StandardError('VALIDATION_ERROR', message, 400, details);
}

/**
 * Cria erro de autenticação (401)
 */
export function AuthError(message: string, details?: any): StandardError {
  return new StandardError('AUTH_ERROR', message, 401, details);
}

/**
 * Cria erro de autorização (403)
 */
export function ForbiddenError(message: string, details?: any): StandardError {
  return new StandardError('FORBIDDEN_ERROR', message, 403, details);
}

/**
 * Cria erro de não encontrado (404)
 */
export function NotFoundError(message: string, details?: any): StandardError {
  return new StandardError('NOT_FOUND_ERROR', message, 404, details);
}

/**
 * Cria erro de rate limit (429)
 */
export function RateLimitError(message: string, details?: any): StandardError {
  return new StandardError('RATE_LIMIT_ERROR', message, 429, details);
}
