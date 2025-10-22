import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createPublicHandler } from "../_shared/base-handler.ts";

Deno.serve(createPublicHandler(
  'test-ixc-connection',
  async (req, { supabase }) => {
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
      throw new Error('Credenciais do IXC não configuradas completamente');
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
      
      return {
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
      };
    }

    // Tentar parsear JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (jsonError) {
      return {
        success: false,
        message: '❌ Resposta inválida do IXC (não é JSON nem HTML válido)',
        details: {
          status: testResponse.status,
          response_preview: responseText.substring(0, 500),
          parse_error: jsonError instanceof Error ? jsonError.message : 'Erro ao parsear JSON'
        }
      };
    }

    // Sucesso!
    return {
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
    };
  }
));
