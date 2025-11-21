import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

// FUNÇÃO TEMPORÁRIA DE TESTE: Testar endpoint vd_contratos
Deno.serve(createAuthenticatedHandler(
  'ixc-test-vd-contratos',
  async (req, { supabase, user }) => {
    console.log('🧪 Testando endpoint vd_contratos...');

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

    interface VdContratosResponse {
      id?: string | number;
      nome?: string;
      valor?: string | number;
      download?: string;
      upload?: string;
      ativo?: string;
      tipo?: string;
    }

    interface IXCApiResponse {
      registros?: VdContratosResponse[] | Record<string, VdContratosResponse>;
      total?: number;
      message?: string;
      type?: string;
    }

    // Buscar TODAS as páginas do endpoint vd_contratos
    let allPlans: VdContratosResponse[] = [];
    let currentPage = 1;
    let hasMorePages = true;
    const maxPages = 20;
    const pageSize = 100;

    console.log('\n🚀 Iniciando busca paginada em vd_contratos...\n');

    while (hasMorePages && currentPage <= maxPages) {
      const body = new URLSearchParams({
        page: String(currentPage),
        rp: String(pageSize),
        sortname: 'vd_contratos.nome',
        sortorder: 'asc',
      });

      console.log(`\n📄 ========== PÁGINA ${currentPage} ==========`);

      const response = await fetch(`${baseUrl}/vd_contratos`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'ixcsoft': 'listar',
        },
        body,
      });

      const text = await response.text();
      let data: IXCApiResponse;
      
      try {
        data = JSON.parse(text) as IXCApiResponse;
      } catch {
        console.error(`❌ Resposta não-JSON:`, text.slice(0, 300));
        break;
      }

      if (!response.ok) {
        console.error(`❌ HTTP ${response.status}:`, text.slice(0, 300));
        break;
      }

      // Normalizar registros (pode ser array ou objeto)
      const pageRegistros = Array.isArray(data?.registros)
        ? data.registros
        : (data?.registros ? Object.values(data.registros) : []);

      const total = Number(data?.total || 0);
      
      console.log(`📊 RESULTADO DA PÁGINA ${currentPage}:`);
      console.log(`   - Registros nesta página: ${pageRegistros.length}`);
      console.log(`   - Total reportado pela API: ${total}`);
      console.log(`   - Total acumulado: ${allPlans.length + pageRegistros.length}`);
      console.log(`   - Type: ${data?.type || 'N/A'}`);

      if (pageRegistros.length === 0) {
        console.log(`✋ Página ${currentPage} vazia - Parando`);
        hasMorePages = false;
        break;
      }

      // Mostrar amostra dos planos
      if (pageRegistros.length > 0) {
        console.log(`\n📋 Amostra dos primeiros 3 planos desta página:`);
        pageRegistros.slice(0, 3).forEach((plan, idx) => {
          console.log(`   ${idx + 1}. [ID: ${plan.id}] ${plan.nome || 'Sem nome'}`);
          console.log(`      Download: ${plan.download || 'N/A'}`);
          console.log(`      Upload: ${plan.upload || 'N/A'}`);
          console.log(`      Valor: ${plan.valor || 'N/A'}`);
          console.log(`      Ativo: ${plan.ativo || 'N/A'}`);
        });
      }

      allPlans = allPlans.concat(pageRegistros);
      
      // Se retornou menos que o pageSize, provavelmente é a última página
      if (pageRegistros.length < pageSize) {
        console.log(`\n✅ Última página detectada (retornou ${pageRegistros.length} < ${pageSize})`);
        hasMorePages = false;
      }

      currentPage++;
    }

    console.log('\n\n📊 ========== RESUMO FINAL ==========');
    console.log(`   Total de páginas consultadas: ${currentPage - 1}`);
    console.log(`   Total de planos encontrados: ${allPlans.length}`);
    console.log('=====================================\n');

    // Buscar planos MASTER
    const masterPlans = allPlans.filter(p => 
      p.nome?.toUpperCase().includes('MASTER')
    );

    if (masterPlans.length > 0) {
      console.log(`\n🎯 PLANOS MASTER ENCONTRADOS: ${masterPlans.length}`);
      masterPlans.forEach(p => {
        console.log(`   - [ID: ${p.id}] ${p.nome}`);
      });
    } else {
      console.log(`\n⚠️ Nenhum plano com "MASTER" no nome foi encontrado`);
    }

    // Listar todos os IDs
    console.log(`\n🔢 TODOS OS IDs (primeiros 20):`);
    allPlans.slice(0, 20).forEach((p, idx) => {
      console.log(`   ${idx + 1}. ID: ${p.id} - ${p.nome || 'Sem nome'}`);
    });

    // Formatar resposta
    const formattedPlans = allPlans.map(plan => ({
      id: String(plan.id || ''),
      name: plan.nome || `Plano ${plan.id}`,
      download: plan.download || '0',
      upload: plan.upload || '0',
      price: Number(plan.valor || 0),
      type: plan.tipo || 'I',
      active: plan.ativo === 'S',
      source: 'vd_contratos',
    }));

    console.log(`\n📤 Retornando ${formattedPlans.length} planos de vd_contratos\n`);

    return {
      success: true,
      endpoint: 'vd_contratos',
      total: formattedPlans.length,
      plans: formattedPlans,
      debug: {
        totalPages: currentPage - 1,
        totalPlans: allPlans.length,
        masterPlansCount: masterPlans.length,
        masterPlans: masterPlans.slice(0, 10).map(p => ({
          id: String(p.id),
          name: p.nome || `Plano ${p.id}`,
        })),
        sampleIds: formattedPlans.slice(0, 15).map(p => p.id),
        rawSample: allPlans.slice(0, 3),
      },
    };
  }
));
