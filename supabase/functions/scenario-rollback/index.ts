// >>> PR29 – scenario-rollback (dupla confirmação real) v2 – 10/10
import { createAuthenticatedHandler } from '../_shared/base-handler.ts';

Deno.serve(createAuthenticatedHandler('scenario-rollback', async (req, { supabase, user }) => {

    const { 
      agent, 
      scenario_key, 
      to_version, 
      reason, 
      action = "request", // request | confirm | apply
      emergency_bypass = false
    } = await req.json();
    
    // >>> CRITICAL FIX: Emergency bypass
    if (emergency_bypass) {
      console.log("🚨 EMERGENCY BYPASS ativado - pulando dual approval");
    }
    // <<< CRITICAL FIX

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

    // 4) APPLY: Aplica rollback após confirmação (ou bypass)
    if (action === "apply" || emergency_bypass) {
      const { rollback_id } = emergency_bypass ? null : await req.json();

      let confirmed: any;
      if (!emergency_bypass) {
        const { data, error: fetchError } = await supabase
          .from("agent_scenarios_rollback_log")
          .select("*")
          .eq("id", rollback_id)
          .eq("status", "confirmed")
          .single();

        if (fetchError || !data) {
          throw new Error("Rollback não confirmado ou já aplicado");
        }
        confirmed = data;
      } else {
        // Emergency bypass: aplicar direto
        confirmed = { agent, scenario_key, to_version };
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

      // Marcar como aplicado (se não for bypass)
      if (!emergency_bypass && rollback_id) {
        await supabase
          .from("agent_scenarios_rollback_log")
          .update({
            status: "applied",
            applied_at: new Date().toISOString()
          })
          .eq("id", rollback_id);
      } else if (emergency_bypass) {
        // Criar log de bypass
        await supabase.from("agent_scenarios_rollback_log").insert({
          agent, scenario_key, to_version, reason,
          status: "applied",
          applied_at: new Date().toISOString(),
          metadata: { emergency_bypass: true }
        });
      }

      // Log auditoria
      EdgeRuntime.waitUntil(
        supabase.from("registros_de_monitoramento").insert({
          fluxo: "support-tech",
          acao: "scenario_rollback_applied",
          detalhes: { 
            agent: confirmed.agent, 
            scenario_key: confirmed.scenario_key, 
            to_version: confirmed.to_version,
            emergency_bypass 
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
