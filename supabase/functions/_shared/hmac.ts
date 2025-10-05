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
export async function validateHMACRequest(
  req: Request,
  secret: string
): Promise<{ valid: boolean; error?: string }> {
  const signature = req.headers.get('X-HMAC-Signature');
  const timestamp = req.headers.get('X-HMAC-Timestamp');
  
  if (!signature || !timestamp) {
    return { valid: false, error: 'Missing HMAC headers' };
  }
  
  // Verificar timestamp (não aceitar requisições com mais de 5 minutos)
  const now = Date.now();
  const reqTime = parseInt(timestamp);
  if (now - reqTime > 5 * 60 * 1000) {
    return { valid: false, error: 'Request expired' };
  }
  
  const body = await req.text();
  const isValid = await verifySignature(body, signature, secret);
  
  if (!isValid) {
    return { valid: false, error: 'Invalid signature' };
  }
  
  return { valid: true };
}
