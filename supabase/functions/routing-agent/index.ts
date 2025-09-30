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

    // Check if customer is identified
    const { data: conversation } = await supabase
      .from('conversations')
      .select('customer_cpf, customer_name, customer_email, ixc_client_id')
      .eq('id', conversationId)
      .single();

    console.log('Conversation data:', conversation);

    // If customer not identified, request CPF
    if (!conversation?.customer_cpf) {
      console.log('Customer not identified, checking if message contains CPF');
      
      // Extract CPF from message (11 digits, with or without formatting)
      const cpfMatch = message.match(/\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/);
      
      if (!cpfMatch) {
        console.log('No CPF found in message, requesting identification');
        return new Response(
          JSON.stringify({
            agent: 'identification',
            message: 'Olá! Para melhor atendê-lo, preciso que informe seu CPF (apenas números ou formato 000.000.000-00).',
            needsIdentification: true
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Clean CPF (remove formatting)
      const cpf = cpfMatch[1].replace(/\D/g, '');
      console.log('CPF found:', cpf);

      // Search customer in IXC
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

        let customerData = null;
        if (ixcResult?.customers && ixcResult.customers.length > 0) {
          const customer = ixcResult.customers[0];
          customerData = {
            customer_cpf: cpf,
            customer_name: customer.razao || customer.nome_fantasia || 'Cliente',
            customer_email: customer.email || null,
            customer_phone: customer.telefone_celular || customer.telefone_comercial || null,
            ixc_client_id: customer.id
          };
        } else {
          // Cliente não encontrado no IXC
          customerData = {
            customer_cpf: cpf,
            customer_name: 'Cliente Novo',
            customer_email: null,
            customer_phone: null,
            ixc_client_id: null
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

        console.log('Customer identified:', customerData);

        // Return confirmation message
        return new Response(
          JSON.stringify({
            agent: 'identification',
            message: `Obrigado, ${customerData.customer_name}! ${customerData.ixc_client_id ? 'Encontrei seu cadastro em nossa base.' : 'Vejo que você ainda não é nosso cliente.'} Como posso ajudá-lo hoje?`,
            customerIdentified: true,
            customerData
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } catch (error) {
        console.error('Error identifying customer:', error);
        // Continue with routing even if identification fails
      }
    }

    // Get conversation history
    let conversationHistory: Message[] = [];
    const { data: messages } = await supabase
      .from('conversation_messages')
      .select('content, sender_type')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(10);

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

    const contextInfo = `
CONTEXTO ADICIONAL:
Cliente: ${conversation?.customer_name || 'Não identificado'}
CPF: ${conversation?.customer_cpf || 'Não informado'}
Cliente IXC: ${conversation?.ixc_client_id ? 'Sim (ID: ' + conversation.ixc_client_id + ')' : 'Não'}
${context ? `Departamento: ${context.department || 'não especificado'}` : ''}

HISTÓRICO DA CONVERSA:
${conversationHistory.length > 0 ? conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n') : 'Sem histórico'}

MENSAGEM ATUAL:
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
        message: `Transferindo você para o ${
          decision.agent === 'sales' ? 'setor de Vendas' :
          decision.agent === 'support_tech' ? 'Suporte Técnico' :
          'Suporte Financeiro'
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
