// ============================================
// IXC CLIENT - Retry Logic + Circuit Breaker
// ============================================

import { addHMACHeaders } from './hmac.ts';
import type { JsonValue } from './types.ts';

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
};

// Circuit breaker global state (em memória - simples)
const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailureTime: 0,
  state: 'closed'
};

const CIRCUIT_BREAKER_THRESHOLD = 5; // Falhas consecutivas
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minuto

/**
 * Delay helper para retry
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verifica estado do circuit breaker
 */
function checkCircuitBreaker(): { canProceed: boolean; reason?: string } {
  const now = Date.now();
  
  if (circuitBreaker.state === 'open') {
    // Verificar se deve tentar half-open
    if (now - circuitBreaker.lastFailureTime > CIRCUIT_BREAKER_TIMEOUT) {
      circuitBreaker.state = 'half-open';
      console.log('🔄 Circuit breaker: HALF-OPEN');
      return { canProceed: true };
    }
    
    return { 
      canProceed: false, 
      reason: `Circuit breaker OPEN - aguarde ${Math.ceil((CIRCUIT_BREAKER_TIMEOUT - (now - circuitBreaker.lastFailureTime)) / 1000)}s` 
    };
  }
  
  return { canProceed: true };
}

/**
 * Registra sucesso no circuit breaker
 */
function recordSuccess() {
  if (circuitBreaker.state === 'half-open') {
    circuitBreaker.state = 'closed';
    circuitBreaker.failures = 0;
    console.log('✅ Circuit breaker: CLOSED');
  }
}

/**
 * Registra falha no circuit breaker
 */
function recordFailure() {
  circuitBreaker.failures++;
  circuitBreaker.lastFailureTime = Date.now();
  
  if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.state = 'open';
    console.log('🚨 Circuit breaker: OPEN');
  }
}

/**
 * Chamada IXC com retry e circuit breaker
 */
