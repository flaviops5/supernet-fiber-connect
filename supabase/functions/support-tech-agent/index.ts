import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/structured-logger.ts";
import { getMassOutageContext } from "../_shared/mass-outage-helper.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    logger.info("Luan iniciou atendimento técnico", { conversation_id, customer_cpf });

    // Verificar se há pane massiva ativa (dados frescos) - com fallback seguro
    let outage = { active: false, affectedRegions: [] as string[], affectedCount: 0 };
    try {
      const ctx = await getMassOutageContext(supabase, conversation_id, 3000);
      if (ctx && typeof ctx === 'object') {
        outage = {
          active: !!ctx.active,
          affectedRegions: Array.isArray(ctx.affectedRegions) ? ctx.affectedRegions : [],
          affectedCount: Number(ctx.affectedCount) || 0,
        };
      }
    } catch (e) {
      logger.warn("Falha ao obter contexto de pane", { error: (e as Error)?.message ?? String(e) });
    }
    
    // Mensagem inicial do Luan
    let initialMessage = "Olá! Sou o Luan do suporte técnico. Recebi seu protocolo e vou te ajudar agora! ⚙️";
    
    if (outage.active) {
      const regionsText = outage.affectedRegions.join(", ");
      initialMessage = `${initialMessage}\n\n⚠️ ATENÇÃO: Detectamos uma instabilidade na região de ${regionsText} afetando ${outage.affectedCount} clientes. Nossa equipe técnica já está trabalhando na solução.`;
      logger.info("Pane massiva detectada", { 
        regions: outage.affectedRegions, 
        affected: outage.affectedCount 
      });
    }
    
    const { error: insertErr } = await supabase.from("conversation_messages").insert({
      conversation_id,
      sender_type: "agent",
      sender_name: "Luan Silva",
      content: initialMessage,
      ai_suggestion: false,
    });
    
    if (insertErr) {
      logger.error("Erro ao inserir mensagem", { error: insertErr.message });
      throw insertErr;
    }

    logger.info("Mensagem do Luan enviada", { conversation_id });

    return new Response(
      JSON.stringify({ ok: true, agent: "support_tech" }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const err = (error as Error)?.message ?? String(error);
    logger.error("Erro no suporte técnico", { error: err });
    
    return new Response(
      JSON.stringify({ 
        error: err,
        message: "Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente ou entre em contato pelo telefone (11) 99999-9999."
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
