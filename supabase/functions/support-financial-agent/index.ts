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
    const { messages, conversationId, customerData, routeReason } = await req.json();
    
    console.log('Support Financial Agent - Processing request');
    console.log('Route reason:', routeReason);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch agent configuration from database
    const { data: agentConfig, error: configError } = await supabase
      .from('agent_configurations')
      .select('*')
      .eq('agent_type', 'support_financial')
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

    // Get financial knowledge base (specific to support_financial or shared)
    const { data: financialKnowledge } = await supabase
      .from('knowledge_base')
      .select('title, content, category')
      .in('category', ['financeiro', 'cobranca', 'pagamento', 'ixc_endpoints'])
      .or('agent_type.eq.support_financial,agent_type.is.null')
      .eq('is_active', true);

    const knowledgeContext = financialKnowledge?.map(k => `[${k.category}] ${k.title}\n${k.content}`).join('\n\n') || '';
    
    const ixcToolsNote = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 FERRAMENTAS IXC DISPONÍVEIS:
Você tem acesso a documentação de ferramentas IXC na base de conhecimento (categoria: ixc_endpoints).
Consulte os fluxos documentados para operações como:
- Desbloqueio de confiança (automático)
- Consulta de títulos financeiros
- Geração de PIX e boletos
- Outras operações financeiras

