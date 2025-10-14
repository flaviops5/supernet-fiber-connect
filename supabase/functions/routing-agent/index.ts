import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ROUTING_AGENT_CONFIG } from "./config.ts";
import { CLOE_MARTINS_SYSTEM_PROMPT } from "./prompts.ts";
import { massOutageContext } from "../_shared/mass-outage-helper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Parse seguro do body
    const body = await req.json().catch(() => ({}));
    const message = body.message ?? body.message_content ?? "";
    const conversationId = body.conversationId ?? body.conversation_id ?? null;
    const customerData = body.customerData ?? {};

    if (!conversationId || !message) {
      console.error("❌ conversationId ou message ausente", body);
      return new Response(
        JSON.stringify({ ok: false, error: "conversationId e message são obrigatórios", body }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // Inicialização Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🧭 [${conversationId}] Routing Agent started`);

    // Gerar protocolo único
    const protocol = `PROT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Atualizar conversa com protocolo
    await supabase
      .from("conversations")
      .update({
        metadata: { protocol },
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    // Verificar queda em massa
    const isMassOutage = ROUTING_AGENT_CONFIG.massOutage.enabled && massOutageContext?.active;

    // Montar contexto base do modelo
    const systemPrompt = CLOE_MARTINS_SYSTEM_PROMPT.replaceAll("[GERAR]", protocol);
    const context = `
      ${systemPrompt}
      CPF_VALIDATED: ${!!customerData?.cpf}
      MASS_OUTAGE_ACTIVE: ${isMassOutage}
      CLIENTE: ${customerData?.name ?? "Desconhecido"}
      STATUS: ${customerData?.status ?? "Indefinido"}
      MENSAGEM: ${message}
    `;

    // Decidir departamento de destino
    let targetDepartment = "comercial";
    if (/\b(boleto|fatura|pagamento)\b/i.test(message)) targetDepartment = "financeiro";
    else if (/\b(internet|lenta|conexão|sem sinal|travando)\b/i.test(message)) targetDepartment = "tecnico";
    else if (/\b(agendar|instalação|visita|logística)\b/i.test(message)) targetDepartment = "logistica";

    console.log(`📊 Departamento identificado: ${targetDepartment}`);

    // Mensagem de transferência
    const transferMessage = `Perfeito! Transferindo você para nosso Suporte ${targetDepartment}. Um momento! ⏳

📋 *Protocolo de Atendimento:* ${protocol}`;

    await supabase.from("conversation_messages").insert({
      conversation_id: conversationId,
      sender_type: "agent",
      sender_name: "Cloé Martins",
      content: transferMessage,
    });

    // Atualizar departamento da conversa
    await supabase
      .from("conversations")
      .update({
        department: targetDepartment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    // Se destino for técnico → chama Luan
    if (targetDepartment === "tecnico") {
      const { error: techError } = await supabase.functions.invoke("support-tech-agent", {
        body: {
          conversation_id: conversationId,
          customer_cpf: customerData?.cpf ?? null,
          message,
        },
      });
      if (techError) console.error("❌ Erro ao chamar Luan:", techError);
    }

    return new Response(
      JSON.stringify({ ok: true, protocol, targetDepartment }),
      { headers: corsHeaders, status: 200 }
    );
  } catch (err) {
    console.error("❌ Error in routing-agent:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
