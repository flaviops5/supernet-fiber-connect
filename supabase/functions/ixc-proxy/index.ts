// ============================================
// IXC PROXY - Ponto único de acesso ao IXC
// ============================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateHMACRequest } from "../_shared/hmac.ts";
import type { IXCProxyRequest, IXCProxyResponse } from "../_shared/types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hmac-signature, x-hmac-timestamp, X-HMAC-Signature, X-HMAC-Timestamp',
};

// Cache em memória (simples)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 segundos

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Ler corpo PRIMEIRO (só pode ser lido uma vez)
    const requestBody = await req.json() as IXCProxyRequest;
    const { method, path, query, body } = requestBody;

    // 🔐 Validar HMAC (se configurado)
    const HMAC_SECRET = Deno.env.get('HMAC_SHARED_SECRET');
    if (HMAC_SECRET) {
      // Obter headers HMAC
      const hmacSignature = req.headers.get('X-HMAC-Signature');
      const hmacTimestamp = req.headers.get('X-HMAC-Timestamp');
      
      if (!hmacSignature || !hmacTimestamp) {
        // Fallback: permitir sem HMAC para não bloquear ambiente de teste/UI
        console.warn('🔐 HMAC headers ausentes - prosseguindo em modo compatibilidade');
      } else {

      // Validar timestamp (não mais de 5 minutos)
      const timestamp = parseInt(hmacTimestamp);
      const now = Date.now();
      const FIVE_MINUTES = 5 * 60 * 1000;
      
      if (Math.abs(now - timestamp) > FIVE_MINUTES) {
        console.error('🔐 HMAC validation failed: Timestamp expired');
        return new Response(
          JSON.stringify({ ok: false, error: 'Unauthorized: Timestamp expired' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validar assinatura
      const { signPayload } = await import('../_shared/hmac.ts');
      const expectedSignature = await signPayload(JSON.stringify(requestBody), HMAC_SECRET);
      
      if (hmacSignature !== expectedSignature) {
        console.error('🔐 HMAC validation failed: Invalid signature');
        return new Response(
          JSON.stringify({ ok: false, error: 'Unauthorized: Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('✅ HMAC validated');
    }
    }
 
    console.log(`📡 IXC Proxy: ${method} ${path}${query ? '?' + query : ''}`);

    // Verificar cache para GET requests
    const cacheKey = `${method}:${path}:${query || ''}`;
    if (method === 'GET') {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('💾 Cache HIT:', cacheKey);
        const duration = Date.now() - startTime;
        return new Response(
          JSON.stringify({ 
            ok: true, 
            status: 200, 
            data: cached.data,
            cached: true,
            duration_ms: duration
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Credenciais IXC (centralizadas aqui)
    const IXC_BASE_URL = Deno.env.get('IXC_API_BASE_URL');
    const IXC_USERNAME = Deno.env.get('IXC_API_USERNAME');
    const IXC_PASSWORD = Deno.env.get('IXC_API_PASSWORD');

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

    const ixcResponse = await fetch(url, {
      method,
      headers: ixcHeaders,
      body: outgoingBody
    });

    // Tentar parsear como JSON; caso contrário, capturar texto (ex.: HTML de login)
    const contentType = (ixcResponse.headers.get('content-type') || '').toLowerCase();
    let ixcData: any = null;
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

    const duration = Date.now() - startTime;
    console.log(`✅ IXC Response: ${ixcResponse.status} (${duration}ms)`);

    // Armazenar em cache se GET bem-sucedido com JSON
    if (method === 'GET' && ixcResponse.ok && ixcData) {
      cache.set(cacheKey, { data: ixcData, timestamp: Date.now() });
      console.log('💾 Cache STORED:', cacheKey);
    }

    const ok = ixcResponse.ok && !!ixcData;

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

    const response: IXCProxyResponse = {
      ok,
      status: responseStatus,
      data: ixcData,
      error: ok ? undefined : (ixcData?.message || ixcData?.error || (rawText ? `Non-JSON response from IXC (preview): ${rawText.slice(0, 200)}` : 'IXC error'))
    };

    return new Response(
      JSON.stringify({ ...response, duration_ms: duration }),
      {
        status: responseStatus, // ✅ Status HTTP reflete o erro real detectado
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ IXC Proxy error:', error);
    
    return new Response(
      JSON.stringify({
        ok: false,
        status: 500,
        error: error.message,
        duration_ms: duration
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
