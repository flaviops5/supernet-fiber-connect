import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ROUTING_AGENT_CONFIG } from "./config.ts";
import { CLOE_MARTINS_SYSTEM_PROMPT, ROUTING_AGENT_SYSTEM_PROMPT } from "./prompts.ts";
import { massOutageContext } from "../_shared/mass-outage-helper.ts";
import { createLogger } from "../_shared/structured-logger.ts";
import { handleEdgeFunctionError, corsHeaders, StandardError } from "../_shared/error-handler.ts";
import type { JsonValue, JsonObject } from "../_shared/error-types.ts";
import type { LovableAIResponse, AgentRequest } from "../_shared/agent-types.ts";
// >>> PR10A - Geolocalização
import { ensureGeo, withGeo } from "../_shared/geo.ts";
// <<< PR10A
import {
  getClientRoutingStatus,
  determineTargetDepartment,
  createSanitizedMetadata,
  ErrorCode,
  redactCPF,
  detectInputType,
} from "./helpers.ts";
import { validateAndMaskCPF } from "../_shared/validateAndMaskCPF.ts";

// CORS headers imported from error-handler

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
    const attachments = body.attachments ?? [];

    if (!conversationId || !message) {
      logger.error("conversationId ou message ausente", { body });
      return new Response(
        JSON.stringify({ ok: false, error: "conversationId e message são obrigatórios", body }),
        { headers: corsHeaders, status: 400 }
      );
    }

    logger.info("Routing Agent iniciado", { conversationId });

    // ===========================================================
    // 🧪 TEST HARNESS MODE (Fail-Safe) — roteamento por intenção
    // ===========================================================
    const envHarness = Deno.env.get("TEST_HARNESS") === "true";
    const envType = Deno.env.get("ENVIRONMENT") || "development";
    const bodyHarness = body?.testMode === true || body?.test_harness === true;

    const TEST_HARNESS = envHarness || bodyHarness;

    if (TEST_HARNESS) {
      if (envType === "production") {
        throw new Error("⚠️ TEST_HARNESS não pode estar ativo em produção!");
      }

      logger.info("🧪 TEST HARNESS ativo — ignorando CPF e roteando por intenção.", {
        envHarness,
        bodyHarness,
        environment: envType,
      });

      const messageText = (message || "").toLowerCase();

      const createTestResponse = async (agentName: string, reason: string) => {
        const protocol = `TEST-${Date.now()}`;
        
        // 🎭 Respostas simuladas realistas por agente
        const agentResponses: Record<string, string> = {
          "Luan": "Entendi! Vou verificar seu sinal agora. Me dê um momento para fazer o diagnóstico completo da sua conexão. 🔧",
          "Julia": "Claro! Vou localizar sua fatura agora. Um momento enquanto verifico sua situação financeira. 💰",
          "Vicente": "Ótimo! Deixa eu verificar as opções disponíveis pra você. Vou te passar os detalhes rapidinho! 📋",
          "Cloé Martins": "Oi! Entendi sua solicitação. Deixa eu te ajudar com isso! 😊"
        };

        const responseMessage = agentResponses[agentName] || agentResponses["Cloé Martins"];
        
        await supabase.from("conversation_messages").insert({
          conversation_id: conversationId,
          sender_type: "agent",
          sender_name: agentName,
          content: responseMessage,
        });

        await supabase.from("conversations").update({
          department: agentName.toLowerCase(),
          metadata: { protocol, testHarness: true, routeReason: reason },
          updated_at: new Date().toISOString(),
        }).eq("id", conversationId);

        logger.info("🧪 Roteamento de teste concluído", { agentName, reason });

        // Normalizar nome do agente para comparação
        const normalizedAgent = agentName.toLowerCase().replace(/[áàãâ]/g, 'a').replace(/[éê]/g, 'e');
        const agentKey = normalizedAgent === "cloé martins" ? "cloe" : normalizedAgent;

        return new Response(
          JSON.stringify({
            ok: true,
            protocol,
            agent: agentKey,
            next_action: agentKey,
            targetDepartment: agentKey,
            message: responseMessage,
            testHarness: true,
            routeReason: reason,
            confidence: 0.95,
          }),
          { headers: corsHeaders, status: 200 },
        );
      };

      // 🔧 Regras de intenção (ordem: comercial → financeiro → técnico)
      // 1️⃣ COMERCIAL (maior prioridade para evitar conflitos)
      if (messageText.match(/contratar|assinar|novo cliente|quero internet|fibra|plano|cobertura|promo|velocidade|upgrade|cancelar|mudar|mais rápido|aumentar velocidade|trocar plano|atendem.*área|disponível.*região|instalar|vendas|mudar.*casa|mudar.*endereço|transfere.*contrato|transferir.*contrato|mudança.*endereço|atendente|falar.*atendente|atendimento.*humano|pessoa.*real|não.*robô/))
        return await createTestResponse("Vicente", "intencao_comercial_simulada");

      // 2️⃣ FINANCEIRO
      if (messageText.match(/boleto|pix|paguei|fatura|pagamento|financeiro|débito|parcelar|nota fiscal|segunda via|vencimento|vence|quando vence|data de vencimento|conta|mensalidade|valor|cobrança|mais car/))
        return await createTestResponse("Julia", "intencao_financeira_simulada");

      // 3️⃣ TÉCNICO (por último para não capturar "internet" em contexto comercial)
      if (messageText.match(/caiu|lenta|lento|travando|sem sinal|offline|conexão ruim|modem|roteador|reiniciar|reboot|desconectando|instável|oscilando|cai toda|abandona|problema na internet|internet não funciona|internet ruim|demorando|site.*carreg|site.*abr|não carrega|não abre|sinal.*fort|sinal.*alt|bombando|próxim.*CTO|perto.*antena|coladinho.*antena|TX.*alto|RX.*baix/))
        return await createTestResponse("Luan", "intencao_tecnica_simulada");

      return await createTestResponse("Cloé Martins", "roteamento_padrao_teste");
    }
    // ===========================================================

    // 🔍 Detectar tipo de entrada (CPF, telefone, outro)
    const inputType = detectInputType(message);
    logger.info("Tipo de entrada detectado", { inputType });

    // Gerar protocolo único
    const protocol = `PROT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    logger.info("Protocolo gerado", { protocol });

    // 🧩 NOVA INTEGRAÇÃO IXC: Buscar cliente e determinar status
    const clientStatus = await getClientRoutingStatus(supabase, message);
    
    // ✅ Validação defensiva de resposta nula
    if (!clientStatus) {
      logger.error("getClientRoutingStatus retornou null/undefined");
      return new Response(
        JSON.stringify({ ok: false, error: "Erro ao buscar status do cliente" }),
        { headers: corsHeaders, status: 500 }
      );
    }
    
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
        askCPFMessage = `Olá! 👋 Sou a Cloé Martins da SUPERNET. 📋 Protocolo: ${protocol}

