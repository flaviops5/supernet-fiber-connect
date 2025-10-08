import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Iniciando teste completo de todas as funções IXC...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = [];

    // Função auxiliar para testar cada função
    const testFunction = async (functionName: string, body: any = {}) => {
      const startTime = Date.now();
      try {
        console.log(`\n📡 Testando ${functionName}...`);
        
        const { data, error } = await supabase.functions.invoke(functionName, {
          body
        });
        
        const duration = Date.now() - startTime;
        
        if (error) {
          console.log(`❌ ${functionName}: ${error.message}`);
          return {
            function: functionName,
            success: false,
            error: error.message,
            duration
          };
        }
        
        const isSuccess = data?.success !== false && data?.ok !== false;
        console.log(`${isSuccess ? '✅' : '❌'} ${functionName}: ${isSuccess ? 'OK' : 'FALHOU'} (${duration}ms)`);
        
        return {
          function: functionName,
          success: isSuccess,
          data: data,
          duration
        };
      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.log(`❌ ${functionName}: ${error.message}`);
        return {
          function: functionName,
          success: false,
          error: error.message,
          duration
        };
      }
    };

    // 1. Test ixc-proxy (fundamental - todas dependem dele)
    results.push(await testFunction('ixc-proxy', {
      method: 'POST',
      path: '/webservice/v1/cliente',
      body: { page: '1', rp: '1' }
    }));

    // 2. Test test-ixc-connection
    results.push(await testFunction('test-ixc-connection'));

    // 3. Test ixc-count-clients
    results.push(await testFunction('ixc-count-clients'));

    // 4. Test ixc-integration
    results.push(await testFunction('ixc-integration', {
      qtype: 'cliente.id',
      query: '1',
      oper: '=',
      page: '1',
      rp: '1'
    }));

    // 5. Test ixc-list-contracts
    results.push(await testFunction('ixc-list-contracts', {
      page: 1,
      limit: 1
    }));

    // 6. Test ixc-sync-plans
    results.push(await testFunction('ixc-sync-plans'));

    // 7. Test ixc-pon-status
    results.push(await testFunction('ixc-pon-status'));

    // 8. Test ixc-radio-status
    results.push(await testFunction('ixc-radio-status'));

    // 9. Test ixc-revenue-stats
    results.push(await testFunction('ixc-revenue-stats'));

    // 10. Test ixc-financial-analytics
    results.push(await testFunction('ixc-financial-analytics'));

    // 11. Test ixc-discover-gpon-endpoints
    results.push(await testFunction('ixc-discover-gpon-endpoints'));

    // Análise dos resultados
    const totalTests = results.length;
    const successCount = results.filter(r => r.success).length;
    const failCount = totalTests - successCount;
    const successRate = Math.round((successCount / totalTests) * 100);

    // Agrupar erros similares
    const errorGroups: { [key: string]: string[] } = {};
    results.filter(r => !r.success).forEach(r => {
      const errorKey = r.error || 'Unknown error';
      if (!errorGroups[errorKey]) {
        errorGroups[errorKey] = [];
      }
      errorGroups[errorKey].push(r.function);
    });

    console.log('\n📊 RESUMO:');
    console.log(`   Total: ${totalTests} funções`);
    console.log(`   ✅ Sucesso: ${successCount}`);
    console.log(`   ❌ Falhas: ${failCount}`);
    console.log(`   📈 Taxa de sucesso: ${successRate}%`);

    // Diagnóstico
    let diagnosis = '';
    if (failCount === 0) {
      diagnosis = '✅ Todas as funções IXC estão funcionando corretamente!';
    } else if (failCount === totalTests) {
      diagnosis = '❌ TODAS as funções IXC estão falhando - problema nas credenciais IXC';
    } else if (results[0].success === false) {
      diagnosis = '❌ A função ixc-proxy (base) está falhando - todas as outras dependem dela';
    } else {
      diagnosis = `⚠️ ${failCount} de ${totalTests} funções estão falhando - problema parcial`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: totalTests,
          success: successCount,
          failed: failCount,
          successRate,
          diagnosis
        },
        results,
        errorGroups,
        recommendation: failCount > 0 
          ? 'Verifique as credenciais IXC (IXC_API_BASE_URL, IXC_API_USERNAME, IXC_API_PASSWORD) no Supabase'
          : 'Tudo funcionando! Credenciais IXC estão corretas.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro ao testar funções:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Erro ao executar testes',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
