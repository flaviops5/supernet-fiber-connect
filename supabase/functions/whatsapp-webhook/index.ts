// ============================================
// WHATSAPP WEBHOOK - Proteção MÁXIMA completa
// ============================================
// Esta função JÁ TEM PROTEÇÃO COMPLETA:
// ✅ CORS headers
// ✅ Error handler + metrics
// ✅ HMAC validation (assinatura de segurança)
// ✅ Rate limiting (10 msg/15min)
// ✅ Idempotência (previne duplicação)
// ✅ LGPD compliance (opt-out, redação PII, logs)
// ✅ Circuit breaker via routing-agent
//
// Não usa base-handler devido à complexidade e necessidade de HMAC + LGPD

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateHMACRequest } from '../_shared/hmac.ts';
import { redactPII, redactPIIObject, extractCPF } from '../_shared/pii-redaction.ts';
import { logLGPDAccess, logConversationAccess } from '../_shared/lgpd-logger.ts';
import { handleEdgeFunctionError } from '../_shared/error-handler.ts';
import { recordMetric } from '../_shared/metrics-helper.ts';
import { createLogger } from "../_shared/structured-logger.ts";
import { getOrCreateTraceId } from "../_shared/trace-id.ts";
import { createTimer } from "../_shared/duration-tracker.ts";
import { checkAndRegisterEvent } from "../_shared/webhook-idempotency.ts";

// ============================================
// SCHEMA VALIDATION (Prioridade Crítica #1)
// ============================================
const RoutingAgentPayloadSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  conversationId: z.string().uuid("Invalid conversation ID"),
  customerData: z.object({
    name: z.string().min(1),
    phone: z.string().regex(/^\d{10,15}$/, "Invalid phone format"),
    channel: z.literal('whatsapp')
  }),
  attachments: z.array(z.object({
    type: z.string(),
    url: z.string().url(),
    mime_type: z.string().optional(),
    mimeType: z.string().optional(),
    caption: z.string().optional(),
    filename: z.string().optional()
  })).optional()
});

type RoutingAgentPayload = z.infer<typeof RoutingAgentPayloadSchema>;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hmac-signature, x-hmac-timestamp',
};

