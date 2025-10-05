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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId, customerData } = await req.json();
    
    console.log('Support Tech Agent - Processing request');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch agent configuration from database
    const { data: agentConfig, error: configError } = await supabase
      .from('agent_configurations')
      .select('*')
      .eq('agent_type', 'support_tech')
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

    // Get technical knowledge base (specific to support_tech or shared)
    const { data: techKnowledge } = await supabase
      .from('knowledge_base')
      .select('title, content, category')
      .in('category', ['suporte_tecnico', 'configuracoes', 'troubleshooting', 'ixc_endpoints'])
      .or('agent_types.cs.{support_tech},agent_types.is.null')
      .eq('is_active', true);

    const knowledgeContext = techKnowledge?.map(k => `[${k.category}] ${k.title}\n${k.content}`).join('\n\n') || '';
    
    const ixcToolsNote = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 FERRAMENTAS IXC DISPONÍVEIS:
Você tem acesso a documentação completa de ferramentas IXC na base de conhecimento (categoria: ixc_endpoints).
Consulte os fluxos de troubleshooting e os endpoints disponíveis para:
- Reiniciar modems remotamente
- Limpar endereços MAC
- Verificar status de conexão
- Outras operações técnicas

IMPORTANTE: Siga os fluxos documentados para resolver problemas de forma eficiente.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    // Check if customer is already identified (handle both naming conventions)
    const customerName = customerData?.customer_name || customerData?.name;
    const customerPhone = customerData?.customer_phone || customerData?.phone;
    const customerCpf = customerData?.customer_cpf || customerData?.cpf;
    const isCustomerIdentified = customerName && customerData?.ixc_client_id;
    const customerFirstName = customerName ? customerName.split(' ')[0] : '';
    
    // 🆕 Verificar se o cliente está OFFLINE
    const isCustomerOffline = customerData?.metadata?.customer_status === 'offline' || 
                              customerData?.metadata?.cliente_status?.isOnline === false;
    
    // Use system prompt from database configuration
    const systemPrompt = agentConfig.system_prompt + `

Você é o Luan, agente de Suporte Técnico N1.

${massOutageContext}

BASE DE CONHECIMENTO:
${knowledgeContext}

${ixcToolsNote}

${isCustomerIdentified ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ CLIENTE JÁ IDENTIFICADO:
Nome: ${customerName}
Telefone: ${customerPhone || 'Não informado'}
ID IXC: ${customerData.ixc_client_id}
CPF: ${customerCpf || 'Não informado'}
${isCustomerOffline ? '🔴 STATUS: OFFLINE (sem internet)' : '🟢 STATUS: ONLINE'}

IMPORTANTE: O cliente JÁ FOI IDENTIFICADO pela Cloé. 
NÃO PEÇA O CPF NOVAMENTE!

${isCustomerOffline ? `
🚨 AÇÃO IMEDIATA NECESSÁRIA:
O cliente está SEM INTERNET. Inicie o troubleshooting básico IMEDIATAMENTE:
1. Cumprimente pelo nome (${customerFirstName})
2. Informe que você sabe que ele está sem internet
3. Peça para verificar as luzes do modem/roteador
4. Pergunte qual é a cor e comportamento das luzes (piscando, fixas, apagadas)

NÃO pergunte "o que está acontecendo?" - você JÁ SABE que ele está offline!
Vá direto para o diagnóstico das luzes do equipamento.
` : `
Cumprimente-o pelo nome (${customerFirstName}) e pergunte qual problema técnico ele está enfrentando.
`}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ CLIENTE NÃO IDENTIFICADO
Para localizar o cadastro e gerar protocolo, você precisa do CPF do titular.
Peça educadamente: "Para começarmos, você poderia me informar o seu nome completo e o CPF do titular da conta?"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`}

SUAS RESPONSABILIDADES:

1. **Atendimento Inicial**
   - Receber e registrar atendimentos técnicos
   - Fazer diagnóstico básico do problema
   - Classificar a urgência e complexidade

2. **Diagnóstico Básico**
   - Fazer perguntas padrão para entender o problema
   - Verificar se o problema é simples ou precisa escalonamento
   - Identificar possíveis causas (equipamento, configuração, sinal)

3. **Soluções Rápidas**
   - Reset de senhas de roteador e Wi-Fi
   - Orientar reinicialização de equipamentos
   - Configurações básicas de roteador (nome da rede, senha)
   - Verificar cabos e conexões físicas
   - Orientar sobre posicionamento do roteador

