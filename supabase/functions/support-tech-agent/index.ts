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
    const { conversation_id, customer_cpf, message } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    logger.info("Luan atendendo", { conversation_id, customer_cpf, message });

    // Buscar histórico de mensagens da conversa
    const { data: messageHistory } = await supabase
      .from("conversation_messages")
      .select("sender_type, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });

    const hasHistory = messageHistory && messageHistory.length > 0;

    // Verificar se é a primeira mensagem (quando vem do routing-agent sem message)
    const isFirstMessage = !message || message.trim() === "" || !hasHistory;

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
      responseMessage = "Olá! Sou o Luan do suporte técnico. Recebi seu protocolo e vou te ajudar agora! ⚙️";
      
      if (outageActive && outageRegion) {
        responseMessage += `\n\n⚠️ ATENÇÃO: Detectamos uma instabilidade na região de ${outageRegion} afetando ${outageCount} clientes. Nossa equipe técnica já está trabalhando na solução.`;
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
        } else {
          responseMessage = "Entendi. Vamos continuar o diagnóstico! 🔧\n\nVocê está conectado por cabo de rede ou Wi-Fi?\n\nIsso vai me ajudar a identificar se o problema é no equipamento ou na conexão sem fio.";
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
