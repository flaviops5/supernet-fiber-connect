import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🎯 Webhook endpoint hit!', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

let webhookData: any = null;
try {
  const textBody = await req.text();
  const contentType = req.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    console.warn('⚠️ Unexpected Content-Type:', contentType);
  }

  if (!textBody || textBody.trim() === '') {
    console.error('❌ Empty body received from webhook');
    return new Response(
      JSON.stringify({ success: false, error: 'Empty request body' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  webhookData = JSON.parse(textBody);
  console.log('📥 Webhook keys:', Object.keys(webhookData));

} catch (e) {
  console.error('❌ Failed to parse JSON body:', e);
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Invalid JSON format',
      details: e instanceof Error ? e.message : 'Unknown error'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
  );
}

    // Evolution API envia diferentes tipos de eventos
    const eventType = webhookData.event;

    // Processar apenas mensagens recebidas
    if (eventType === 'messages.upsert') {
      const messageData = webhookData.data;
      
      // Ignorar mensagens enviadas por nós mesmos
      if (messageData.key?.fromMe) {
        console.log('⏭️ Ignoring message from self');
        return new Response(JSON.stringify({ success: true, ignored: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const customerPhone = messageData.key?.remoteJid?.replace('@s.whatsapp.net', '') || '';
      const customerName = messageData.pushName || 'Cliente WhatsApp';
      const messageContent = messageData.message?.conversation || 
                           messageData.message?.extendedTextMessage?.text || 
                           'Mensagem de mídia';

      console.log(`📞 Message from ${customerName} (${customerPhone}): ${messageContent}`);

      // Check for feedback response (números de 1 a 5)
      const feedbackMatch = messageContent.trim().match(/^[1-5]$/);
      if (feedbackMatch) {
        const rating = parseInt(feedbackMatch[0]);
        
        // Find most recent resolved conversation for this customer
        const { data: recentConversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('customer_phone', customerPhone)
          .eq('status', 'resolved')
          .order('resolved_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentConversation) {
          await supabase
            .from('conversation_feedback')
            .insert({
              conversation_id: recentConversation.id,
              customer_rating: rating,
              metadata: { source: 'whatsapp_auto' }
            });

          console.log(`⭐ Feedback registered: ${rating} stars`);
          
          // Send thank you message
          await supabase.functions.invoke('send-whatsapp-message', {
            body: {
              phone: customerPhone,
              message: '✅ Obrigado pelo seu feedback! Sua opinião é muito importante para nós.'
            }
          });

          return new Response(JSON.stringify({ 
            success: true, 
            feedbackRegistered: true,
            rating: rating
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Check for recently resolved conversation (auto-reopen within 24h)
      const { data: recentResolved } = await supabase
        .from('conversations')
        .select('id, customer_name, customer_cpf, customer_email, ixc_client_id, department, assigned_agent_id')
        .eq('customer_phone', customerPhone)
        .eq('channel', 'whatsapp')
        .eq('status', 'resolved')
        .gte('resolved_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('resolved_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Buscar conversação ativa ou criar nova
      const { data: existingConversation, error: searchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('customer_phone', customerPhone)
        .eq('channel', 'whatsapp')
        .or('status.eq.active,status.eq.waiting')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (searchError) {
        console.error('Error searching conversation:', searchError);
      }

      let conversationId = existingConversation?.id;
      let isReopen = false;

      // Se não existe conversação ativa, criar ou reabrir
      if (!conversationId && recentResolved) {
        // Reabrir conversa recente mantendo dados do cliente
        console.log('🔄 Reopening recent conversation with existing data');
        const { data: reopenedConv, error: reopenError } = await supabase
          .from('conversations')
          .insert({
            customer_name: recentResolved.customer_name,
            customer_phone: customerPhone,
            customer_cpf: recentResolved.customer_cpf,
            customer_email: recentResolved.customer_email,
            ixc_client_id: recentResolved.ixc_client_id,
            channel: 'whatsapp',
            status: 'waiting',
            department: recentResolved.department,
            assigned_agent_id: recentResolved.assigned_agent_id,
            reopened_from_conversation_id: recentResolved.id,
            reopen_count: 1,
            last_message_at: new Date().toISOString(),
            metadata: {
              whatsapp_id: messageData.key?.id,
              instance: webhookData.instance,
              auto_reopened: true
            }
          })
          .select()
          .single();

        if (reopenError) {
          console.error('Error reopening conversation:', reopenError);
        } else {
          conversationId = reopenedConv.id;
          isReopen = true;
        }
      }
      
      if (!conversationId) {
        console.log('🆕 Creating new conversation');
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({
            customer_name: customerName,
            customer_phone: customerPhone,
            channel: 'whatsapp',
            status: 'waiting',
            last_message_at: new Date().toISOString(),
            metadata: {
              whatsapp_id: messageData.key?.id,
              instance: webhookData.instance
            }
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating/updating conversation:', createError);
          throw createError;
        }

        conversationId = newConversation.id;
      } else {
        console.log('♻️ Using existing conversation:', conversationId);
        // Atualizar última mensagem
        await supabase
          .from('conversations')
          .update({ 
            last_message_at: new Date().toISOString(),
            status: 'active'
          })
          .eq('id', conversationId);
      }

      // Salvar mensagem do cliente
      const { error: messageError } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'customer',
          sender_name: customerName,
          content: messageContent,
          metadata: {
            whatsapp_message_id: messageData.key?.id,
            timestamp: messageData.messageTimestamp
          }
        });

      if (messageError) {
        console.error('Error saving message:', messageError);
        throw messageError;
      }

      // Auto-tag conversation using AI (fire and forget)
      if (!isReopen) {
        supabase.functions.invoke('ai-auto-tag', {
          body: { 
            conversation_id: conversationId,
            message_content: messageContent 
          }
        }).catch(err => console.error('Auto-tag error:', err));
      }

      // Chamar agente de roteamento (Cloé) para processar e responder
      console.log('🤖 Calling routing agent...');
      const { data: routingResponse, error: routingError } = await supabase.functions.invoke('routing-agent', {
        body: {
          message: messageContent,
          conversationId: conversationId,
          context: {
            name: customerName,
            phone: customerPhone,
            channel: 'whatsapp'
          }
        }
      });

      if (routingError) {
        console.error('Routing agent error:', routingError);
        throw routingError;
      }

      console.log('📨 Agent response:', routingResponse);

      // Salvar mensagem do agente ANTES de tentar enviar
      const { error: saveAgentMsgError } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'agent',
          sender_name: 'Cloé Martins',
          content: routingResponse.message,
          ai_suggestion: true
        });

      if (saveAgentMsgError) {
        console.error('⚠️ Error saving agent message:', saveAgentMsgError);
      }

      // Tentar enviar resposta via WhatsApp (não crítico)
      let messageSent = false;
      const { error: sendError } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          phone: customerPhone,
          message: routingResponse.message || 'Olá! Em breve nossa equipe entrará em contato.'
        }
      });

      if (sendError) {
        console.error('⚠️ Failed to send WhatsApp message (conversation saved):', sendError);
        messageSent = false;
      } else {
        console.log('✅ WhatsApp message sent successfully');
        messageSent = true;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          conversationId: conversationId,
          processed: true,
          messageSent: messageSent,
          isReopen: isReopen
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Outros tipos de evento
    return new Response(
      JSON.stringify({ success: true, eventType: eventType, processed: false }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Webhook error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
