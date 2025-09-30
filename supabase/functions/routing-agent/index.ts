import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: string;
  content: string;
}

interface AgentConfig {
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId, context } = await req.json();
    
    console.log('Routing Agent - Received message:', message);
    
    if (!conversationId) {
      throw new Error('conversationId é obrigatório');
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get routing agent configuration
    const { data: config, error: configError } = await supabase
      .from('agent_configurations')
      .select('system_prompt, model, temperature, max_tokens')
      .eq('agent_type', 'routing')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      console.error('Error loading routing config:', configError);
      throw new Error('Routing agent configuration not found');
    }

    console.log('Using routing config:', config.model);

    // Get conversation history to check if we need CPF
    const { data: messages } = await supabase
      .from('conversation_messages')
      .select('content, sender_type')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    const messageCount = messages?.length || 0;
    console.log('Message count:', messageCount);

    // Check if customer is identified
    const { data: conversation } = await supabase
      .from('conversations')
      .select('customer_cpf, customer_name, customer_email, ixc_client_id, metadata')
      .eq('id', conversationId)
      .single();

    console.log('Conversation data:', conversation);

    // Check if message contains CPF
    const cpfMatch = message.match(/\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/);
    
    // If CPF was provided, identify customer
    if (cpfMatch && !conversation?.customer_cpf) {
      const cpf = cpfMatch[1].replace(/\D/g, '');
      console.log('CPF found in message:', cpf);

      try {
        const { data: ixcResult, error: ixcError } = await supabase.functions.invoke('ixc-integration', {
          body: {
            action: 'searchCustomers',
            params: { query: cpf }
          }
        });

        if (ixcError) {
          console.error('Error searching IXC:', ixcError);
          throw ixcError;
        }

        console.log('IXC search result:', ixcResult);

        let customerData: any = null;
        let clientStatus: any = null;
        
        if (ixcResult?.success && ixcResult.data && Array.isArray(ixcResult.data) && ixcResult.data.length > 0) {
          const customer = ixcResult.data[0];
          
          // Get full customer status (online, blocked, etc.)
          console.log('Getting customer status from IXC...');
          const { data: statusResult } = await supabase.functions.invoke('ixc-integration', {
            body: {
              action: 'getCustomerStatus',
              params: { id: customer.id }
            }
          });

          console.log('Customer status result:', JSON.stringify(statusResult, null, 2));
          clientStatus = statusResult?.data || null;

          customerData = {
            customer_cpf: cpf,
            customer_name: customer.razao || customer.nome_fantasia || 'Cliente',
            customer_email: customer.email || null,
            customer_phone: customer.telefone_celular || customer.telefone_comercial || null,
            ixc_client_id: customer.id,
            metadata: {
              ...conversation?.metadata,
              cliente_status: clientStatus
            }
          };
        } else {
          // Cliente não encontrado no IXC
          customerData = {
            customer_cpf: cpf,
            customer_name: 'Cliente Novo',
            customer_email: null,
            customer_phone: null,
            ixc_client_id: null,
            metadata: {
              ...conversation?.metadata,
              cliente_novo: true
            }
          };
        }

        // Update conversation with customer data
        const { error: updateError } = await supabase
          .from('conversations')
          .update(customerData)
          .eq('id', conversationId);

        if (updateError) {
          console.error('Error updating conversation:', updateError);
          throw updateError;
        }

        console.log('Customer identified and status verified');

        // AUTOMATIC ROUTING BASED ON STATUS
        if (clientStatus) {
          const isOnline = clientStatus.online === true || clientStatus.onlineStatus === true;
          const isBlocked = clientStatus.blocked === true || clientStatus.financiallyBlocked === true;
          const serviceStatus = clientStatus.serviceStatus || '';
          // Problema financeiro = bloqueado OU serviceStatus contendo "FINANCEIRO"
          const hasFinancialIssue = isBlocked || serviceStatus.includes('FINANCEIRO');

          console.log(`Status: Online=${isOnline}, Blocked=${isBlocked}, ServiceStatus=${serviceStatus}, HasFinancialIssue=${hasFinancialIssue}`);

          // If blocked/overdue/financial issue → Financial Support (Julia Martins)
          if (hasFinancialIssue) {
            console.log('Client has financial issue - routing to financial support');
            return new Response(
              JSON.stringify({
                agent: 'support_financial',
                message: `Obrigado, ${customerData.customer_name}! Identifiquei que há uma pendência financeira em sua conta. Vou transferir você para a Julia Martins do setor financeiro que poderá resolver isso imediatamente.`,
                customerIdentified: true,
                customerData,
                autoRouted: true,
                routeReason: 'financial_issue'
              }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          // If offline → Technical Support
          if (!isOnline) {
            console.log('Client is offline - routing to technical support');
            return new Response(
              JSON.stringify({
                agent: 'support_tech',
                message: `Obrigado, ${customerData.customer_name}! Já verificando aqui... percebi que sua conexão está offline. Vou transferir você para nosso suporte técnico que já vai resolver!`,
                customerIdentified: true,
                customerData,
                autoRouted: true,
                routeReason: 'offline'
              }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          // If online and not blocked - confirm and continue with normal routing
          console.log('Client is online and not blocked - confirming and proceeding');
          return new Response(
            JSON.stringify({
              agent: 'routing',
              message: `Obrigado, ${customerData.customer_name}! Verifiquei aqui e está tudo certo com sua conexão. Como posso ajudá-lo?`,
              customerIdentified: true,
              customerData,
              requiresIntent: true
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // New customer or couldn't verify status - ask how to help
        return new Response(
          JSON.stringify({
            agent: 'routing',
            message: `Olá! ${customerData.ixc_client_id ? 'Encontrei seu cadastro.' : 'Vejo que você ainda não é nosso cliente!'} Como posso ajudá-lo hoje?`,
            customerIdentified: true,
            customerData,
            requiresIntent: true
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } catch (error) {
        console.error('Error identifying customer:', error);
        // Continue with normal flow
      }
    }

    // If customer not identified yet and has had some conversation, ask for CPF naturally
    if (!conversation?.customer_cpf && messageCount >= 1) {
      // Check if we already asked for CPF
      const alreadyAskedForCPF = messages?.some(m => 
        m.sender_type === 'agent' && m.content.toLowerCase().includes('cpf')
      );

      if (!alreadyAskedForCPF) {
        console.log('Asking for CPF naturally after initial conversation');
        return new Response(
          JSON.stringify({
            agent: 'identification',
            message: 'Perfeito! Para verificar sua situação, pode me passar seu CPF, por favor?',
            needsIdentification: true
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // If this is first message (greeting), respond naturally
    if (messageCount === 0) {
      const greetings = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'eae', 'e ai'];
      const isGreeting = greetings.some(g => message.toLowerCase().includes(g));
      
      if (isGreeting) {
        console.log('First message is a greeting - responding naturally');
        return new Response(
          JSON.stringify({
            agent: 'routing',
            message: 'Olá! Tudo bem? Meu nome é Cloé, da SUPERNET FIBRA. Como posso ajudá-lo hoje? 😊',
            isGreeting: true
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Build conversation history for context
    let conversationHistory: Message[] = [];
    if (messages) {
      conversationHistory = messages.map(msg => ({
        role: msg.sender_type === 'client' ? 'user' : 'assistant',
        content: msg.content
      }));
    }

    // Call AI Gateway to determine routing
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Get customer status from metadata if available
    const clientStatus = conversation?.metadata?.cliente_status;
    
    const contextInfo = `
CONTEXTO DO CLIENTE:
Nome: ${conversation?.customer_name || 'Não identificado'}
CPF: ${conversation?.customer_cpf || 'Não informado'}
ID IXC: ${conversation?.ixc_client_id || 'N/A'}
Status Online: ${clientStatus?.online ? 'SIM' : 'NÃO'}
Bloqueado: ${clientStatus?.blocked ? 'SIM' : 'NÃO'}
${context ? `Departamento Atual: ${context.department}` : ''}

HISTÓRICO RECENTE:
${conversationHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

MENSAGEM ATUAL DO CLIENTE:
"${message}"
`;

    const routingResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: config.system_prompt },
          { role: 'user', content: contextInfo }
        ],
        temperature: config.temperature,
        max_tokens: config.max_tokens,
      }),
    });

    if (!routingResponse.ok) {
      const errorText = await routingResponse.text();
      console.error('AI Gateway error:', routingResponse.status, errorText);
      throw new Error(`AI Gateway error: ${routingResponse.status}`);
    }

    const routingData = await routingResponse.json();
    const routingDecision = routingData.choices[0].message.content;
    
    console.log('Routing decision:', routingDecision);
    
    // Parse routing decision
    let decision;
    try {
      // Try to extract JSON from the response
      const jsonMatch = routingDecision.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        decision = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (e) {
      console.error('Failed to parse routing decision:', e);
      // Default to clarify if parsing fails
      decision = {
        agent: 'clarify',
        confidence: 50,
        reason: 'Não foi possível determinar a intenção claramente'
      };
    }

    // If clarification needed, return message asking for more info
    if (decision.agent === 'clarify' || decision.confidence < 60) {
      return new Response(
        JSON.stringify({
          agent: 'clarify',
          message: 'Para que eu possa direcionar você ao setor correto, poderia me informar se sua dúvida é sobre:\n\n🛒 **Vendas** - Contratar planos, preços, cobertura\n🔧 **Suporte Técnico** - Problemas de conexão, configurações\n💰 **Financeiro** - Faturas, pagamentos, boletos',
          confidence: decision.confidence,
          reason: decision.reason
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Return routing decision
    return new Response(
      JSON.stringify({
        agent: decision.agent,
        confidence: decision.confidence,
        reason: decision.reason,
        message: `Transferindo você para ${
          decision.agent === 'sales' ? 'o Vicente, do setor de Vendas' :
          decision.agent === 'support_tech' ? 'nosso Suporte Técnico' :
          'a Julia Martins, do Financeiro'
        }. Um momento, por favor...`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in routing-agent:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        agent: 'sales', // Default fallback
        confidence: 30,
        reason: 'Erro no roteamento, direcionando para vendas por padrão'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
