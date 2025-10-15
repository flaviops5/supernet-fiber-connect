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
  redactCPF,
} from "./helpers.ts";
import { validateAndMaskCPF, detectInputType } from "../_shared/validateAndMaskCPF.ts";

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

    // 🔍 Detectar tipo de entrada (CPF, telefone, outro)
    const inputType = detectInputType(message);
    logger.info("Tipo de entrada detectado", { inputType });

    // Gerar protocolo único
    const protocol = `PROT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    logger.info("Protocolo gerado", { protocol });

    // 🧩 NOVA INTEGRAÇÃO IXC: Buscar cliente e determinar status
    const clientStatus = await getClientRoutingStatus(supabase, message);
    
    // 🔐 Log mascarado do status
    const cpfForLog = clientStatus.cpf ? redactCPF(clientStatus.cpf) : null;
    logger.info("Status do cliente obtido", { 
      found: clientStatus.found, 
      error: clientStatus.error,
      isBlocked: clientStatus.isBlocked,
      isOffline: clientStatus.isOffline,
      cpf_masked: cpfForLog,
      inputType,
    });

    // 🚨 CASO ESPECIAL: CPF não identificado
    if (clientStatus.error === ErrorCode.NO_CPF) {
      // 🧪 Verificar se mensagem parece ser um CPF inválido
      const cpfAttempt = validateAndMaskCPF(message);
      
      let askCPFMessage: string;
      if (!cpfAttempt.isValid && message.replace(/\D/g, '').length === 11) {
        // CPF com 11 dígitos mas inválido
        askCPFMessage = `Olá! 👋 Sou a Cloé Martins da SUPERNET.

⚠️ O CPF informado (${cpfAttempt.maskedCPF}) parece estar **incorreto**. 

Por favor, **verifique os números** e envie novamente.

📋 Protocolo: ${protocol}

Exemplo: 000.000.000-00`;
        logger.info("CPF inválido detectado", { masked: cpfAttempt.maskedCPF });
      } else {
        // Sem CPF na mensagem
        askCPFMessage = `Olá! 👋 Sou a Cloé Martins da SUPERNET.

Para começarmos, preciso do seu CPF para localizar seu cadastro.

📋 Protocolo: ${protocol}

Por favor, me informe seu CPF (apenas números):`;
      }

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
    logger.info("Departamento determinado", { targetDepartment, clientFound: clientStatus.found });

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

    // 🚀 Se Cloé continua atendendo, gera uma resposta contextual
    if (targetDepartment === "cloe") {
      logger.info("Cloé continua atendimento - gerando resposta");
      
      // Buscar histórico da conversa
      const { data: messages } = await supabase
        .from("conversation_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      const conversationHistory = messages?.map((msg) => ({
        role: msg.sender_type === "customer" ? "user" : "assistant",
        content: msg.content,
      })) || [];

      // Gerar resposta da Cloé usando IA
      const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: ROUTING_AGENT_CONFIG.model,
          messages: [
            { role: "system", content: ROUTING_AGENT_SYSTEM_PROMPT },
            ...conversationHistory.slice(-ROUTING_AGENT_CONFIG.maxMessagesInContext),
          ],
          temperature: ROUTING_AGENT_CONFIG.temperature,
          max_tokens: ROUTING_AGENT_CONFIG.maxTokens,
        }),
      });

      const aiData = await aiResponse.json();
      const cloeMessage = aiData.choices?.[0]?.message?.content || "Como posso ajudar?";

      // Salvar resposta da Cloé
      await supabase.from("conversation_messages").insert({
        conversation_id: conversationId,
        sender_type: "agent",
        sender_name: "Cloé Martins",
        content: cloeMessage,
      });

      logger.info("Resposta da Cloé gerada", { messagePreview: cloeMessage.slice(0, 50) });
      
      return new Response(
        JSON.stringify({ ok: true, protocol, targetDepartment: "cloe", message: cloeMessage }),
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
      logger.info("Invocando Luan (support-tech-agent)", {
        cpf_redacted: `***${clientStatus.cpf?.slice(-3)}`,
        ixc_client_id: clientStatus.id,
        isOffline: clientStatus.isOffline,
        suggestAutoReboot: clientStatus.suggestAutoReboot,
        cpf_not_found: !clientStatus.found
      });
      
      const { error: techError } = await supabase.functions.invoke("support-tech-agent", {
        body: {
          conversation_id: conversationId,
          customer_cpf: clientStatus.cpf ?? null,
          ixc_client_id: clientStatus.id ?? null,
          message: "", // Handoff inicial: força saudação e lógica de offline/reboot
          suggested_action: clientStatus.suggestAutoReboot ? "auto_reboot" : null,
          client_is_offline: clientStatus.isOffline === true,
          cpf_not_found: !clientStatus.found, // 🆕 Indica que CPF não foi encontrado
        },
      });
      if (techError) logger.error("Erro ao chamar Luan", { error: techError });
      else logger.info("Luan invocado com sucesso");
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
