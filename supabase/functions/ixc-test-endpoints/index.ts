import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

interface EndpointTestResult {
  endpoint: string;
  total_records: number;
  sample_records: any[];
  error?: string;
  duration_ms: number;
}

Deno.serve(createAuthenticatedHandler(
  'ixc-test-endpoints',
  async (req, { supabase, user }) => {
    console.log('🔍 Testando múltiplos endpoints do IXC...');

    // Credenciais IXC
    const ixcUsername = Deno.env.get('IXC_API_USERNAME');
    const ixcPassword = Deno.env.get('IXC_API_PASSWORD');
    const IXC_API_BASE = Deno.env.get('IXC_API_BASE_URL');

    if (!ixcUsername || !ixcPassword || !IXC_API_BASE) {
      throw new Error('Credenciais IXC não configuradas');
    }

    // Normalizar URL
    const cleanBaseUrl = IXC_API_BASE.replace(/\/adm\.php$/, '').replace(/^https?:\/\//, '');
    const auth = btoa(`${ixcUsername}:${ixcPassword}`);
    const baseUrl = `https://${cleanBaseUrl}/webservice/v1`;

    const endpoints = [
      'radgrupos',
      'produto',
      'su_oss_plano',
    ];

    const results: EndpointTestResult[] = [];

    for (const endpoint of endpoints) {
      const startTime = Date.now();
      console.log(`\n📊 Testando endpoint: ${endpoint}`);
      
      try {
        // Buscar primeira página para ver quantos registros existem
        const body = new URLSearchParams({
          page: '1',
          rp: '10', // Apenas 10 para ver a estrutura
          sortorder: 'asc',
        });

        const response = await fetch(`${baseUrl}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'ixcsoft': 'listar',
          },
          body,
        });

        const duration = Date.now() - startTime;
        const text = await response.text();
        
        if (!response.ok) {
          console.error(`❌ ${endpoint}: HTTP ${response.status}`);
          results.push({
            endpoint,
            total_records: 0,
            sample_records: [],
            error: `HTTP ${response.status}`,
            duration_ms: duration,
          });
          continue;
        }

        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          console.error(`❌ ${endpoint}: Resposta não-JSON`);
          results.push({
            endpoint,
            total_records: 0,
            sample_records: [],
            error: 'Resposta inválida (não-JSON)',
            duration_ms: duration,
          });
          continue;
        }

        // Extrair registros
        const registros = Array.isArray(data?.registros)
          ? data.registros
          : (data?.registros ? Object.values(data.registros) : []);

        const total = Number(data?.total || 0);

        console.log(`✅ ${endpoint}: ${total} registros (${registros.length} na amostra)`);
        
        // Logar campos disponíveis do primeiro registro
        if (registros.length > 0) {
          console.log(`📋 Campos disponíveis em ${endpoint}:`, Object.keys(registros[0]));
        }

        results.push({
          endpoint,
          total_records: total,
          sample_records: registros.slice(0, 3), // Primeiros 3 registros como amostra
          duration_ms: duration,
        });

      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ Erro ao testar ${endpoint}:`, error.message);
        results.push({
          endpoint,
          total_records: 0,
          sample_records: [],
          error: error.message,
          duration_ms: duration,
        });
      }
    }

    // Resumo final
    console.log('\n📊 RESUMO DOS ENDPOINTS:');
    results.forEach(result => {
      if (result.error) {
        console.log(`❌ ${result.endpoint}: ERRO - ${result.error}`);
      } else {
        console.log(`✅ ${result.endpoint}: ${result.total_records} registros (${result.duration_ms}ms)`);
      }
    });

    return {
      success: true,
      tested_at: new Date().toISOString(),
      results,
      summary: {
        total_endpoints_tested: endpoints.length,
        successful_endpoints: results.filter(r => !r.error).length,
        failed_endpoints: results.filter(r => r.error).length,
        total_records_found: results.reduce((sum, r) => sum + r.total_records, 0),
      },
    };
  }
));
