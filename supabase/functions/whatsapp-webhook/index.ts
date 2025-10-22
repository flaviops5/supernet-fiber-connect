import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { validateHMACRequest } from '../_shared/hmac.ts';
import { redactPII, redactPIIObject, extractCPF } from '../_shared/pii-redaction.ts';
import { logLGPDAccess, logConversationAccess } from '../_shared/lgpd-logger.ts';
import { handleEdgeFunctionError } from '../_shared/error-handler.ts';
import { recordMetric } from '../_shared/metrics-helper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hmac-signature, x-hmac-timestamp',
};

// Correlation ID para rastreamento end-to-end
function generateCorrelationId(): string {
  return `whatsapp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

serve(async (req) => {
  const correlationId = generateCorrelationId();
  const startTime = Date.now();
  
  console.log(`🎯 [${correlationId}] Webhook endpoint hit`, {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  });

  if (req.method === 'OPTIONS') {
    console.log(`✅ [${correlationId}] OPTIONS request handled`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Sprint 1: Validação HMAC (opcional, para compatibilidade)
    const hmacSecret = Deno.env.get('HMAC_SHARED_SECRET');
    if (hmacSecret) {
      const hmacValidation = await validateHMACRequest(req.clone(), hmacSecret);
      if (!hmacValidation.valid) {
        console.warn(`⚠️ [${correlationId}] HMAC validation failed: ${hmacValidation.error}`);
        // Não bloqueia por compatibilidade, apenas loga
      } else {
        console.log(`✅ [${correlationId}] HMAC validated successfully`);
      }
    }

    let webhookData: any = null;
    let rawBody = '';
    
    try {
      rawBody = await req.text();
      const contentType = req.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        console.warn(`⚠️ [${correlationId}] Unexpected Content-Type: ${contentType}`);
      }

      if (!rawBody || rawBody.trim() === '') {
        console.error(`❌ [${correlationId}] Empty body received from webhook`);
        return new Response(
          JSON.stringify({ success: false, error: 'Empty request body', correlationId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      webhookData = JSON.parse(rawBody);
      console.log(`📥 [${correlationId}] Webhook keys:`, Object.keys(webhookData));

    } catch (e) {
      console.error(`❌ [${correlationId}] Failed to parse JSON body:`, e);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON format',
          details: e instanceof Error ? e.message : 'Unknown error',
          correlationId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Sprint 1: Controle de idempotência
    const webhookId = `${webhookData.instance || 'default'}-${webhookData.data?.key?.id || Date.now()}`;
    
    const { data: existingWebhook } = await supabase
      .from('processed_webhooks')
      .select('id')
      .eq('webhook_id', webhookId)
      .maybeSingle();

    if (existingWebhook) {
      console.log(`⏭️ [${correlationId}] Webhook já processado (idempotência): ${webhookId}`);
      return new Response(
        JSON.stringify({ success: true, status: 'already_processed', correlationId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Registra webhook como processado
    await supabase.from('processed_webhooks').insert({
      webhook_id: webhookId,
      event_type: webhookData.event || 'unknown',
      request_signature: req.headers.get('x-hmac-signature'),
      request_timestamp: req.headers.get('x-hmac-timestamp') ? 
        parseInt(req.headers.get('x-hmac-timestamp')!) : null,
      metadata: { correlationId, rawBodyLength: rawBody.length },
    });

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
      
      // Capturar mensagem de texto ou mídia
      let messageContent = messageData.message?.conversation || 
                           messageData.message?.extendedTextMessage?.text || '';
      
      // Capturar imagens anexadas
      const attachments: any[] = [];
      
      // Verificar se há imagem
      if (messageData.message?.imageMessage) {
        const imageMsg = messageData.message.imageMessage;
        
        // Obter URL da imagem do Evolution API
        const imageUrl = imageMsg.url;
        const caption = imageMsg.caption || '';
        
        if (imageUrl) {
          attachments.push({
            type: 'image',
            url: imageUrl,
            mimeType: imageMsg.mimetype || 'image/jpeg',
            caption: caption
          });
          
          // Se não há texto mas há caption, usar caption como conteúdo
          if (!messageContent && caption) {
            messageContent = caption;
          } else if (!messageContent) {
            messageContent = '📷 [Imagem enviada]';
          }
        }
      }
      
      // Verificar se há documento/PDF (pode ser útil no futuro)
      if (messageData.message?.documentMessage) {
        const docMsg = messageData.message.documentMessage;
        if (docMsg.url) {
          attachments.push({
            type: 'document',
            url: docMsg.url,
            mimeType: docMsg.mimetype || 'application/octet-stream',
            filename: docMsg.fileName || 'documento'
          });
        }
      }
      
      if (!messageContent) {
        messageContent = 'Mensagem de mídia';
      }

      // Sprint 1: Log com PII redaction
      console.log(`📞 [${correlationId}] Message from ${redactPII(customerName, 'logs')} (${redactPII(customerPhone, 'logs')}): ${redactPII(messageContent, 'ai')}`);

      // Sprint 1: Extrai CPF da mensagem (se houver)
      const extractedCPF = extractCPF(messageContent);
      if (extractedCPF) {
        console.log(`🆔 [${correlationId}] CPF detectado na mensagem (mascarado)`);
      }

      // 🛡️ RATE LIMITING: Verificar limite de mensagens
      const rateLimitWindow = 15; // minutos
      const maxMessagesPerWindow = 10;
      
      const { data: recentMessages, error: rateLimitError } = await supabase
        .from('conversation_messages')
        .select('id, created_at')
        .eq('sender_type', 'customer')
        .gte('created_at', new Date(Date.now() - rateLimitWindow * 60 * 1000).toISOString())
        .ilike('metadata->>customer_phone', customerPhone);

      if (!rateLimitError && recentMessages && recentMessages.length >= maxMessagesPerWindow) {
        console.warn(`⚠️ [${correlationId}] Rate limit exceeded for ${redactPII(customerPhone, 'logs')}`);
        
        // Enviar mensagem de aviso
        await supabase.functions.invoke('send-whatsapp-message', {
          body: {
            phone: customerPhone,
            message: '⚠️ Você atingiu o limite de mensagens. Por favor, aguarde alguns minutos antes de enviar novas mensagens.\n\nSe for urgente, ligue: (61) 99947-5886'
          }
        });

        return new Response(
          JSON.stringify({ success: true, rateLimited: true, correlationId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 🚫 OPT-OUT LGPD: Verificar comandos de cancelamento
      const optOutCommands = ['SAIR', 'RECUSAR', 'PARAR', 'STOP', 'CANCELAR', 'NAO QUERO'];
      const normalizedMessage = messageContent.toUpperCase().trim();
      
      if (optOutCommands.includes(normalizedMessage)) {
        console.log(`🚫 [${correlationId}] Opt-out requested by ${redactPII(customerPhone, 'logs')}`);
        
        // Marcar opt-out na conversa
        const { data: conversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('customer_phone', customerPhone)
          .eq('channel', 'whatsapp')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (conversation) {
          await supabase
            .from('conversations')
            .update({
              opt_out_requested: true,
              opt_out_date: new Date().toISOString(),
              status: 'resolved',
              resolved_at: new Date().toISOString(),
              lgpd_consent: false,
              metadata: { opt_out_reason: 'user_request', correlationId }
            })
            .eq('id', conversation.id);

          // Log LGPD
          await logLGPDAccess(
            supabase,
            'opt_out',
            'conversation',
            'user_consent',
            'Cliente solicitou opt-out via WhatsApp',
            { phone: customerPhone, conversation_id: conversation.id }
          );
        }

        // Enviar mensagem de confirmação
        await supabase.functions.invoke('send-whatsapp-message', {
          body: {
            phone: customerPhone,
            message: '✅ Entendido! Você não receberá mais mensagens automáticas da SUPERNET FIBRA.\n\nCaso precise de atendimento no futuro, pode nos contatar:\n📞 (61) 99947-5886\n✉️ contato@supernetfibra.com.br\n\nObrigado!'
          }
        });

        return new Response(
          JSON.stringify({ success: true, optOut: true, correlationId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
        // Reabrir conversa recente atualizando a resolvida
        console.log('🔄 Reopening recent resolved conversation:', recentResolved.id);
        const { data: reopenedConv, error: reopenError } = await supabase
          .from('conversations')
          .update({
            status: 'waiting',
            reopened_from_conversation_id: recentResolved.id,
            reopen_count: (recentResolved.reopen_count || 0) + 1,
            last_message_at: new Date().toISOString(),
            metadata: {
              whatsapp_id: messageData.key?.id,
              instance: webhookData.instance,
              auto_reopened: true,
              previous_resolved_at: recentResolved.resolved_at
            }
          })
          .eq('id', recentResolved.id)
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
        
        // UPSERT: criar nova ou atualizar se já existir
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .upsert({
            customer_name: customerName,
            customer_phone: customerPhone,
            channel: 'whatsapp',
            status: 'waiting',
            last_message_at: new Date().toISOString(),
            metadata: {
              whatsapp_id: messageData.key?.id,
              instance: webhookData.instance
            }
          }, {
            onConflict: 'channel,customer_phone',
            ignoreDuplicates: false
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

      // Salvar mensagem do cliente com attachments
      const { error: messageError } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'customer',
          sender_name: customerName,
          content: messageContent,
          attachments: attachments.length > 0 ? attachments : null,
          metadata: {
            whatsapp_message_id: messageData.key?.id,
            timestamp: messageData.messageTimestamp,
            has_attachments: attachments.length > 0
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
          attachments: attachments.length > 0 ? attachments : undefined,
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

      // 🔄 AUTO-ENCERRAMENTO: Verificar se conversa deve ser encerrada
      // Encerra quando:
      // 1. autoClose explícito = true (rate limit, transferência para vendas por falha de CPF)
      // 2. Transferiu para agente especializado que já respondeu (Julia/Luan já atendeu)
      const shouldAutoClose = routingResponse.autoClose === true;
      
      if (shouldAutoClose) {
        console.log('✅ Auto-closing conversation based on agent response');
        await supabase
          .from('conversations')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            metadata: {
              auto_closed: true,
              close_reason: routingResponse.rateLimited ? 'rate_limited' : 
                          routingResponse.routeReason === 'cpf_validation_failed' ? 'transferred_sales' :
                          'info_provided'
            }
          })
          .eq('id', conversationId);
      }
      
      // 📊 Se transferiu para agente especializado (Julia/Luan), atualizar o agente responsável mas manter conversa aberta
      if (routingResponse.autoRouted && !shouldAutoClose) {
        const agentDepartmentMap = {
          'support_financial': 'financeiro',
          'support_tech': 'tecnico'
        };
        
        const department = agentDepartmentMap[routingResponse.agent];
        if (department) {
          console.log(`📍 Updating conversation department to: ${department}`);
          await supabase
            .from('conversations')
            .update({
              department: department,
              status: 'active' // Mantém ativa para o novo agente
            })
            .eq('id', conversationId);
        }
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
    recordMetric({
      agent_name: 'whatsapp-webhook',
      action_type: 'webhook_processed',
      success: true,
      duration_ms: Date.now() - startTime,
      metadata: { event_type: eventType }
    }).catch(console.error);
    
    return new Response(
      JSON.stringify({ success: true, eventType: eventType, processed: false }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Webhook error:', error);
    
    // Registrar métrica de erro
    recordMetric({
      agent_name: 'whatsapp-webhook',
      action_type: 'webhook_processed',
      success: false,
      duration_ms: Date.now() - startTime,
      error_message: error.message || 'Unknown error'
    }).catch(console.error);
    
    return handleEdgeFunctionError(error, 'whatsapp-webhook');
  }
});
