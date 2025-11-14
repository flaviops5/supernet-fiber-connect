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
    let allPlans: IXCPlanResponse[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const body = new URLSearchParams({
        page: String(currentPage),
        rp: '100',
        sortname: 'radgrupos.grupo',
        sortorder: 'asc',
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

      if (pageRegistros.length > 0) {
        allPlans = allPlans.concat(pageRegistros);
        console.log(`📄 Página ${currentPage}: ${pageRegistros.length} planos (Total: ${allPlans.length})`);
      }

      // Calcular total de páginas
      const total = Number(data?.total || 0);
      const rp = 100;
      totalPages = Math.ceil(total / rp);

      currentPage++;
    } while (currentPage <= totalPages);

    console.log(`✅ Total de ${allPlans.length} planos encontrados`);

    // Formatar planos para resposta
    const formattedPlans = allPlans.map((plan) => ({
      id: plan.id,
      name: plan.grupo || plan.nome || `Plano ${plan.id}`,
      download: plan.download || '0',
      upload: plan.upload || '0',
      price: Number(plan.valor_produto || plan.valor || 0),
      type: plan.tipo || 'I',
    }));

    return {
      success: true,
      total: formattedPlans.length,
      plans: formattedPlans,
    };
  }
));
