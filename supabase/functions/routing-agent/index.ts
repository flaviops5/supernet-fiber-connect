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

        // ROTEAMENTO SIMPLIFICADO: BLOQUEADO ou FINANCEIRO EM ATRASO → Julia (Financeiro)
        if (clientStatus) {
          const contracts = clientStatus.contracts || [];
          
          // Verifica APENAS: está BLOQUEADO ou FINANCEIRO EM ATRASO?
          let isBlocked = false;
          
          for (const contract of contracts) {
            const statusInternet = String(contract.status_internet || '').toUpperCase();
            const isAccessDisabled = contract.data_acesso_desativado && contract.data_acesso_desativado !== '0000-00-00';
            
            // Códigos que indicam BLOQUEIO ou FINANCEIRO EM ATRASO
            const financialBlockStatus = ['CA', 'CM', 'CB', 'FA'];
            
            if (financialBlockStatus.includes(statusInternet) || /BLOQ|BLOQUE/.test(statusInternet) || isAccessDisabled) {
              isBlocked = true;
              break;
            }
          }

          // Se está BLOQUEADO ou em ATRASO → Julia (Financeiro)
          if (isBlocked) {
            console.log('Cliente BLOQUEADO ou FINANCEIRO EM ATRASO - roteando para Julia (Financeiro)');
            const firstName = customerData.customer_name.split(' ')[0];

            // Server-side handoff: call Julia (support-financial-agent) immediately
            let financialMessage: string | undefined = undefined;
            console.log('🔵 ANTES de chamar support-financial-agent');
            try {
              console.log('🟡 Invocando support-financial-agent com:', {
                conversationId,
                hasSupabase: !!supabase,
                hasCustomerData: !!customerData
              });
              
              const { data: finData, error: finError } = await supabase.functions.invoke('support-financial-agent', {
                body: {
                  messages: [{ role: 'user', content: message }],
                  conversationId,
                  customerData,
                  routeReason: 'blocked_or_overdue',
                },
              });
              
              console.log('🟢 Resposta do support-financial-agent:', { 
                finData, 
                finError,
                hasMessage: !!finData?.message 
              });
              
              if (finError) {
                console.error('🔴 ERRO ao chamar support-financial-agent:', finError);
              } else if (finData?.message) {
                financialMessage = finData.message as string;
                console.log('✅ Mensagem da Julia recebida:', financialMessage.substring(0, 50) + '...');

                // Persist Julia's message server-side so it appears in timelines
                const { data: insertResult, error: insertError } = await supabase
                  .from('conversation_messages')
                  .insert({
                    conversation_id: conversationId,
                    sender_type: 'agent',
                    sender_name: 'Julia Martins (Financeiro)',
                    content: financialMessage,
                    ai_suggestion: true,
                  })
                  .select();
                
                if (insertError) {
                  console.error('❌ ERRO ao persistir mensagem da Julia:', insertError);
                } else {
                  console.log('✅ Mensagem da Julia persistida no DB:', insertResult);
                }
              } else {
                console.warn('⚠️ support-financial-agent retornou sem mensagem');
              }
            } catch (e) {
              console.error('💥 EXCEÇÃO ao chamar support-financial-agent:', e);
              console.error('💥 Tipo de erro:', typeof e);
              console.error('💥 Stack trace:', e instanceof Error ? e.stack : 'N/A');
            }

            // Se Julia respondeu, usa a mensagem dela como principal
            const finalMessage = financialMessage || 
              `Obrigado, ${firstName}! Identifiquei que há uma pendência financeira em sua conta. Vou transferir você para a Julia Martins do setor financeiro que poderá resolver isso imediatamente.`;
            
            console.log('🔵 Retornando resposta:', {
              hasFinancialMessage: !!financialMessage,
              messageLength: finalMessage.length
            });
            
            return new Response(
              JSON.stringify({
                agent: 'support_financial',
                message: finalMessage,
                customerIdentified: true,
                customerData,
                autoRouted: true,
                routeReason: 'blocked_or_overdue',
                juliaResponse: !!financialMessage, // Flag indicando se veio da Julia
              }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          // Senão, verifica se está offline → Suporte Técnico
          const isOnline = clientStatus.isOnline === true;
          if (!isOnline) {
            console.log('Cliente offline - roteando para Suporte Técnico');
            const firstName = customerData.customer_name.split(' ')[0];
            return new Response(
              JSON.stringify({
                agent: 'support_tech',
                message: `Obrigado, ${firstName}! Já verificando aqui... percebi que sua conexão está offline. Vou transferir você para nosso suporte técnico que já vai resolver!`,
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
          const firstName = customerData.customer_name.split(' ')[0];
          return new Response(
            JSON.stringify({
              agent: 'routing',
              message: `Obrigado, ${firstName}! Verifiquei aqui e está tudo certo com sua conexão. Como posso ajudá-lo?`,
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

    // Don't ask for CPF too early - let the AI routing decide first

    // If this is first message (greeting), respond naturally
    if (messageCount === 0) {
      const greetings = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'eae', 'e ai'];
      const isGreeting = greetings.some(g => message.toLowerCase().includes(g));
      
      if (isGreeting) {
        console.log('First message is a greeting - responding naturally');
        return new Response(
          JSON.stringify({
            agent: 'routing',
            message: 'Olá! Tudo bem? Meu nome é Cloé. Como posso ajudá-lo hoje? 😊',
            isGreeting: true
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Handle first user turn saved before routing call (no agent messages persisted yet)
    if (messageCount === 1) {
      const hasAgentMessage = messages?.some((m: any) => m.sender_type === 'agent');
      const userMsgs = messages?.filter((m: any) => m.sender_type === 'client' || m.sender_type === 'customer') || [];
      const greetings = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'eae', 'e ai', 'opa'];
      const isGreeting = greetings.some(g => message.toLowerCase().includes(g));
      if (!hasAgentMessage && userMsgs.length === 1 && isGreeting) {
        console.log('First turn greeting after persisted customer message - Cloé introduces herself as atendente');
        return new Response(
          JSON.stringify({
            agent: 'routing',
            message: 'Olá! Tudo bem? Meu nome é Cloé, atendente da SUPERNET FIBRA. Como posso ajudar hoje? 😊',
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
        role: (msg.sender_type === 'client' || msg.sender_type === 'customer') ? 'user' : 'assistant',
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
Status Online: ${clientStatus?.isOnline ? 'SIM' : 'NÃO'}
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

    // If clarification needed, return message from AI (no hardcoded menus)
    if (decision.agent === 'clarify' || decision.confidence < 60) {
      return new Response(
        JSON.stringify({
          agent: 'clarify',
          message: decision.message || 'Para te ajudar melhor, pode me contar um pouco mais sobre o que você precisa?',
          confidence: decision.confidence,
          reason: decision.reason
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if we need CPF for this agent
    const needsCPF = decision.agent === 'support_tech' || decision.agent === 'support_financial';
    
    // If agent needs CPF and customer not identified, ask for it
    if (needsCPF && !conversation?.customer_cpf) {
      console.log(`Agent ${decision.agent} needs CPF - asking for identification`);
      return new Response(
        JSON.stringify({
          agent: 'identification',
          message: `Perfeito! Vou direcionar você para ${
            decision.agent === 'support_tech' ? 'nosso Suporte Técnico' :
            'a Julia Martins do Financeiro'
          }.\n\nPara que eu possa verificar sua situação, pode me passar seu CPF, por favor?`,
          needsIdentification: true,
          targetAgent: decision.agent
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Return routing decision, with server-side handoff if already identified for Financeiro
    let financialMessage: string | undefined = undefined;
    if (decision.agent === 'support_financial' && conversation?.customer_cpf) {
      try {
        const { data: finData, error: finError } = await supabase.functions.invoke('support-financial-agent', {
          body: {
            messages: [{ role: 'user', content: message }],
            conversationId,
            customerData: {
              customer_cpf: conversation.customer_cpf,
              customer_name: conversation.customer_name,
              customer_email: conversation.customer_email,
              ixc_client_id: conversation.ixc_client_id,
              metadata: conversation.metadata,
            },
          },
        });
        if (finError) {
          console.error('Erro ao chamar support-financial-agent (decision path):', finError);
        } else if (finData?.message) {
          financialMessage = finData.message as string;
          await supabase.from('conversation_messages').insert({
            conversation_id: conversationId,
            sender_type: 'agent',
            sender_name: 'Julia Martins (Financeiro)',
            content: financialMessage,
            ai_suggestion: true,
          });
        }
      } catch (e) {
        console.error('Exceção ao chamar support-financial-agent (decision path):', e);
      }
    }

    return new Response(
      JSON.stringify({
        agent: decision.agent,
        confidence: decision.confidence,
        reason: decision.reason,
        message: `Perfeito! Transferindo você para ${
          decision.agent === 'sales' ? 'o Vicente, nosso especialista em Vendas' :
          decision.agent === 'support_tech' ? 'nosso Suporte Técnico' :
          'a Julia Martins, do Financeiro'
        }. Um momento! ⏳`,
        financialMessage,
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
