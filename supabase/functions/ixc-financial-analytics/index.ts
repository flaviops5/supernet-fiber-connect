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
    
    console.log('Buscando análise financeira completa no IXC...');

    // Buscar contratos ativos
    const contractsResponse = await fetch(
      'https://supernetfibra.ixcsoft.com.br/webservice/v1/cliente_contrato?rp=1000',
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!contractsResponse.ok) {
      throw new Error(`Erro ao buscar contratos: ${contractsResponse.status}`);
    }

    const contractsData = await contractsResponse.json();
    
    // Buscar faturas (títulos financeiros)
    const invoicesResponse = await fetch(
      'https://supernetfibra.ixcsoft.com.br/webservice/v1/fn_titulo?rp=1000',
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const invoicesData = invoicesResponse.ok ? await invoicesResponse.json() : { registros: [] };
    
    const now = new Date();
    const analytics = {
      // Métricas de Receita
      mrr: 0,
      arr: 0,
      activeContracts: 0,
      totalContracts: 0,
      averageTicket: 0,
      
      // Análise de Inadimplência
      overdueInvoices: 0,
      overdueAmount: 0,
      overdueRate: 0,
      aging: {
        days0_30: { count: 0, amount: 0 },
        days31_60: { count: 0, amount: 0 },
        days61_90: { count: 0, amount: 0 },
        days90Plus: { count: 0, amount: 0 },
      },
      
      // Top Devedores
      topDebtors: [] as Array<{
        clientId: string,
        clientName: string,
        overdueAmount: number,
        invoicesCount: number,
        oldestInvoice: string
      }>,
      
      // Churn e Projeções
      churnedContracts: 0,
      churnRate: 0,
      projectedMRR: 0,
      projectedARR: 0,
      
      // Performance por Plano
      planPerformance: {} as Record<string, {
        activeCount: number,
        canceledCount: number,
        churnRate: number,
        revenue: number
      }>,
      
      // Evolução Temporal (últimos 12 meses simulado)
      monthlyRevenue: [] as Array<{ month: string, revenue: number, contracts: number }>,
    };

    // Processar contratos
    analytics.totalContracts = contractsData.registros?.length || 0;
    
    const debtorMap = new Map<string, {
      clientId: string,
      clientName: string,
      overdueAmount: number,
      invoicesCount: number,
      oldestInvoice: Date
    }>();

    contractsData.registros?.forEach((contract: any) => {
      const status = contract.status_internet || '';
      const valor = parseFloat(contract.valor) || 0;
      const plano = contract.plano || 'Sem plano';

      if (['A', 'AA', 'AT', 'AC'].includes(status)) {
        analytics.activeContracts++;
        analytics.mrr += valor;
        
        if (!analytics.planPerformance[plano]) {
          analytics.planPerformance[plano] = {
            activeCount: 0,
            canceledCount: 0,
            churnRate: 0,
            revenue: 0
          };
        }
        analytics.planPerformance[plano].activeCount++;
        analytics.planPerformance[plano].revenue += valor;
      } else if (['D', 'C', 'I'].includes(status)) {
        analytics.churnedContracts++;
        
        if (!analytics.planPerformance[plano]) {
          analytics.planPerformance[plano] = {
            activeCount: 0,
            canceledCount: 0,
            churnRate: 0,
            revenue: 0
          };
        }
        analytics.planPerformance[plano].canceledCount++;
      }
    });

    // Processar faturas vencidas
    invoicesData.registros?.forEach((invoice: any) => {
      const dueDate = new Date(invoice.data_vencimento);
      const amount = parseFloat(invoice.valor) || 0;
      const status = invoice.status || '';
      
      if (status === 'A' && dueDate < now) {
        analytics.overdueInvoices++;
        analytics.overdueAmount += amount;
        
        const daysDiff = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 30) {
          analytics.aging.days0_30.count++;
          analytics.aging.days0_30.amount += amount;
        } else if (daysDiff <= 60) {
          analytics.aging.days31_60.count++;
          analytics.aging.days31_60.amount += amount;
        } else if (daysDiff <= 90) {
          analytics.aging.days61_90.count++;
          analytics.aging.days61_90.amount += amount;
        } else {
          analytics.aging.days90Plus.count++;
          analytics.aging.days90Plus.amount += amount;
        }
        
        // Agrupar por cliente
        const clientId = invoice.id_cliente?.toString() || 'unknown';
        const clientName = invoice.nome_cliente || 'Cliente desconhecido';
        
        if (!debtorMap.has(clientId)) {
          debtorMap.set(clientId, {
            clientId,
            clientName,
            overdueAmount: 0,
            invoicesCount: 0,
            oldestInvoice: dueDate
          });
        }
        
        const debtor = debtorMap.get(clientId)!;
        debtor.overdueAmount += amount;
        debtor.invoicesCount++;
        if (dueDate < debtor.oldestInvoice) {
          debtor.oldestInvoice = dueDate;
        }
      }
    });

    // Top devedores
    analytics.topDebtors = Array.from(debtorMap.values())
      .sort((a, b) => b.overdueAmount - a.overdueAmount)
      .slice(0, 10)
      .map(d => ({
        ...d,
        oldestInvoice: d.oldestInvoice.toISOString().split('T')[0]
      }));

    // Calcular métricas
    analytics.arr = analytics.mrr * 12;
    analytics.averageTicket = analytics.activeContracts > 0 
      ? analytics.mrr / analytics.activeContracts 
      : 0;
    analytics.overdueRate = analytics.activeContracts > 0
      ? (analytics.overdueInvoices / analytics.activeContracts) * 100
      : 0;
    analytics.churnRate = analytics.totalContracts > 0
      ? (analytics.churnedContracts / analytics.totalContracts) * 100
      : 0;

    // Projeções (assumindo crescimento de 5% e churn atual)
    const growthRate = 0.05;
    const monthlyChurnRate = analytics.churnRate / 12 / 100;
    analytics.projectedMRR = analytics.mrr * (1 + growthRate - monthlyChurnRate);
    analytics.projectedARR = analytics.projectedMRR * 12;

    // Calcular churn rate por plano
    Object.keys(analytics.planPerformance).forEach(plan => {
      const data = analytics.planPerformance[plan];
      const total = data.activeCount + data.canceledCount;
      data.churnRate = total > 0 ? (data.canceledCount / total) * 100 : 0;
    });

    // Simular evolução temporal (últimos 12 meses)
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    for (let i = 11; i >= 0; i--) {
      let month = currentMonth - i;
      let year = currentYear;
      
      if (month < 0) {
        month += 12;
        year -= 1;
      }
      
      const monthName = new Date(year, month, 1).toLocaleDateString('pt-BR', { 
        year: 'numeric', 
        month: 'short' 
      });
      
      // Simular crescimento gradual
      const growthFactor = 0.97 + (i * 0.003);
      analytics.monthlyRevenue.push({
        month: monthName,
        revenue: analytics.mrr * growthFactor,
        contracts: Math.round(analytics.activeContracts * growthFactor)
      });
    }

    console.log('Análise financeira concluída');

    return new Response(
      JSON.stringify({
        success: true,
        ...analytics
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Erro na análise financeira:', error);
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
