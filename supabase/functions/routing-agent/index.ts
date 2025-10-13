import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { checkRateLimit, formatBlockedTime } from "../_shared/rate-limiter.ts";
import { getLovableCircuitBreaker } from "../_shared/circuit-breaker.ts";
import { redactPII, redactPIIObject } from "../_shared/pii-redaction.ts";
import { logConversationAccess } from "../_shared/lgpd-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id',
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
  // Sprint 2: Correlation ID para rastreamento
  const correlationId = req.headers.get('x-correlation-id') || 
    `routing-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  console.log(`🧭 [${correlationId}] Routing Agent started`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId, context } = await req.json();
    
    console.log(`📥 [${correlationId}] Message:`, redactPII(message, 'logs'));
    
    if (!conversationId) {
      throw new Error('conversationId é obrigatório');
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Sprint 1: LGPD Audit - Registra acesso à conversação
    await logConversationAccess(
      supabase,
      conversationId,
      undefined,
      'Roteamento de mensagem para departamento apropriado',
      req
    );

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

    // Get relevant knowledge base
    const { data: knowledge } = await supabase
      .from('knowledge_base')
      .select('title, content, category')
      .or('category.eq.routing,category.eq.ixc_endpoints,category.eq.geral')
      .eq('is_active', true);

    const knowledgeContext = knowledge?.map(k => `[${k.category}] ${k.title}\n${k.content}`).join('\n\n') || '';

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
    
    // Validar formato do CPF antes de prosseguir
    const isValidCPFFormat = (cpf: string): boolean => {
      const clean = cpf.replace(/\D/g, '');
      if (clean.length !== 11) return false;
      if (/^(\d)\1{10}$/.test(clean)) return false; // Rejeita CPFs com todos dígitos iguais
      return true;
    };
    
    // Se não tem CPF na conversa, solicitar
    if (!conversation?.customer_cpf && !cpfMatch) {
      const attempts = conversation?.metadata?.cpf_attempts || 0;
      
      if (attempts >= 3) {
        console.log('⚠️ Máximo de tentativas de CPF atingido - transferindo para vendas');
        const protocol = `PROT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        const transferMessage = `Vejo que está com dificuldades com o CPF. Vou transferir você para nossa equipe de vendas que poderá auxiliar! ⏳\n\n📋 *Protocolo:* ${protocol}`;
        
        await supabase
          .from('conversation_messages')
          .insert({
            conversation_id: conversationId,
            sender_type: 'agent',
            sender_name: 'Cloé Martins',
            content: transferMessage,
            ai_suggestion: true,
          });
        
        return new Response(
          JSON.stringify({
            agent: 'sales',
            message: transferMessage,
            protocol,
            routeReason: 'cpf_validation_failed',
            autoRouted: true,
            autoClose: true, // Encerrar conversa após transferência
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Solicitar CPF com identificação da Cloé
      const askMessage = attempts === 0 
        ? 'Olá! Sou a Cloé Martins 😊\n\nPara começarmos, você poderia me informar seu CPF?'
        : 'Por favor, informe um CPF válido no formato: 000.000.000-00';
      
      // Incrementar contador de tentativas
      await supabase
        .from('conversations')
        .update({
          metadata: {
            ...conversation?.metadata,
            cpf_attempts: attempts + 1
          }
        })
        .eq('id', conversationId);
      
      return new Response(
        JSON.stringify({
          agent: 'routing',
          message: askMessage,
          requiresCPF: true,
          attempts: attempts + 1,
          autoClose: false // Não encerrar enquanto aguarda CPF
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // If CPF was provided, identify customer
    if (cpfMatch && !conversation?.customer_cpf) {
      const cpf = cpfMatch[1].replace(/\D/g, '');
      
      // Validar formato
      if (!isValidCPFFormat(cpf)) {
        const attempts = conversation?.metadata?.cpf_attempts || 0;
        
        await supabase
          .from('conversations')
          .update({
            metadata: {
              ...conversation?.metadata,
              cpf_attempts: attempts + 1
            }
          })
          .eq('id', conversationId);
        
        if (attempts + 1 >= 3) {
          const protocol = `PROT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          const transferMessage = `CPF inválido. Vou transferir você para nossa equipe que poderá auxiliar! ⏳\n\n📋 *Protocolo:* ${protocol}`;
          
      await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'agent',
          sender_name: 'Cloé Martins',
          content: transferMessage,
          ai_suggestion: true,
        });
          
          return new Response(
            JSON.stringify({
              agent: 'sales',
              message: transferMessage,
              protocol,
              routeReason: 'cpf_validation_failed',
              autoRouted: true,
              autoClose: true, // Encerrar conversa após transferência
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        return new Response(
          JSON.stringify({
            agent: 'routing',
            message: 'CPF inválido. Por favor, informe um CPF válido no formato: 000.000.000-00',
            requiresCPF: true,
            attempts: attempts + 1
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      console.log('CPF found in message:', cpf);

      // 🛡️ RATE LIMITING: Verificar antes de consultar IXC
      const rateLimitCheck = await checkRateLimit(cpf);
      
      if (!rateLimitCheck.allowed) {
        const blockedMessage = rateLimitCheck.blockedUntil
          ? `Você atingiu o limite de mensagens. Por favor, aguarde ${formatBlockedTime(rateLimitCheck.blockedUntil)} antes de tentar novamente.`
          : 'Muitas tentativas. Por favor, aguarde alguns minutos.';

        console.warn(`🚫 Rate limit blocked: CPF ${cpf}`);

        await supabase
          .from('conversation_messages')
          .insert({
            conversation_id: conversationId,
            sender_type: 'agent',
            sender_name: 'Cloé Martins',
            content: blockedMessage,
            ai_suggestion: true,
          });

        return new Response(
          JSON.stringify({
            agent: 'routing',
            message: blockedMessage,
            rateLimited: true,
            blockedUntil: rateLimitCheck.blockedUntil,
            autoClose: true // Encerrar conversa quando bloqueado por rate limit
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log(`✅ Rate limit OK: ${rateLimitCheck.remaining} requests remaining`);

      // 🆕 PASSO 1: Consultar histórico de contatos ANTES do IXC
      const { data: contactHistory } = await supabase
        .from('customer_contact_history')
        .select('*')
        .eq('cpf', cpf)
        .order('created_at', { ascending: false })
        .limit(5);

      const hasContactHistory = contactHistory && contactHistory.length > 0;
      const lastContact = contactHistory?.[0];
      const contactCount = contactHistory?.length || 0;

      console.log('📊 Histórico de contatos:', { 
        hasHistory: hasContactHistory, 
        contactCount,
        lastContact: lastContact?.created_at,
        wasFoundInIXC: lastContact?.was_found_in_ixc
      });

      // MOCK DATA FOR TESTING - Check if it's a test CPF
      const isTestCPF = ['11111111111', '22222222222', '33333333333', '44444444444', '99999999999'].includes(cpf);
      
      if (isTestCPF) {
        console.log('🧪 TEST CPF detected - using mock data');
        
        let mockCustomerData: any;
        let mockClientStatus: any;

        switch (cpf) {
          case '11111111111': // OFFLINE + Sem Pendências → Técnico
            mockClientStatus = {
              isOnline: false,
              contracts: [{
                status_internet: 'A', // Ativo
                data_acesso_desativado: null
              }]
            };
            mockCustomerData = {
              customer_cpf: cpf,
              customer_name: 'Cliente Teste Offline',
              customer_email: 'offline@teste.com',
              customer_phone: '(11) 91111-1111',
              ixc_client_id: 'TEST_OFFLINE_001',
              metadata: {
                ...conversation?.metadata,
                cliente_status: mockClientStatus
              }
            };
            break;

          case '22222222222': // OFFLINE + Com Pendências → Financeiro
            mockClientStatus = {
              isOnline: false,
              contracts: [{
                status_internet: 'CA', // Cancelado por Atraso
                data_acesso_desativado: '2025-09-15'
              }]
            };
            mockCustomerData = {
              customer_cpf: cpf,
              customer_name: 'Cliente Teste Bloqueado',
              customer_email: 'bloqueado@teste.com',
              customer_phone: '(11) 92222-2222',
              ixc_client_id: 'TEST_BLOCKED_002',
              metadata: {
                ...conversation?.metadata,
                cliente_status: mockClientStatus
              }
            };
            break;

          case '33333333333': // ONLINE + Sem Pendências → Cloé analisa
            mockClientStatus = {
              isOnline: true,
              contracts: [{
                status_internet: 'A', // Ativo
                data_acesso_desativado: null
              }]
            };
            mockCustomerData = {
              customer_cpf: cpf,
              customer_name: 'Cliente Teste Online',
              customer_email: 'online@teste.com',
              customer_phone: '(11) 93333-3333',
              ixc_client_id: 'TEST_ONLINE_003',
              metadata: {
                ...conversation?.metadata,
                cliente_status: mockClientStatus
              }
            };
            break;

          case '44444444444': // ONLINE + Com Pendências → Financeiro
            mockClientStatus = {
              isOnline: true,
              contracts: [{
                status_internet: 'FA', // Financeiro em Atraso
                data_acesso_desativado: null
              }]
            };
            mockCustomerData = {
              customer_cpf: cpf,
              customer_name: 'Cliente Teste Devedor',
              customer_email: 'devedor@teste.com',
              customer_phone: '(11) 94444-4444',
              ixc_client_id: 'TEST_DEBTOR_004',
              metadata: {
                ...conversation?.metadata,
                cliente_status: mockClientStatus
              }
            };
            break;

          case '99999999999': // Cliente Novo (não existe no IXC)
            mockClientStatus = null;
            mockCustomerData = {
              customer_cpf: cpf,
              customer_name: 'Cliente Novo Teste',
              customer_email: null,
              customer_phone: null,
              ixc_client_id: null,
              metadata: {
                ...conversation?.metadata,
                cliente_novo: true
              }
            };
            break;

          default:
            mockCustomerData = null;
            mockClientStatus = null;
        }

        if (mockCustomerData) {
          // Update conversation with mock data
          const { error: updateError } = await supabase
            .from('conversations')
            .update(mockCustomerData)
            .eq('id', conversationId);

          if (updateError) {
            console.error('Error updating conversation with mock data:', updateError);
          } else {
            console.log('✅ Mock customer data updated');
          }

          const clientStatus = mockClientStatus;

          // Same routing logic as real customers
          if (clientStatus) {
            const contracts = clientStatus.contracts || [];
            let isBlocked = false;
            
            for (const contract of contracts) {
              const statusInternet = String(contract.status_internet || '').toUpperCase();
              const isAccessDisabled = contract.data_acesso_desativado && contract.data_acesso_desativado !== '0000-00-00';
              const financialBlockStatus = ['CA', 'CM', 'CB', 'FA'];
              
              if (financialBlockStatus.includes(statusInternet) || /BLOQ|BLOQUE/.test(statusInternet) || isAccessDisabled) {
                isBlocked = true;
                break;
              }
            }

            if (isBlocked) {
              console.log('🧪 MOCK: Cliente BLOQUEADO - roteando para Julia (Financeiro)');
              const firstName = mockCustomerData.customer_name.split(' ')[0];
              
              // Generate protocol
              const protocol = `PROT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

              // First, send Cloé's transfer message with protocol
              const cloeTransferMessage = `Perfeito! Transferindo você para nosso Suporte Financeiro. Um momento! ⏳\n\n📋 *Protocolo de Atendimento:* ${protocol}`;
              
              await supabase
                .from('conversation_messages')
                .insert({
                  conversation_id: conversationId,
                  sender_type: 'agent',
                  sender_name: 'Cloé Martins',
                  content: cloeTransferMessage,
                  ai_suggestion: true,
                });

              let financialMessage: string | undefined = undefined;
              try {
                const { data: finData, error: finError } = await supabase.functions.invoke('support-financial-agent', {
                  body: {
                    messages: [{ role: 'user', content: message }],
                    conversationId,
                    customerData: mockCustomerData,
                    routeReason: 'blocked_or_overdue',
                  },
                });
                
                if (finError) {
                  console.error('🔴 ERRO ao chamar support-financial-agent:', finError);
                } else if (finData?.message) {
                  financialMessage = finData.message as string;
                  
                  // 🔄 Se Julia sugeriu roteamento de volta, NÃO salvar como Julia
                  if (finData.shouldRouteBack) {
                    console.log('🔄 Julia sugeriu voltar para roteamento');
                    return new Response(
                      JSON.stringify({
                        agent: 'routing',
                        message: 'Entendi! Vou te direcionar para o setor correto. Um momento!',
                        shouldReroute: true,
                        conversationId
                      }),
                      {
                        status: 200,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                      }
                    );
                  }
                  
                  await supabase
                    .from('conversation_messages')
                    .insert({
                      conversation_id: conversationId,
                      sender_type: 'agent',
                      sender_name: 'Julia Martins (Financeiro)',
                      content: financialMessage,
                      ai_suggestion: true,
                    });
                }
              } catch (e) {
                console.error('💥 EXCEÇÃO ao chamar support-financial-agent:', e);
              }

              const finalMessage = financialMessage ? 
                `${cloeTransferMessage}\n\n${financialMessage}` :
                cloeTransferMessage;
              
              return new Response(
                JSON.stringify({
                  agent: 'support_financial',
                  message: finalMessage,
                  protocol,
                  customerIdentified: true,
                  customerData: mockCustomerData,
                  autoRouted: true,
                  routeReason: 'blocked_or_overdue',
                  juliaResponse: !!financialMessage,
                  autoClose: false, // NÃO encerrar - cliente agora está com Julia
                }),
                {
                  status: 200,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
              );
            }

            const isOnline = clientStatus.isOnline === true;
            if (!isOnline) {
              // 🆕 VERIFICAR MASS OUTAGE antes de transferir para Luan
              const mockLogin = mockClientStatus?.pppoeLogin || 'test@pppoe';
              
              const { data: massOutage } = await supabase
                .from('mass_outage_events')
                .select('*')
                .eq('status', 'active')
                .order('detected_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              // Verificar se o login está na lista de afetados
              const isClientAffected = massOutage?.affected_logins?.includes(mockLogin);
              
              if (isClientAffected) {
                console.log('🚨 MOCK: Cliente AFETADO por queda em massa');
                const firstName = mockCustomerData.customer_name.split(' ')[0];
                const metadata = massOutage.metadata as any;
                const isPowerOutage = metadata?.power_outage === true;
                const dyingGaspCount = metadata?.dying_gasp_count || 0;
                
                let causeInfo = '';
                if (isPowerOutage && dyingGaspCount > 0) {
                  causeInfo = `\n\n⚡ **CAUSA IDENTIFICADA**: Falta de energia na região confirmada por ${dyingGaspCount} equipamento${dyingGaspCount > 1 ? 's' : ''} (Dying Gasp).`;
                } else if (isPowerOutage) {
                  causeInfo = '\n\n⚡ **CAUSA IDENTIFICADA**: Falta de energia na região.';
                }
                
                const outageMessage = `Olá ${firstName}! 👋\n\n🚨 **INTERRUPÇÃO EM MASSA DETECTADA**\n\nIdentifiquei que você está afetado por uma interrupção na sua região (${massOutage.region_pattern}).\n\n📊 **Situação atual:**\n• ${massOutage.affected_count} clientes afetados\n• Detectado em: ${new Date(massOutage.detected_at).toLocaleString('pt-BR')}${causeInfo}\n\n✅ **Nossa equipe técnica já está trabalhando na solução.**\n\nO problema não é no seu equipamento individual. Assim que normalizar, sua conexão voltará automaticamente.\n\nPedimos desculpas pelo transtorno! 🙏`;
                
                await supabase
                  .from('conversation_messages')
                  .insert({
                    conversation_id: conversationId,
                    sender_type: 'agent',
                    sender_name: 'Cloé Martins',
                    content: outageMessage,
                    ai_suggestion: true,
                  });
                
                return new Response(
                  JSON.stringify({
                    agent: 'routing',
                    message: outageMessage,
                    customerIdentified: true,
                    customerData: mockCustomerData,
                    massOutageDetected: true,
                    autoClose: true, // Encerrar - informação completa fornecida
                  }),
                  {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                  }
                );
              }
              
              console.log('🧪 MOCK: Cliente OFFLINE - roteando para Luan (Suporte Técnico)');
              const firstName = mockCustomerData.customer_name.split(' ')[0];
              
              // Generate protocol
              const protocol = `PROT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

              // 🆕 Personalizar mensagem baseado no histórico
              let cloeGreeting = '';
              if (hasContactHistory && contactCount > 0) {
                cloeGreeting = `Que bom te ver de novo, ${firstName}! 😊 `;
              }
              
              // First, send Cloé's transfer message with protocol
              const cloeTransferMessage = `${cloeGreeting}Perfeito! Transferindo você para nosso Suporte Técnico. Um momento! ⏳\n\n📋 *Protocolo de Atendimento:* ${protocol}`;
              
              await supabase
                .from('conversation_messages')
                .insert({
                  conversation_id: conversationId,
                  sender_type: 'agent',
                  sender_name: 'Cloé Martins',
                  content: cloeTransferMessage,
                  ai_suggestion: true,
                });

              let techMessage: string | undefined = undefined;
              try {
                const { data: techData, error: techError } = await supabase.functions.invoke('support-tech-agent', {
                  body: {
                    messages: [{ role: 'user', content: message }],
                    conversationId,
                    customerData: mockCustomerData,
                  },
                });
                
                if (techError) {
                  console.error('🔴 ERRO ao chamar support-tech-agent:', techError);
                } else if (techData?.message) {
                  techMessage = techData.message as string;
                  
                  await supabase
                    .from('conversation_messages')
                    .insert({
                      conversation_id: conversationId,
                      sender_type: 'agent',
                      sender_name: 'Luan Silva (Suporte Técnico N1)',
                      content: techMessage,
                      ai_suggestion: true,
                    });
                }
              } catch (e) {
                console.error('💥 EXCEÇÃO ao chamar support-tech-agent:', e);
              }

              const finalMessage = techMessage ? 
                `${cloeTransferMessage}\n\n${techMessage}` :
                cloeTransferMessage;
              
              return new Response(
                JSON.stringify({
                  agent: 'support_tech',
                  message: finalMessage,
                  protocol,
                  customerIdentified: true,
                  customerData: mockCustomerData,
                  autoRouted: true,
                  routeReason: 'offline',
                  luanResponse: !!techMessage,
                  autoClose: false, // NÃO encerrar - cliente agora está com Luan
                }),
                {
                  status: 200,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
              );
            }

            console.log('🧪 MOCK: Cliente online e não bloqueado - confirmando');
            const firstName = mockCustomerData.customer_name.split(' ')[0];
            
            // 🆕 Personalizar mensagem baseado no histórico
            let welcomeMessage = '';
            if (hasContactHistory && contactCount > 0) {
              welcomeMessage = `Que bom te ver de novo, ${firstName}! 😊 Verifiquei aqui e está tudo certo com sua conexão. Como posso ajudá-lo hoje?`;
            } else {
              welcomeMessage = `Obrigado, ${firstName}! Verifiquei aqui e está tudo certo com sua conexão. Como posso ajudá-lo?`;
            }
            
            return new Response(
              JSON.stringify({
                agent: 'routing',
                message: welcomeMessage,
                customerIdentified: true,
                customerData: mockCustomerData,
                requiresIntent: true,
                isReturningCustomer: hasContactHistory
              }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          // New customer
          const firstName = mockCustomerData.customer_name.split(' ')[0];
          
          // 🆕 Personalizar mensagem baseado no histórico
          let welcomeMessage = '';
          if (hasContactHistory && contactCount > 0) {
            welcomeMessage = `Que bom te ver de novo, ${firstName}! 😊 ${mockCustomerData.ixc_client_id ? 'Encontrei seu cadastro.' : 'Vejo que você ainda não é nosso cliente!'} Como posso ajudá-lo hoje?`;
          } else {
            welcomeMessage = `Olá! ${mockCustomerData.ixc_client_id ? 'Encontrei seu cadastro.' : 'Vejo que você ainda não é nosso cliente!'} Como posso ajudá-lo hoje?`;
          }
          
          return new Response(
            JSON.stringify({
              agent: 'routing',
              message: welcomeMessage,
              customerIdentified: true,
              customerData: mockCustomerData,
              requiresIntent: true,
              isReturningCustomer: hasContactHistory
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }

      // REAL IXC INTEGRATION (only if not a test CPF)
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
          console.log('❌ CPF não encontrado no IXC');

          // 🆕 Registrar tentativa no histórico
          await supabase
            .from('customer_contact_history')
            .insert({
              cpf,
              contact_reason: 'cpf_validation_failed',
              was_found_in_ixc: false,
              conversation_id: conversationId,
              metadata: {
                attempt_number: (conversation?.metadata?.cpf_attempts || 0) + 1,
                has_previous_history: hasContactHistory,
                previous_contact_count: contactCount
              }
            });

          // 🆕 Contar tentativas de validação
          const cpfAttempts = (conversation?.metadata?.cpf_attempts || 0) + 1;
          
          // Atualizar metadata com contador de tentativas
          await supabase
            .from('conversations')
            .update({
              metadata: {
                ...conversation?.metadata,
                cpf_attempts: cpfAttempts,
                last_cpf_attempt: cpf,
                last_cpf_attempt_at: new Date().toISOString()
              }
            })
            .eq('id', conversationId);

          console.log('📊 Tentativa de CPF:', { cpfAttempts, cpf });

          // 🆕 Após 3 tentativas, transferir para humano
          if (cpfAttempts >= 3) {
            console.log('⚠️ 3 tentativas de CPF sem sucesso - transferindo para humano');
            
            return new Response(
              JSON.stringify({
                agent: 'human_transfer',
                message: `Não consegui localizar seu cadastro após várias tentativas. Vou transferir você para um de nossos colaboradores que vai entrar em contato em breve. 🙏`,
                needsHumanTransfer: true,
                cpfAttempts,
                cpfNotFound: true,
                autoClose: true // Encerrar após transferir para humano
              }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          // 🆕 Mensagem personalizada baseada no histórico e tentativas
          let notFoundMessage = '❌ Não encontrei cadastro com esse CPF.\n\n';
          
          if (hasContactHistory && lastContact?.was_found_in_ixc) {
            // Cliente já foi encontrado antes no IXC
            notFoundMessage += '🤔 Vejo que você já entrou em contato conosco antes e seu cadastro foi encontrado. ';
          }

          if (cpfAttempts === 1) {
            // Primeira tentativa - perguntas simples
            notFoundMessage += 'Por favor, verifique:\n• O CPF está correto?\n• O contrato está em seu nome?\n\nPode confirmar essas informações? 🙂';
          } else if (cpfAttempts === 2) {
            // Segunda tentativa - mais detalhes
            notFoundMessage += 'Vamos tentar de novo. Por favor, confirme:\n• Você digitou o CPF corretamente?\n• O contrato da SUPERNET está registrado no seu CPF?\n\nTente informar novamente ou me diga se o contrato está em outro nome. 🙏';
          }

          return new Response(
            JSON.stringify({
              agent: 'identification',
              message: notFoundMessage,
              cpfNotFound: true,
              cpfAttempts,
              hasContactHistory,
              needsIdentification: true,
              autoClose: false // NÃO encerrar - aguardando nova tentativa de CPF
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // 🆕 Registrar contato bem-sucedido no histórico
        await supabase
          .from('customer_contact_history')
          .insert({
            cpf,
            customer_name: customerData.customer_name,
            customer_phone: customerData.customer_phone,
            customer_email: customerData.customer_email,
            ixc_client_id: customerData.ixc_client_id,
            contact_reason: 'cpf_validation_success',
            was_found_in_ixc: !!customerData.ixc_client_id,
            conversation_id: conversationId,
            metadata: {
              client_status: clientStatus,
              is_returning_customer: hasContactHistory,
              previous_contact_count: contactCount,
              last_contact_date: lastContact?.created_at
            }
          });

        // Update conversation with customer data
        const { error: updateError } = await supabase
          .from('conversations')
          .update({
            ...customerData,
            metadata: {
              ...customerData.metadata,
              cpf_attempts: 0, // Resetar contador após sucesso
              is_returning_customer: hasContactHistory,
              contact_history_count: contactCount
            }
          })
          .eq('id', conversationId);

        if (updateError) {
          console.error('Error updating conversation:', updateError);
          throw updateError;
        }

        console.log('Customer identified and status verified');

        // 🆕 Personalizar mensagem se for cliente recorrente
        const firstName = customerData.customer_name.split(' ')[0];
        let returningCustomerGreeting = '';
        if (hasContactHistory && contactCount > 1) {
          returningCustomerGreeting = `Que bom te ver de novo, ${firstName}! `;
        }

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
            
            // Generate protocol
            const protocol = `PROT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

            // Server-side handoff: call Julia (support-financial-agent) immediately
            let financialMessage: string | undefined = undefined;
            console.log('🔵 ANTES de chamar support-financial-agent');
            
            // 🆕 Personalizar mensagem baseado no histórico
            let cloeGreeting = '';
            if (hasContactHistory && contactCount > 0) {
              cloeGreeting = `Que bom te ver de novo, ${firstName}! 😊 `;
            }
            
            // First, send Cloé's transfer message with protocol
            const cloeTransferMessage = `${cloeGreeting}Perfeito! Transferindo você para nosso Suporte Financeiro. Um momento! ⏳\n\n📋 *Protocolo de Atendimento:* ${protocol}`;
            
            await supabase
              .from('conversation_messages')
              .insert({
                conversation_id: conversationId,
                sender_type: 'agent',
                sender_name: 'Cloé Martins',
                content: cloeTransferMessage,
                ai_suggestion: true,
              });
            
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

                // 🔄 Se Julia sugeriu roteamento de volta, NÃO persistir como Julia
                if (finData.shouldRouteBack) {
                  console.log('🔄 Julia sugeriu voltar para roteamento');
                  return new Response(
                    JSON.stringify({
                      agent: 'routing',
                      message: 'Entendi! Vou te direcionar para o setor correto. Um momento!',
                      shouldReroute: true,
                      conversationId
                    }),
                    {
                      status: 200,
                      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    }
                  );
                }

                // Persist Julia's message server-side (WITHOUT protocol)
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

            // Return Cloé's transfer message (with protocol) + Julia's message (without protocol)
            const finalMessage = financialMessage ? 
              `${cloeTransferMessage}\n\n${financialMessage}` :
              cloeTransferMessage;
            
            console.log('🔵 Retornando resposta:', {
              hasFinancialMessage: !!financialMessage,
              messageLength: finalMessage.length,
              protocol
            });
            
            return new Response(
              JSON.stringify({
                agent: 'support_financial',
                message: finalMessage,
                protocol,
                customerIdentified: true,
                customerData,
                autoRouted: true,
                routeReason: 'blocked_or_overdue',
                juliaResponse: !!financialMessage,
                autoClose: false, // NÃO encerrar - cliente agora está com Julia
              }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          // Senão, verifica se está offline → Suporte Técnico (Luan)
          const isOnline = clientStatus.isOnline === true;
          if (!isOnline) {
            console.log('Cliente OFFLINE - verificando quedas em massa...');
            
            // 🆕 VERIFICAR MASS OUTAGE ANTES DE QUALQUER COISA
            const customerLogin = clientStatus?.pppoeLogin || customerData.metadata?.ixc_data?.login || '';
            console.log('🔍 Login do cliente para verificação:', customerLogin);
            
            if (customerLogin) {
              const { data: massOutage } = await supabase
                .from('mass_outage_events')
                .select('*')
                .eq('status', 'active')
                .order('detected_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              // Verificar se o login do cliente está na lista de afetados
              const isClientAffected = massOutage?.affected_logins?.includes(customerLogin);
              
              if (isClientAffected) {
                console.log('🚨 CLIENTE AFETADO POR QUEDA EM MASSA:', customerLogin);
                console.log('Região:', massOutage.region_pattern);
                console.log('Clientes afetados:', massOutage.affected_count);
                
                const metadata = massOutage.metadata as any;
                const isPowerOutage = metadata?.power_outage === true;
                const dyingGaspCount = metadata?.dying_gasp_count || 0;
                
                let causeInfo = '';
                if (isPowerOutage && dyingGaspCount > 0) {
                  causeInfo = `\n\n⚡ **CAUSA IDENTIFICADA**: Falta de energia na região confirmada por ${dyingGaspCount} equipamento${dyingGaspCount > 1 ? 's' : ''} (Dying Gasp).`;
                } else if (isPowerOutage) {
                  causeInfo = '\n\n⚡ **CAUSA IDENTIFICADA**: Falta de energia na região.';
                }
                
                const firstName = customerData.customer_name.split(' ')[0];
                const massOutageMessage = `Olá ${firstName}! 👋\n\n🚨 **INTERRUPÇÃO EM MASSA DETECTADA**\n\nIdentifiquei que você está afetado por uma interrupção na sua região (${massOutage.region_pattern}).\n\n📊 **Situação atual:**\n• ${massOutage.affected_count} clientes afetados\n• Detectado em: ${new Date(massOutage.detected_at).toLocaleString('pt-BR')}${causeInfo}\n\n✅ **Nossa equipe técnica já está trabalhando na solução.**\n\nO problema não é no seu equipamento individual. Assim que normalizar, sua conexão voltará automaticamente.\n\nPedimos desculpas pelo transtorno! 🙏`;
                
                // Salvar mensagem da Cloé
                await supabase
                  .from('conversation_messages')
                  .insert({
                    conversation_id: conversationId,
                    sender_type: 'agent',
                    sender_name: 'Cloé Martins',
                    content: massOutageMessage,
                    ai_suggestion: true,
                  });
                
                // NÃO TRANSFERIR PARA LUAN - Cloé já informou sobre a queda em massa
                return new Response(
                  JSON.stringify({
                    agent: 'routing',
                    message: massOutageMessage,
                    customerIdentified: true,
                    customerData,
                    massOutageDetected: true,
                    massOutageInfo: {
                      region: massOutage.region_pattern,
                      affectedCount: massOutage.affected_count,
                      isPowerOutage,
                      detectedAt: massOutage.detected_at
                    },
                    autoClose: true, // Encerrar - informação completa fornecida
                  }),
                  {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                  }
                );
              }
              
              console.log('✅ Cliente NÃO está afetado por queda em massa - prosseguindo para suporte técnico');
            }
            
            // 🆕 VERIFICAR SE JÁ EXISTE ATENDIMENTO EM ANDAMENTO
            const { data: currentConversation } = await supabase
              .from('conversations')
              .select('department, metadata')
              .eq('id', conversationId)
              .single();

            const existingProtocol = currentConversation?.metadata?.protocol;
            const alreadyInSupport = currentConversation?.department === 'support_tech';

            console.log('Departamento atual:', currentConversation?.department);
            console.log('Protocolo existente:', existingProtocol);
            console.log('Já em atendimento técnico:', alreadyInSupport);

            // SE JÁ ESTÁ EM ATENDIMENTO TÉCNICO, APENAS CONTINUA SEM CRIAR NOVO PROTOCOLO
            if (alreadyInSupport && existingProtocol) {
              console.log('⚠️ Cliente já está em atendimento - continuando sem criar novo protocolo');

              try {
                const { data: techData, error: techError } = await supabase.functions.invoke('support-tech-agent', {
                  body: {
                    messages: [{ role: 'user', content: message }],
                    conversationId,
                    customerData: {
                      ...customerData,
                      existingProtocol
                    },
                  },
                });

                if (techError) {
                  console.error('Erro ao invocar support-tech-agent:', techError);
                  throw techError;
                }

                if (techData && techData.message) {
                  // Persistir mensagem do Luan
                  await supabase
                    .from('conversation_messages')
                    .insert({
                      conversation_id: conversationId,
                      sender_type: 'agent',
                      sender_name: 'Luan Silva (Suporte Técnico N1)',
                      content: techData.message,
                      ai_suggestion: true,
                      metadata: {}
                    });

                  return new Response(
                    JSON.stringify({
                      agent: 'support_tech',
                      message: techData.message,
                      protocol: existingProtocol,
                      customerIdentified: true,
                      customerData,
                      continuingSupport: true
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                }
              } catch (e) {
                console.error('Erro ao continuar atendimento:', e);
              }
            }
            
            // SE NÃO ESTÁ EM ATENDIMENTO AINDA, CRIAR PROTOCOLO E TRANSFERIR (PRIMEIRA VEZ)
            console.log('🆕 Primeira transferência - criando protocolo e transferindo para Luan');
            
            // Generate protocol
            const protocol = `PROT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

            // Atualizar metadata da conversa com o protocolo e departamento
            await supabase
              .from('conversations')
              .update({
                department: 'support_tech',
                metadata: {
                  ...currentConversation?.metadata,
                  protocol
                }
              })
              .eq('id', conversationId);

            // Server-side handoff: call Luan (support-tech-agent) immediately
            let techMessage: string | undefined = undefined;
            console.log('🔵 ANTES de chamar support-tech-agent');
            
            // 🆕 Personalizar mensagem baseado no histórico
            let cloeGreeting = '';
            if (hasContactHistory && contactCount > 0) {
              cloeGreeting = `Que bom te ver de novo, ${firstName}! 😊 `;
            }
            
            // First, send Cloé's transfer message with protocol
            const cloeTransferMessage = `${cloeGreeting}Perfeito! Transferindo você para nosso Suporte Técnico. Um momento! ⏳\n\n📋 *Protocolo de Atendimento:* ${protocol}`;
            
            await supabase
              .from('conversation_messages')
              .insert({
                conversation_id: conversationId,
                sender_type: 'agent',
                sender_name: 'Cloé Martins',
                content: cloeTransferMessage,
                ai_suggestion: true,
              });
            
            try {
              console.log('🟡 Invocando support-tech-agent com:', {
                conversationId,
                hasSupabase: !!supabase,
                hasCustomerData: !!customerData
              });
              
              const { data: techData, error: techError } = await supabase.functions.invoke('support-tech-agent', {
                body: {
                  messages: [{ role: 'user', content: message }],
                  conversationId,
                  customerData: {
                    ...customerData,
                    metadata: {
                      ...customerData.metadata,
                      customer_status: 'offline'
                    }
                  },
                },
              });
              
              console.log('🟢 Resposta do support-tech-agent:', { 
                techData, 
                techError,
                hasMessage: !!techData?.message 
              });
              
              if (techError) {
                console.error('🔴 ERRO ao chamar support-tech-agent:', techError);
              } else if (techData?.message) {
                techMessage = techData.message as string;
                console.log('✅ Mensagem do Luan recebida:', techMessage.substring(0, 50) + '...');

                // Persist Luan's message server-side (WITHOUT protocol)
                const luanMessageContent = techMessage + (massOutageMessage || '');
                const { data: insertResult, error: insertError } = await supabase
                  .from('conversation_messages')
                  .insert({
                    conversation_id: conversationId,
                    sender_type: 'agent',
                    sender_name: 'Luan Silva (Suporte Técnico N1)',
                    content: luanMessageContent,
                    ai_suggestion: true,
                  })
                  .select();
                
                if (insertError) {
                  console.error('❌ ERRO ao persistir mensagem do Luan:', insertError);
                } else {
                  console.log('✅ Mensagem do Luan persistida no DB:', insertResult);
                }
              } else {
                console.warn('⚠️ support-tech-agent retornou sem mensagem');
              }
            } catch (e) {
              console.error('💥 EXCEÇÃO ao chamar support-tech-agent:', e);
              console.error('💥 Tipo de erro:', typeof e);
              console.error('💥 Stack trace:', e instanceof Error ? e.stack : 'N/A');
            }

            // Return Cloé's transfer message (with protocol) + Luan's message (without protocol)
            const finalMessage = techMessage ? 
              `${cloeTransferMessage}\n\n${techMessage}${massOutageMessage || ''}` :
              cloeTransferMessage;
            
            console.log('🔵 Retornando resposta:', {
              hasTechMessage: !!techMessage,
              messageLength: finalMessage.length,
              protocol
            });
            
            return new Response(
              JSON.stringify({
                agent: 'support_tech',
                message: finalMessage,
                protocol,
                customerIdentified: true,
                customerData,
                autoRouted: true,
                routeReason: 'offline',
                luanResponse: !!techMessage,
                autoClose: false, // NÃO encerrar - cliente agora está com Luan
              }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          // If online and not blocked - confirm and continue with normal routing
          console.log('Client is online and not blocked - confirming and proceeding');
          
          // 🆕 Personalizar mensagem baseado no histórico de contatos
          let welcomeMessage = '';
          if (hasContactHistory && contactCount > 0) {
            welcomeMessage = `Que bom te ver de novo, ${firstName}! 😊 Verifiquei aqui e está tudo certo com sua conexão. Como posso ajudá-lo hoje?`;
          } else {
            welcomeMessage = `Obrigado, ${firstName}! Verifiquei aqui e está tudo certo com sua conexão. Como posso ajudá-lo?`;
          }
          
          return new Response(
            JSON.stringify({
              agent: 'routing',
              message: welcomeMessage,
              customerIdentified: true,
              customerData,
              requiresIntent: true,
              isReturningCustomer: hasContactHistory
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // New customer or couldn't verify status - ask how to help
        
        // 🆕 Personalizar mensagem baseado no histórico de contatos
        let welcomeMessage = '';
        if (hasContactHistory && contactCount > 0) {
          welcomeMessage = `Que bom te ver de novo, ${firstName}! 😊 ${customerData.ixc_client_id ? 'Encontrei seu cadastro.' : 'Vejo que você ainda não é nosso cliente!'} Como posso ajudá-lo hoje?`;
        } else {
          welcomeMessage = `Olá! ${customerData.ixc_client_id ? 'Encontrei seu cadastro.' : 'Vejo que você ainda não é nosso cliente!'} Como posso ajudá-lo hoje?`;
        }
        
        return new Response(
          JSON.stringify({
            agent: 'routing',
            message: welcomeMessage,
            customerIdentified: true,
            customerData,
            requiresIntent: true,
            isReturningCustomer: hasContactHistory
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
            message: 'Olá! Tudo bem? Meu nome é Cloé. Como posso ajudar hoje? 😊',
            isGreeting: true,
            autoClose: false // NÃO encerrar - conversa inicial
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
          reason: decision.reason,
          autoClose: false // NÃO encerrar - aguardando clarificação
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
          message: 'Para verificar sua situação, preciso do seu CPF, por favor.',
          needsIdentification: true,
          targetAgent: decision.agent,
          autoClose: false // NÃO encerrar - aguardando CPF
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Return routing decision, with server-side handoff if already identified for Financeiro
    // Generate protocol for all transfers
    const protocol = `PROT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
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
          
          // 🔄 Se Julia sugeriu roteamento de volta, NÃO persistir
          if (finData.shouldRouteBack) {
            console.log('🔄 Julia sugeriu voltar para roteamento (decision path)');
            return new Response(
              JSON.stringify({
                agent: 'routing',
                message: 'Entendi! Vou te direcionar para o setor correto. Um momento!',
                shouldReroute: true,
                conversationId
              }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
          
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

    const transferMessage = `Perfeito! Transferindo você para ${
      decision.agent === 'sales' ? 'o Vicente, nosso especialista em Vendas' :
      decision.agent === 'support_tech' ? 'nosso Suporte Técnico' :
      'a Julia Martins, do Financeiro'
    }. Um momento! ⏳\n\n📋 *Protocolo de Atendimento:* ${protocol}`;

    return new Response(
      JSON.stringify({
        agent: decision.agent,
        confidence: decision.confidence,
        reason: decision.reason,
        message: transferMessage,
        protocol,
        financialMessage,
        autoClose: false // NÃO encerrar - transferindo para agente especializado
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
