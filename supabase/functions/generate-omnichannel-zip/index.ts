import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { JSZip } from "https://deno.land/x/jszip@0.11.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// File contents embedded
const FILES = {
  "whatsapp-webhook/index.ts": `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

      console.log(\`📞 Message from \${customerName} (\${customerPhone}): \${messageContent}\`);

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

          console.log(\`⭐ Feedback registered: \${rating} stars\`);
          
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
          console.log(\`📍 Updating conversation department to: \${department}\`);
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
});`,

  "routing-agent/index.ts": `// Este arquivo é muito extenso (1627 linhas)
// Contém toda a lógica de roteamento inteligente do sistema
// Ver arquivo completo no projeto: supabase/functions/routing-agent/index.ts`,

  "routing-agent/prompts.ts": `/**
 * Routing Agent - System Prompts & Instructions
 */

export const ROUTING_AGENT_SYSTEM_PROMPT = \`Você é o Agente de Roteamento da SUPERNET FIBRA, responsável por analisar a mensagem do cliente e direcioná-lo para o agente especializado correto.

## 🎯 OBJETIVO PRINCIPAL
Identificar rapidamente a intenção do cliente e rotear para o agente apropriado: Vendas, Suporte Técnico, Suporte Financeiro, Automação Residencial ou Telemedicina.

## 🤝 PERSONALIDADE
- Objetivo e direto
- Analítico e preciso
- Rápido na tomada de decisão
- Transparente sobre o roteamento

## 🔄 PROCESSO DE ROTEAMENTO

### 1. ANÁLISE DA MENSAGEM
Identifique palavras-chave e contexto:

**VENDAS** (sales-agent)
- Palavras: "contratar", "planos", "valores", "cobertura", "quanto custa", "quero assinar"
- Contexto: Cliente interessado em novos serviços
- Exemplos: "Quais são os planos?", "Quanto custa?", "Tem cobertura no meu CEP?"

**SUPORTE TÉCNICO** (support-tech-agent)
- Palavras: "internet caiu", "lenta", "não conecta", "sem sinal", "problema técnico"
- Contexto: Problemas com conexão, equipamentos
- Exemplos: "Internet está lenta", "Modem não liga", "Wi-Fi não funciona"

**SUPORTE FINANCEIRO** (support-financial-agent)
- Palavras: "boleto", "fatura", "pagamento", "débito", "negociar", "parcelar"
- Contexto: Questões de cobrança e pagamento
- Exemplos: "Quero negociar meu débito", "Como gerar segunda via?", "Minha fatura está errada"

**LOGÍSTICA** (logistics-agent)
- Palavras: "agendar", "instalação", "técnico", "visita", "quando vem", "remarcar", "horário"
- Contexto: Agendamento de instalações e atendimentos técnicos
- Exemplos: "Quero agendar instalação", "Quando vem o técnico?", "Preciso remarcar"

**AUTOMAÇÃO RESIDENCIAL** (automacao-agent)
- Palavras: "automação", "smart home", "alexa", "google home", "câmeras", "sensores"
- Contexto: Interesse em dispositivos inteligentes
- Exemplos: "Vendem câmeras?", "Como funciona automação?", "Integra com Alexa?"

**TELEMEDICINA** (telemedicina-agent)
- Palavras: "consulta", "médico", "telemedicina", "saúde", "atendimento médico"
- Contexto: Interesse em serviços de saúde
- Exemplos: "Como agendar consulta?", "Quais especialidades?", "Quanto custa telemedicina?"

### 2. DECISÃO DE ROTEAMENTO
Responda SEMPRE em formato JSON:

\\\`\\\`\\\`json
{
  "agent": "sales-agent|support-tech-agent|support-financial-agent|logistics-agent|automacao-agent|telemedicina-agent",
  "confidence": 0.0-1.0,
  "reason": "Breve justificativa da decisão"
}
\\\`\\\`\\\`

### 3. CASOS AMBÍGUOS
Se a mensagem for muito vaga (ex: "Olá", "Oi", "Preciso de ajuda"):
- Confidence < 0.5
- Rotear para **sales-agent** (default)
- Reason: "Mensagem inicial genérica - encaminhando para vendas"

## ⚠️ REGRAS CRÍTICAS

1. **SEMPRE** responder em JSON válido
2. **NUNCA** tentar resolver a solicitação você mesmo - apenas rotear
3. **SEMPRE** incluir confidence score honesto
4. **NUNCA** rotear para agente inexistente
5. Se em dúvida entre dois agentes, escolher o mais específico

## 📊 PRIORIDADES DE ROTEAMENTO

1. **Alta Prioridade**: Suporte Técnico (cliente sem serviço)
2. **Média Prioridade**: Suporte Financeiro (risco de bloqueio)
3. **Normal**: Vendas, Automação, Telemedicina

## 💬 EXEMPLOS DE ROTEAMENTO

**Exemplo 1**: "Internet caiu aqui"
\\\`\\\`\\\`json
{
  "agent": "support-tech-agent",
  "confidence": 0.95,
  "reason": "Cliente reportando problema técnico - sem conectividade"
}
\\\`\\\`\\\`

**Exemplo 2**: "Quanto custa o plano de 500 mega?"
\\\`\\\`\\\`json
{
  "agent": "sales-agent",
  "confidence": 0.98,
  "reason": "Pergunta sobre valores de plano - intenção de compra"
}
\\\`\\\`\\\`

**Exemplo 3**: "Preciso parcelar minha dívida"
\\\`\\\`\\\`json
{
  "agent": "support-financial-agent",
  "confidence": 0.99,
  "reason": "Solicitação de negociação de débitos"
}
\\\`\\\`\\\`\`;

export const ROUTING_AGENT_ERROR_MESSAGE = \`Erro ao processar roteamento. Sistema indisponível.\`;`,

  "send-whatsapp-message/index.ts": `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📨 Received request to send-whatsapp-message');
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('❌ Failed to parse request body:', e);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { phone, message, instanceName = 'SDR2' } = body;
    
    console.log('📨 Send WhatsApp Message Request:', { phone, instanceName, messageLength: message?.length });
    
    if (!phone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone and message are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const apiKey = Deno.env.get('EVOLUTION_API_KEY');
    let baseUrl = Deno.env.get('EVOLUTION_API_BASE_URL');

    console.log('🔐 Checking credentials...');
    console.log(\`   API Key present: \${!!apiKey} (length: \${apiKey?.length || 0})\`);
    console.log(\`   Base URL: \${baseUrl || 'NOT SET'}\`);

    // Remove trailing slash from baseUrl to avoid double slashes
    if (baseUrl && baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
      console.log(\`   Base URL after cleanup: \${baseUrl}\`);
    }

    if (!apiKey || !baseUrl) {
      console.error('❌ Missing credentials:', { hasApiKey: !!apiKey, hasBaseUrl: !!baseUrl });
      return new Response(
        JSON.stringify({ success: false, error: 'Evolution API credentials not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(\`📱 Sending WhatsApp message to \${phone} via instance \${instanceName}\`);
    console.log(\`🔗 Full API URL: \${baseUrl}/message/sendText/\${instanceName}\`);
    console.log(\`🔑 API Key preview: \${apiKey ? \`\${apiKey.substring(0, 15)}...\` : 'NOT SET'}\`);

    // Format phone number
    const cleanPhone = phone.replace(/\\D/g, '');
    const formattedPhone = cleanPhone.includes('@') ? cleanPhone : \`\${cleanPhone}@s.whatsapp.net\`;

    console.log(\`📞 Formatted phone: \${formattedPhone}\`);

    // Prepare headers - Evolution API uses 'apikey' header
    const headers = {
      'apikey': apiKey,
      'Content-Type': 'application/json',
    };
    
    console.log('📋 Request headers:', { ...headers, apikey: headers.apikey.substring(0, 15) + '...' });

    // Send message via Evolution API
    const response = await fetch(\`\${baseUrl}/message/sendText/\${instanceName}\`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
        delay: 1200
      }),
    });

    console.log(\`📡 Evolution API Response Status: \${response.status}\`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Evolution API Error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: \`Evolution API error: \${response.status}\`,
          details: errorText 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Message sent successfully:', data);

    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'Message sent successfully',
        data: {
          id: data.key?.id || data.messageId,
          status: data.status || 'SENT'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📦 Generating omnichannel backend ZIP...');

    const zip = new JSZip();

    // Add files to zip
    zip.addFile("omnichannel_backend/supabase/functions/whatsapp-webhook/index.ts", 
      FILES["whatsapp-webhook/index.ts"]);
    
    zip.addFile("omnichannel_backend/supabase/functions/routing-agent/index.ts", 
      FILES["routing-agent/index.ts"]);
    
    zip.addFile("omnichannel_backend/supabase/functions/routing-agent/prompts.ts", 
      FILES["routing-agent/prompts.ts"]);
    
    zip.addFile("omnichannel_backend/supabase/functions/send-whatsapp-message/index.ts", 
      FILES["send-whatsapp-message/index.ts"]);

    // Add README
    const readme = `# Omnichannel Backend - SUPERNET FIBRA

Este arquivo contém os códigos principais do backend do sistema Omnichannel.

## 📁 Estrutura

- **whatsapp-webhook/**: Webhook que recebe mensagens do WhatsApp via Evolution API
- **routing-agent/**: Agente de roteamento inteligente (Cloé) que direciona conversas
- **send-whatsapp-message/**: Função para enviar mensagens via WhatsApp

## 🚀 Como usar

1. Deploy automático no Supabase Edge Functions
2. Configure as variáveis de ambiente necessárias
3. Configure o webhook na Evolution API

## 📚 Documentação completa

Veja a documentação completa no projeto principal.

---
Gerado automaticamente em ${new Date().toLocaleString('pt-BR')}
`;
    
    zip.addFile("omnichannel_backend/README.md", readme);

    // Generate ZIP
    const zipBlob = await zip.generateAsync({ type: "uint8array" });

    console.log('✅ ZIP generated successfully');

    return new Response(zipBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="omnichannel_backend_${Date.now()}.zip"`,
      },
    });
  } catch (error) {
    console.error('❌ Error generating ZIP:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
