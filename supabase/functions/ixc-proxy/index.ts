// ============================================
// IXC PROXY - Ponto único de acesso ao IXC
// ============================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateHMACRequest } from "../_shared/hmac.ts";
import type { IXCProxyRequest, IXCProxyResponse } from "../_shared/types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hmac-signature, x-hmac-timestamp',
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
    // 🔐 Validar HMAC (se configurado)
    const HMAC_SECRET = Deno.env.get('HMAC_SHARED_SECRET');
    if (HMAC_SECRET) {
      const validation = await validateHMACRequest(req, HMAC_SECRET);
      if (!validation.valid) {
        console.error('🔐 HMAC validation failed:', validation.error);
        return new Response(
          JSON.stringify({ ok: false, error: 'Unauthorized: ' + validation.error }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('✅ HMAC validated');
    }

    const { method, path, query, body } = await req.json() as IXCProxyRequest;

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

    // Construir URL
    const url = `${IXC_BASE_URL}${path}${query ? '?' + query : ''}`;
    
    // Fazer requisição ao IXC
    const ixcResponse = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${IXC_USERNAME}:${IXC_PASSWORD}`)}`
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const ixcData = await ixcResponse.json();
    const duration = Date.now() - startTime;

    console.log(`✅ IXC Response: ${ixcResponse.status} (${duration}ms)`);

    // Armazenar em cache se GET bem-sucedido
    if (method === 'GET' && ixcResponse.ok) {
      cache.set(cacheKey, { data: ixcData, timestamp: Date.now() });
      console.log('💾 Cache STORED:', cacheKey);
    }

    const response: IXCProxyResponse = {
      ok: ixcResponse.ok,
      status: ixcResponse.status,
      data: ixcData,
      error: !ixcResponse.ok ? ixcData.message || ixcData.error || 'IXC error' : undefined
    };

    return new Response(
      JSON.stringify({ ...response, duration_ms: duration }),
      {
        status: 200,
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
