/**
 * Composite Authentication System v3.1
 * Hierarquia: CRON > HMAC > service_role > user JWT
 * 
 * Conformidade: P1/P2 + LGPD + HMAC compatibility
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  authenticated: boolean;
  method: 'cron' | 'hmac' | 'service_role' | 'user_jwt' | 'none';
  user_id?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Valida requisição usando hierarquia de autenticação
 */
export async function authenticateRequest(
  req: Request,
  logger?: any
): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  const cronKey = req.headers.get('X-Cron-Key');
  const hmacSignature = req.headers.get('X-HMAC-Signature');
  const hmacTimestamp = req.headers.get('X-HMAC-Timestamp');

  // 1️⃣ CRON Authentication (highest priority)
  if (cronKey) {
    const expectedCronSecret = Deno.env.get('CRON_SECRET');
    
    if (!expectedCronSecret) {
      logger?.warn('CRON_SECRET not configured');
      return {
        authenticated: false,
        method: 'none',
        error: 'CRON_SECRET not configured'
      };
    }

    if (cronKey === expectedCronSecret) {
      logger?.info('✅ Authenticated via CRON key');
      return {
        authenticated: true,
        method: 'cron',
        metadata: { source: 'cron_job' }
      };
    }

    logger?.warn('❌ Invalid CRON key');
    return {
      authenticated: false,
      method: 'none',
      error: 'Invalid CRON key'
    };
  }

  // 2️⃣ HMAC Authentication (internal calls)
  if (hmacSignature && hmacTimestamp) {
    const hmacSecret = Deno.env.get('HMAC_SHARED_SECRET');
    
    if (!hmacSecret) {
      logger?.warn('HMAC_SHARED_SECRET not configured - skipping HMAC validation');
    } else {
      try {
        const timestamp = parseInt(hmacTimestamp, 10);
        const now = Date.now();
        const maxAge = 300000; // 5 minutos

        // Validar timestamp
        if (now - timestamp > maxAge) {
          logger?.warn('❌ HMAC timestamp expired', {
            age_ms: now - timestamp,
            max_age_ms: maxAge
          });
          return {
            authenticated: false,
            method: 'none',
            error: 'HMAC timestamp expired'
          };
        }

        // Obter body para validação HMAC
        const body = await req.clone().text();
        const url = new URL(req.url);
        const path = url.pathname + url.search;

        // Gerar HMAC esperado
        const encoder = new TextEncoder();
        const message = `${req.method}:${path}:${timestamp}:${body}`;
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(hmacSecret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
        const expectedSignature = Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        if (hmacSignature === expectedSignature) {
          logger?.info('✅ Authenticated via HMAC');
          return {
            authenticated: true,
            method: 'hmac',
            metadata: { 
              source: 'internal_call',
              timestamp 
            }
          };
        }

        logger?.warn('❌ Invalid HMAC signature');
        return {
          authenticated: false,
          method: 'none',
          error: 'Invalid HMAC signature'
        };
      } catch (err) {
        logger?.error('❌ HMAC validation error', { 
          error: err instanceof Error ? err.message : String(err) 
        });
        return {
          authenticated: false,
          method: 'none',
          error: 'HMAC validation failed'
        };
      }
    }
  }

  // 3️⃣ Service Role Authentication (internal Supabase calls)
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (token === serviceRoleKey) {
      logger?.info('✅ Authenticated via service_role key');
      return {
        authenticated: true,
        method: 'service_role',
        metadata: { source: 'service_role' }
      };
    }

    // 4️⃣ User JWT Authentication (fallback)
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseClient = createClient(supabaseUrl, token);
      
      const { data: { user }, error } = await supabaseClient.auth.getUser();

      if (error || !user) {
        logger?.warn('❌ Invalid JWT token', { error: error?.message });
        return {
          authenticated: false,
          method: 'none',
          error: 'Invalid JWT token'
        };
      }

      logger?.info('✅ Authenticated via user JWT', { user_id: user.id });
      return {
        authenticated: true,
        method: 'user_jwt',
        user_id: user.id,
        metadata: { 
          email: user.email,
          role: user.role 
        }
      };
    } catch (err) {
      logger?.error('❌ JWT validation error', { 
        error: err instanceof Error ? err.message : String(err) 
      });
      return {
        authenticated: false,
        method: 'none',
        error: 'JWT validation failed'
      };
    }
  }

  // ❌ Nenhum método de autenticação válido
  logger?.warn('❌ No valid authentication method found');
  return {
    authenticated: false,
    method: 'none',
    error: 'No authentication provided'
  };
}

/**
 * Gera HMAC signature para chamadas internas
 */
export async function generateHmacSignature(
  method: string,
  path: string,
  body: string = ''
): Promise<{ signature: string; timestamp: number }> {
  const hmacSecret = Deno.env.get('HMAC_SHARED_SECRET');
  
  if (!hmacSecret) {
    throw new Error('HMAC_SHARED_SECRET not configured');
  }

  const timestamp = Date.now();
  const message = `${method}:${path}:${timestamp}:${body}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(hmacSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );

  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return { signature, timestamp };
}

/**
 * Adiciona headers de autenticação HMAC a uma requisição
 */
export async function addHmacHeaders(
  headers: Record<string, string>,
  method: string,
  path: string,
  body?: unknown
): Promise<Record<string, string>> {
  const bodyStr = body ? JSON.stringify(body) : '';
  const { signature, timestamp } = await generateHmacSignature(method, path, bodyStr);

  return {
    ...headers,
    'X-HMAC-Signature': signature,
    'X-HMAC-Timestamp': timestamp.toString()
  };
}
