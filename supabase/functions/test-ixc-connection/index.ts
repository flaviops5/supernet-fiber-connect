import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const IXC_API_BASE_URL = Deno.env.get('IXC_API_BASE_URL');
    const IXC_API_USERNAME = Deno.env.get('IXC_API_USERNAME');
    const IXC_API_PASSWORD = Deno.env.get('IXC_API_PASSWORD');
    const HMAC_SECRET = Deno.env.get('HMAC_SHARED_SECRET');

    console.log('🔍 Testando conexão com IXC...');
    console.log('📍 IXC_API_BASE_URL:', IXC_API_BASE_URL ? `${IXC_API_BASE_URL.substring(0, 30)}...` : 'NÃO CONFIGURADO');
    console.log('👤 IXC_API_USERNAME:', IXC_API_USERNAME ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
    console.log('🔑 IXC_API_PASSWORD:', IXC_API_PASSWORD ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
    console.log('🔐 HMAC_SECRET:', HMAC_SECRET ? 'CONFIGURADO' : 'NÃO CONFIGURADO');

    // Validar configurações
    if (!IXC_API_BASE_URL || !IXC_API_USERNAME || !IXC_API_PASSWORD) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Credenciais do IXC não configuradas completamente',
          details: {
            base_url: !!IXC_API_BASE_URL,
            username: !!IXC_API_USERNAME,
            password: !!IXC_API_PASSWORD,
            hmac: !!HMAC_SECRET
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Teste simples: buscar um cliente inexistente (apenas para testar conectividade)
    const testUrl = `${IXC_API_BASE_URL}/webservice/v1/cliente?qtype=cliente.id&oper=<&page=1&rp=1`;
    
    console.log('🌐 Testando URL:', testUrl);

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${IXC_API_USERNAME}:${IXC_API_PASSWORD}`),
        'Content-Type': 'application/json',
        'ixcsoft': 'listar'
      }
    });

    const responseText = await response.text();
    console.log('📥 Resposta IXC:', response.status, responseText.substring(0, 200));

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    if (response.ok) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: '✅ Conexão com IXC estabelecida com sucesso!',
          details: {
            status: response.status,
            base_url_configured: true,
            credentials_valid: true,
            hmac_configured: !!HMAC_SECRET,
            response_sample: typeof responseData === 'string' ? responseData.substring(0, 100) : responseData
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: '❌ Erro na conexão com IXC',
          details: {
            status: response.status,
            error: responseData,
            base_url: IXC_API_BASE_URL
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ Erro no teste de conexão:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Erro ao testar conexão com IXC',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
