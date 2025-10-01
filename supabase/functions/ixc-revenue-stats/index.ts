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
    const IXC_USERNAME = Deno.env.get('IXC_API_USERNAME');
    const IXC_PASSWORD = Deno.env.get('IXC_API_PASSWORD');
    
    if (!IXC_USERNAME || !IXC_PASSWORD) {
      throw new Error('Credenciais IXC não configuradas');
    }

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
        `https://supernetfibra.ixcsoft.com.br/webservice/v1/cliente_contrato?page=${page}&rp=${contractsPerPage}`,
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

      const data = await response.json();
      
      if (!data.registros || data.registros.length === 0) {
        hasMorePages = false;
        break;
      }

      revenueStats.totalContracts += data.registros.length;

      // Processar cada contrato
      data.registros.forEach((contract: any) => {
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

    return new Response(
      JSON.stringify({
        success: true,
        ...revenueStats,
        pagesProcessed: page
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Erro ao calcular receita IXC:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
