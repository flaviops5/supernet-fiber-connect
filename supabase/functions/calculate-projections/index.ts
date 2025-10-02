import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔮 Iniciando cálculo de projeções...');

    // Buscar configurações de projeção
    const { data: settings } = await supabase
      .from('projection_settings')
      .select('*')
      .single();

    if (!settings) {
      throw new Error('Configurações de projeção não encontradas');
    }

    console.log('⚙️ Configurações:', settings);

    // Buscar dados financeiros do IXC
    const { data: financialData, error: ixcError } = await supabase.functions.invoke('ixc-financial-analytics');
    
    if (ixcError) {
      console.error('❌ Erro ao buscar dados do IXC:', ixcError);
      throw new Error(`Erro IXC: ${ixcError.message}`);
    }

    const analytics = financialData?.data || financialData;
    console.log('📊 Dados base:', {
      mrr: analytics?.mrr,
      churnRate: analytics?.churnRate,
      activeClients: analytics?.activeClients
    });

    // Dados base atuais
    const baseMRR = analytics?.mrr || 0;
    const baseChurnRate = analytics?.churnRate || 2.5;
    const activeClients = analytics?.activeClients || 0;
    const variableCostPct = parseFloat(settings.variable_cost_percentage) / 100;
    const fixedCosts = parseFloat(settings.fixed_costs);

    // Limpar projeções antigas
    await supabase
      .from('cash_flow_projections')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    const projections = [];
    let accumulatedOptimistic = 0;
    let accumulatedBase = 0;
    let accumulatedPessimistic = 0;

    // Gerar projeções para os próximos N meses
    for (let month = 1; month <= settings.projection_months; month++) {
      const projectionDate = new Date();
      projectionDate.setMonth(projectionDate.getMonth() + month);
      projectionDate.setDate(1); // Primeiro dia do mês

      // CENÁRIO OTIMISTA
      const optimisticGrowth = 1 + (parseFloat(settings.optimistic_revenue_growth) / 100);
      const optimisticChurnReduction = 1 - (parseFloat(settings.optimistic_churn_reduction) / 100);
      const optimisticRevenue = baseMRR * Math.pow(optimisticGrowth, month);
      const optimisticCosts = (optimisticRevenue * variableCostPct) + fixedCosts;
      const optimisticCashFlow = optimisticRevenue - optimisticCosts;
      accumulatedOptimistic += optimisticCashFlow;

      projections.push({
        projection_date: projectionDate.toISOString().split('T')[0],
        scenario: 'optimistic',
        projected_revenue: optimisticRevenue,
        projected_costs: optimisticCosts,
        projected_churn_rate: baseChurnRate * optimisticChurnReduction,
        projected_new_clients: Math.round(activeClients * 0.05), // 5% novos clientes
        projected_cash_flow: optimisticCashFlow,
        accumulated_cash_flow: accumulatedOptimistic,
        metadata: {
          month,
          growth_applied: settings.optimistic_revenue_growth,
          churn_reduction: settings.optimistic_churn_reduction
        }
      });

      // CENÁRIO BASE
      const baseRevenue = baseMRR;
      const baseCosts = (baseRevenue * variableCostPct) + fixedCosts;
      const baseCashFlow = baseRevenue - baseCosts;
      accumulatedBase += baseCashFlow;

      projections.push({
        projection_date: projectionDate.toISOString().split('T')[0],
        scenario: 'base',
        projected_revenue: baseRevenue,
        projected_costs: baseCosts,
        projected_churn_rate: baseChurnRate,
        projected_new_clients: Math.round(activeClients * 0.02), // 2% novos clientes
        projected_cash_flow: baseCashFlow,
        accumulated_cash_flow: accumulatedBase,
        metadata: {
          month,
          note: 'Cenário mantém valores atuais'
        }
      });

      // CENÁRIO PESSIMISTA
      const pessimisticDecline = 1 - (parseFloat(settings.pessimistic_revenue_decline) / 100);
      const pessimisticChurnIncrease = 1 + (parseFloat(settings.pessimistic_churn_increase) / 100);
      const pessimisticRevenue = baseMRR * Math.pow(pessimisticDecline, month);
      const pessimisticCosts = (pessimisticRevenue * variableCostPct) + fixedCosts;
      const pessimisticCashFlow = pessimisticRevenue - pessimisticCosts;
      accumulatedPessimistic += pessimisticCashFlow;

      projections.push({
        projection_date: projectionDate.toISOString().split('T')[0],
        scenario: 'pessimistic',
        projected_revenue: pessimisticRevenue,
        projected_costs: pessimisticCosts,
        projected_churn_rate: baseChurnRate * pessimisticChurnIncrease,
        projected_new_clients: Math.round(activeClients * 0.01), // 1% novos clientes
        projected_cash_flow: pessimisticCashFlow,
        accumulated_cash_flow: accumulatedPessimistic,
        metadata: {
          month,
          decline_applied: settings.pessimistic_revenue_decline,
          churn_increase: settings.pessimistic_churn_increase
        }
      });
    }

    console.log(`📈 Criando ${projections.length} projeções...`);

    // Inserir todas as projeções
    const { error: insertError } = await supabase
      .from('cash_flow_projections')
      .insert(projections);

    if (insertError) {
      console.error('❌ Erro ao inserir projeções:', insertError);
      throw insertError;
    }

    const response = {
      success: true,
      message: `${projections.length} projeções criadas com sucesso`,
      summary: {
        months: settings.projection_months,
        scenarios: ['optimistic', 'base', 'pessimistic'],
        finalAccumulated: {
          optimistic: accumulatedOptimistic,
          base: accumulatedBase,
          pessimistic: accumulatedPessimistic
        }
      }
    };

    console.log('✅ Projeções calculadas:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro na função calculate-projections:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});