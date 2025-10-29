// >>> PR28 – luan-auto-upgrade (Edge Function) v2 – 10/10
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type KpiRow = { 
  ts: string; 
  total_count: number; 
  resolved_remote_count: number; 
  tickets_count: number;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // 1) Buscar KPIs dos últimos 7 dias
    const { data, error } = await supabase.rpc("calc_support_kpis_last_7_days");
    if (error) throw error;

    const rows = (data as KpiRow[]) ?? [];
    
    // Agregação manual
    const total = rows.reduce((a, r) => a + Number(r.total_count || 0), 0);
    const remote = rows.reduce((a, r) => a + Number(r.resolved_remote_count || 0), 0);
    const tickets = rows.reduce((a, r) => a + Number(r.tickets_count || 0), 0);

    const remoteRate = total > 0 ? remote / total : 0;
    const ticketRate = total > 0 ? tickets / total : 0;

    console.log(`📊 KPIs: total=${total}, remoteRate=${(remoteRate*100).toFixed(1)}%, ticketRate=${(ticketRate*100).toFixed(1)}%`);

    // 2) Regras simples adaptativas
    const policy = {
      agent: "support-tech",
      version: "global-rules-v2",
      rules: {
        prioritize_guided_messages: remoteRate < 0.7,
        reduce_repetitions: ticketRate > 0.25,
        prefer_variations: remoteRate < 0.7 
          ? ["var_curta_empatica", "var_guiada_midia"] 
          : ["var_padrao"],
        scenario_overrides: {
          C: { max_retries: ticketRate > 0.25 ? 1 : 2 },
          D: { open_ticket_immediately: ticketRate > 0.25 }
        }
      },
      kpi_snapshot: { 
        remoteRate: Math.round(remoteRate * 1000) / 1000, 
        ticketRate: Math.round(ticketRate * 1000) / 1000, 
        total,
        period_days: 7
      },
      applied_at: new Date().toISOString()
    };

    // 3) Persistir policy global (upsert)
    const { error: upsertError } = await supabase
      .from("agent_global_policies")
      .upsert(
        { 
          agent: "support-tech", 
          policy_json: policy, 
          updated_at: new Date().toISOString() 
        }, 
        { onConflict: "agent" }
      );
    
    if (upsertError) throw upsertError;

    // 4) Log auditoria (fire-and-forget via EdgeRuntime)
    EdgeRuntime.waitUntil(
      supabase.from("registros_de_monitoramento").insert({
        fluxo: "support-tech",
        acao: "auto_upgrade_applied",
        detalhes: { 
          remoteRate: policy.kpi_snapshot.remoteRate,
          ticketRate: policy.kpi_snapshot.ticketRate,
          policy_version: policy.version,
          prefer_variations: policy.rules.prefer_variations 
        }
      })
    );

    console.log("✅ Auto-upgrade aplicado:", policy.version);

    return new Response(
      JSON.stringify({ ok: true, policy }), 
      { headers: { ...corsHeaders, "content-type": "application/json" } }
    );

  } catch (e) {
    console.error("❌ Erro auto-upgrade:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, "content-type": "application/json" } 
      }
    );
  }
});
// <<< PR28
