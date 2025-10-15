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

    // Verificar se é a primeira mensagem (quando vem do routing-agent sem message)
    const isFirstMessage = !message || message.trim() === "";

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
      // Continuar atendimento com análise da mensagem
      logger.info("Luan continuando atendimento", { message });

      // Aqui você pode adicionar lógica mais sofisticada com IA
      // Por enquanto, vamos usar respostas básicas
      if (message.toLowerCase().includes("sem internet") || message.toLowerCase().includes("offline")) {
        responseMessage = "Entendi que você está sem internet. Vou verificar o status da sua conexão...\n\nPode me informar se as luzes do seu equipamento estão acesas? 💡";
      } else if (message.toLowerCase().includes("lento") || message.toLowerCase().includes("devagar")) {
        responseMessage = "Certo, vou te ajudar com a lentidão. Primeiro, vamos fazer alguns testes básicos.\n\nVocê está conectado por cabo ou Wi-Fi? 📶";
      } else {
        responseMessage = "Entendi sua situação. Vou te ajudar! Para dar continuidade, você pode me passar mais detalhes sobre o problema? 🔧";
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