IMPORTANTE: O desbloqueio de confiança é realizado automaticamente quando necessário.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    // Get system settings for company info
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    // DESBLOQUEIO AUTOMÁTICO se cliente está bloqueado/em atraso
    let desbloqueioInfo = '';
    let paymentInfo = '';
    
    if (routeReason === 'blocked_or_overdue' && customerData?.ixc_client_id) {
      console.log('🔓 Cliente bloqueado/em atraso - tentando desbloqueio automático...');
      
      // 📝 Register action_log for unblock attempt
      const { data: actionLog } = await supabase
        .from('action_log')
        .insert({
          agent_name: 'Júlia Martins',
          client_cpf: customerData?.cpf,
          action_type: 'unblock_attempt',
          action_payload: {
            reason: routeReason,
            ixc_client_id: customerData.ixc_client_id,
            customer_name: customerData?.name
          }
        })
        .select()
        .single();
      
      try {
        // Buscar contratos do cliente via IXC
        const statusResponse = await fetch(`${supabaseUrl}/functions/v1/ixc-integration`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'getCustomerStatus',
            params: { id: customerData.ixc_client_id }
          })
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          const contracts = statusData.data?.contracts || [];
          
          // Encontrar contrato bloqueado/em atraso ativo
          const blockedContract = contracts.find((c: any) => {
            const statusInternet = String(c.status_internet || '').toUpperCase();
            const financialBlockStatus = ['CA', 'CM', 'CB', 'FA'];
            return financialBlockStatus.includes(statusInternet) || /BLOQ|BLOQUE/.test(statusInternet);
          });

          if (blockedContract) {
            console.log(`📋 Contrato bloqueado encontrado: ${blockedContract.id}`);
            
            // Tentar desbloqueio de confiança
            const unblockResponse = await fetch(`${supabaseUrl}/functions/v1/ixc-integration`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                action: 'desbloqueioConfianca',
                params: { contractId: blockedContract.id }
              })
            });

            if (unblockResponse.ok) {
              const unblockData = await unblockResponse.json();
              
              if (unblockData.data?.success) {
                console.log('✅ Desbloqueio bem-sucedido!');
                
                // 📝 Update action_log with success
                if (actionLog) {
                  await supabase
                    .from('action_log')
                    .update({
                      result: {
                        success: true,
                        contract_id: blockedContract.id,
                        unblock_data: unblockData.data
                      }
                    })
                    .eq('id', actionLog.id);
                }
                
                // Buscar títulos financeiros pendentes
                const titlesResponse = await fetch(`${supabaseUrl}/functions/v1/ixc-integration`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    action: 'getFinancialTitles',
                    params: { customerId: customerData.ixc_client_id }
                  })
                });

                if (titlesResponse.ok) {
                  const titlesData = await titlesResponse.json();
                  const titles = titlesData.data?.titles || [];
                  
                  if (titles.length > 0) {
                    console.log(`💰 ${titles.length} título(s) pendente(s) encontrado(s)`);
                    const firstTitle = titles[0];
                    
                    // Buscar QR Code PIX do primeiro título
                    const pixResponse = await fetch(`${supabaseUrl}/functions/v1/ixc-integration`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        action: 'getPixQrCode',
                        params: { titleId: firstTitle.id }
                      })
                    });

                    if (pixResponse.ok) {
                      const pixData = await pixResponse.json();
                      console.log('🏦 QR Code PIX obtido');
                      
                      paymentInfo = `

📄 INFORMAÇÕES DE PAGAMENTO (ENVIE AO CLIENTE):

💵 Valor: R$ ${firstTitle.valor}
📅 Vencimento: ${firstTitle.data_vencimento}
🔢 Código de Barras: ${firstTitle.codbar || 'Não disponível'}

🏦 PIX COPIA E COLA:
${pixData.data?.qrcode || 'Não disponível'}

${firstTitle.url_boleto ? `📎 Link do Boleto: ${firstTitle.url_boleto}` : ''}
${pixData.data?.qrcode_link ? `🔗 Link de Pagamento: ${pixData.data.qrcode_link}` : ''}
`;
                    }
                  }
                }
                
                desbloqueioInfo = `
✅ DESBLOQUEIO DE CONFIANÇA REALIZADO COM SUCESSO

📋 Contrato liberado: ${blockedContract.id} (${blockedContract.contrato})
⏰ O cliente agora tem 3 DIAS de serviço normal para regularizar o pagamento
🌐 Instrua o cliente a testar a navegação IMEDIATAMENTE
${paymentInfo}

🔔 MONITORAMENTO AUTOMÁTICO DE PAGAMENTO ATIVO:
- Sistema irá verificar o pagamento a cada 5 minutos
- Notificação automática será enviada quando o pagamento for confirmado
- Timeout de 10 minutos para aguardar confirmação
- Após timeout, oriente cliente a entrar em contato se já pagou

IMPORTANTE: Explique ao cliente que:
1. O serviço foi liberado por 3 dias para regularização
2. Assim que o pagamento for confirmado no sistema, receberá notificação automática
3. Se já pagou, pode levar alguns minutos para confirmar no sistema
4. Após 3 dias sem pagamento, o bloqueio retornará automaticamente
`;
              } else {
                console.log('❌ Falha no desbloqueio:', unblockData.data?.error);
                
                // 📝 Update action_log with failure
                if (actionLog) {
                  await supabase
                    .from('action_log')
                    .update({
                      result: {
                        success: false,
                        error: unblockData.data?.error,
                        contract_id: blockedContract.id
                      }
                    })
                    .eq('id', actionLog.id);
                }
                
                desbloqueioInfo = `
❌ TENTATIVA DE DESBLOQUEIO NÃO FOI POSSÍVEL

📋 Contrato: ${blockedContract.id}
⚠️ Motivo: ${unblockData.data?.error || 'Erro desconhecido'}

O sistema IXC não permitiu a liberação automática. Oriente o cliente a regularizar o pagamento para ter o acesso restabelecido.
`;
              }
            }
          }
        }
      } catch (error) {
        console.error('Erro ao tentar desbloqueio automático:', error);
      }
    }

    // Use system prompt from database configuration
    const systemPrompt = agentConfig.system_prompt + `

INFORMAÇÕES DA EMPRESA:
- Nome: ${settings?.company_name || 'SUPERNET FIBRA'}
- E-mail: ${settings?.company_email || 'contato@supernetfibra.com.br'}
- Telefone: ${settings?.company_phone || '(11) 99999-9999'}
- WhatsApp: ${settings?.company_whatsapp || '5511999999999'}

BASE DE CONHECIMENTO:
${knowledgeContext}

${ixcToolsNote}

INFORMAÇÕES DO CLIENTE:

${customerData?.name ? `Nome: ${customerData.name}` : 'Não identificado'}
${customerData?.email ? `E-mail: ${customerData.email}` : ''}
${customerData?.phone ? `Telefone: ${customerData.phone}` : ''}
${customerData?.cpf ? `CPF: ${customerData.cpf}` : ''}
${customerData?.ixc_client_id ? `ID IXC: ${customerData.ixc_client_id}` : ''}

${desbloqueioInfo ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔓 AÇÃO AUTOMÁTICA REALIZADA:
${desbloqueioInfo}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUÇÃO CRÍTICA: Use essas informações na sua PRIMEIRA RESPOSTA ao cliente. Explique o desbloqueio realizado e forneça os dados de pagamento.
` : ''}
`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // 🛠️ Tool for creating administrative escalation ticket
    const tools = [{
      type: "function",
      function: {
        name: "criar_atendimento_escalacao",
        description: "Cria um atendimento de escalação administrativa quando o cliente solicita falar com supervisor, gerente ou diretor. Use quando a solicitação não pode ser resolvida no nível financeiro e requer intervenção administrativa.",
        parameters: {
          type: "object",
          properties: {
            motivo: {
              type: "string",
              description: "Motivo da escalação (ex: 'Cliente solicita falar com gerente', 'Reclamação que exige atenção administrativa')"
            },
            urgencia: {
              type: "string",
              enum: ["normal", "alta", "urgente"],
              description: "Nível de urgência da escalação"
            },
            detalhes: {
              type: "string",
              description: "Detalhes adicionais sobre o contexto da solicitação"
            }
          },
          required: ["motivo", "urgencia"]
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
        modalities: ['text', 'image'],
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
    let assistantMessage = choice.message.content as string;

    // 🎫 Check if AI wants to create escalation ticket
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      
      if (toolCall.function.name === 'criar_atendimento_escalacao') {
        const args = JSON.parse(toolCall.function.arguments);
        
        console.log('Creating escalation ticket with args:', args);
        
        // 📝 Create action_log entry BEFORE IXC call
        const { data: escalationLog } = await supabase
          .from('action_log')
          .insert({
            agent_name: 'Júlia Martins',
            client_cpf: customerData?.cpf,
            action_type: 'create_ticket',
            action_payload: {
              tipo: 'escalacao_administrativa',
              motivo: args.motivo,
              urgencia: args.urgencia,
              detalhes: args.detalhes,
              customer_name: customerData?.name,
              ixc_client_id: customerData?.ixc_client_id
            }
          })
          .select()
          .single();

        // 🔄 Create escalation ticket in IXC via proxy with retry
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        
        if (supabaseUrl && customerData?.ixc_client_id) {
          try {
            const ticketBody = {
              id_cliente: customerData.ixc_client_id,
              id_tipo_chamado: 99,
              descricao: `ESCALAÇÃO ADMINISTRATIVA\n\nMotivo: ${args.motivo}\n\nDetalhes: ${args.detalhes || 'Cliente solicita atenção do setor administrativo'}`,
              prioridade: args.urgencia === 'urgente' ? 'alta' : args.urgencia,
              status: 'A'
            };

            // Usar IXC Proxy com retry
            const maxRetries = 3;
            let ixcResponse;
            let lastError;

            for (let attempt = 0; attempt <= maxRetries; attempt++) {
              try {
                console.log(`🔄 Attempt ${attempt + 1}/${maxRetries + 1} to create escalation ticket`);
                
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
              const ticketId = ticketData.id || ticketData.protocolo;
              console.log('Escalation ticket created:', ticketId);
              
              // 📝 Update action_log with result
              if (escalationLog) {
                await supabase
                  .from('action_log')
                  .update({
                    ixcticket_id: String(ticketId),
                    result: ticketData
                  })
                  .eq('id', escalationLog.id);
              }

              // Update conversation
              if (conversationId) {
                await supabase
                  .from('conversations')
                  .update({
                    metadata: {
                      escalation_ticket_id: ticketId,
                      escalation_reason: args.motivo,
                      escalation_created_at: new Date().toISOString(),
                      action_log_id: escalationLog?.id
                    },
                    status: 'escalated'
                  })
                  .eq('id', conversationId);
              }

              assistantMessage = `${assistantMessage}\n\n✅ Atendimento de escalação criado com sucesso! Protocolo: ${ticketId}. Nossa equipe administrativa entrará em contato com você em breve.`;
            } else {
              const errorText = await ixcResponse.text();
              console.error('Error creating escalation ticket:', errorText);
              
              if (escalationLog) {
                await supabase
                  .from('action_log')
                  .update({
                    result: { error: errorText, status: ixcResponse.status }
                  })
                  .eq('id', escalationLog.id);
              }
              
              assistantMessage = `${assistantMessage}\n\n⚠️ Identifiquei sua solicitação de escalação, mas tive um problema ao registrar. Por favor, entre em contato pelo telefone para falar diretamente com nossa equipe administrativa.`;
            }
          } catch (error) {
            console.error('Error calling IXC API for escalation:', error);
            
            if (escalationLog) {
              await supabase
                .from('action_log')
                .update({
                  result: { error: String(error) }
                })
                .eq('id', escalationLog.id);
            }
            
            assistantMessage = `${assistantMessage}\n\n⚠️ Sua solicitação foi registrada internamente e nossa equipe administrativa retornará em breve.`;
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
    console.error('Error in support-financial-agent:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: 'Desculpe, estou com dificuldades no momento. Por favor, entre em contato pelo WhatsApp (11) 99999-9999 ou e-mail contato@supernetfibra.com.br.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
