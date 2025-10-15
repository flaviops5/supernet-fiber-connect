import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/structured-logger.ts";
import { massOutageContext } from "../_shared/mass-outage-helper.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logger = createLogger("support-tech-agent", req);

  try {
    const { conversation_id, customer_cpf, message, ixc_client_id, suggested_action, client_is_offline, cpf_not_found } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    logger.info("Luan atendendo", { 
      conversation_id, 
      customer_cpf, 
      message,
      ixc_client_id,
      suggested_action,
      client_is_offline,
      cpf_not_found,
      isFirstMessage: !message || message.trim() === ""
    });

    // Buscar histórico de mensagens da conversa
    const { data: messageHistory } = await supabase
      .from("conversation_messages")
      .select("sender_type, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });

    const hasHistory = messageHistory && messageHistory.length > 0;

    // Verificar se é a primeira mensagem (quando vem do routing-agent sem message)
    const isFirstMessage = !message || message.trim() === "" || !hasHistory;
    
    logger.info("Verificação de primeira mensagem", {
      isFirstMessage,
      hasMessage: !!message,
      messageLength: message?.length,
      hasHistory,
      historyLength: messageHistory?.length
    });

    // Verificar se há pane massiva ativa (contexto em memória)
    let outageActive = massOutageContext.active;
    let outageRegion = massOutageContext.affectedRegion || "";
    let outageCount = massOutageContext.affectedCount || 0;
    
    if (outageActive) {
      logger.info("Pane massiva detectada", { 
        region: outageRegion, 
        affected: outageCount 
      });
    }
    
    let responseMessage = "";

    // Se é a primeira mensagem, enviar saudação
    if (isFirstMessage) {
      logger.info("Luan enviando mensagem inicial", {
        outageActive,
        suggested_action,
        client_is_offline,
        ixc_client_id,
        cpf_not_found
      });
      
      // Buscar informações da conversa para personalizar a mensagem
      const { data: conversation } = await supabase
        .from("conversations")
        .select("customer_name, metadata")
        .eq("id", conversation_id)
        .single();

      const customerName = conversation?.customer_name || "cliente";
      const cpfRetryCount = (conversation?.metadata as any)?.cpf_retry_count || 0;

      // 🚨 CASO ESPECIAL: CPF não encontrado
      if (cpf_not_found) {
        if (cpfRetryCount >= 2) {
          // Já tentou 3 vezes (0, 1, 2) - transferir para humano
          logger.info("Luan: CPF não encontrado após 3 tentativas - transferindo para humano");
          responseMessage = `${customerName}, não consegui localizar seu CPF no sistema após algumas tentativas. 😕\n\nVou te transferir para um atendente humano que pode te ajudar melhor com isso. Só um momento! ⏳`;
          
          // Atualizar conversa para status "aguardando humano"
          await supabase
            .from("conversations")
            .update({
              status: "active",
              department: "tecnico",
              assigned_agent_id: null,
              metadata: {
                ...(conversation?.metadata as any || {}),
                needs_human_transfer: true,
                transfer_reason: "cpf_not_found_after_retries"
              }
            })
            .eq("id", conversation_id);
        } else {
          // Primeira ou segunda tentativa - pedir CPF novamente
          const attemptNumber = cpfRetryCount + 1;
          logger.info(`Luan: CPF não encontrado - tentativa ${attemptNumber}/3`);
          
          responseMessage = `${customerName}, não encontrei esse CPF no nosso sistema. 🔍\n\nPode confirmar o CPF para mim? Digite apenas os números, por favor.\n\n(Tentativa ${attemptNumber} de 3)`;
          
          // Incrementar contador de retry
          await supabase
            .from("conversations")
            .update({
              metadata: {
                ...(conversation?.metadata as any || {}),
                cpf_retry_count: cpfRetryCount + 1
              }
            })
            .eq("id", conversation_id);
        }
      } else {
        // Resetar contador se CPF foi encontrado
        if (cpfRetryCount > 0) {
          await supabase
            .from("conversations")
            .update({
              metadata: {
                ...(conversation?.metadata as any || {}),
                cpf_retry_count: 0
              }
            })
            .eq("id", conversation_id);
        }

        // Mensagem inicial seguindo o prompt do sistema
        if (outageActive && outageRegion) {
          // Caso especial: Pane massiva
          responseMessage = `Olá ${customerName}! Sou o **Luan Silva**, do Suporte Técnico da SUPERNET. 👋\n\n⚠️ **ATENÇÃO**: Detectamos uma instabilidade geral na região de ${outageRegion} afetando ${outageCount} clientes.\n\nNossa equipe técnica já está trabalhando para normalizar o serviço. Você não está sozinho nessa! Vou te manter informado sobre o andamento.`;
        } else if (suggested_action === "auto_reboot" && ixc_client_id) {
          // Caso especial: Auto-reboot sugerido pela Cloé
          responseMessage = `Olá ${customerName}! Sou o **Luan Silva**, do Suporte Técnico da SUPERNET. 👋\n\nEntendo que ficar sem internet é frustrante. Vi que você está offline. Vou fazer um reinício remoto do seu equipamento agora - isso leva cerca de 1 minuto... 🔄`;
        } else if (client_is_offline) {
          // Cliente offline - começar troubleshooting
          logger.info("Luan: Cliente offline detectado - iniciando troubleshooting");
          responseMessage = `Olá ${customerName}! Sou o **Luan Silva**, do Suporte Técnico da SUPERNET. 👋\n\nEntendo que ficar sem internet é frustrante. Vi que você está offline. Vamos resolver isso agora!\n\nPara começar, me diga: **as luzes do seu equipamento estão acesas?**\n\n💡 Especialmente a luz PON/LOS - está **verde** ou **vermelha**?`;
        } else {
          // Mensagem genérica para outros casos
          responseMessage = `Olá ${customerName}! Sou o **Luan Silva**, do Suporte Técnico da SUPERNET. 👋\n\nEntendo que ficar sem internet é frustrante. Vou te ajudar a resolver isso agora!\n\nVamos começar: **qual problema você está enfrentando?**`;
        }
      }

      const { error: insertErr } = await supabase.from("conversation_messages").insert({
        conversation_id,
        sender_type: "agent",
        sender_name: "Luan Silva",
        content: responseMessage,
        ai_suggestion: false
      });
      
      if (insertErr) {
        logger.error("Erro ao inserir mensagem", { error: insertErr.message });
        throw insertErr;
      }

      logger.info("Mensagem inicial do Luan enviada");

      // 🆕 EXECUTAR REBOOT E AGUARDAR CONCLUSÃO
      if (suggested_action === "auto_reboot" && ixc_client_id) {
        logger.info("Iniciando reboot automático", { ixc_client_id });
        
        // Promise com timeout de 90 segundos
        await Promise.race([
          supabase.functions.invoke("reboot-client-equipment", {
            body: { ixc_client_id, customer_cpf }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout: reboot demorou mais de 90s")), 90000)
          )
        ])
          .then(async (response: any) => {
            const { data: rebootResult, error: rebootError } = response;
            
            if (rebootError) {
              logger.error("Erro ao executar reboot", { error: rebootError.message });
              throw rebootError;
            }

            logger.info("Reboot concluído", { 
              success: rebootResult?.ok, 
              isOnline: rebootResult?.is_online,
              duration_ms: rebootResult?.duration_ms
            });

            // Enviar atualização ao cliente baseada no resultado
            let updateMessage = "";
            const needsEscalation = !rebootResult?.is_online && rebootResult?.ok !== false;
            
            if (rebootResult?.is_online) {
              updateMessage = "✅ Ótima notícia! Seu equipamento foi religado e já está ONLINE!\n\nTesta aí pra mim? Consegue navegar agora?";
            } else if (rebootResult?.ok === false) {
              // Reboot falhou (equipamento não respondeu)
              updateMessage = "⚠️ Tentei reiniciar remotamente, mas não consegui comunicação com o equipamento.\n\nPreciso que você faça o seguinte:\n\n1. 🔌 Desconecte o cabo de força do equipamento\n2. ⏱️ Aguarde 30 segundos\n3. 🔌 Reconecte o cabo\n\nMe avisa quando ligar!";
            } else {
              // Reboot executado mas cliente ainda offline → FLUXO DE ESCALONAMENTO
              updateMessage = "⚠️ Reiniciei o equipamento remotamente, mas ele ainda está offline após 60 segundos.\n\n**Isso pode indicar:**\n🔴 Problema de sinal óptico (fibra)\n🔴 Equipamento com defeito\n🔴 Problema na rede\n\n**Próximo passo:** Vou escalar para nossa equipe técnica de campo verificar o sinal da ONU e a conexão física.\n\nVocê receberá contato em até 4 horas úteis. Enquanto isso, se as luzes do equipamento voltarem, me avise!";
            }

            await supabase.from("conversation_messages").insert({
              conversation_id,
              sender_type: "agent",
              sender_name: "Luan Silva",
              content: updateMessage,
              ai_suggestion: false,
              metadata: needsEscalation ? { 
                reboot_failed_escalation: true, 
                ixc_client_id,
                reason: "equipment_offline_after_reboot" 
              } : {}
            });
            
            // Se precisa escalar, marcar conversa para técnico de campo
            if (needsEscalation) {
              await supabase.from("conversations").update({
                status: "escalated",
                priority: 2,
                tags: ["reboot_failed", "needs_field_tech"],
                metadata: {
                  escalation_reason: "Equipment offline after remote reboot",
                  escalated_at: new Date().toISOString(),
                  ixc_client_id
                }
              }).eq("id", conversation_id);
              
              logger.info("Conversa escalada para técnico de campo", { conversation_id });
            }
            
            logger.info("Mensagem de conclusão do reboot enviada", { needsEscalation });
          })
          .catch(async (err) => {
            logger.error("Erro no reboot background", { 
              error: err.message,
              isTimeout: err.message.includes("Timeout")
            });

            // Mensagem de fallback para o cliente
            const fallbackMessage = "⚠️ Não consegui concluir o reinício remoto (problema de comunicação).\n\nVamos fazer manualmente:\n\n1. 🔌 Desconecte o cabo de força do equipamento\n2. ⏱️ Aguarde 30 segundos\n3. 🔌 Reconecte o cabo\n\nMe avisa quando as luzes acenderem!";

            await supabase.from("conversation_messages").insert({
              conversation_id,
              sender_type: "agent",
              sender_name: "Luan Silva",
              content: fallbackMessage,
              ai_suggestion: false
            }).catch(insertErr => {
              logger.error("Erro ao inserir mensagem de fallback", { error: insertErr.message });
            });
          });
      }
    } else {
      // Continuar atendimento com análise contextual
      logger.info("Luan continuando atendimento", { message, historyLength: messageHistory?.length });

      // Analisar contexto baseado no histórico
      const conversationContext = messageHistory.map(m => m.content.toLowerCase()).join(" ");
      const currentMessage = message.toLowerCase();

      // Lógica de troubleshooting baseada em contexto
      if (conversationContext.includes("sem internet") || conversationContext.includes("offline")) {
        // Cliente está sem internet
        if (currentMessage.includes("não") && (currentMessage.includes("acesa") || currentMessage.includes("luz"))) {
          // Luzes apagadas = sem energia
          responseMessage = "Entendi! Se as luzes do equipamento não estão acesas, pode ser falta de energia.\n\n🔌 Por favor, verifique:\n\n1. Se o cabo de força está bem conectado na tomada\n2. Se a tomada está funcionando (teste com outro aparelho)\n3. Se há energia elétrica no local\n\nApós verificar, me avise o resultado!";
        } else if (currentMessage.includes("sim") || currentMessage.includes("acesa") || currentMessage.includes("luz")) {
          // Luzes acesas mas sem internet
          responseMessage = "Ok, as luzes estão acesas. Vamos fazer mais alguns testes! 🔍\n\nComo estão as luzes especificamente?\n\n💡 LOS (vermelha) - Indica problema de sinal\n💚 PON/INTERNET (verde) - Indica conexão OK\n⚡ POWER (verde) - Indica energia OK\n\nQuais luzes estão acesas e quais não estão?";
        } else if (currentMessage.includes("sem internet")) {
          // Cliente acabou de reportar o problema - começar troubleshooting
          responseMessage = "Entendi, você está sem internet. Vamos resolver isso! 🔧\n\n**Primeiro passo:** As luzes do seu equipamento estão acesas?\n\n💡 Me diga especialmente sobre a luz **PON/LOS** - está **verde** ou **vermelha**?";
        } else {
          responseMessage = "Certo. Vamos continuar o diagnóstico! 🔧\n\nVocê está conectado por cabo de rede ou Wi-Fi?\n\nIsso vai me ajudar a identificar se o problema é no equipamento ou na conexão sem fio.";
        }
      } else if (conversationContext.includes("lento") || conversationContext.includes("devagar")) {
        // Cliente com internet lenta
        responseMessage = "Certo, sobre a lentidão... Vamos fazer alguns testes!\n\n📊 Pode fazer um teste de velocidade em www.fast.com e me passar o resultado?\n\nEnquanto isso, me diga:\n1. Está conectado por cabo ou Wi-Fi?\n2. Quantos dispositivos estão conectados agora?";
      } else {
        // Resposta genérica contextualizada
        responseMessage = "Entendi! Vou te ajudar com isso. 🔧\n\nPode me dar mais detalhes sobre o que está acontecendo? Quanto mais informações você me passar, mais rápido conseguimos resolver!";
      }

      const { error: insertErr } = await supabase.from("conversation_messages").insert({
        conversation_id,
        sender_type: "agent",
        sender_name: "Luan Silva",
        content: responseMessage,
        ai_suggestion: false
      });
      
      if (insertErr) {
        logger.error("Erro ao inserir mensagem de continuação", { error: insertErr.message });
        throw insertErr;
      }

      logger.info("Luan respondeu ao cliente");
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        agent: "support_tech",
        message: responseMessage
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    const err = (error as Error)?.message ?? String(error);
    logger.error("Erro no suporte técnico", { error: err });
    
    return new Response(
      JSON.stringify({ 
        error: err,
        message: "Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente ou entre em contato pelo telefone (11) 99999-9999."
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
