import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

// P0 FIX: Convertido para createAuthenticatedHandler
// Lista de planos contém dados comerciais estratégicos
Deno.serve(createAuthenticatedHandler(
  'ixc-list-plans',
  async (req, { supabase, user }) => {
    console.log('📋 Listando todos os planos do IXC...');

    // Credenciais IXC
    const ixcUsername = Deno.env.get('IXC_API_USERNAME');
    const ixcPassword = Deno.env.get('IXC_API_PASSWORD');
    const IXC_API_BASE = Deno.env.get('IXC_API_BASE_URL');

    if (!ixcUsername || !ixcPassword) {
      throw new Error('Credenciais IXC não configuradas');
    }

    if (!IXC_API_BASE) {
      throw new Error('IXC_API_BASE_URL não configurado');
    }

    // Normalizar URL removendo /adm.php
    const cleanBaseUrl = IXC_API_BASE.replace(/\/adm\.php$/, '').replace(/^https?:\/\//, '');
    const auth = btoa(`${ixcUsername}:${ixcPassword}`);
    const baseUrl = `https://${cleanBaseUrl}/webservice/v1`;

    interface IXCPlanResponse {
      id?: string | number;
      grupo?: string;
      nome?: string;
      download?: string;
      upload?: string;
      valor_produto?: string | number;
      valor?: string | number;
      tipo?: string;
      descricao?: string;
    }

    interface IXCApiResponse {
      registros?: IXCPlanResponse[] | Record<string, IXCPlanResponse>;
      total?: number;
      message?: string;
    }

    // FUNÇÃO AUXILIAR: Buscar planos de um endpoint específico com paginação
    async function fetchPlansFromEndpoint(endpoint: string, endpointName: string): Promise<(IXCPlanResponse & { __source: string })[]> {
      console.log(`\n🔍 ========== BUSCANDO DE ${endpointName.toUpperCase()} ==========`);
      
      let allPlansFromEndpoint: (IXCPlanResponse & { __source: string })[] = [];
      let currentPage = 1;
      let hasMorePages = true;
      const minPages = 5;
      const maxPages = 20;

      while (hasMorePages && currentPage <= maxPages) {
        const body = new URLSearchParams({
          page: String(currentPage),
          rp: '100',
          sortname: endpoint === 'radgrupos' ? 'radgrupos.grupo' : (endpoint === 'produto' ? 'produto.descricao' : 'su_oss_plano.nome'),
          sortorder: 'asc',
        });

        console.log(`\n🔍 ========== BUSCANDO PÁGINA ${currentPage} de ${endpointName} ==========`);

        const response = await fetch(`${baseUrl}/${endpoint}`, {
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
          console.error(`❌ Resposta não-JSON de ${endpointName}:`, text.slice(0, 200));
          break;
        }

        if (!response.ok) {
          console.error(`❌ ${endpointName} HTTP ${response.status}:`, text.slice(0, 200));
          break;
        }

        const pageRegistros = Array.isArray(data?.registros)
          ? data.registros
          : (data?.registros ? Object.values(data.registros) : []);

        const total = Number(data?.total || 0);
        console.log(`📊 RESULTADO DA PÁGINA ${currentPage} (${endpointName}):`);
        console.log(`   - Registros nesta página: ${pageRegistros.length}`);
        console.log(`   - Total reportado: ${total}`);
        console.log(`   - Total acumulado: ${allPlansFromEndpoint.length + pageRegistros.length}`);

        if (pageRegistros.length === 0) {
          if (currentPage > minPages) {
            console.log(`✋ Página ${currentPage} vazia em ${endpointName} - Parando`);
            hasMorePages = false;
            break;
          } else {
            console.log(`⚠️ Página ${currentPage} vazia mas continuando até página ${minPages}`);
          }
        }

        if (pageRegistros.length > 0) {
          const planNames = pageRegistros.map(p => p.grupo || p.nome || p.descricao).filter(Boolean);
          console.log(`📋 Amostra (${endpointName}, pág ${currentPage}):`, planNames.slice(0, 3).join(', '));
          
          // Adicionar source ao plano
          const plansWithSource = pageRegistros.map(p => ({ ...p, __source: endpoint }));
          allPlansFromEndpoint = allPlansFromEndpoint.concat(plansWithSource);
          console.log(`✅ Total acumulado de ${endpointName}: ${allPlansFromEndpoint.length}\n`);
        }

        currentPage++;
      }

      console.log(`✅ Total de ${allPlansFromEndpoint.length} registros encontrados em ${endpointName}\n`);
      return allPlansFromEndpoint;
    }

    // Buscar TODOS os planos de MÚLTIPLOS endpoints
    console.log('🚀 Iniciando busca em múltiplos endpoints do IXC...');
    
    const [radgruposPlans, produtoPlans, ossPlanoPlans] = await Promise.all([
      fetchPlansFromEndpoint('radgrupos', 'radgrupos'),
      fetchPlansFromEndpoint('produto', 'produto'),
      fetchPlansFromEndpoint('su_oss_plano', 'su_oss_plano'),
    ]);

    // Combinar todos os planos usando chave composta (endpoint:id) para evitar colisões
    const allPlansMap = new Map<string, IXCPlanResponse & { __source: string }>();
    
    [...radgruposPlans, ...produtoPlans, ...ossPlanoPlans].forEach(plan => {
      const endpoint = plan.__source;
      const planId = String(plan.id || '');
      const uniqueId = `${endpoint}:${planId}`;
      
      if (planId && !allPlansMap.has(uniqueId)) {
        allPlansMap.set(uniqueId, plan);
      }
    });

    const allPlans = Array.from(allPlansMap.values());
    
    console.log('\n📊 ========== RESUMO DA BUSCA ==========');
    console.log(`   - radgrupos: ${radgruposPlans.length} registros`);
    console.log(`   - produto: ${produtoPlans.length} registros`);
    console.log(`   - su_oss_plano: ${ossPlanoPlans.length} registros`);
    console.log(`   - TOTAL (sem duplicatas): ${allPlans.length} planos`);
    console.log('========================================\n');
    
    // Log dos 10 primeiros planos para análise
    if (allPlans.length > 0) {
      console.log('📋 === 10 PRIMEIROS PLANOS (DE TODOS OS ENDPOINTS) ===');
      allPlans.slice(0, 10).forEach((plan, index) => {
        console.log(`${index + 1}. [ID: ${plan.id}] ${plan.grupo || plan.nome || plan.descricao || 'Sem nome'}`);
      });
      console.log('================================');
    }
    
    // Log dos planos com "MASTER" no nome
    const masterPlans = allPlans.filter(p => 
      (p.grupo?.toUpperCase().includes('MASTER') || 
       p.nome?.toUpperCase().includes('MASTER') ||
       p.descricao?.toUpperCase().includes('MASTER'))
    );
    if (masterPlans.length > 0) {
      console.log(`\n🎯 PLANOS MASTER ENCONTRADOS: ${masterPlans.length}`);
      masterPlans.forEach(p => {
        console.log(`   - [ID: ${p.id}] ${p.grupo || p.nome || p.descricao}`);
      });
    } else {
      console.log(`\n⚠️ Nenhum plano com "MASTER" no nome foi encontrado`);
    }

    // Formatar planos para resposta com ID composto (endpoint:id)
    console.log('\n🔧 FORMATANDO PLANOS COM ID COMPOSTO...');
    const formattedPlans = allPlans.map((plan) => {
      const endpoint = plan.__source;
      const planId = String(plan.id || '');
      const uniqueId = `${endpoint}:${planId}`;
      
      return {
        id: uniqueId,
        originalId: planId,
        source: endpoint,
        name: plan.grupo || plan.nome || plan.descricao || `Plano ${planId}`,
        download: plan.download || '0',
        upload: plan.upload || '0',
        price: Number(plan.valor_produto || plan.valor || 0),
        type: plan.tipo || 'I',
      };
    });
    
    // Log de verificação dos IDs
    if (formattedPlans.length > 0) {
      console.log('✅ Primeiros 3 IDs compostos gerados:');
      formattedPlans.slice(0, 3).forEach(p => {
        console.log(`   - ${p.id} (source: ${p.source}, originalId: ${p.originalId})`);
      });
    }

    console.log(`\n📤 Retornando ${formattedPlans.length} planos formatados\n`);

    return {
      success: true,
      total: formattedPlans.length,
      plans: formattedPlans,
      debug: {
        radgruposCount: radgruposPlans.length,
        produtoCount: produtoPlans.length,
        ossPlanoCount: ossPlanoPlans.length,
        uniqueTotal: allPlans.length,
        sampleIds: formattedPlans.slice(0, 10).map((p) => p.id),
        masterPlans: masterPlans.slice(0, 10).map((p) => ({
          id: `${p.__source}:${p.id}`,
          name: p.grupo || p.nome || p.descricao || `Plano ${p.id}`,
        })),
      },
    };
