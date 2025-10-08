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

    // ✅ Normalizar URL removendo /adm.php
    const cleanBaseUrl = IXC_API_BASE_URL.replace(/\/adm\.php$/, '');

    // Teste 1: Endpoint cliente (com limite de 1 registro)
    const testUrl = `${cleanBaseUrl}/webservice/v1/cliente`;
    console.log('🌐 Testando endpoint:', testUrl);

    const testResponse = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${IXC_API_USERNAME}:${IXC_API_PASSWORD}`),
        'Content-Type': 'application/x-www-form-urlencoded',
        'ixcsoft': 'listar'
      },
      body: new URLSearchParams({ page: '1', rp: '1' })
    });

    const responseText = await testResponse.text();
    const isHtml = responseText.trim().startsWith('<');
    
    console.log('📥 Status:', testResponse.status);
    console.log('📝 Content-Type:', testResponse.headers.get('content-type'));
    console.log('📄 É HTML?', isHtml);
    console.log('📄 Preview:', responseText.substring(0, 300));

    // Se retornou HTML, é erro de autenticação/configuração
    if (isHtml) {
      const isLoginPage = responseText.includes('login') || responseText.includes('autenticar') || responseText.includes('senha');
      
      return new Response(
        JSON.stringify({ 
          success: false,
          message: isLoginPage 
            ? '❌ IXC retornou página de login - credenciais inválidas ou IP bloqueado'
            : '❌ IXC retornou HTML ao invés de JSON - verifique a URL da API',
          details: {
            status: testResponse.status,
            response_type: 'HTML',
            is_login_page: isLoginPage,
            base_url: IXC_API_BASE_URL,
            endpoint_tested: '/webservice/v1/cliente',
            html_preview: responseText.substring(0, 500),
            possible_causes: [
              'URL base incorreta',
              'Credenciais inválidas (usuário/senha)',
              'IP do servidor não está na whitelist do IXC',
              'Problema de CORS ou segurança no IXC'
            ]
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Tentar parsear JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (jsonError) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: '❌ Resposta inválida do IXC (não é JSON nem HTML válido)',
          details: {
            status: testResponse.status,
            response_preview: responseText.substring(0, 500),
            parse_error: jsonError instanceof Error ? jsonError.message : 'Erro ao parsear JSON'
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sucesso!
    return new Response(
      JSON.stringify({ 
        success: true,
        message: '✅ Conexão com IXC estabelecida com sucesso!',
        details: {
          status: testResponse.status,
          response_type: 'JSON',
          base_url_configured: true,
          credentials_valid: true,
          hmac_configured: !!HMAC_SECRET,
          base_url: IXC_API_BASE_URL,
          endpoint_tested: '/webservice/v1/cliente',
          response_data: responseData
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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
