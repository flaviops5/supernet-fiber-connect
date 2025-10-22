import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { callLovableAI, extractContent } from '../_shared/lovable-client.ts';
import { redactPII } from '../_shared/pii-redaction.ts';
import { logConversationAccess } from '../_shared/lgpd-logger.ts';
import { handleEdgeFunctionError, corsHeaders, StandardError } from "../_shared/error-handler.ts";
import { createLogger } from "../_shared/structured-logger.ts";

interface Message {
  role: string;
  content: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logger = createLogger("support-financial-agent", req);

  try {
    const { messages, conversationId, customerData, routeReason, attachments } = await req.json();
    
    const correlationId = req.headers.get('x-correlation-id') || (crypto as any).randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    logger.info("Processing request", { correlationId, routeReason, hasAttachments: !!attachments?.length });
    
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
      logger.error("Agent configuration not found", { error: configError });
      throw new StandardError('CONFIG_ERROR', 'Agent configuration not found', 500);
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
      logger.info("Cliente bloqueado/em atraso - tentando desbloqueio automático", {
        ixc_client_id: customerData.ixc_client_id
      });
      
      // 📝 Register action_log for unblock attempt
      const { data: actionLog } = await supabase
        .from('action_log')
        .insert({
          agent_name: 'Julia',
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
            logger.info("Contrato bloqueado encontrado", { contract_id: blockedContract.id });
            
            // Função para formatar data no padrão brasileiro
            const formatarData = (data: string | null | undefined): string => {
              if (!data) return 'Data não disponível';
              try {
                const d = new Date(data);
                if (isNaN(d.getTime())) return 'Data inválida';
                const dia = String(d.getDate()).padStart(2, '0');
                const mes = String(d.getMonth() + 1).padStart(2, '0');
                const ano = d.getFullYear();
                return `${dia}/${mes}/${ano}`;
              } catch {
                return 'Data inválida';
              }
            };
            
            // Calcular data de liberação do desbloqueio (primeiro vencimento após nao_bloquear_ate)
            const calcularDataLiberacao = (nao_bloquear_ate: string | null | undefined): string => {
              if (!nao_bloquear_ate) return 'quando houver pagamento';
              try {
                const dataBase = new Date(nao_bloquear_ate);
                if (isNaN(dataBase.getTime())) return 'quando houver pagamento';
                // Adiciona 1 dia para ser "após"
                dataBase.setDate(dataBase.getDate() + 1);
                return formatarData(dataBase.toISOString());
              } catch {
                return 'quando houver pagamento';
              }
            };
            
            // VERIFICAÇÃO: Cliente já usou desbloqueio e não pagou no prazo?
            const dtUltimoDesbloqueio = blockedContract.dt_ult_des_bloq_conf;
            const naoBloquearAte = blockedContract.nao_bloquear_ate;
            const desbloqueioAtivoRecentemente = blockedContract.desbloqueio_confianca_ativo === 'S';
            
            // Verificar se a data limite já passou
            let desbloqueioIndisponivel = false;
            if (dtUltimoDesbloqueio && naoBloquearAte) {
              try {
                const dataLimite = new Date(naoBloquearAte);
                const dataAtual = new Date();
                // Se a data limite já passou, significa que não pagou dentro do prazo
                if (dataAtual > dataLimite) {
                  desbloqueioIndisponivel = true;
                  console.log('⚠️ Desbloqueio indisponível: usado anteriormente e prazo expirado');
                  console.log(`Data último desbloqueio: ${dtUltimoDesbloqueio}`);
                  console.log(`Data limite (não bloquear até): ${naoBloquearAte}`);
                  console.log(`Data atual: ${dataAtual.toISOString()}`);
                }
              } catch (error) {
                console.error('Erro ao verificar datas de desbloqueio:', error);
              }
            }
            
            // Se desbloqueio está indisponível, informar ao agente SEM tentar desbloquear
            if (desbloqueioIndisponivel) {
              const dataLiberacao = calcularDataLiberacao(naoBloquearAte);
              
              desbloqueioInfo = `
❌ DESBLOQUEIO DE CONFIANÇA NÃO DISPONÍVEL

O desbloqueio de confiança não está disponível para o contrato #${blockedContract.id}, este recurso foi usado no dia ${formatarData(dtUltimoDesbloqueio)} e não foi realizado o pagamento até o dia ${formatarData(naoBloquearAte)}, este recurso será habilitado novamente quando o título que vence após o dia ${dataLiberacao} for pago.

📋 INFORME AO CLIENTE:
Para restabelecer o acesso, é necessário regularizar o pagamento pendente. Após a confirmação do pagamento no sistema, o serviço será liberado automaticamente.
`;
              
              // 📝 Update action_log indicando que desbloqueio não está disponível
              if (actionLog) {
                await supabase
                  .from('action_log')
                  .update({
                    result: {
                      success: false,
                      error: 'Desbloqueio de confiança não disponível - já usado anteriormente sem pagamento',
                      contract_id: blockedContract.id,
                      dt_ultimo_desbloqueio: dtUltimoDesbloqueio,
                      nao_bloquear_ate: naoBloquearAte,
                      contract_data: blockedContract
                    }
                  })
                  .eq('id', actionLog.id);
              }
              
              logger.info("Cliente não pode usar desbloqueio - já usado sem pagamento", {
                contract_id: blockedContract.id
              });
            } else if (desbloqueioAtivoRecentemente) {
              // Se já tem desbloqueio ativo, não tenta novamente
              desbloqueioInfo = `
❌ DESBLOQUEIO DE CONFIANÇA JÁ ATIVO

O contrato #${blockedContract.id} já possui um desbloqueio de confiança ativo. O cliente tem até ${formatarData(naoBloquearAte)} para regularizar o pagamento.

📋 INFORME AO CLIENTE:
Seu serviço já foi desbloqueado temporariamente. Por favor, efetue o pagamento para evitar novo bloqueio.
`;
              
              // 📝 Update action_log
              if (actionLog) {
                await supabase
                  .from('action_log')
                  .update({
                    result: {
                      success: false,
                      error: 'Desbloqueio de confiança já está ativo',
                      contract_id: blockedContract.id,
                      nao_bloquear_ate: naoBloquearAte
                    }
                  })
                  .eq('id', actionLog.id);
              }
              
              logger.warn("Desbloqueio já ativo no contrato", {
                contract_id: blockedContract.id,
                nao_bloquear_ate: naoBloquearAte
              });
            } else {
              // Pode tentar desbloqueio normalmente
              logger.info("Cliente pode usar desbloqueio - tentando...", {
                contract_id: blockedContract.id
              });
            
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
                logger.info("Desbloqueio bem-sucedido", { 
                  contract_id: blockedContract.id 
                });
                
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
                    logger.info("Títulos pendentes encontrados", { 
                      count: titles.length 
                    });
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
                      logger.info("QR Code PIX obtido", { 
                        title_id: firstTitle.id 
                      });
                      
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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 CRÍTICO - VOCÊ DEVE ENVIAR OS DADOS DE PAGAMENTO AO CLIENTE:
${paymentInfo || '⚠️ Dados de pagamento não disponíveis - solicite manualmente ao financeiro'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
              } else {
                logger.warn("Falha no desbloqueio", { 
                  error: unblockData.data?.error,
                  contract_id: blockedContract.id
                });
                
                // 📝 Update action_log with failure
                if (actionLog) {
                  await supabase
                    .from('action_log')
                    .update({
                      result: {
                        success: false,
                        error: unblockData.data?.error,
                        contract_id: blockedContract.id,
                        contract_data: blockedContract
                      }
                    })
                     .eq('id', actionLog.id);
                }
                
                // Mensagem genérica para outros tipos de erro (não relacionados a desbloqueio já usado)
                desbloqueioInfo = `
❌ TENTATIVA DE DESBLOQUEIO NÃO FOI POSSÍVEL

📋 Contrato: ${blockedContract.id}
⚠️ Motivo: ${unblockData.data?.error || 'Sistema IXC não permitiu o desbloqueio'}

O sistema IXC não permitiu a liberação automática. Oriente o cliente a regularizar o pagamento para ter o acesso restabelecido.
`;
              }
            }
            } // Fim do else (pode tentar desbloqueio)
          }
        }
      } catch (error) {
        logger.error("Erro ao tentar desbloqueio automático", { 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Extract status information from customerData
    const clientStatus = customerData?.metadata?.cliente_status;
    let statusMessage = '';
    
    if (clientStatus && routeReason === 'blocked_or_overdue') {
      const isOnline = clientStatus.isOnline;
      const contracts = clientStatus.contracts || [];
      const accessStatus = clientStatus.accessStatus;
      
      // Determinar status de bloqueio
      let isBlocked = false;
      let blockReason = '';
      
      for (const contract of contracts) {
        const statusInternet = String(contract.status_internet || '').toUpperCase();
        const financialBlockStatus = ['CA', 'CM', 'CB', 'FA'];
        
        if (financialBlockStatus.includes(statusInternet)) {
          isBlocked = true;
          blockReason = statusInternet === 'CA' ? 'Cancelado por Atraso' :
                       statusInternet === 'CM' ? 'Cortado Manualmente' :
                       statusInternet === 'CB' ? 'Cortado por Bloqueio' :
                       statusInternet === 'FA' ? 'Financeiro em Atraso' : 'Bloqueado';
          break;
        }
      }
      
      statusMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 STATUS ATUAL DO CLIENTE (INFORME AO CLIENTE):

🌐 Status de Conexão: ${isOnline ? '✅ ONLINE' : '❌ OFFLINE'}
${isBlocked ? `🔒 Status de Acesso: ❌ BLOQUEADO (${blockReason})` : '✅ Status de Acesso: LIBERADO'}
${accessStatus?.statusDeAcesso ? `📋 Status da Conta: ${accessStatus.statusDeAcesso}` : ''}

INSTRUÇÃO CRÍTICA: INICIE sua resposta informando CLARAMENTE esses status ao cliente.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
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

${statusMessage}

${imageAnalysis}

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

    // 🖼️ Análise de imagens se houver attachments
    let imageAnalysis = '';
    
    if (attachments && attachments.length > 0) {
      console.log(`🔍 [${correlationId}] Analyzing ${attachments.length} image(s) with AI...`);
      
      try {
        const imageMessages = attachments.map((att: any) => ({
          type: "image_url",
          image_url: { url: att.url }
        }));
        
        const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{
              role: 'user',
              content: [
                {
                  type: "text",
                  text: "Analise esta imagem enviada por um cliente que está com problemas financeiros/pagamento. Extraia informações relevantes como: comprovantes de pagamento, prints de contas bancárias, boletos, faturas, etc. Descreva de forma clara e objetiva o que você vê."
                },
                ...imageMessages
              ]
            }],
            max_completion_tokens: 500
          }),
        });
        
        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          imageAnalysis = analysisData.choices[0]?.message?.content || '';
          console.log(`✅ [${correlationId}] Image analysis completed`);
          
          // Adicionar análise ao contexto
          if (imageAnalysis) {
            imageAnalysis = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖼️ ANÁLISE DE IMAGEM ENVIADA PELO CLIENTE:

${imageAnalysis}

IMPORTANTE: Use esta análise para contextualizar sua resposta. Se for comprovante de pagamento, verifique se o pagamento foi identificado no sistema. Se for print de boleto/fatura, confirme os valores e datas.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
          }
        } else {
          console.error(`❌ [${correlationId}] Error analyzing image:`, await analysisResponse.text());
        }
      } catch (error) {
        console.error(`❌ [${correlationId}] Exception analyzing image:`, error);
      }
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
            agent_name: 'Julia',
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

    // 🔄 Detectar se cliente mudou de assunto (fora do escopo financeiro)
    const financialKeywords = ['boleto', 'pagar', 'débito', 'fatura', 'negociar', 'parcelar', 'desbloque', 'pagamento', 'cobrança'];
    const technicalKeywords = ['internet', 'conexão', 'lento', 'caiu', 'não funciona', 'wi-fi', 'wifi', 'sinal'];
    const salesKeywords = ['plano', 'contratar', 'upgrade', 'mudar', 'velocidade maior'];
    
    const lastUserMessage = messages?.[messages.length - 1]?.content?.toLowerCase() || '';
    const hasFinancialIntent = financialKeywords.some(kw => lastUserMessage.includes(kw));
    const hasTechnicalIntent = technicalKeywords.some(kw => lastUserMessage.includes(kw));
    const hasSalesIntent = salesKeywords.some(kw => lastUserMessage.includes(kw));
    
    // Se cliente mudou de assunto E não é mais financeiro, sinalizar para rotear de volta
    const shouldRouteBack = !hasFinancialIntent && (hasTechnicalIntent || hasSalesIntent);
    
    if (shouldRouteBack) {
      console.log('🔄 Cliente mudou de assunto - sugerindo roteamento de volta para Cloé');
      return new Response(
        JSON.stringify({ 
          message: assistantMessage,
          shouldRouteBack: true,
          suggestedAgent: hasTechnicalIntent ? 'support_technical' : 'sales'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    return handleEdgeFunctionError(error, "support-financial-agent");
  }
});
