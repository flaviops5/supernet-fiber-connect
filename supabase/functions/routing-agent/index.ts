import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ROUTING_AGENT_CONFIG } from "./config.ts";
import { CLOE_MARTINS_SYSTEM_PROMPT } from "./prompts.ts";
import { massOutageContext } from "../_shared/mass-outage-helper.ts";
import { createLogger } from "../_shared/structured-logger.ts";
import {
  getClientRoutingStatus,
  determineTargetDepartment,
  createSanitizedMetadata,
  ErrorCode,
} from "./helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const logger = createLogger("routing-agent", req);

  try {
    // Parse seguro do body
    const body = await req.json().catch(() => ({}));
    const message = body.message ?? body.message_content ?? "";
    const conversationId = body.conversationId ?? body.conversation_id ?? null;
    const customerData = body.customerData ?? {};

    if (!conversationId || !message) {
      logger.error("conversationId ou message ausente", { body });
      return new Response(
        JSON.stringify({ ok: false, error: "conversationId e message são obrigatórios", body }),
        { headers: corsHeaders, status: 400 }
      );
    }

    logger.info("Routing Agent iniciado", { conversationId });

    // Gerar protocolo único
    const protocol = `PROT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    logger.info("Protocolo gerado", { protocol });

    // 🧩 NOVA INTEGRAÇÃO IXC: Buscar cliente e determinar status
    const clientStatus = await getClientRoutingStatus(supabase, message);
    logger.info("Status do cliente obtido", { 
      found: clientStatus.found, 
      error: clientStatus.error,
      isBlocked: clientStatus.isBlocked,
      isOffline: clientStatus.isOffline,
    });

    // 🚨 CASO ESPECIAL: CPF não identificado
    if (clientStatus.error === ErrorCode.NO_CPF) {
      const askCPFMessage = `Olá! 👋 Sou a Cloé Martins da SUPERNET.

Para começarmos, preciso do seu CPF para localizar seu cadastro.

📋 Protocolo: ${protocol}

Por favor, me informe seu CPF (apenas números):`;

      await supabase.from("conversation_messages").insert({
        conversation_id: conversationId,
        sender_type: "agent",
        sender_name: "Cloé Martins",
        content: askCPFMessage,
      });

      await supabase.from("conversations").update({
        metadata: createSanitizedMetadata(protocol, clientStatus),
        updated_at: new Date().toISOString(),
      }).eq("id", conversationId);

      logger.info("Solicitação de CPF enviada");
      return new Response(
        JSON.stringify({ ok: true, protocol, needsCPF: true }),
        { headers: corsHeaders, status: 200 }
      );
    }

    // 🎯 Determinar departamento de destino
    const targetDepartment = determineTargetDepartment(clientStatus, message);
    logger.info("Departamento determinado", { targetDepartment });

    // 💬 Atualizar conversa com dados sanitizados (LGPD)
    await supabase.from("conversations").update({
      customer_name: clientStatus.name || "Cliente",
      department: targetDepartment,
      metadata: createSanitizedMetadata(protocol, clientStatus),
      updated_at: new Date().toISOString(),
    }).eq("id", conversationId);

    // 📝 Registrar histórico de contato
    if (clientStatus.found && clientStatus.cpf) {
      await supabase.from("customer_contact_history").insert({
        cpf: clientStatus.cpf,
        customer_name: clientStatus.name,
        ixc_client_id: clientStatus.id,
        contact_channel: "whatsapp",
        contact_reason: "routing",
        was_found_in_ixc: true,
        conversation_id: conversationId,
        metadata: { protocol, department: targetDepartment },
      });
    }

    // 🚀 Se Cloé continua atendendo, não transfere
    if (targetDepartment === "cloe") {
      logger.info("Cloé continua atendimento");
      return new Response(
        JSON.stringify({ ok: true, protocol, targetDepartment: "cloe" }),
        { headers: corsHeaders, status: 200 }
      );
    }

    // 💬 Mensagem de transferência (envia ANTES de invocar agente)
    const departmentNames: Record<string, string> = {
      financeiro: "Financeiro (Julia)",
      tecnico: "Técnico (Luan)",
      comercial: "Comercial (Vicente)",
    };

    const transferMessage = `Perfeito! Vou te transferir para o time ${departmentNames[targetDepartment]}. Um momento! ⏳`;

    await supabase.from("conversation_messages").insert({
      conversation_id: conversationId,
      sender_type: "agent",
      sender_name: "Cloé Martins",
      content: transferMessage,
    });

    // 📤 Invocar agente especializado DEPOIS da mensagem de transferência
    if (targetDepartment === "tecnico") {
      const { error: techError } = await supabase.functions.invoke("support-tech-agent", {
        body: {
          conversation_id: conversationId,
          customer_cpf: clientStatus.cpf ?? null,
          ixc_client_id: clientStatus.id ?? null,
          message,
          suggested_action: clientStatus.suggestAutoReboot ? "auto_reboot" : null,
          client_is_offline: clientStatus.isOffline === true, // 🆕 Status do cliente
        },
      });
      if (techError) logger.error("Erro ao chamar Luan", { error: techError });
    }

    logger.info("Roteamento concluído", { protocol, targetDepartment });
    return new Response(
      JSON.stringify({ ok: true, protocol, targetDepartment }),
      { headers: corsHeaders, status: 200 }
    );
  } catch (err: any) {
    logger.error("Erro crítico no routing-agent", { error: err.message, stack: err.stack });
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
