import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Code2, FileCode, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AuthGuard } from '@/components/AuthGuard';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Arquivos com código completo embutido
const BACKEND_FILES = [
  {
    name: 'whatsapp-webhook/index.ts',
    description: 'Webhook que recebe mensagens do WhatsApp via Evolution API',
    language: 'typescript',
    code: `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

      // Criar nova conversa se não existir
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
          console.error('Error creating conversation:', createError);
          throw createError;
        }

        conversationId = newConversation.id;
      }

      // Salvar mensagem do cliente
      await supabase
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

      // Chamar agente de roteamento
      const { data: routingResponse } = await supabase.functions.invoke('routing-agent', {
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

      // Enviar resposta via WhatsApp
      await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          phone: customerPhone,
          message: routingResponse.message || 'Olá! Em breve nossa equipe entrará em contato.'
        }
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          conversationId: conversationId,
          processed: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

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
});`
  },
  {
    name: 'routing-agent/index.ts',
    description: 'Agente de roteamento inteligente (Cloé) - identifica CPF e direciona para especialistas',
    language: 'typescript',
    code: `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId, context } = await req.json();
    
    console.log('Routing Agent - Received:', message);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get conversation data
    const { data: conversation } = await supabase
      .from('conversations')
      .select('customer_cpf, customer_name, ixc_client_id')
      .eq('id', conversationId)
      .single();

    // Extract CPF from message
    const cpfMatch = message.match(/\\b(\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2})\\b/);
    
    // If no CPF yet, ask for it
    if (!conversation?.customer_cpf && !cpfMatch) {
      return new Response(
        JSON.stringify({
          agent: 'routing',
          message: 'Olá! Sou a Cloé Martins 😊\\n\\nPara começarmos, você poderia me informar seu CPF?',
          requiresCPF: true
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // If CPF provided, identify customer
    if (cpfMatch && !conversation?.customer_cpf) {
      const cpf = cpfMatch[1].replace(/\\D/g, '');
      
      // Search in IXC
      const { data: ixcResponse } = await supabase.functions.invoke('ixc-integration', {
        body: {
          action: 'search_customer',
          params: { cpf }
        }
      });

      if (ixcResponse?.success && ixcResponse?.customer) {
        // Update conversation with customer data
        await supabase
          .from('conversations')
          .update({
            customer_cpf: cpf,
            customer_name: ixcResponse.customer.nome,
            customer_email: ixcResponse.customer.email,
            ixc_client_id: ixcResponse.customer.id
          })
          .eq('id', conversationId);

        // Check if blocked
        const isBlocked = ixcResponse.customer.status === 'bloqueado';
        
        if (isBlocked) {
          // Route to Financial Support
          const protocol = \`PROT-\${Date.now()}-\${Math.random().toString(36).substr(2, 9).toUpperCase()}\`;
          
          return new Response(
            JSON.stringify({
              agent: 'support_financial',
              message: \`Identificado! Transferindo para Suporte Financeiro... ⏳\\n\\n📋 Protocolo: \${protocol}\`,
              protocol,
              autoRouted: true
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // Check if offline
        const isOffline = !ixcResponse.customer.online;
        
        if (isOffline) {
          // Route to Technical Support
          const protocol = \`PROT-\${Date.now()}-\${Math.random().toString(36).substr(2, 9).toUpperCase()}\`;
          
          return new Response(
            JSON.stringify({
              agent: 'support_tech',
              message: \`Vejo que sua conexão está offline. Transferindo para Suporte Técnico... 🔧\\n\\n📋 Protocolo: \${protocol}\`,
              protocol,
              autoRouted: true
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // Customer is online and not blocked
        return new Response(
          JSON.stringify({
            agent: 'routing',
            message: \`Ótimo! Vejo que sua conexão está ativa. Como posso ajudar?\`,
            customerIdentified: true
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } else {
        // New customer
        return new Response(
          JSON.stringify({
            agent: 'sales',
            message: \`CPF não encontrado em nossa base. Vou transferir para Vendas! 🎉\`,
            autoRouted: true
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Default response
    return new Response(
      JSON.stringify({
        agent: 'routing',
        message: 'Como posso ajudar você hoje?'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Routing error:', error);
    
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
});`
  },
  {
    name: 'routing-agent/config.ts',
    description: 'Configuração do agente de roteamento',
    language: 'typescript',
    code: `/**
 * Routing Agent - Configuration
 */

export const ROUTING_AGENT_CONFIG = {
  // Model settings
  model: "gpt-4o-mini",
  temperature: 0.3, // Baixa temperatura para decisões consistentes
  maxTokens: 500, // Resposta curta (apenas JSON)
  
  // Agent behavior
  maxMessagesInContext: 5, // Apenas contexto recente para decisão rápida
  enableToolCalling: false, // Não precisa de ferramentas
  
  // Routing rules
  defaultAgent: "sales-agent", // Agente padrão para casos ambíguos
  minConfidenceThreshold: 0.4, // Abaixo disso, vai para default
  
  // Agents disponíveis
  availableAgents: [
    "sales-agent",
    "support-tech-agent",
    "support-financial-agent",
    "automacao-agent",
    "telemedicina-agent"
  ],
  
  // Department mapping
  departmentMapping: {
    "sales-agent": "comercial",
    "support-tech-agent": "tecnico",
    "support-financial-agent": "financeiro",
    "automacao-agent": "tecnico",
    "telemedicina-agent": "comercial"
  },
  
  // Priority mapping
  agentPriority: {
    "support-tech-agent": 3, // Highest priority
    "support-financial-agent": 2,
    "sales-agent": 1,
    "automacao-agent": 1,
    "telemedicina-agent": 1
  },
  
  // Timeouts
  responseTimeout: 10000, // 10s - Roteamento deve ser rápido
  toolTimeout: 5000, // Não usado, mas mantido por consistência
};`
  },
  {
    name: 'routing-agent/prompts.ts',
    description: 'Prompts do sistema para o agente de roteamento',
    language: 'typescript',
    code: `/**
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

\\\\\`\\\\\`\\\\\`json
{
  "agent": "sales-agent|support-tech-agent|support-financial-agent|logistics-agent|automacao-agent|telemedicina-agent",
  "confidence": 0.0-1.0,
  "reason": "Breve justificativa da decisão"
}
\\\\\`\\\\\`\\\\\`

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
\\\\\`\\\\\`\\\\\`json
{
  "agent": "support-tech-agent",
  "confidence": 0.95,
  "reason": "Cliente reportando problema técnico - sem conectividade"
}
\\\\\`\\\\\`\\\\\`

**Exemplo 2**: "Quanto custa o plano de 500 mega?"
\\\\\`\\\\\`\\\\\`json
{
  "agent": "sales-agent",
  "confidence": 0.98,
  "reason": "Pergunta sobre valores de plano - intenção de compra"
}
\\\\\`\\\\\`\\\\\`

**Exemplo 3**: "Preciso parcelar minha dívida"
\\\\\`\\\\\`\\\\\`json
{
  "agent": "support-financial-agent",
  "confidence": 0.99,
  "reason": "Solicitação de negociação de débitos"
}
\\\\\`\\\\\`\\\\\`\`;

export const ROUTING_AGENT_ERROR_MESSAGE = \`Erro ao processar roteamento. Sistema indisponível.\`;`
  },
  {
    name: 'send-whatsapp-message/index.ts',
    description: 'Função para enviar mensagens via WhatsApp usando Evolution API',
    language: 'typescript',
    code: `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📨 Received request to send-whatsapp-message');
    
    const body = await req.json();
    const { phone, message, instanceName = 'SDR2' } = body;
    
    console.log('📨 Send WhatsApp Message:', { phone, instanceName, messageLength: message?.length });
    
    if (!phone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone and message are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const apiKey = Deno.env.get('EVOLUTION_API_KEY');
    let baseUrl = Deno.env.get('EVOLUTION_API_BASE_URL');

    console.log('🔐 Checking credentials...');
    console.log(\`   API Key present: \${!!apiKey}\`);
    console.log(\`   Base URL: \${baseUrl || 'NOT SET'}\`);

    // Remove trailing slash
    if (baseUrl && baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    if (!apiKey || !baseUrl) {
      console.error('❌ Missing credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Evolution API credentials not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(\`📱 Sending WhatsApp message to \${phone}\`);

    // Format phone number
    const cleanPhone = phone.replace(/\\D/g, '');
    const formattedPhone = cleanPhone.includes('@') ? cleanPhone : \`\${cleanPhone}@s.whatsapp.net\`;

    console.log(\`📞 Formatted phone: \${formattedPhone}\`);

    // Send message via Evolution API
    const response = await fetch(\`\${baseUrl}/message/sendText/\${instanceName}\`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
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
});`
  }
];

