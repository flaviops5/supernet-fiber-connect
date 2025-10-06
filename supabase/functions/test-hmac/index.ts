import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { addHMACHeaders } from '../_shared/hmac.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HMAC_SECRET = Deno.env.get('HMAC_SHARED_SECRET');
    
    if (!HMAC_SECRET) {
      return new Response(
        JSON.stringify({ 
          error: 'HMAC_SHARED_SECRET não configurado',
          status: 'failed'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Teste de assinatura HMAC
    const testPayload = { 
      test: 'Testando HMAC',
      timestamp: Date.now(),
      method: 'GET',
      path: '/test'
    };

    console.log('🔑 Testando assinatura HMAC...');
    console.log('📝 Secret length:', HMAC_SECRET.length);
    console.log('📦 Payload:', testPayload);

    const headers = await addHMACHeaders(testPayload, HMAC_SECRET);
    
    console.log('✅ Headers HMAC gerados:', headers);

    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'HMAC funcionando corretamente!',
        secret_configured: true,
        secret_length: HMAC_SECRET.length,
        headers_generated: Object.keys(headers),
        sample_signature: headers['X-HMAC-Signature']?.substring(0, 20) + '...',
        sample_timestamp: headers['X-HMAC-Timestamp']
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro no teste HMAC:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao testar HMAC',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        status: 'failed'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
