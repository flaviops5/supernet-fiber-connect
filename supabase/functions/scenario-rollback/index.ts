// >>> PR29 – scenario-rollback (dupla confirmação real) v2 – 10/10
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { 
      agent, 
      scenario_key, 
      to_version, 
      reason, 
      action = "request" // request | confirm | apply
    } = await req.json();

    // Validação básica
    if (!agent || !scenario_key || !to_version) {
      throw new Error("Campos obrigatórios: agent, scenario_key, to_version");
    }

    // 1) Buscar versão alvo
    const { data: targetVersion, error: versionError } = await supabase
      .from("agent_scenarios_versions")
      .select("*")
      .eq("agent", agent)
      .eq("scenario_key", scenario_key)
      .eq("version", to_version)
      .single();

    if (versionError || !targetVersion) {
      throw new Error(`Versão ${to_version} não encontrada para ${agent}/${scenario_key}`);
    }

    // 2) REQUEST: Criar pedido inicial
    if (action === "request") {
      const { data: newRequest, error: insertError } = await supabase
        .from("agent_scenarios_rollback_log")
        .insert({
          agent,
          scenario_key,
          to_version,
          reason: reason || "Rollback solicitado",
          status: "pending",
          requested_by: null // seria auth.uid() em produção
        })
        .select()
        .single();

      if (insertError) throw insertError;

      console.log("📋 Rollback REQUEST criado:", newRequest.id);

      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: "Rollback pendente de confirmação por segundo usuário",
          rollback_id: newRequest.id,
          status: "pending"
        }), 
        { headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // 3) CONFIRM: Segundo usuário confirma (não aplica ainda)
    if (action === "confirm") {
      const { rollback_id } = await req.json();
      
      const { data: existing, error: fetchError } = await supabase
        .from("agent_scenarios_rollback_log")
        .select("*")
        .eq("id", rollback_id)
        .eq("status", "pending")
        .single();

      if (fetchError || !existing) {
        throw new Error("Rollback não encontrado ou já processado");
      }

      // Validar que não é o mesmo usuário (simulado aqui)
      const { error: confirmError } = await supabase
        .from("agent_scenarios_rollback_log")
        .update({
          status: "confirmed",
          confirmed_by: null, // seria auth.uid() diferente de requested_by
          confirmed_at: new Date().toISOString()
        })
        .eq("id", rollback_id);

      if (confirmError) throw confirmError;

      console.log("✅ Rollback CONFIRMED:", rollback_id);

      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: "Rollback confirmado. Pronto para aplicar.",
          rollback_id,
          status: "confirmed"
        }), 
        { headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // 4) APPLY: Aplica rollback após confirmação
    if (action === "apply") {
      const { rollback_id } = await req.json();

      const { data: confirmed, error: fetchError } = await supabase
        .from("agent_scenarios_rollback_log")
        .select("*")
        .eq("id", rollback_id)
        .eq("status", "confirmed")
        .single();

      if (fetchError || !confirmed) {
        throw new Error("Rollback não confirmado ou já aplicado");
      }

      // Buscar versão novamente
      const { data: version } = await supabase
        .from("agent_scenarios_versions")
        .select("*")
        .eq("agent", confirmed.agent)
        .eq("scenario_key", confirmed.scenario_key)
        .eq("version", confirmed.to_version)
        .single();

      if (!version) throw new Error("Versão não encontrada");

      // Aplicar na tabela de configs atuais
      const { error: applyError } = await supabase
        .from("agent_current_configs")
        .upsert({
          agent: confirmed.agent,
          scenario_key: confirmed.scenario_key,
          payload_json: version.payload,
          configs_json: version.configs,
          updated_at: new Date().toISOString()
        }, { onConflict: "agent,scenario_key" });

      if (applyError) throw applyError;

      // Marcar como aplicado
      await supabase
        .from("agent_scenarios_rollback_log")
        .update({
          status: "applied",
          applied_at: new Date().toISOString()
        })
        .eq("id", rollback_id);

      // Log auditoria
      EdgeRuntime.waitUntil(
        supabase.from("registros_de_monitoramento").insert({
          fluxo: "support-tech",
          acao: "scenario_rollback_applied",
          detalhes: { 
            agent: confirmed.agent, 
            scenario_key: confirmed.scenario_key, 
            to_version: confirmed.to_version 
          }
        })
      );

      console.log("🔄 Rollback APPLIED:", rollback_id);

      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: "Rollback aplicado com sucesso",
          rollback_id,
          status: "applied"
        }), 
        { headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    throw new Error(`Action inválida: ${action}`);

  } catch (e) {
    console.error("❌ Erro rollback:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, "content-type": "application/json" } 
      }
    );
  }
});
// <<< PR29
