// ============================================
// IXC PROXY - Ponto único de acesso ao IXC
// ============================================
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { authenticateRequest } from "../_shared/composite-auth.ts";
import { safeLog, sanitizeForLog } from "../_shared/log-sanitizer.ts";
import { createLogger as createUnifiedLogger } from "../_shared/unified-logger.ts";
import { createLogger } from "../_shared/structured-logger.ts";
import { getOrCreateTraceId } from "../_shared/trace-id.ts";
import { createTimer } from "../_shared/duration-tracker.ts";
import type { IXCProxyRequest, IXCProxyResponse } from "../_shared/types.ts";
import type { JsonValue } from "../_shared/error-types.ts";

const cache = new Map<string, { data: JsonValue; timestamp: number }>();
const CACHE_TTL = 30000; // 30 segundos

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-key, x-hmac-signature, x-hmac-timestamp',
};

// v3.1 Hybrid: Composite Auth (CRON > HMAC > service_role > JWT)
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const timer = createTimer();
  const traceId = getOrCreateTraceId(req);
  const logger = createLogger('ixc-proxy', req, { 
    traceId, 
    durationTracker: timer 
  });

  try {
    // 🔐 Autenticação via composite auth
    const authResult = await authenticateRequest(req, logger);
    
    if (!authResult.authenticated) {
      logger.warn('❌ Authentication failed', { error: authResult.error });
      return new Response(
        JSON.stringify({ error: authResult.error || 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('✅ Authenticated', { 
      method: authResult.method,
      metadata: authResult.metadata 
    });

    // Ler corpo
    const requestBody = await req.json() as IXCProxyRequest;
    const { method, path, query, body } = requestBody;
    logger.info(`IXC Proxy request: ${method} ${path}`, { query });

    const startTime = Date.now();

    // Verificar cache para GET requests
    const cacheKey = `${method}:${path}:${query || ''}`;
    if (method === 'GET') {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        logger.info('Cache HIT', { cacheKey });
        const duration = Date.now() - startTime;
        return new Response(
          JSON.stringify({ 
            ok: true, 
            status: 200, 
            data: cached.data,
            cached: true,
            duration_ms: duration
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Credenciais IXC (centralizadas aqui)
    const IXC_BASE_URL = Deno.env.get('IXC_API_BASE_URL');
    const IXC_USERNAME = Deno.env.get('IXC_API_USERNAME');
    const IXC_PASSWORD = Deno.env.get('IXC_API_PASSWORD');

    logger.info('Auth configured', { 
      hasUrl: !!IXC_BASE_URL, 
      hasUser: !!IXC_USERNAME, 
      hasPass: !!IXC_PASSWORD 
    });

    if (!IXC_BASE_URL || !IXC_USERNAME || !IXC_PASSWORD) {
      throw new Error('IXC credentials not configured');
    }

    // ✅ Normalizar URL removendo /adm.php
    const cleanBaseUrl = IXC_BASE_URL.replace(/\/adm\.php$/, '');

    // Construir URL
    const url = `${cleanBaseUrl}${path}${query ? '?' + query : ''}`;
    
    // Fazer requisição ao IXC
    // ✅ Usar Authorization BASIC do caller somente se vier em formato Basic; caso contrário usar credenciais do ambiente
    const incomingAuth = req.headers.get('authorization') || '';
    const useIncomingBasic = incomingAuth.toLowerCase().startsWith('basic ');
    const ixcAuthHeader = useIncomingBasic
      ? incomingAuth
      : `Basic ${btoa(`${IXC_USERNAME}:${IXC_PASSWORD}`)}`;
    
    logger.info('Auth configured', { 
      source: useIncomingBasic ? 'request' : 'env',
      authPreview: ixcAuthHeader.slice(0, 15)
    });
    logger.info('IXC URL', { url });
    
    const ixcHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': ixcAuthHeader
    };

    // Alguns endpoints do IXC exigem este header para listagens
    // Detectar chamadas de listagem (IXC exige form-urlencoded + header ixcsoft)
    const isListar = method === 'POST' && path.startsWith('/webservice/v1/') && body && typeof body === 'object' && (
      'qtype' in body || 'query' in body || 'oper' in body || 'page' in body || 'rp' in body || 'sortname' in body || 'sortorder' in body
    );

    if (isListar) {
      ixcHeaders['ixcsoft'] = 'listar';
      ixcHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    // ====== VALIDATOR BLOCK (Temporary Debug) ======
    try {
      const parsedUrl = new URL(url);
      const pathUsed = parsedUrl.pathname + parsedUrl.search;

      logger.info("🔍 VALIDATOR: IXC Request Diagnostics", {
        method,
        endpoint: pathUsed,
        hasIxcsoftHeader: ixcHeaders['ixcsoft'] || '(missing)',
        authHeader: ixcHeaders['Authorization'] ? 'present' : '(missing)',
        contentType: ixcHeaders['Content-Type'] || '(missing)',
        bodyPreview: body ? JSON.stringify(body).slice(0, 200) : '(no body)',
        timestamp: new Date().toISOString(),
        deploymentSignature: 'DEPLOY_CHECK_v1',
      });
    } catch (e) {
      logger.error('Validator exception', { error: e instanceof Error ? e.message : String(e) });
    }
    // ====== END VALIDATOR BLOCK ======

    // Preparar corpo adequadamente
    let outgoingBody: BodyInit | undefined = undefined;
    if (body) {
      if (isListar) {
        // Encode como form-urlencoded
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(body)) {
          if (v !== undefined && v !== null) params.append(k, String(v));
        }
        outgoingBody = params;
      } else {
        // JSON padrão
        outgoingBody = JSON.stringify(body);
      }
    }

    const ixcResponse = await logger.measure('ixc-api-call', async () => {
      return await fetch(url, {
        method,
        headers: ixcHeaders,
        body: outgoingBody
      });
    });

    // Tentar parsear como JSON; caso contrário, capturar texto (ex.: HTML de login)
    const contentType = (ixcResponse.headers.get('content-type') || '').toLowerCase();
    let ixcData: JsonValue | null = null;
    let rawText: string | undefined;
    try {
      const looksJson = contentType.includes('json');
      if (looksJson) {
        try {
          ixcData = await ixcResponse.json();
        } catch {
          // Alguns IXC retornam text/x-json com JSON válido em texto
          const txt = await ixcResponse.text();
          rawText = txt;
          try { ixcData = JSON.parse(txt); } catch { /* permanece como texto */ }
        }
      } else {
        rawText = await ixcResponse.text();
      }
    } catch (_) {
      try { rawText = await ixcResponse.text(); } catch { /* ignore */ }
    }

    // Timing será capturado pelo timer.complete() ao final
    logger.info(`IXC Response: ${ixcResponse.status}`, { status: ixcResponse.status });
    
    // Log para debug de dados parseados (sanitizado)
    logger.info('Response data type', { 
      type: typeof ixcData, 
      isNull: ixcData === null, 
      isUndefined: ixcData === undefined 
    });
    if (rawText) logger.info('Raw text preview', { preview: rawText.slice(0, 300) });
    
    // Log adicional para erros de autenticação
    if (ixcResponse.status === 401) {
      logger.error('IXC returned 401 - Check credentials');
      if (rawText) logger.error('Response', { preview: rawText.slice(0, 300) });
    }

    // Armazenar em cache se GET bem-sucedido com JSON
    if (method === 'GET' && ixcResponse.ok && ixcData) {
      cache.set(cacheKey, { data: ixcData, timestamp: Date.now() });
      logger.info('Cache stored', { cacheKey });
    }

    const ok = ixcResponse.ok && !!ixcData;
    
    // Log para debug quando IXC retorna 200 mas pode ter erro no payload (SANITIZADO)
    if (ixcResponse.ok && ixcData) {
      safeLog.ixcData(ixcData);
    }

    // Determinar status HTTP correto baseado no tipo de erro
    let responseStatus = ixcResponse.status;
    
    // Se IXC retornou 200 mas não é JSON válido, é um erro de configuração (502 Bad Gateway)
    if (ixcResponse.ok && !ixcData && rawText) {
      responseStatus = 502; // Bad Gateway - resposta inválida do IXC
    }
    // Se IXC retornou erro (4XX/5XX), manter o status original
    else if (!ixcResponse.ok) {
      responseStatus = ixcResponse.status;
    }
    // Se tudo OK, 200
    else if (ok) {
      responseStatus = 200;
    }

    const duration = timer.complete();
    logger.info('IXC request completed', { 
      duration_ms: duration,
      status: responseStatus,
      ok
    });

    const response: IXCProxyResponse = {
      ok,
      status: responseStatus,
      data: ixcData,
      error: ok ? undefined : (ixcData?.message || ixcData?.error || (rawText ? `Non-JSON response from IXC (preview): ${rawText.slice(0, 200)}` : 'IXC error')),
      duration_ms: duration
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: responseStatus,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    const duration = timer.complete();
    logger.error('IXC Proxy error', { 
      error: error instanceof Error ? error.message : String(error),
      duration_ms: duration
    });

    const errorResponse: IXCProxyResponse = {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Internal server error',
      duration_ms: duration
    };

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
