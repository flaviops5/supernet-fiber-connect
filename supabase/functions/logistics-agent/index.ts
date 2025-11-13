import { createAuthenticatedHandler } from '../_shared/base-handler.ts';
import { LOGISTICS_AGENT_CONFIG } from "./config.ts";
import { LOGISTICS_AGENT_SYSTEM_PROMPT, LOGISTICS_AGENT_ERROR_MESSAGE } from "./prompts.ts";
import { callLovableAI, extractContent, extractToolCalls, hasToolCalls } from '../_shared/lovable-client.ts';
import { logLGPDAccess } from '../_shared/lgpd-logger.ts';
import { recordMetric } from '../_shared/metrics-helper.ts';
import { handleEdgeFunctionError, corsHeaders } from '../_shared/error-handler.ts';

interface Message {
  role: string;
  content: string;
}

Deno.serve(createAuthenticatedHandler('logistics-agent', async (req, { supabase, user }) => {
  const correlationId = `logistics-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const { messages, conversationId, customerData } = await req.json();
    
    console.log(`📦 [${correlationId}] Logistics Agent (Érik) - Processing request`);

    // Sprint 1: LGPD Audit para acesso a dados do cliente
    if (conversationId) {
      await logLGPDAccess(
        supabase,
        'read',
        'conversation',
        'legitimate_interest',
        'Logistics agent acessou conversa para agendamento',
        { conversation_id: conversationId, correlation_id: correlationId }
      );
    }

    // Fetch agent configuration
    const { data: agentConfig, error: configError } = await supabase
      .from('agent_configurations')
      .select('*')
      .eq('agent_type', 'logistics')
      .eq('is_active', true)
      .single();

    if (configError || !agentConfig) {
      console.error('Error fetching agent config:', configError);
      throw new Error('Agent configuration not found');
    }

    // Get conversation history
    let conversationHistory: Message[] = [];
    if (conversationId) {
      const { data: historyMessages } = await supabase
        .from('conversation_messages')
        .select('content, sender_type')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (historyMessages) {
        conversationHistory = historyMessages.map(msg => ({
          role: msg.sender_type === 'client' ? 'user' : 'assistant',
          content: msg.content
        }));
      }
    }

    // Get logistics knowledge base
    const { data: logisticsKnowledge } = await supabase
      .from('knowledge_base')
      .select('title, content, category')
      .in('category', ['logistica', 'instalacao', 'agendamento'])
      .or('agent_types.cs.{logistics},agent_types.is.null')
      .eq('is_active', true);

    const knowledgeContext = logisticsKnowledge?.map(k => 
      `[${k.category}] ${k.title}\n${k.content}`
    ).join('\n\n') || '';

    // Customer context
    const customerName = customerData?.customer_name || customerData?.name;
    const customerPhone = customerData?.customer_phone || customerData?.phone;
    const customerCpf = customerData?.customer_cpf || customerData?.cpf;
    const customerEmail = customerData?.email;
    const isCustomerIdentified = customerName && customerCpf;
    const customerFirstName = customerName ? customerName.split(' ')[0] : '';

    // Build system prompt
    const systemPrompt = agentConfig.system_prompt + `

${LOGISTICS_AGENT_SYSTEM_PROMPT}

BASE DE CONHECIMENTO:
${knowledgeContext}

${isCustomerIdentified ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ CLIENTE JÁ IDENTIFICADO:
Nome: ${customerName}
Telefone: ${customerPhone || 'Não informado'}
CPF: ${customerCpf}
Email: ${customerEmail || 'Não informado'}
${customerData?.ixc_client_id ? `ID IXC: ${customerData.ixc_client_id}` : ''}

IMPORTANTE: Cliente já identificado. Vá direto ao assunto da logística/instalação.
Cumprimente pelo nome (${customerFirstName}) e pergunte como pode ajudar.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ CLIENTE NÃO IDENTIFICADO
Para agendar instalação ou consultar atendimento, você precisa:
- Nome completo
- CPF
- Telefone
- Email (opcional mas recomendado)

Peça educadamente essas informações.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`}
`;

    // Define tools for logistics operations
    const tools = [
      {
        type: "function",
        function: {
          name: "criar_agendamento_instalacao",
          description: "Agenda uma nova instalação de internet. Use quando o cliente confirmar todos os dados necessários e aceitar a data/horário proposto.",
          parameters: {
            type: "object",
            properties: {
              customer_name: { type: "string", description: "Nome completo do cliente" },
              customer_cpf: { type: "string", description: "CPF do cliente (apenas números)" },
              customer_phone: { type: "string", description: "Telefone do cliente" },
              customer_email: { type: "string", description: "Email do cliente" },
              address_street: { type: "string", description: "Rua/Avenida" },
              address_number: { type: "string", description: "Número" },
              address_complement: { type: "string", description: "Complemento (apto, bloco, etc)" },
              address_neighborhood: { type: "string", description: "Bairro" },
              address_city: { type: "string", description: "Cidade" },
              address_zipcode: { type: "string", description: "CEP" },
              installation_date: { type: "string", description: "Data da instalação (YYYY-MM-DD)" },
              installation_period: { type: "string", enum: ["manha", "tarde"], description: "Período: manhã (8h-12h) ou tarde (13h-17h)" },
              plan_name: { type: "string", description: "Nome do plano contratado" },
              observations: { type: "string", description: "Observações adicionais (opcional)" }
            },
            required: ["customer_name", "customer_cpf", "customer_phone", "address_street", "address_number", "address_neighborhood", "address_city", "address_zipcode", "installation_date", "installation_period"]
          }
        }
      }
    ];

    // Sprint 1: Call AI usando Lovable Client com Circuit Breaker
    const aiResponse = await callLovableAI({
      model: agentConfig.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        ...messages
      ],
      tools: tools,
      tool_choice: "auto",
      temperature: parseFloat(agentConfig.temperature),
      max_completion_tokens: agentConfig.max_tokens,
    }, correlationId);

    const choice = aiResponse.choices[0];
    let assistantMessage = extractContent(aiResponse);

    // Handle tool calls
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      
      if (toolCall.function.name === 'criar_agendamento_instalacao') {
        const args = JSON.parse(toolCall.function.arguments);
        
        console.log('Creating installation appointment:', args);

        try {
          // Create appointment
          const { data: appointment, error: appointmentError } = await supabase
            .from('installation_appointments')
            .insert({
              customer_name: args.customer_name,
              customer_cpf: args.customer_cpf.replace(/\D/g, ''),
              customer_phone: args.customer_phone.replace(/\D/g, ''),
              customer_email: args.customer_email,
              customer_address: `${args.address_street}, ${args.address_number}${args.address_complement ? ', ' + args.address_complement : ''} - ${args.address_neighborhood}`,
              customer_cep: args.address_zipcode.replace(/\D/g, ''),
              plan_name: args.plan_name || 'A definir',
              plan_speed: 'A definir',
              plan_price: 0,
              appointment_date: args.installation_date,
              appointment_period: args.installation_period,
              status: 'pending',
              observations: args.observations || null,
              payment_day: 10,
              customer_birth_date: '2000-01-01'
            })
            .select()
            .single();

          if (appointmentError) {
            console.error('Error creating appointment:', appointmentError);
            assistantMessage = `Desculpe, não consegui criar o agendamento. Erro: ${appointmentError.message}. Por favor, tente novamente ou entre em contato conosco.`;
          } else {
            // Log action
            await supabase
              .from('action_log')
              .insert({
                agent_name: 'Erik',
                client_cpf: args.customer_cpf,
                action_type: 'create_appointment',
                action_payload: args,
                result: { appointment_id: appointment.id }
              });

            const protocol = appointment.id.split('-')[0].toUpperCase();
            assistantMessage = `✅ Agendamento criado com sucesso!

📋 Protocolo: ${protocol}
📅 Data: ${new Date(args.installation_date).toLocaleDateString('pt-BR')}
🕐 Período: ${args.installation_period === 'manha' ? 'Manhã (8h às 12h)' : 'Tarde (13h às 17h)'}
📍 Local: ${args.address_street}, ${args.address_number} - ${args.address_neighborhood}

📱 Nosso técnico entrará em contato cerca de 1 hora antes da instalação.

Alguma dúvida sobre o agendamento?`;
          }
        } catch (error: unknown) {
          console.error('Unexpected error:', error);
          assistantMessage = `Desculpe, ocorreu um erro inesperado ao criar o agendamento. Por favor, tente novamente.`;
        }
      }
    }

    // Log metrics
    await supabase
      .from('agent_metrics')
      .insert({
        agent_name: 'Erik',
        conversation_id: conversationId,
        action_type: 'response',
        success: true,
        duration_ms: 0,
        metadata: {
          model: agentConfig.model,
          tokens: aiData.usage
        }
    });

  return new Response(
    JSON.stringify({ 
      message: assistantMessage,
      agent: 'logistics',
      agentName: 'Érik Souza'
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}));
