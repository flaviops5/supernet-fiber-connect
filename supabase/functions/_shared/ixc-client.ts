// ============================================
// IXC CLIENT - Retry Logic + Circuit Breaker
// ============================================

import { addHMACHeaders } from './hmac.ts';

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
  body?: any,
  query?: string,
  config: Partial<RetryConfig> = {}
): Promise<any> {
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
        // Status HTTP de erro - pode ser temporário
        const errorText = await response.text();
        throw new Error(`IXC Proxy HTTP ${response.status}: ${errorText}`);
      }
      
      // Ler resposta como texto primeiro para poder tratar erros de JSON
      const responseText = await response.text();
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        // Resposta não é JSON - pode ser HTML de erro
        const preview = responseText.substring(0, 200);
        throw new Error(`IXC Error: Non-JSON response from IXC (preview): ${preview}`);
      }
      
      if (!data.ok) {
        // IXC retornou erro - pode ser temporário
        throw new Error(`IXC Error: ${data.error || 'Unknown error'}`);
      }
      
      // ✅ SUCESSO
      recordSuccess();
      console.log(`✅ IXC call successful on attempt ${attempt + 1}`);
      return data;
      
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ IXC call failed on attempt ${attempt + 1}:`, lastError.message);
      
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
