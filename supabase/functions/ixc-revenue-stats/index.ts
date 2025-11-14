import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

interface IXCContract {
  status_internet?: string;
  valor?: string | number;
  plano?: string;
  [key: string]: unknown;
}

interface IXCContractsResponse {
  registros?: IXCContract[];
  [key: string]: unknown;
}

// P0 FIX: Convertido para createAuthenticatedHandler
// Estatísticas de receita são dados financeiros críticos
Deno.serve(createAuthenticatedHandler(
  'ixc-revenue-stats',
  async (req, { supabase, user }) => {
    const IXC_USERNAME = Deno.env.get('IXC_API_USERNAME');
    const IXC_PASSWORD = Deno.env.get('IXC_API_PASSWORD');
    const IXC_API_BASE = Deno.env.get('IXC_API_BASE_URL');
    
    if (!IXC_USERNAME || !IXC_PASSWORD) {
      throw new Error('Credenciais IXC não configuradas');
    }

    if (!IXC_API_BASE) {
      throw new Error('IXC_API_BASE_URL não configurado');
    }

    // ✅ Normalizar URL removendo /adm.php
    const cleanBaseUrl = IXC_API_BASE.replace(/\/adm\.php$/, '');

    const credentials = btoa(`${IXC_USERNAME}:${IXC_PASSWORD}`);
    
    console.log('Buscando contratos e receita no IXC...');

    let page = 1;
    let hasMorePages = true;
    const contractsPerPage = 1000;
    
    const revenueStats = {
      totalContracts: 0,
      activeContracts: 0,
      inactiveContracts: 0,
      blockedContracts: 0,
      mrr: 0, // Monthly Recurring Revenue
      arr: 0, // Annual Recurring Revenue
      averageTicket: 0,
      contractsByStatus: {} as Record<string, number>,
      revenueByPlan: {} as Record<string, { count: number; revenue: number }>,
    };

    while (hasMorePages) {
      const response = await fetch(
        `${cleanBaseUrl}/webservice/v1/cliente_contrato?page=${page}&rp=${contractsPerPage}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na API IXC:', response.status, errorText);
        throw new Error(`Erro ao buscar contratos no IXC: ${response.status}`);
      }

      const data: IXCContractsResponse = await response.json();
      
      if (!data.registros || data.registros.length === 0) {
        hasMorePages = false;
        break;
      }

      revenueStats.totalContracts += data.registros.length;

      // Processar cada contrato
      data.registros?.forEach((contract: IXCContract) => {
        const status = contract.status_internet || 'unknown';
        const valor = parseFloat(contract.valor) || 0;
        const plano = contract.plano || 'Sem plano';

        // Contar por status
        revenueStats.contractsByStatus[status] = 
          (revenueStats.contractsByStatus[status] || 0) + 1;

        // Classificar contratos
        if (['A', 'AA', 'AT', 'AC'].includes(status)) {
          revenueStats.activeContracts++;
          revenueStats.mrr += valor;

          // Agrupar receita por plano
          if (!revenueStats.revenueByPlan[plano]) {
            revenueStats.revenueByPlan[plano] = { count: 0, revenue: 0 };
          }
          revenueStats.revenueByPlan[plano].count++;
          revenueStats.revenueByPlan[plano].revenue += valor;
        } else if (['CM', 'CA', 'CB', 'FA'].includes(status)) {
          revenueStats.blockedContracts++;
        } else if (['D', 'C', 'I'].includes(status)) {
          revenueStats.inactiveContracts++;
        }
      });

      console.log(`Página ${page}: ${data.registros.length} contratos processados`);
      
      if (data.registros.length < contractsPerPage) {
        hasMorePages = false;
      } else {
        page++;
      }
    }

    // Calcular métricas finais
    revenueStats.arr = revenueStats.mrr * 12;
    revenueStats.averageTicket = revenueStats.activeContracts > 0 
      ? revenueStats.mrr / revenueStats.activeContracts 
      : 0;

    // Ordenar planos por receita
    const sortedPlans = Object.entries(revenueStats.revenueByPlan)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, { count: number; revenue: number }>);

    revenueStats.revenueByPlan = sortedPlans;

    console.log(`Receita calculada: MRR R$ ${revenueStats.mrr.toFixed(2)}`);

    return {
      success: true,
      ...revenueStats,
      pagesProcessed: page
    };
  }
));
