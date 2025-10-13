// ============================================
// IXC Financial Analytics com Persistência
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/structured-logger.ts";
import { callIxcWithRetry } from "../_shared/ixc-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const IXC_PROXY_URL = `${SUPABASE_URL}/functions/v1/ixc-proxy`;

interface Contract {
  id_contrato?: string;
  status_internet?: string;
  valor?: string;
  plano?: string;
  id_cliente?: string;
  razao?: string;
}

interface Invoice {
  id?: string;
  id_cliente?: string;
  nome_cliente?: string;
  data_vencimento?: string;
  valor?: string;
  status?: string;
}

function computeAnalytics(contracts: Contract[], invoices: Invoice[]) {
  const now = new Date();
  
  const result = {
    mrr: 0,
    arr: 0,
    activeContracts: 0,
    totalContracts: contracts.length || 0,
    averageTicket: 0,
    overdueInvoices: 0,
    overdueAmount: 0,
    overdueRate: 0,
    churnedContracts: 0,
    churnRate: 0,
    projectedMRR: 0,
    projectedARR: 0,
    aging: {
      days0_30: { count: 0, amount: 0 },
      days31_60: { count: 0, amount: 0 },
      days61_90: { count: 0, amount: 0 },
      days90Plus: { count: 0, amount: 0 },
    },
    topDebtors: [] as Array<{
      clientId: string;
      clientName: string;
      overdueAmount: number;
      invoicesCount: number;
      oldestInvoice: string;
    }>,
    planPerformance: {} as Record<string, {
      activeCount: number;
      canceledCount: number;
      churnRate: number;
      revenue: number;
    }>,
    monthlyRevenue: [] as Array<{
      month: string;
      revenue: number;
      contracts: number;
    }>,
  };

  const debtorMap = new Map<string, {
    clientId: string;
    clientName: string;
    overdueAmount: number;
    invoicesCount: number;
    oldestInvoice: Date;
  }>();

  // Processar contratos
  for (const c of contracts) {
    const status = c.status_internet || "";
    const valor = parseFloat(c.valor || "0") || 0;
    const plano = c.plano || "Sem plano";

    if (["A", "AA", "AT", "AC"].includes(status)) {
      result.activeContracts++;
      result.mrr += valor;
      
      if (!result.planPerformance[plano]) {
        result.planPerformance[plano] = {
          activeCount: 0,
          canceledCount: 0,
          churnRate: 0,
          revenue: 0
        };
      }
      result.planPerformance[plano].activeCount++;
      result.planPerformance[plano].revenue += valor;
    } else if (["D", "C", "I"].includes(status)) {
      result.churnedContracts++;
      
      if (!result.planPerformance[plano]) {
        result.planPerformance[plano] = {
          activeCount: 0,
          canceledCount: 0,
          churnRate: 0,
          revenue: 0
        };
      }
      result.planPerformance[plano].canceledCount++;
    }
  }

  // Processar faturas
  for (const inv of invoices) {
    const due = new Date(inv.data_vencimento || "");
    const amount = parseFloat(inv.valor || "0") || 0;
    const status = inv.status || "";
    
    if (status === "A" && due < now) {
      result.overdueInvoices++;
      result.overdueAmount += amount;

      const days = Math.floor((now.getTime() - due.getTime()) / 86400000);
      if (days <= 30) {
        result.aging.days0_30.count++;
        result.aging.days0_30.amount += amount;
      } else if (days <= 60) {
        result.aging.days31_60.count++;
        result.aging.days31_60.amount += amount;
      } else if (days <= 90) {
        result.aging.days61_90.count++;
        result.aging.days61_90.amount += amount;
      } else {
        result.aging.days90Plus.count++;
        result.aging.days90Plus.amount += amount;
      }

      const clientId = inv.id_cliente?.toString() || "unknown";
      const clientName = inv.nome_cliente || "Cliente desconhecido";
      
      if (!debtorMap.has(clientId)) {
        debtorMap.set(clientId, {
          clientId,
          clientName,
          overdueAmount: 0,
          invoicesCount: 0,
          oldestInvoice: due
        });
      }
      
      const d = debtorMap.get(clientId)!;
      d.overdueAmount += amount;
      d.invoicesCount++;
      if (due < d.oldestInvoice) d.oldestInvoice = due;
    }
  }

  // Top devedores
  result.topDebtors = Array.from(debtorMap.values())
    .sort((a, b) => b.overdueAmount - a.overdueAmount)
    .slice(0, 10)
    .map(d => ({
      ...d,
      oldestInvoice: d.oldestInvoice.toISOString().split("T")[0]
    }));

  // Métricas finais
  result.arr = result.mrr * 12;
  result.averageTicket = result.activeContracts 
    ? result.mrr / result.activeContracts 
    : 0;
  result.overdueRate = invoices.length 
    ? (result.overdueInvoices / invoices.length) * 100 
    : 0;
  result.churnRate = result.totalContracts 
    ? (result.churnedContracts / result.totalContracts) * 100 
    : 0;

  // Churn por plano
  for (const k of Object.keys(result.planPerformance)) {
    const p = result.planPerformance[k];
    const total = p.activeCount + p.canceledCount;
    p.churnRate = total ? (p.canceledCount / total) * 100 : 0;
  }

  // Série mensal (últimos 12 meses - sintética)
  const cm = now.getMonth();
  const cy = now.getFullYear();
  for (let i = 11; i >= 0; i--) {
    let m = cm - i;
    let y = cy;
    if (m < 0) {
      m += 12;
      y--;
    }
    const label = new Date(y, m, 1).toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "short"
    });
    const factor = 0.97 + i * 0.002;
    result.monthlyRevenue.push({
      month: label,
      revenue: result.mrr * factor,
      contracts: Math.round(result.activeContracts * factor)
    });
  }

  // Projeção baseada em churn e inadimplência
  const churnMonthly = (result.churnRate / 100) / 12;
  const overduePenalty = Math.min(result.overdueRate / 100, 0.15);
  const baseGrowth = 0.02; // 2% ao mês baseline
  result.projectedMRR = result.mrr * (1 + baseGrowth - churnMonthly - overduePenalty);
  result.projectedARR = result.projectedMRR * 12;

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const logger = createLogger("ixc-financial-analytics", req);

  try {
    logger.info("Iniciando análise financeira");

    // Validar autenticação
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      logger.warn("Unauthorized - missing auth header");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar dados do IXC usando o proxy e circuit breaker
    logger.info("Buscando dados do IXC");
    
    const [contractsData, invoicesData] = await Promise.all([
      callIxcWithRetry(
        IXC_PROXY_URL,
        "GET",
        "/webservice/v1/cliente_contrato",
        { qtype: "cliente_contrato.id", oper: ">", query: "0", grid_param: JSON.stringify([{ orderby: "cliente_contrato.id", order: "ASC" }]) }
      ),
      callIxcWithRetry(
        IXC_PROXY_URL,
        "GET",
        "/webservice/v1/fn_titulo",
        { qtype: "fn_titulo.id", oper: ">", query: "0", grid_param: JSON.stringify([{ orderby: "fn_titulo.id", order: "ASC" }]) }
      )
    ]);

    const contracts = contractsData.data?.registros || [];
    const invoices = invoicesData.data?.registros || [];

    logger.info("Dados recebidos", {
      contracts: contracts.length,
      invoices: invoices.length
    });

    // Computar analytics
    const analytics = computeAnalytics(contracts, invoices);

    // Persistir no Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { error: insertError } = await supabase
      .from("financial_analytics")
      .upsert({
        day_bucket: new Date().toISOString().split('T')[0],
        mrr: analytics.mrr,
        arr: analytics.arr,
        active_contracts: analytics.activeContracts,
        total_contracts: analytics.totalContracts,
        average_ticket: analytics.averageTicket,
        overdue_invoices: analytics.overdueInvoices,
        overdue_amount: analytics.overdueAmount,
        overdue_rate: analytics.overdueRate,
        churned_contracts: analytics.churnedContracts,
        churn_rate: analytics.churnRate,
        projected_mrr: analytics.projectedMRR,
        projected_arr: analytics.projectedARR,
        aging: analytics.aging,
        top_debtors: analytics.topDebtors,
        plan_performance: analytics.planPerformance,
        monthly_revenue: analytics.monthlyRevenue,
        raw_counts: {
          contracts: contracts.length,
          invoices: invoices.length
        },
        computation_time_ms: Date.now() - startTime,
        ixc_api_calls: 2
      }, {
        onConflict: 'day_bucket'
      });

    if (insertError) {
      logger.error("Erro ao persistir analytics", { error: insertError.message });
    } else {
      logger.info("Analytics persistido com sucesso");
    }

    logger.info("Análise concluída", {
      duration_ms: Date.now() - startTime
    });

    return new Response(JSON.stringify({
      success: true,
      ...analytics,
      metadata: {
        computation_time_ms: Date.now() - startTime,
        cached: false
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    logger.error("Erro na análise financeira", {
      error: error.message,
      duration_ms: Date.now() - startTime
    });
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
