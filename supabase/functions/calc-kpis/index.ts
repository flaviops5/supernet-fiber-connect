/**
 * Calculadora de KPIs - usa views SQL otimizadas
 * 
 * Endpoint: POST /calc-kpis
 * Body: { days?: number, fluxo?: string }
 */

import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type KPIFilter = {
  days?: number;
  fluxo?: string;
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { days = 7, fluxo = "support-tech" } = 
      (await req.json().catch(() => ({}))) as KPIFilter;

    // Usar view SQL para dados diários (muito mais performático)
    const { data: dailyData, error: dailyError } = await supabase
      .from("dashboard_suporte_kpis")
      .select("*")
      .gte("dia", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order("dia", { ascending: false });

    if (dailyError) {
      return new Response(
        JSON.stringify({ ok: false, error: dailyError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Usar view SQL para resumo geral (já agregado no banco)
    const { data: summaryData, error: summaryError } = await supabase
      .from("dashboard_suporte_kpis_summary")
      .select("*")
      .single();

    if (summaryError) {
      return new Response(
        JSON.stringify({ ok: false, error: summaryError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Agregação simples dos últimos N dias
    const windowTotals = dailyData.reduce(
      (acc, day) => ({
        logs: acc.logs + (day.total_logs || 0),
        resolved: acc.resolved + (day.total_resolvidos || 0),
        escalated: acc.escalated + (day.total_escalados || 0),
        hybrid_usage: acc.hybrid_usage + (day.total_hibrido || 0),
        scenarios: {
          A: acc.scenarios.A + (day.total_a || 0),
          B: acc.scenarios.B + (day.total_b || 0),
          C: acc.scenarios.C + (day.total_c || 0),
          D: acc.scenarios.D + (day.total_d || 0),
        },
      }),
      { 
        logs: 0, 
        resolved: 0, 
        escalated: 0, 
        hybrid_usage: 0, 
        scenarios: { A: 0, B: 0, C: 0, D: 0 } 
      }
    );

    const result = {
      ok: true,
      window_days: days,
      totals: windowTotals,
      ratios: {
        msr: windowTotals.logs ? windowTotals.resolved / windowTotals.logs : 0,
        escalations: windowTotals.logs ? windowTotals.escalated / windowTotals.logs : 0,
        hybrid_usage: windowTotals.logs ? windowTotals.hybrid_usage / windowTotals.logs : 0,
      },
      daily_breakdown: dailyData,
      overall_summary: summaryData,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("❌ calc-kpis error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