export async function callIxcWithRetry(
  proxyUrl: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: JsonValue,
  query?: string,
  config: Partial<RetryConfig> = {}
): Promise<JsonValue> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  
  // Verificar circuit breaker
  const circuitCheck = checkCircuitBreaker();
  if (!circuitCheck.canProceed) {
    throw new Error(circuitCheck.reason);
  }
  
  let lastError: Error | null = null;
  let delayMs = retryConfig.initialDelayMs;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      console.log(`🔄 IXC call attempt ${attempt + 1}/${retryConfig.maxRetries + 1}: ${method} ${path}`);
      
      const startTime = Date.now();
      const requestBody = { method, path, body, query };

      // Assinatura HMAC se secret configurado
      const HMAC_SECRET = Deno.env.get('HMAC_SHARED_SECRET');
      const signedHeaders = HMAC_SECRET
        ? await addHMACHeaders(requestBody, HMAC_SECRET)
        : { 'Content-Type': 'application/json' };

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: signedHeaders,
        body: JSON.stringify(requestBody)
      });
      
      const duration = Date.now() - startTime;
      console.log(`⏱️ IXC call duration: ${duration}ms`);
      
      if (!response.ok) {
        const errorText = await response.text();
        const isConfigError = response.status === 401 || response.status === 403 || response.status === 404;
        const errorMsg = `IXC Proxy HTTP ${response.status}: ${errorText}`;
        
        // Não fazer retry em erros de configuração
        if (isConfigError) {
          console.error(`❌ Configuration error detected - aborting retries`);
          throw new Error(`[NO_RETRY] ${errorMsg}`);
        }
        
        throw new Error(errorMsg);
      }
      
      const responseText = await response.text();
      
      // Detectar resposta HTML (erro de configuração/autenticação)
      if (responseText.trim().startsWith('<')) {
        const isLoginPage = responseText.includes('login') || responseText.includes('autenticar');
        const errorMsg = isLoginPage 
          ? 'IXC retornou página de login - verifique URL, usuário e senha do IXC'
          : 'IXC retornou HTML ao invés de JSON - verifique a configuração da API';
        
        console.error(`❌ HTML response detected - aborting retries`);
        throw new Error(`[NO_RETRY] ${errorMsg}`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        const preview = responseText.substring(0, 200);
        throw new Error(`[NO_RETRY] Resposta inválida do IXC: ${preview}`);
      }
      
      // Verificar formato de erro IXC: {"type":"error","message":"..."}
      if (data.type === 'error' && data.message) {
        // Erros específicos que não devem retry
        const noRetryErrors = [
          'não está disponível',
          'não encontrado',
          'permission denied',
          'unauthorized'
        ];
        
        const shouldNotRetry = noRetryErrors.some(err => 
          data.message.toLowerCase().includes(err.toLowerCase())
        );
        
        if (shouldNotRetry) {
          throw new Error(`[NO_RETRY] IXC Error: ${data.message}`);
        }
        
        throw new Error(`IXC Error: ${data.message}`);
      }
      
      if (!data.ok) {
        throw new Error(`IXC Error: ${data.error || 'Unknown error'}`);
      }
      
      // ✅ SUCESSO
      recordSuccess();
      console.log(`✅ IXC call successful on attempt ${attempt + 1}`);
      return data;
      
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ IXC call failed on attempt ${attempt + 1}:`, lastError.message);
      
      // ✅ CORREÇÃO: Erros de configuração NÃO devem disparar circuit breaker
      // Se for erro de configuração (marcado com [NO_RETRY]), abortar imediatamente
      if (lastError.message.includes('[NO_RETRY]')) {
        const cleanMessage = lastError.message.replace('[NO_RETRY] ', '');
        // NÃO chamar recordFailure() aqui - erros persistentes não devem abrir o circuit breaker
        throw new Error(cleanMessage);
      }
      
      // Se for último retry, não esperar
      if (attempt < retryConfig.maxRetries) {
        console.log(`⏳ Waiting ${delayMs}ms before retry...`);
        await delay(delayMs);
        
        // Exponential backoff
        delayMs = Math.min(delayMs * retryConfig.backoffMultiplier, retryConfig.maxDelayMs);
      }
    }
  }
  
  // ❌ FALHA após todos os retries
  recordFailure();
  throw new Error(`IXC call failed after ${retryConfig.maxRetries + 1} attempts: ${lastError?.message}`);
}

/**
 * Status do circuit breaker (para monitoramento)
 */
export function getCircuitBreakerStatus() {
  return {
    state: circuitBreaker.state,
    failures: circuitBreaker.failures,
    lastFailureTime: circuitBreaker.lastFailureTime,
    threshold: CIRCUIT_BREAKER_THRESHOLD,
    timeoutMs: CIRCUIT_BREAKER_TIMEOUT
  };
}

/**
 * Reset manual do circuit breaker (para emergências)
 */
export function resetCircuitBreaker() {
  circuitBreaker.failures = 0;
  circuitBreaker.lastFailureTime = 0;
  circuitBreaker.state = 'closed';
  console.log('🔧 Circuit breaker manually reset to CLOSED');
}

/**
 * Busca dados de sinal TX/RX da ONU (potência óptica)
 * Endpoint: botao_rel_22991 (Relatório de Potência/Resumo ONU)
 */
export async function getOnuSignalStatus(
  proxyUrl: string,
  clientId: string
): Promise<any> {
  console.log(`📡 Buscando dados TX/RX para cliente ${clientId}...`);
  
  try {
    const result = await callIxcWithRetry(
      proxyUrl,
      'POST',
      '/webservice/v1/botao_rel_22991',
      { id: clientId }
    );
    
    console.log('✅ Dados TX/RX obtidos com sucesso');
    return result;
  } catch (error) {
    console.error('❌ Erro ao buscar dados TX/RX:', error);
    throw error;
  }
}
