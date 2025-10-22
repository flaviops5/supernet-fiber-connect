import { createPublicHandler } from "../_shared/base-handler.ts";

Deno.serve(createPublicHandler(
  'nps-webhook',
  async (req, { supabase }) => {
    const payload = await req.json();
    console.log('NPS Webhook recebido:', payload);

    // Validar campos obrigatórios
    const { 
      campaign_id, 
      recipient_id,
      customer_name,
      score,
      customer_phone,
      customer_email,
      feedback,
      response_channel = 'whatsapp',
      ixc_client_id
    } = payload;

    if (!campaign_id || !recipient_id || !customer_name || score === undefined) {
      throw new Error('Campos obrigatórios: campaign_id, recipient_id, customer_name, score');
    }

    // Validar score (0-10)
    if (score < 0 || score > 10) {
      throw new Error('Score deve estar entre 0 e 10');
    }

    // Calcular categoria baseado no score
    let category: string;
    if (score >= 9) {
      category = 'promoter';
    } else if (score >= 7) {
      category = 'neutral';
    } else {
      category = 'detractor';
    }

    // Inserir resposta NPS
    const { data: npsResponse, error: insertError } = await supabase
      .from('nps_responses')
      .insert({
        campaign_id,
        recipient_id,
        customer_name,
        customer_phone,
        customer_email,
        score,
        category,
        feedback: feedback || null,
        response_channel,
        ixc_client_id: ixc_client_id || null,
        responded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir resposta NPS:', insertError);
      throw insertError;
    }

    console.log('Resposta NPS registrada com sucesso:', npsResponse);

    // Atualizar status do recipient
    const { error: updateError } = await supabase
      .from('campaign_recipients')
      .update({
        replied_at: new Date().toISOString(),
        response_text: feedback || `Score: ${score}`,
      })
      .eq('id', recipient_id);

    if (updateError) {
      console.error('Erro ao atualizar recipient:', updateError);
    }

    // As triggers do banco já cuidam de:
    // 1. Marcar detractores para follow-up (mark_detractor_followup)
    // 2. Atualizar estatísticas NPS (update_nps_stats)

    return { 
      success: true, 
      message: 'Resposta NPS processada com sucesso',
      data: {
        id: npsResponse.id,
        category,
        follow_up_needed: category === 'detractor',
      }
    };
  }
));