export default function OmnichannelCodes() {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopyCode = async (fileName: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedFile(fileName);
      toast({
        title: 'Código copiado!',
        description: `${fileName} copiado para a área de transferência`,
      });
      setTimeout(() => setCopiedFile(null), 2000);
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o código.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadFile = (fileName: string, code: string) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: 'Arquivo baixado!',
      description: `${fileName} salvo com sucesso`,
    });
  };

  return (
    <AuthGuard requiredRoles={['admin', 'editor']}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Code2 className="h-8 w-8 text-primary" />
              Código Backend Omnichannel
            </h1>
            <p className="text-muted-foreground mt-2">
              3 arquivos principais do sistema - prontos para usar
            </p>
          </div>
        </div>

        <Separator />

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Arquivos TypeScript Completos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="font-semibold">📦 O que está incluído:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 space-y-1">
                <li><strong>whatsapp-webhook</strong>: Recebe mensagens do WhatsApp</li>
                <li><strong>routing-agent</strong>: Identifica CPF e roteia automaticamente</li>
                <li><strong>send-whatsapp-message</strong>: Envia respostas via WhatsApp</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <p className="font-semibold">🚀 Como usar:</p>
              <ol className="list-decimal list-inside text-sm text-muted-foreground ml-4 space-y-1">
                <li>Clique em cada arquivo abaixo para expandir</li>
                <li>Copie o código completo ou baixe o arquivo .ts</li>
                <li>Cole em outra LLM (Claude, ChatGPT, Gemini) para análise</li>
              </ol>
            </div>

            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                💡 <strong>Dica:</strong> Estes códigos são Edge Functions do Supabase (Deno). 
                Você pode pedir para a LLM explicar, otimizar ou adaptar para outras plataformas.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BACKEND_FILES.map((file, index) => (
            <Card key={file.name}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-purple-500" />
                  Arquivo {index + 1}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="secondary">{file.name}</Badge>
                  <p className="text-xs text-muted-foreground">{file.description}</p>
                  <div className="text-sm font-mono text-muted-foreground">
                    {file.code.split('\n').length} linhas
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              Código dos Arquivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {BACKEND_FILES.map((file) => (
                <AccordionItem key={file.name} value={file.name}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 flex-1">
                      <FileCode className="h-5 w-5 text-purple-500 flex-shrink-0" />
                      <div className="text-left flex-1">
                        <div className="font-semibold">{file.name}</div>
                        <div className="text-xs text-muted-foreground font-normal">
                          {file.description}
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-auto mr-2">
                        {file.code.split('\n').length} linhas
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyCode(file.name, file.code)}
                          className="gap-2"
                        >
                          {copiedFile === file.name ? (
                            <>
                              <Check className="h-4 w-4" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copiar Código
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadFile(file.name, file.code)}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Baixar .ts
                        </Button>
                      </div>
                      
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[600px] text-xs font-mono border">
                          <code className="language-typescript">{file.code}</code>
                        </pre>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-2">
          <CardHeader>
            <CardTitle className="text-sm">Variáveis de Ambiente Necessárias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm font-mono">
              <div className="p-2 bg-white dark:bg-gray-900 rounded border">
                EVOLUTION_API_KEY
              </div>
              <div className="p-2 bg-white dark:bg-gray-900 rounded border">
                EVOLUTION_API_BASE_URL
              </div>
              <div className="p-2 bg-white dark:bg-gray-900 rounded border">
                OPENAI_API_KEY
              </div>
              <div className="p-2 bg-white dark:bg-gray-900 rounded border">
                SUPABASE_URL
              </div>
              <div className="p-2 bg-white dark:bg-gray-900 rounded border">
                SUPABASE_SERVICE_ROLE_KEY
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
