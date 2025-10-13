// ============================================
// HMAC SIGNATURE - Segurança entre Edge Functions
// ============================================

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Gera assinatura HMAC SHA-256 para um payload
 */
export async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verifica se a assinatura HMAC é válida
 */
export async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expectedSignature = await signPayload(payload, secret);
  return signature === expectedSignature;
}

/**
 * Adiciona headers HMAC para requisição interna
 */
export async function addHMACHeaders(
  body: any,
  secret: string
): Promise<Record<string, string>> {
  const payload = JSON.stringify(body);
  const signature = await signPayload(payload, secret);
  const timestamp = Date.now().toString();
  
  return {
    'X-HMAC-Signature': signature,
    'X-HMAC-Timestamp': timestamp,
    'Content-Type': 'application/json'
  };
}

/**
 * Valida headers HMAC de requisição recebida
 */
/**
 * Sprint 1: Validação HMAC com TTL e clock skew tolerance
 * 
 * @param req - Request HTTP recebida
 * @param secret - Segredo compartilhado HMAC
 * @param ttlSeconds - TTL em segundos (padrão: 300s = 5 minutos)
 * @param clockSkewSeconds - Tolerância para dessincronização de relógio (padrão: 30s)
 */
export async function validateHMACRequest(
  req: Request,
  secret: string,
  ttlSeconds: number = 300,
  clockSkewSeconds: number = 30
): Promise<{ valid: boolean; error?: string }> {
  const signature = req.headers.get('X-HMAC-Signature');
  const timestamp = req.headers.get('X-HMAC-Timestamp');
  
  if (!signature || !timestamp) {
    return { valid: false, error: 'Missing HMAC headers' };
  }
  
  // Validação de TTL com clock skew tolerance
  const now = Math.floor(Date.now() / 1000);
  const reqTime = Math.floor(parseInt(timestamp) / 1000);
  
  if (isNaN(reqTime)) {
    return { valid: false, error: 'Invalid timestamp format' };
  }
  
  const timeDifference = Math.abs(now - reqTime);
  const maxAllowedDiff = ttlSeconds + clockSkewSeconds;
  
  if (timeDifference > maxAllowedDiff) {
    return { 
      valid: false, 
      error: `Timestamp expired (TTL: ${ttlSeconds}s, clock skew: ±${clockSkewSeconds}s, diff: ${timeDifference}s)` 
    };
  }
  
  const body = await req.text();
  const isValid = await verifySignature(body, signature, secret);
  
  if (!isValid) {
    return { valid: false, error: 'Invalid HMAC signature' };
  }
  
  return { valid: true };
}