4. **FLUXO DE TROUBLESHOOTING OBRIGATÓRIO**

   **ETAPA 1 - Verificação de Luzes do Modem/Roteador:**
   - Perguntar: "Quais luzes estão acesas no seu modem/roteador?"
   - Perguntar: "Alguma luz está piscando? Qual cor?"
   
   **ETAPA 2 - SE LUZES ESTÃO APAGADAS OU VERMELHAS:**
   - Pedir para verificar se o equipamento está ligado na tomada
   - Verificar se há energia elétrica no local
   - Orientar a desligar por 30 segundos e religar
   - Se continuar: escalonar para troca de equipamento

   **ETAPA 3 - SE LUZES ESTÃO ACESAS/VERDES:**
   ⚠️ IMPORTANTE: Cliente está OFFLINE mas equipamento parece OK
   
   Próximos passos OBRIGATÓRIOS:
   
   a) **Teste de Conectividade:**
      - "Você está tentando conectar por Wi-Fi ou cabo?"
      - Se Wi-Fi: "Consegue ver o nome da rede Wi-Fi disponível?"
      - Se vê a rede: "Consegue conectar? Pede senha?"
   
   b) **Teste em Outros Dispositivos:**
      - "Tem outro dispositivo aí para testar? (celular, notebook, etc)"
      - "Esse outro dispositivo consegue conectar?"
      
   c) **Interpretação dos Resultados:**
      - Se NENHUM dispositivo conecta: problema pode ser no equipamento ou sinal
      - Se ALGUNS conectam: problema pode ser no dispositivo específico do cliente
      - Se conecta mas não navega: problema pode ser de autenticação/DNS

   d) **Ações Baseadas no Diagnóstico:**
      - Equipamento não autentica (luzes OK, ninguém conecta): 
        → Solicitar reinicialização do modem (30s desligado)
        → Se persistir: escalonar para verificação de sinal/OLT
      
      - Conecta mas não navega:
        → Verificar se está sendo redirecionado para alguma página
        → Pode ser bloqueio (mas Cloé já verificou status financeiro)
        → Escalonar para N2
      
      - Só um dispositivo não conecta:
        → Problema no dispositivo do cliente
        → Orientar: esquecer rede e reconectar
        → Verificar se senha está correta

5. **Abertura de Atendimentos Técnicos (OS)**
   Você TEM ACESSO ao IXC e pode criar atendimentos técnicos automaticamente.
   
   ABRA ATENDIMENTO quando diagnosticar:
   - ✅ Fonte de alimentação queimada (equipamento sem energia)
   - ✅ Cabo danificado ou rompido
   - ✅ Equipamento defeituoso (não liga, não autentica após testes)
   - ✅ Problema de sinal que não resolve remotamente
   - ✅ Necessidade de troca de equipamento
   - ✅ Qualquer problema que EXIJA presença técnica no local
   
   COMO ABRIR:
   Quando concluir o diagnóstico e determinar que precisa de visita técnica:
   1. Use a ferramenta criar_atendimento_ixc
   2. Informe o tipo do problema
   3. Descreva detalhadamente o diagnóstico
   4. Defina a urgência corretamente
   5. Informe ao cliente que o atendimento foi aberto e equipe entrará em contato
   
   NÃO ABRA ATENDIMENTO se:
   - Problema é claramente no dispositivo do cliente
   - Senha de Wi-Fi incorreta
   - Cliente não seguiu os passos corretamente
   - Problema pode ser resolvido remotamente
