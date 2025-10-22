import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createPublicHandler } from "../_shared/base-handler.ts";

Deno.serve(createPublicHandler(
  'ixc-discover-gpon-endpoints',
  async (req, { supabase }) => {
    const ixcUsername = Deno.env.get('IXC_API_USERNAME');
    const ixcPassword = Deno.env.get('IXC_API_PASSWORD');
    const ixcBaseUrl = Deno.env.get('IXC_API_BASE_URL');

    if (!ixcUsername || !ixcPassword || !ixcBaseUrl) {
      throw new Error('Credenciais IXC não configuradas');
    }

    const basicAuth = btoa(`${ixcUsername}:${ixcPassword}`);
    const normalizedUrl = ixcBaseUrl.replace(/^https?:\/\//, '').split('/')[0];

    console.log('🔍 Iniciando descoberta de endpoints GPON...');

    // Lista de endpoints potenciais relacionados a GPON
    const potentialEndpoints = [
      // Equipamentos
      // 'cliente_equipamento', // Removido: endpoint não existe no IXC
      'equipamento_fibra',
      'pon_onu',
      'equipamento',
      
      // Monitoramento
      'pon_olt',
      'pon_sinal',
      'cliente_conexao_historico',
      'conexao_historico',
      
      // Infraestrutura
      'fibra_cto',
      'fibra_splitter',
      'fibra_cabo',
      'fibra_rede',
      'cto',
      'splitter',
      
      // Diagnóstico
      'pon_diagnostico',
      'pon_rx_power',
      'pon_tx_power',
      'diagnostico_rede',
      
      // Outros
      'pop',
      'equipamento_rede',
      'infra_rede',
      'topologia_rede'
    ];

    const results = [];

    for (const endpoint of potentialEndpoints) {
      try {
        console.log(`🔎 Testando endpoint: ${endpoint}`);
        
        const response = await fetch(`https://${normalizedUrl}/webservice/v1/${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/json',
            'ixcsoft': 'listar'
          },
          body: JSON.stringify({
            qtype: `${endpoint}.id`,
            query: '1',
            oper: '>=',
            page: '1',
            rp: '1'
          })
        });

        const status = response.status;
        
        if (status === 200) {
          try {
            const data = await response.json();
            
            // Verificar se é uma resposta de erro do IXC
            if (data?.type === 'error') {
              results.push({
                endpoint,
                status: 'IXC_ERROR',
                statusCode: 200,
                recordCount: 0,
                errorMessage: data.message,
                message: `⚠️ HTTP 200 mas IXC retorna erro: "${data.message}"`
              });
              console.log(`⚠️ ${endpoint}: IXC ERROR - ${data.message}`);
            } else if (data?.registros !== undefined) {
              // Resposta válida com dados
              results.push({
                endpoint,
                status: 'EXISTS',
                statusCode: 200,
                recordCount: data.registros.length,
                message: `✅ Endpoint disponível (${data.registros.length} registros)`
              });
              console.log(`✅ ${endpoint}: EXISTE (${data.registros.length} registros)`);
            } else {
              // Resposta 200 mas formato inesperado
              results.push({
                endpoint,
                status: 'UNKNOWN_FORMAT',
                statusCode: 200,
                recordCount: 0,
                message: '⚠️ Resposta em formato inesperado',
                rawResponse: JSON.stringify(data).substring(0, 200)
              });
              console.log(`⚠️ ${endpoint}: FORMATO INESPERADO`);
            }
          } catch (parseError) {
            results.push({
              endpoint,
              status: 'PARSE_ERROR',
              statusCode: 200,
              message: `❌ Erro ao processar resposta: ${parseError.message}`
            });
            console.log(`❌ ${endpoint}: ERRO NO PARSE`);
          }
        } else if (status === 404) {
          results.push({
            endpoint,
            status: 'NOT_FOUND',
            statusCode: 404,
            message: '❌ Endpoint não existe'
          });
          console.log(`❌ ${endpoint}: NÃO EXISTE`);
        } else {
          results.push({
            endpoint,
            status: 'ERROR',
            statusCode: status,
            message: `⚠️ Erro: ${status}`
          });
          console.log(`⚠️ ${endpoint}: ERRO ${status}`);
        }
      } catch (error) {
        results.push({
          endpoint,
          status: 'ERROR',
          statusCode: 0,
          message: `❌ Erro: ${error.message}`
        });
        console.error(`❌ ${endpoint}: ${error.message}`);
      }

      // Pequeno delay para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const existingEndpoints = results.filter(r => r.status === 'EXISTS');
    const notFoundEndpoints = results.filter(r => r.status === 'NOT_FOUND');
    const ixcErrorEndpoints = results.filter(r => r.status === 'IXC_ERROR');
    const errorEndpoints = results.filter(r => r.status === 'ERROR');
    const unknownEndpoints = results.filter(r => r.status === 'UNKNOWN_FORMAT' || r.status === 'PARSE_ERROR');

    console.log('✅ ${existingEndpoints.length} endpoints funcionais');
    console.log('❌ Endpoints não encontrados: ${notFoundEndpoints.length}');
    console.log('⚠️ Endpoints com erro IXC: ${ixcErrorEndpoints.length}');
    console.log('⚠️ Endpoints com outros erros: ${errorEndpoints.length + unknownEndpoints.length}');

    return {
      success: true,
      summary: {
        total: potentialEndpoints.length,
        functional: existingEndpoints.length,
        notFound: notFoundEndpoints.length,
        ixcErrors: ixcErrorEndpoints.length,
        otherErrors: errorEndpoints.length + unknownEndpoints.length
      },
      functionalEndpoints: existingEndpoints.map(e => ({
        endpoint: e.endpoint,
        recordCount: e.recordCount
      })),
      ixcErrorEndpoints: ixcErrorEndpoints.map(e => ({
        endpoint: e.endpoint,
        errorMessage: e.errorMessage,
        details: e.message
      })),
      allResults: results
    };
  }
));