⚠️ O CPF informado (${cpfAttempt.maskedCPF}) parece estar **incorreto**. 

Por favor, **verifique os números** e envie novamente 😊`;
        logger.info("CPF inválido detectado", { masked: cpfAttempt.maskedCPF });
      } else {
        // Sem CPF na mensagem
        askCPFMessage = `Olá! 👋 Sou a Cloé Martins da SUPERNET. 📋 Protocolo: ${protocol}

Para começarmos, preciso do seu CPF para localizar seu cadastro, isso deve levar menos de 1 minuto, por favor aguarde 😊`;
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
      
      // >>> PR10A - Captura geo após confirmar cliente
      const { data: currentConv } = await supabase
        .from("conversations")
        .select("metadata, customer_phone")
        .eq("id", conversationId)
        .single();
      
      let flowState = (currentConv?.metadata as any)?.flow_state || {};
      
      const geoData = await ensureGeo(
        supabase,
        { conversation_id: conversationId, flowState },
        clientStatus.id,
        currentConv?.customer_phone
      );
      
      flowState = { ...flowState, geo: geoData };
      
      await supabase.from("registros_de_monitoramento").insert({
        acao: "routing_initial",
        fluxo: "routing-agent",
        conversation_id: conversationId,
        detalhes: withGeo({ target_department: targetDepartment }, flowState)
      });
      
      logger.info("Geolocalização capturada no routing", { cidade: geoData.cidade, source: geoData.source });
      // <<< PR10A
    }

    // 🔔 Mensagem de confirmação após CPF validado
    if (clientStatus.found) {
      // Extrair apenas o primeiro nome
      const firstName = clientStatus.name?.split(' ')[0] || 'Cliente';
      
      await supabase.from("conversation_messages").insert({
        conversation_id: conversationId,
        sender_type: "agent",
        sender_name: "Cloé Martins",
        content: `Olá ${firstName}! Me dê mais um minutinho para verificar tudo!`,
      });
    }

    // 📤 Fluxo específico para suporte técnico
    if (targetDepartment === "tecnico") {
      // Aguardar 2 segundos após a mensagem de confirmação
      await new Promise(resolve => setTimeout(resolve, 2000));
      logger.info("Cliente offline detectado - iniciando fluxo de reboot pela Cloé", {
        cpf_redacted: `***${clientStatus.cpf?.slice(-3)}`,
        ixc_client_id: clientStatus.id,
        isOffline: clientStatus.isOffline,
      });

      let rebootResult = null;
      let onuSignal = null;

      // 🔄 CLOÉ EXECUTA REBOOT se cliente está offline
      if (clientStatus.isOffline && clientStatus.id) {
        logger.info("Cloé executando reboot remoto", { ixc_client_id: clientStatus.id });
        
        // Mensagem informando sobre o reboot
        await supabase.from("conversation_messages").insert({
          conversation_id: conversationId,
          sender_type: "agent",
          sender_name: "Cloé Martins",
          content: "Detectei que você está offline. Vou tentar reiniciar seu equipamento remotamente... 🔄\n\nIsso vai demorar mais um minutinho, por favor aguarde.",
        });
        
        // Aguardar 2 segundos antes de iniciar o reboot
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
          // Executar reboot com timeout de 90s
          const rebootPromise = supabase.functions.invoke("reboot-client-equipment", {
            body: { 
              ixc_client_id: clientStatus.id, 
              customer_cpf: clientStatus.cpf 
            }
          });
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout: reboot demorou mais de 90s")), 90000)
          );

          const { data, error } = await Promise.race([rebootPromise, timeoutPromise]) as { data: JsonObject | null; error: Error | null };
          
          if (!error && data) {
            rebootResult = data;
            logger.info("Reboot concluído pela Cloé", { 
              success: data.ok, 
              isOnline: data.is_online 
            });

            // Se voltou online, confirmar e finalizar
            if (data.is_online) {
              await supabase.from("conversation_messages").insert({
                conversation_id: conversationId,
                sender_type: "agent",
                sender_name: "Cloé Martins",
                content: "✅ Pronto! Seu equipamento voltou online!\n\nTesta aí pra mim? Consegue navegar?",
              });

              // Não transferir para Luan - sucesso!
              logger.info("Reboot bem-sucedido - cliente voltou online");
              return new Response(
                JSON.stringify({ ok: true, protocol, targetDepartment: "cloe", reboot_success: true }),
                { headers: corsHeaders, status: 200 }
              );
            }
          }
        } catch (rebootError) {
          logger.error("Erro no reboot pela Cloé", { error: rebootError instanceof Error ? rebootError.message : 'Unknown error' });
        }

        // Reboot falhou ou cliente ainda offline - buscar TX/RX para Luan
        logger.info("Reboot falhou - buscando sinal ONU para diagnóstico", { ixc_client_id: clientStatus.id });
        
        try {
          const { data: signalData } = await supabase.functions.invoke("ixc-onu-signal", {
            body: { ixc_client_id: clientStatus.id }
          });

          if (signalData?.success && signalData.data) {
            onuSignal = signalData.data;
            logger.info("Sinal ONU obtido", { tx: onuSignal.tx_power, rx: onuSignal.rx_power });
          }
        } catch (signalError) {
          logger.error("Erro ao buscar sinal ONU", { error: signalError instanceof Error ? signalError.message : 'Unknown error' });
        }

        // Aguardar 3 segundos antes de enviar mensagem de transferência
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Mensagem informando que o reboot não resolveu
        await supabase.from("conversation_messages").insert({
          conversation_id: conversationId,
          sender_type: "agent",
          sender_name: "Cloé Martins",
          content: "⚠️ Tentei reiniciar remotamente, mas seu equipamento ainda está offline.\n\nVou te transferir para o Luan, nosso técnico especializado. Ele vai fazer um diagnóstico completo! ⏳",
        });
      }

      // Transferir para Luan com resultado do reboot e sinal ONU
      logger.info("Invocando Luan após tentativa de reboot", {
        reboot_attempted: !!rebootResult,
        reboot_success: rebootResult?.is_online,
        has_onu_signal: !!onuSignal
      });
      
      const { error: techError } = await supabase.functions.invoke("support-tech-agent", {
        body: {
          conversation_id: conversationId,
          customer_cpf: clientStatus.cpf ?? null,
          ixc_client_id: clientStatus.id ?? null,
          message: "",
          reboot_attempted: true, // Indica que Cloé já tentou reboot
          reboot_result: rebootResult,
          onu_signal: onuSignal, // TX/RX para análise
          client_is_offline: clientStatus.isOffline === true,
          cpf_not_found: !clientStatus.found,
          attachments: attachments, // 🖼️ Passar imagens para o Luan
        },
      });
      if (techError) logger.error("Erro ao chamar Luan", { error: techError });
      else logger.info("✅ Luan invocado com sucesso");
      
      logger.info("Roteamento concluído", { protocol, targetDepartment });
      return new Response(
        JSON.stringify({ ok: true, protocol, targetDepartment }),
        { headers: corsHeaders, status: 200 }
      );
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

      // 🆕 Criar contexto atual do cliente para a IA
      const contextMessage = clientStatus.found
        ? `[CONTEXTO INTERNO - Cliente encontrado: ${clientStatus.name}, CPF ${clientStatus.cpf_masked}, ${clientStatus.isBlocked ? 'BLOQUEADO' : 'ativo'}, ${clientStatus.isOffline ? 'OFFLINE' : 'online'}. Use estas informações para personalizar o atendimento.]`
        : `[CONTEXTO INTERNO - Cliente NÃO encontrado no sistema com este CPF]`;

      // Gerar resposta da Cloé usando Lovable AI com fallback
      let cloeMessage = "Como posso ajudar?";
      
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: ROUTING_AGENT_CONFIG.model,
            messages: [
              { role: "system", content: ROUTING_AGENT_SYSTEM_PROMPT },
              ...conversationHistory.slice(-ROUTING_AGENT_CONFIG.maxMessagesInContext),
              { role: "system", content: contextMessage }, // 🆕 Adiciona contexto atual
            ],
            temperature: ROUTING_AGENT_CONFIG.temperature,
            max_tokens: ROUTING_AGENT_CONFIG.maxTokens,
          }),
        });

        if (!aiResponse.ok) {
          throw new Error(`Lovable AI error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json() as LovableAIResponse;
        cloeMessage = aiData.choices?.[0]?.message?.content || "Olá! Como posso ajudar você hoje?";
      } catch (aiError) {
        logger.error("Erro ao chamar Lovable AI", { error: aiError instanceof Error ? aiError.message : 'Unknown error' });
        cloeMessage = "Olá! Estou aqui para ajudar. Qual é sua necessidade hoje?";
      }

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

    // 💬 Para outros departamentos, enviar mensagem de transferência
    const departmentNames: Record<string, string> = {
      financeiro: "Financeiro (Julia)",
      comercial: "Comercial (Vicente)",
    };

    const transferMessage = `Perfeito! Vou te transferir para o time ${departmentNames[targetDepartment]}. Um momento! ⏳`;

    await supabase.from("conversation_messages").insert({
      conversation_id: conversationId,
      sender_type: "agent",
      sender_name: "Cloé Martins",
      content: transferMessage,
    });

    logger.info("Roteamento concluído", { protocol, targetDepartment });
    return new Response(
      JSON.stringify({ ok: true, protocol, targetDepartment }),
      { headers: corsHeaders, status: 200 }
    );
  } catch (err) {
    return handleEdgeFunctionError(err, "routing-agent");
  }
});
