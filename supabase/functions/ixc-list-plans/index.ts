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
    }

    interface IXCApiResponse {
      registros?: IXCPlanResponse[] | Record<string, IXCPlanResponse>;
      total?: number;
      message?: string;
    }

    // Buscar TODOS os planos do IXC com paginação
    // ESTRATÉGIA: Buscar páginas até encontrar uma vazia (ignorar "total" reportado pelo IXC)
    let allPlans: IXCPlanResponse[] = [];
    let currentPage = 1;
    let hasMorePages = true;
    const maxPages = 20; // Segurança: limitar a 20 páginas (2000 planos)

    while (hasMorePages && currentPage <= maxPages) {
      const body = new URLSearchParams({
        page: String(currentPage),
        rp: '100',
        sortname: 'radgrupos.grupo',
        sortorder: 'asc',
      });

      console.log(`🔍 Buscando página ${currentPage} do IXC...`);
      console.log(`📊 Parâmetros da busca:`, {
        page: currentPage,
        rp: 100,
        sortname: 'radgrupos.grupo',
        sortorder: 'asc'
      });

      const response = await fetch(`${baseUrl}/radgrupos`, {
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
        console.error('❌ Resposta não-JSON do IXC:', text.slice(0, 200));
        throw new Error('Resposta inválida do IXC');
      }

      if (!response.ok) {
        console.error(`❌ IXC HTTP ${response.status}:`, text.slice(0, 200));
        throw new Error(data?.message || `HTTP ${response.status}`);
      }

      // Extrair registros da página atual
      const pageRegistros = Array.isArray(data?.registros)
        ? data.registros
        : (data?.registros ? Object.values(data.registros) : []);

      const total = Number(data?.total || 0);
      console.log(`📊 Página ${currentPage}: ${pageRegistros.length} planos retornados (Total reportado pelo IXC: ${total})`);

      // Se não há planos nesta página, paramos
      if (pageRegistros.length === 0) {
        console.log(`✋ Página ${currentPage} vazia - parando a busca`);
        hasMorePages = false;
        break;
      }

      // Log dos nomes dos planos na página atual para debug
      const planNames = pageRegistros.map(p => p.grupo || p.nome).filter(Boolean);
      console.log(`📋 Planos na página ${currentPage}:`, planNames.slice(0, 5).join(', ') + (planNames.length > 5 ? ` ... (${planNames.length} total)` : ''));
      
      allPlans = allPlans.concat(pageRegistros);
      console.log(`✅ Total acumulado: ${allPlans.length} planos`);

      currentPage++;
    }

    if (currentPage > maxPages) {
      console.log(`⚠️ Limite de ${maxPages} páginas atingido - pode haver mais planos`);
    }

    console.log(`✅ Total de ${allPlans.length} planos encontrados`);
    
    // Log dos planos com "MASTER" no nome
    const masterPlans = allPlans.filter(p => 
      (p.grupo?.toUpperCase().includes('MASTER') || p.nome?.toUpperCase().includes('MASTER'))
    );
    if (masterPlans.length > 0) {
      console.log(`🎯 Planos MASTER encontrados: ${masterPlans.length}`, 
        masterPlans.map(p => ({ id: p.id, name: p.grupo || p.nome }))
      );
    } else {
      console.log(`⚠️ Nenhum plano com "MASTER" no nome foi encontrado`);
    }

    // Formatar planos para resposta
    const formattedPlans = allPlans.map((plan) => ({
      id: String(plan.id || ''),
      name: plan.grupo || plan.nome || `Plano ${plan.id}`,
      download: plan.download || '0',
      upload: plan.upload || '0',
      price: Number(plan.valor_produto || plan.valor || 0),
      type: plan.tipo || 'I',
    }));

    console.log(`📤 Retornando ${formattedPlans.length} planos formatados`);

    return {
      success: true,
      total: formattedPlans.length,
      plans: formattedPlans,
    };
  }
));