`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Tool for creating IXC ticket
    const tools = [{
      type: "function",
      function: {
        name: "criar_atendimento_ixc",
        description: "Cria uma ordem de serviço (atendimento) no IXC quando o problema requer visita técnica presencial. Use quando: equipamento sem energia/queimado, cabo danificado, problema de sinal que não resolve remotamente, necessidade de troca de equipamento.",
        parameters: {
          type: "object",
          properties: {
            tipo_problema: {
              type: "string",
              enum: ["fonte_queimada", "cabo_danificado", "equipamento_defeituoso", "problema_sinal", "troca_equipamento", "instalacao_reparo"],
              description: "Tipo do problema identificado"
            },
            descricao: {
              type: "string",
              description: "Descrição detalhada do problema diagnosticado e ações já realizadas"
            },
            urgencia: {
              type: "string",
              enum: ["baixa", "media", "alta", "critica"],
              description: "Nível de urgência do atendimento"
            }
          },
          required: ["tipo_problema", "descricao", "urgencia"]
        }
      }
    }];

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: agentConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          ...messages
        ],
        tools: tools,
        tool_choice: "auto",
        temperature: parseFloat(agentConfig.temperature),
        max_tokens: agentConfig.max_tokens,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices[0];
    let assistantMessage = choice.message.content;

    // Check if AI wants to create a ticket
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      
      if (toolCall.function.name === 'criar_atendimento_ixc') {
        const args = JSON.parse(toolCall.function.arguments);
        
        console.log('Creating IXC ticket with args:', args);
        
        // 📝 STEP 1: Create action_log entry BEFORE IXC call
        const { data: actionLog, error: actionLogError } = await supabase
          .from('action_log')
          .insert({
            agent_name: 'Luan',
            client_cpf: customerCpf,
            action_type: 'create_ticket',
            action_payload: {
              tipo_problema: args.tipo_problema,
              descricao: args.descricao,
              urgencia: args.urgencia,
              customer_name: customerName,
              ixc_client_id: customerData?.ixc_client_id
            }
          })
          .select()
          .single();

        if (actionLogError) {
          console.error('Error creating action_log:', actionLogError);
        }

        // 🔄 Create ticket in IXC via proxy with retry
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        
        if (supabaseUrl && customerData?.ixc_client_id) {
          try {
            // Map problem types to IXC ticket types
            const tipoMap: Record<string, number> = {
              'fonte_queimada': 1,
              'cabo_danificado': 2,
              'equipamento_defeituoso': 3,
              'problema_sinal': 4,
              'troca_equipamento': 5,
              'instalacao_reparo': 6
            };

            const ticketBody = {
              id_cliente: customerData.ixc_client_id,
              id_tipo_chamado: tipoMap[args.tipo_problema] || 1,
              descricao: args.descricao,
              prioridade: args.urgencia === 'critica' ? 'alta' : args.urgencia,
              status: 'A'
            };

            // Usar IXC Proxy com retry
            const maxRetries = 3;
            let ixcResponse;
            let lastError;

            for (let attempt = 0; attempt <= maxRetries; attempt++) {
              try {
                console.log(`🔄 Attempt ${attempt + 1}/${maxRetries + 1} to create IXC ticket`);
                
                ixcResponse = await fetch(`${supabaseUrl}/functions/v1/ixc-proxy`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    method: 'POST',
                    path: '/webservice/v1/su_oss_chamado',
                    body: ticketBody
                  })
                });

                if (ixcResponse.ok) break;
                
                lastError = await ixcResponse.text();
                if (attempt < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
              } catch (e) {
                lastError = e;
                if (attempt < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
              }
            }

            if (ixcResponse && ixcResponse.ok) {
              const proxyData = await ixcResponse.json();
              const ticketData = proxyData.data;
              console.log('IXC ticket created:', ticketData);
              const ticketId = ticketData.id || ticketData.protocolo;
              
              // 📝 STEP 2: Update action_log with IXC result
              if (actionLog) {
                await supabase
                  .from('action_log')
                  .update({
                    ixcticket_id: String(ticketId),
                    result: ticketData
                  })
                  .eq('id', actionLog.id);
              }

              // 📅 STEP 3: Create installation appointment
              const startDate = new Date();
              startDate.setDate(startDate.getDate() + 1); // Tomorrow
              startDate.setHours(8, 0, 0, 0); // 08:00
              
              const endDate = new Date(startDate);
              endDate.setHours(12, 0, 0, 0); // 12:00

              const { error: appointmentError } = await supabase
                .from('installation_appointments')
                .insert({
                  customer_cpf: customerCpf,
                  customer_name: customerName,
                  customer_phone: customerPhone,
                  customer_email: customerData?.email,
                  ixc_contract_id: String(ticketId),
                  appointment_date: startDate.toISOString().split('T')[0],
                  appointment_period: '08:00-12:00',
                  status: 'scheduled',
                  plan_name: 'Manutenção Técnica',
                  plan_speed: 'N/A',
                  plan_price: 0,
                  payment_day: 1,
                  customer_birth_date: '2000-01-01',
                  customer_cep: '00000-000',
                  customer_address: 'A definir',
                  observations: `Atendimento técnico: ${args.tipo_problema} - ${args.descricao}`
                });

              if (appointmentError) {
                console.error('Error creating appointment:', appointmentError);
              } else {
                console.log('Appointment scheduled for:', startDate.toISOString());
              }
              
              // Update conversation with ticket info
              if (conversationId) {
                await supabase
                  .from('conversations')
                  .update({
                    metadata: {
                      ixc_ticket_id: ticketId,
                      ticket_type: args.tipo_problema,
                      ticket_created_at: new Date().toISOString(),
                      action_log_id: actionLog?.id
                    },
                    status: 'scheduled'
                  })
                  .eq('id', conversationId);
              }

              assistantMessage = `${assistantMessage}\n\n✅ Atendimento criado com sucesso! Protocolo: ${ticketId}. Nossa equipe técnica entrará em contato em breve para agendar a visita.`;
            } else {
              const errorText = await ixcResponse.text();
              console.error('Error creating IXC ticket:', errorText);
              
              // Update action_log with error
              if (actionLog) {
                await supabase
                  .from('action_log')
                  .update({
                    result: { error: errorText, status: ixcResponse.status }
                  })
                  .eq('id', actionLog.id);
              }
              
              assistantMessage = `${assistantMessage}\n\n⚠️ Identifiquei que você precisa de uma visita técnica, mas tive um problema ao registrar o atendimento. Por favor, anote o protocolo de atendimento e nossa equipe retornará em breve.`;
            }
          } catch (error) {
            console.error('Error calling IXC API:', error);
            
            // Update action_log with error
            if (actionLog) {
              await supabase
                .from('action_log')
                .update({
                  result: { error: String(error) }
                })
                .eq('id', actionLog.id);
            }
            
            assistantMessage = `${assistantMessage}\n\n⚠️ Identifiquei que você precisa de uma visita técnica. Vou registrar internamente e nossa equipe entrará em contato para agendar.`;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in support-tech-agent:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: 'Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente ou entre em contato pelo telefone (11) 99999-9999.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
