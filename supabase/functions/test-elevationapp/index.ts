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
    const { 
      serverIp = "192.168.72.20",
      endpoint = "/api/health",
      username,
      password 
    } = await req.json();

    console.log(`🔍 Testando Elevationapp em ${serverIp}${endpoint}`);

    const results: any = {
      server: serverIp,
      tests: [],
      summary: {
        total: 0,
        successful: 0,
        failed: 0,
      }
    };

    // Teste 1: Verificar se o servidor está acessível (porta 80)
    const testHttp = async (port: number) => {
      const test = {
        name: `HTTP Port ${port}`,
        success: false,
        responseTime: 0,
        message: '',
      };

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const startTime = Date.now();
        
        const response = await fetch(`http://${serverIp}:${port}${endpoint}`, {
          method: 'GET',
          signal: controller.signal,
          headers: username && password ? {
            'Authorization': 'Basic ' + btoa(`${username}:${password}`)
          } : {}
        });
        
        test.responseTime = Date.now() - startTime;
        clearTimeout(timeoutId);

        test.success = response.ok;
        test.message = `Status: ${response.status} - ${response.statusText} (${test.responseTime}ms)`;
        
        if (response.ok) {
          const data = await response.text();
          console.log(`✅ Resposta da porta ${port}:`, data.substring(0, 200));
        }
      } catch (error) {
        test.message = error.name === 'AbortError' 
          ? 'Timeout - servidor não respondeu em 5s'
          : `Erro: ${error.message}`;
        console.log(`❌ Erro na porta ${port}:`, test.message);
      }

      results.tests.push(test);
      results.summary.total++;
      if (test.success) results.summary.successful++;
      else results.summary.failed++;
    };

    // Teste 2: Verificar HTTPS (porta 443)
    const testHttps = async () => {
      const test = {
        name: 'HTTPS Port 443',
        success: false,
        responseTime: 0,
        message: '',
      };

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const startTime = Date.now();
        
        const response = await fetch(`https://${serverIp}${endpoint}`, {
          method: 'GET',
          signal: controller.signal,
          headers: username && password ? {
            'Authorization': 'Basic ' + btoa(`${username}:${password}`)
          } : {}
        });
        
        test.responseTime = Date.now() - startTime;
        clearTimeout(timeoutId);

        test.success = response.ok;
        test.message = `Status: ${response.status} - ${response.statusText} (${test.responseTime}ms)`;
      } catch (error) {
        test.message = error.name === 'AbortError' 
          ? 'Timeout - servidor não respondeu em 5s'
          : `Erro: ${error.message}`;
      }

      results.tests.push(test);
      results.summary.total++;
      if (test.success) results.summary.successful++;
      else results.summary.failed++;
    };

    // Executar testes em paralelo
    await Promise.all([
      testHttp(80),
      testHttp(8080),
      testHttp(3000),
      testHttps(),
    ]);

    console.log(`📊 Resumo: ${results.summary.successful}/${results.summary.total} testes bem-sucedidos`);

    return new Response(
      JSON.stringify(results),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('❌ Erro na função:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        message: 'Erro ao testar conectividade com Elevationapp'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
