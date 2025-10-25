/**
 * Lovable AI Client - Sprint 2
 * 
 * Cliente HTTP para Lovable AI com Circuit Breaker e retry exponencial
 */

import { getLovableCircuitBreaker } from './circuit-breaker.ts';
import { redactPII } from './pii-redaction.ts';
import type { JsonObject, JsonValue } from './error-types.ts';

export interface LovableTool {
  type: string;
  function: {
    name: string;
    description?: string;
    parameters?: JsonObject;
  };
}

export type LovableToolChoice = 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };

export interface LovableToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LovableMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LovableRequest {
  model?: string;
  messages: LovableMessage[];
  temperature?: number;
  max_completion_tokens?: number;
  tools?: LovableTool[];
  tool_choice?: LovableToolChoice;
}

export interface LovableResponse {
  id: string;
  choices: Array<{
    message: {
      content?: string;
      tool_calls?: LovableToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Retry com backoff exponencial
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  correlationId?: string
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Não retenta em erros 4xx (exceto 429 rate limit)
      if (error instanceof Response) {
        if (error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }
      }
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(
        `⚠️ [${correlationId}] Retry ${attempt}/${maxRetries} após ${delay}ms - ${lastError.message}`
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Chama Lovable AI com Circuit Breaker e retry
 */
export async function callLovableAI(
  request: LovableRequest,
  correlationId?: string
): Promise<LovableResponse> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY não configurada');
  }

  const circuitBreaker = getLovableCircuitBreaker();
  
  // Sprint 1: Redaciona PII antes de enviar para IA
  const sanitizedRequest: LovableRequest = {
    ...request,
    messages: request.messages.map(msg => ({
      ...msg,
      content: msg.role === 'user' ? redactPII(msg.content, 'ai') : msg.content,
    })),
  };

  const startTime = Date.now();
  
  try {
    const response = await circuitBreaker.call(async () => {
      return await retryWithBackoff(async () => {
        const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-Correlation-ID': correlationId || 'unknown',
          },
          body: JSON.stringify({
            model: request.model || 'google/gemini-2.5-flash',
            ...sanitizedRequest,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          
          // Sprint 2: Log estruturado de erro
          console.error(`❌ [${correlationId}] Lovable AI error`, {
            status: res.status,
            statusText: res.statusText,
            error: errorText,
            duration: Date.now() - startTime,
          });
          
          if (res.status === 429) {
            throw new Error('Rate limit exceeded - aguarde antes de tentar novamente');
          }
          
          if (res.status === 402) {
            throw new Error('Payment required - adicione créditos ao workspace Lovable');
          }
          
          throw new Error(`Lovable API error: ${res.status} - ${errorText}`);
        }

        return await res.json();
      }, 3, 2000, correlationId);
    });

    const duration = Date.now() - startTime;
    
    // Sprint 2: Log estruturado de sucesso
    console.log(`✅ [${correlationId}] Lovable AI success`, {
      model: request.model || 'google/gemini-2.5-flash',
      duration,
      tokens: response.usage?.total_tokens || 0,
      circuitState: circuitBreaker.getState(),
    });

    return response;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Sprint 2: Log estruturado de falha
    console.error(`❌ [${correlationId}] Lovable AI failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
      circuitState: circuitBreaker.getState(),
    });
    
    throw error;
  }
}

/**
 * Extrai conteúdo da resposta Lovable
 */
export function extractContent(response: LovableResponse): string {
  return response.choices[0]?.message?.content || '';
}

/**
 * Extrai tool calls da resposta Lovable
 */
export function extractToolCalls(response: LovableResponse): LovableToolCall[] {
  return response.choices[0]?.message?.tool_calls || [];
}

/**
 * Verifica se resposta tem tool calls
 */
export function hasToolCalls(response: LovableResponse): boolean {
  return extractToolCalls(response).length > 0;
}