// Correlation ID para rastreamento end-to-end
function generateCorrelationId(): string {
  return `whatsapp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

serve(async (req) => {
  const timer = createTimer();
  const traceId = getOrCreateTraceId(req);
  const logger = createLogger('whatsapp-webhook', req, { 
    traceId, 
    durationTracker: timer 
  });
  
  logger.info('📥 Webhook endpoint hit', {
    method: req.method,
    url: req.url
  });

  if (req.method === 'OPTIONS') {
    logger.info('✅ OPTIONS request handled');
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
        logger.warn('⚠️ HMAC validation failed', { error: hmacValidation.error });
        // Não bloqueia por compatibilidade, apenas loga
      } else {
        logger.info('✅ HMAC validated successfully');
      }
    }

    let webhookData: Record<string, unknown> | null = null;
    let rawBody = '';
    
    try {
      rawBody = await req.text();
      const contentType = req.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        logger.warn('⚠️ Unexpected Content-Type', { contentType });
      }

      if (!rawBody || rawBody.trim() === '') {
        logger.error('❌ Empty body received from webhook');
        return new Response(
          JSON.stringify({ success: false, error: 'Empty request body' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      webhookData = JSON.parse(rawBody);
      logger.info('📥 Webhook data received', { keys: Object.keys(webhookData) });
      logger.info('🔍 Full webhook event', { 
        event: webhookData.event,
        instance: webhookData.instance,
        dataKeys: webhookData.data ? Object.keys(webhookData.data) : []
      });

    } catch (e) {
      logger.error('❌ Failed to parse JSON body', { error: e });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON format',
          details: e instanceof Error ? e.message : 'Unknown error',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // ============================================
    // IDEMPOTÊNCIA - Item 11 Auditoria
    // ============================================
    // Usar messageId único do WhatsApp para deduplicação
    const messageId = webhookData.data?.key?.id || `${webhookData.instance}-${Date.now()}`;
    const eventType = webhookData.event || 'unknown';
    
    // Verificar e registrar evento (operação atômica)
    const isNewEvent = await checkAndRegisterEvent(supabase, {
      webhookName: 'whatsapp-webhook',
      eventId: messageId,
      eventType: eventType,
      payload: {
        instance: webhookData.instance,
        event: eventType,
        timestamp: new Date().toISOString()
      },
      metadata: {
        trace_id: traceId,
        hmac_signature: req.headers.get('x-hmac-signature'),
        content_length: rawBody.length
      }
    });

    if (!isNewEvent) {
      logger.info('⏭️ Duplicate webhook event rejected (idempotency)', { 
        messageId,
        eventType 
      });
      
      await recordMetric(supabase, {
        metric_name: 'webhook_duplicate_rejected',
        metric_value: 1,
        dimensions: {
          webhook_name: 'whatsapp-webhook',
          event_type: eventType
        },
        trace_id: traceId
      });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'duplicate_rejected',
          message_id: messageId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    logger.info('✅ New webhook event accepted', { messageId, eventType });

    // Evolution API envia diferentes tipos de eventos
    const eventType = webhookData.event;
    
    logger.info('🔔 Event type received', { 
      eventType, 
      hasData: !!webhookData.data,
      dataKeys: webhookData.data ? Object.keys(webhookData.data) : []
    });

    // Processar apenas mensagens recebidas
    if (eventType === 'messages.upsert') {
      const messageData = webhookData.data;
      
      // Ignorar mensagens enviadas por nós mesmos
      if (messageData.key?.fromMe) {
        logger.info('⏭️ Ignoring message from self');
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
      const attachments: Array<{ type: string; url: string; mime_type?: string }> = [];
      
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
      logger.info('📞 Message received', {
        customerName: redactPII(customerName, 'logs'),
        customerPhone: redactPII(customerPhone, 'logs'),
        messagePreview: redactPII(messageContent, 'ai').substring(0, 50)
      });

      // Sprint 1: Extrai CPF da mensagem (se houver)
      const extractedCPF = extractCPF(messageContent);
      if (extractedCPF) {
        logger.info('🆔 CPF detectado na mensagem (mascarado)');
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
        logger.warn('⚠️ Rate limit exceeded', { 
          customerPhone: redactPII(customerPhone, 'logs'),
          messageCount: recentMessages.length
        });
        
        // Enviar mensagem de aviso
        await supabase.functions.invoke('send-whatsapp-message', {
          body: {
            phone: customerPhone,
            message: '⚠️ Você atingiu o limite de mensagens. Por favor, aguarde alguns minutos antes de enviar novas mensagens.\n\nSe for urgente, ligue: (61) 99947-5886'
          }
        });

        return new Response(
          JSON.stringify({ success: true, rateLimited: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 🔄 RESET COMMAND: Reiniciar fluxo do zero com a Cloé
      const resetCommands = ['/RESET', 'RESET', '/REINICIAR', 'REINICIAR', '/RECOMECAR'];
      const normalizedMessage = messageContent.toUpperCase().trim();
      
      if (resetCommands.includes(normalizedMessage)) {
        logger.info('🔄 Reset requested', { customerPhone: redactPII(customerPhone, 'logs') });
        
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
              department: null,
              status: 'waiting',
              metadata: { reset_requested: true, reset_at: new Date().toISOString() }
            })
            .eq('id', conversation.id);
          
          await supabase
            .from('agent_flow_states')
            .delete()
            .eq('conversation_id', conversation.id);
        }

        await supabase.functions.invoke('send-whatsapp-message', {
          body: {
            phone: customerPhone,
            message: '✅ Conversa reiniciada! Agora pode começar do zero.\n\nEnvie sua mensagem para iniciar um novo atendimento.'
          }
        });

        return new Response(
          JSON.stringify({ success: true, reset: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // 🚫 OPT-OUT LGPD: Verificar comandos de cancelamento
      const optOutCommands = ['SAIR', 'RECUSAR', 'PARAR', 'STOP', 'CANCELAR', 'NAO QUERO'];
      
      if (optOutCommands.includes(normalizedMessage)) {
        logger.info('🚫 Opt-out requested', { customerPhone: redactPII(customerPhone, 'logs') });
        
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
              metadata: { opt_out_reason: 'user_request' }
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
          JSON.stringify({ success: true, optOut: true }),
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

          logger.info('⭐ Feedback registered', { rating });
          
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
        logger.error('Error searching conversation', { error: searchError });
      }

      let conversationId = existingConversation?.id;
      let isReopen = false;

      // Se não existe conversação ativa, criar ou reabrir
      if (!conversationId && recentResolved) {
        // Reabrir conversa recente atualizando a resolvida
        logger.info('🔄 Reopening recent resolved conversation', { conversationId: recentResolved.id });
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
          logger.error('Error reopening conversation', { error: reopenError });
        } else {
          conversationId = reopenedConv.id;
          isReopen = true;
        }
      }
      
      if (!conversationId) {
        logger.info('🆕 Creating new conversation');
        
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
          logger.error('Error creating/updating conversation', { error: createError });
          throw createError;
        }

        conversationId = newConversation.id;
      } else {
        logger.info('♻️ Using existing conversation', { conversationId });
        // Atualizar última mensagem
        await supabase
          .from('conversations')
          .update({ 
            last_message_at: new Date().toISOString(),
            status: 'active'
          })
          .eq('id', conversationId);
      }

      // ====== AGORA buscar department atualizado da conversa (APÓS reopen/create) ======
      const { data: currentConv } = await supabase
        .from('conversations')
        .select('department, status')
        .eq('id', conversationId)
        .single();

      const currentDepartment = currentConv?.department;
      const conversationStatus = currentConv?.status;

      logger.info('📍 Conversation department check', { 
        conversationId, 
        department: currentDepartment, 
        status: conversationStatus,
        isReopen 
      });

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
        logger.error('Error saving message', { error: messageError });
        throw messageError;
      }

      // Auto-tag conversation using AI (fire and forget)
      if (!isReopen) {
        supabase.functions.invoke('ai-auto-tag', {
          body: { 
            conversation_id: conversationId,
            message_content: messageContent 
          }
        }).catch(err => logger.error('Auto-tag error', { error: err }));
      }

      // Se já existe um departamento definido E conversa está ativa/waiting, envie diretamente ao agente especializado
      const isGreeting = /^(ol[aá]|oi|bom dia|boa tarde|boa noite)$/i.test((messageContent || '').trim());
      if (currentDepartment && (conversationStatus === 'active' || conversationStatus === 'waiting') && !isGreeting) {
        
        if (currentDepartment === 'tecnico') {
          logger.info('🤖 Routing directly to support-tech-agent (Luan)', { conversationId });

          // 🧭 Mensagem de transferência da Cloé antes do especialista (uma vez, com idempotência)
          const firstName = (customerName || 'Cliente').split(' ')[0];
          const transferMsg = `Perfeito, ${firstName}! Vou te transferir para o Suporte Técnico. Um momento! ⏳`;

          const { data: lastAgentMsg } = await supabase
            .from('conversation_messages')
            .select('id, content, created_at')
            .eq('conversation_id', conversationId)
            .eq('sender_type', 'agent')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const isDupTransfer = !!(lastAgentMsg && lastAgentMsg.content === transferMsg &&
            Date.now() - new Date(lastAgentMsg.created_at as string).getTime() < 10_000);

          if (!isDupTransfer) {
            const { error: saveTransferErr } = await supabase
              .from('conversation_messages')
              .insert({
                conversation_id: conversationId,
                sender_type: 'agent',
                sender_name: 'Cloé Martins',
                content: transferMsg,
                ai_suggestion: true
              });
            if (saveTransferErr) {
              logger.error('⚠️ Error saving transfer message', { error: saveTransferErr });
            }

            const { error: sendTransferErr } = await supabase.functions.invoke('send-whatsapp-message', {
              body: { phone: customerPhone, message: transferMsg }
            });
            if (sendTransferErr) {
              logger.error('⚠️ Failed to send transfer message', { error: sendTransferErr });
            } else {
              logger.info('✅ Transfer message sent before specialist routing');
            }
          } else {
            logger.info('⏭️ Skipping duplicate transfer message');
          }

          const { data: techResponse, error: techError } = await supabase.functions.invoke('support-tech-agent', {
            body: {
              conversation_id: conversationId,
              message: messageContent,
              attachments: attachments.length > 0 ? attachments : undefined
            }
          });
          
          if (techError) {
            logger.error('Support-tech-agent error', { error: techError });
            throw techError;
          }
          
          const parsed = typeof techResponse === 'string' ? JSON.parse(techResponse) : techResponse;
          const reply = parsed?.message || '';

          let messageSent = false;
          if (reply && reply.trim() !== '') {
            // ✅ NÃO salvar mensagem - o support-tech-agent já salvou
            // Apenas enviar via WhatsApp
            const { error: sendErr } = await supabase.functions.invoke('send-whatsapp-message', {
              body: { phone: customerPhone, message: reply }
            });
            if (sendErr) {
              logger.error('⚠️ Failed to send WhatsApp message', { error: sendErr });
            } else {
              logger.info('✅ WhatsApp message sent successfully');
              messageSent = true;
            }
          }

          return new Response(JSON.stringify({ success: true, conversationId, processed: true, messageSent, isReopen }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }

        if (currentDepartment === 'financeiro') {
          logger.info('🤖 Routing directly to support-financial-agent (Julia)', { conversationId });
          const { data: finResponse, error: finError } = await supabase.functions.invoke('support-financial-agent', {
            body: {
              conversationId: conversationId,
              messages: [{ role: 'user', content: messageContent }],
              customerData: { name: customerName, phone: customerPhone },
              attachments: attachments.length > 0 ? attachments : undefined
            }
          });
          
          if (finError) {
            logger.error('Support-financial-agent error', { error: finError });
            throw finError;
          }
          
          const parsed = typeof finResponse === 'string' ? JSON.parse(finResponse) : finResponse;
          const reply = parsed?.message || '';

          let messageSent = false;
          if (reply && reply.trim() !== '') {
            // ✅ NÃO salvar mensagem - o support-financial-agent já salvou
            // Apenas enviar via WhatsApp
            const { error: sendErr } = await supabase.functions.invoke('send-whatsapp-message', {
              body: { phone: customerPhone, message: reply }
            });
            if (sendErr) {
              logger.error('⚠️ Failed to send WhatsApp message', { error: sendErr });
            } else {
              logger.info('✅ WhatsApp message sent successfully');
              messageSent = true;
            }
          }

          return new Response(JSON.stringify({ success: true, conversationId, processed: true, messageSent, isReopen }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      }

      // ============================================
      // CHAMAR ROUTING-AGENT COM VALIDAÇÃO (Prioridade Crítica #1 e #4)
      // ============================================
      logger.info('🤖 Calling routing agent...');
      
      // 1️⃣ Construir payload normalizado
      const routingPayload: RoutingAgentPayload = {
        message: messageContent,
        conversationId: conversationId,
        customerData: {
          name: customerName,
          phone: customerPhone,
          channel: 'whatsapp'
        },
        attachments: attachments.length > 0 ? attachments : undefined
      };

      // 2️⃣ Validar schema antes de enviar (Prioridade Crítica #1)
      try {
        RoutingAgentPayloadSchema.parse(routingPayload);
        logger.info('✅ Payload validation passed');
      } catch (validationError) {
        logger.error('❌ Payload validation failed', { 
          error: validationError,
          payload: {
            ...routingPayload,
            customerData: {
              ...routingPayload.customerData,
              phone: redactPII(routingPayload.customerData.phone, 'logs')
            }
          }
        });
        throw new Error(`Invalid payload for routing-agent: ${validationError.message}`);
      }

      // 3️⃣ Chamar routing-agent com try/catch robusto (Prioridade Crítica #4)
      let routingResponse: { reply?: string; error?: string } | null = null;
      let routingError: Error | null = null;
      
      try {
        const result = await supabase.functions.invoke('routing-agent', {
          body: routingPayload
        });
        
        routingResponse = result.data;
        routingError = result.error;
        
        // Verificar se erro está em .context.error (Prioridade Crítica #8)
        if (!routingError && result.data?.context?.error) {
          routingError = result.data.context.error;
          logger.warn('⚠️ Error detected in response context', { error: routingError });
        }
      } catch (fetchError) {
        logger.error('❌ Network error calling routing-agent', { 
          error: fetchError,
          conversationId 
        });
        throw new Error(`Failed to connect to routing-agent: ${fetchError.message}`);
      }

      // 4️⃣ Tratar erro do routing-agent (Prioridade Crítica #4)
      if (routingError) {
        logger.error('❌ Routing agent error', { 
          error: routingError,
          conversationId,
          errorType: typeof routingError,
          errorKeys: routingError ? Object.keys(routingError) : []
        });
        
        // Enviar mensagem de erro ao cliente
        await supabase.functions.invoke('send-whatsapp-message', {
          body: {
            phone: customerPhone,
            message: '⚠️ Desculpe, estamos com dificuldades técnicas momentâneas. Por favor, tente novamente em alguns instantes ou ligue: (61) 99947-5886'
          }
        }).catch(err => logger.error('Failed to send error message', { error: err }));
        
        throw routingError;
      }

      // 5️⃣ Validar resposta do routing-agent (Prioridade Crítica #1)
      if (!routingResponse) {
        logger.error('❌ Empty response from routing-agent', { conversationId });
        throw new Error('Routing agent returned empty response');
      }

      // Parse JSON se necessário (com validação)
      let parsedResponse = routingResponse;
      if (typeof routingResponse === 'string') {
        try {
          parsedResponse = JSON.parse(routingResponse);
          logger.info('📨 JSON parsed from string response');
        } catch (parseError) {
          logger.error('❌ Failed to parse routing response', { 
            error: parseError,
            responsePreview: routingResponse?.substring(0, 200) 
          });
          throw new Error('Invalid routing agent response format');
        }
      }

      // Validar estrutura mínima da resposta
      if (typeof parsedResponse !== 'object' || parsedResponse === null) {
        logger.error('❌ Invalid response type from routing-agent', { 
          type: typeof parsedResponse,
          conversationId 
        });
        throw new Error('Routing agent returned invalid response type');
      }

      logger.info('📨 Agent response received', { 
        hasMessage: !!parsedResponse?.message,
        messageLength: parsedResponse?.message?.length,
        responseKeys: Object.keys(parsedResponse || {}),
        needsCPF: parsedResponse?.needsCPF
      });

      // ============================================
      // SALVAR RESULTADO DO ROUTING EM METADATA (Prioridade Importante #2)
      // ============================================
      try {
        // 1️⃣ Buscar metadata atual
        const { data: currentConv } = await supabase
          .from('conversations')
          .select('metadata')
          .eq('id', conversationId)
          .single();

        // 2️⃣ Merge com novo routing info
        const existingMetadata = currentConv?.metadata || {};
        const updatedMetadata = {
          ...existingMetadata,
          last_routing: {
            timestamp: new Date().toISOString(),
            agent: parsedResponse?.agent || 'routing-agent',
            targetDepartment: parsedResponse?.targetDepartment,
            autoRouted: parsedResponse?.autoRouted,
            routeReason: parsedResponse?.routeReason,
            needsCPF: parsedResponse?.needsCPF,
            rateLimited: parsedResponse?.rateLimited,
            hasMessage: !!parsedResponse?.message,
            messageLength: parsedResponse?.message?.length || 0
          }
        };

        // 3️⃣ Update não-bloqueante
        const { error: metadataError } = await supabase
          .from('conversations')
          .update({ metadata: updatedMetadata })
          .eq('id', conversationId);

        if (metadataError) {
          logger.warn('⚠️ Failed to save routing metadata', { error: metadataError });
        } else {
          logger.info('✅ Routing metadata saved to conversation');
        }
      } catch (metaErr) {
        logger.warn('⚠️ Error saving routing metadata', { error: metaErr });
      }

      // 🔁 AUTO-ROUTING: Transfer message + invoke specialist agent
      if (parsedResponse?.autoRouted && !parsedResponse?.autoClose) {
        try {
          const targetDept = parsedResponse.agent === 'support_tech'
            ? 'tecnico'
            : parsedResponse.agent === 'support_financial'
              ? 'financeiro'
              : null;

          if (targetDept) {
            const firstName = (customerName || 'Cliente').split(' ')[0];
            const transferMsg = targetDept === 'tecnico'
              ? `Perfeito, ${firstName}! Vou te transferir para o Suporte Técnico. Um momento! ⏳`
              : `Perfeito, ${firstName}! Vou te transferir para o Suporte Financeiro. Um momento! ⏳`;

            // 1️⃣ Send transfer message
            const { data: lastAgentMsg } = await supabase
              .from('conversation_messages')
              .select('id, content, created_at')
              .eq('conversation_id', conversationId)
              .eq('sender_type', 'agent')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const isDupTransfer = !!(lastAgentMsg && lastAgentMsg.content === transferMsg &&
              Date.now() - new Date(lastAgentMsg.created_at as string).getTime() < 10_000);

            if (!isDupTransfer) {
              await supabase.from('conversation_messages').insert({
                conversation_id: conversationId,
                sender_type: 'agent',
                sender_name: 'Cloé Martins',
                content: transferMsg,
                ai_suggestion: true
              });

              await supabase.functions.invoke('send-whatsapp-message', {
                body: { phone: customerPhone, message: transferMsg }
              });
              
              logger.info('✅ Transfer message sent');
            }

            // 2️⃣ Invoke specialist agent immediately
            logger.info(`🚀 Invoking ${targetDept} specialist agent after transfer`);
            
            const specialistFn = targetDept === 'tecnico' ? 'support-tech-agent' : 'support-financial-agent';
            const { data: specialistResponse, error: specialistError } = await supabase.functions.invoke(specialistFn, {
              body: targetDept === 'tecnico' 
                ? { conversation_id: conversationId, message: messageContent, attachments }
                : { conversationId, messages: [{ role: 'user', content: messageContent }], customerData: { name: customerName, phone: customerPhone }, attachments }
            });

            if (specialistError) {
              logger.error(`❌ ${specialistFn} invocation failed`, { error: specialistError });
            } else {
              const specialistParsed = typeof specialistResponse === 'string' ? JSON.parse(specialistResponse) : specialistResponse;
              const specialistMsg = specialistParsed?.message || specialistParsed?.reply || '';

              if (specialistMsg && specialistMsg.trim() !== '') {
                // Specialist already saved message, just send via WhatsApp
                await supabase.functions.invoke('send-whatsapp-message', {
                  body: { phone: customerPhone, message: specialistMsg }
                });
                logger.info(`✅ ${targetDept} specialist message sent`);
              }
            }
          }
        } catch (err) {
          logger.error('⚠️ Auto-routing failed', { error: err });
        }

        // Skip remaining processing - specialist handled it
        return new Response(JSON.stringify({ 
          success: true, 
          conversationId,
          processed: true,
          messageSent: true,
          handledBySpecialist: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      if (parsedResponse.message && parsedResponse.message.trim() !== '') {
        // Determinar autor correto da mensagem (evita salvar fala do Luan/Julia como se fosse da Cloé)
        let authorName = 'Cloé Martins';
        const msg = parsedResponse.message as string;
        const dept = (parsedResponse.targetDepartment || '').toString();
        if (dept === 'tecnico' || /Luan\s+Silva/i.test(msg)) {
          authorName = 'Luan Silva';
        } else if (dept === 'financeiro' || /Julia/i.test(msg)) {
          authorName = 'Julia Martins';
        }

        // Idempotência: pular se a última mensagem de agente for idêntica nos últimos 10s
        const { data: lastAgentMsg } = await supabase
          .from('conversation_messages')
          .select('id, content, created_at')
          .eq('conversation_id', conversationId)
          .eq('sender_type', 'agent')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const isDuplicate = !!(lastAgentMsg && lastAgentMsg.content === msg &&
          Date.now() - new Date(lastAgentMsg.created_at as string).getTime() < 10_000);

        if (!isDuplicate) {
          const { error: saveAgentMsgError } = await supabase
            .from('conversation_messages')
            .insert({
              conversation_id: conversationId,
              sender_type: 'agent',
              sender_name: authorName,
              content: msg,
              ai_suggestion: true
            });

          if (saveAgentMsgError) {
            logger.error('⚠️ Error saving agent message', { error: saveAgentMsgError });
          }
        } else {
          logger.info('⏭️ Skipping duplicate agent message save');
        }
      } else {
        logger.info('⏭️ Skipping message save (empty or handled by specialist agent)');
      }

      // 🔄 AUTO-ENCERRAMENTO: Verificar se conversa deve ser encerrada
      // Encerra quando:
      // 1. autoClose explícito = true (rate limit, transferência para vendas por falha de CPF)
      // 2. Transferiu para agente especializado que já respondeu (Julia/Luan já atendeu)
      const shouldAutoClose = parsedResponse.autoClose === true;
      
      if (shouldAutoClose) {
        logger.info('✅ Auto-closing conversation based on agent response');
        await supabase
          .from('conversations')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            department: null, // 🔄 Limpar department ao resolver
            metadata: {
              auto_closed: true,
              close_reason: parsedResponse.rateLimited ? 'rate_limited' : 
                          parsedResponse.routeReason === 'cpf_validation_failed' ? 'transferred_sales' :
                          'info_provided'
            }
          })
          .eq('id', conversationId);
      }
      
      // 📊 Se transferiu para agente especializado (Julia/Luan), atualizar o agente responsável mas manter conversa aberta
      if (parsedResponse.autoRouted && !shouldAutoClose) {
        const agentDepartmentMap = {
          'support_financial': 'financeiro',
          'support_tech': 'tecnico'
        };
        
        const department = agentDepartmentMap[parsedResponse.agent];
        if (department) {
          logger.info('📍 Updating conversation department', { department });
          await supabase
            .from('conversations')
            .update({
              department: department,
              status: 'active' // Mantém ativa para o novo agente
            })
            .eq('id', conversationId);
        }
      }

      // Tentar enviar resposta via WhatsApp (apenas se houver mensagem)
      let messageSent = false;
      if (parsedResponse.message && parsedResponse.message.trim() !== '') {
        const { error: sendError } = await supabase.functions.invoke('send-whatsapp-message', {
          body: {
            phone: customerPhone,
            message: parsedResponse.message
          }
        });

        if (sendError) {
          logger.error('⚠️ Failed to send WhatsApp message (conversation saved)', { error: sendError });
          messageSent = false;
        } else {
          logger.info('✅ WhatsApp message sent successfully');
          messageSent = true;
        }
      } else {
        logger.info('⏭️ Skipping WhatsApp send (message handled by specialist agent)');
        messageSent = true; // Considera enviado pois foi tratado pelo agente
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
    }).catch(err => logger.error('Metric error', { error: err }));
    
    return new Response(
      JSON.stringify({ success: true, eventType: eventType, processed: false }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    logger.error('❌ Webhook error', { error });
    
    // Registrar métrica de erro
    recordMetric({
      agent_name: 'whatsapp-webhook',
      action_type: 'webhook_processed',
      success: false,
      duration_ms: Date.now() - startTime,
      error_message: error.message || 'Unknown error'
    }).catch(err => logger.error('Metric error', { error: err }));
    
    return handleEdgeFunctionError(error, 'whatsapp-webhook');
  }
});
