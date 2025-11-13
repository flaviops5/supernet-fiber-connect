import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from '../_shared/base-handler.ts';
import { callLovableAI, extractContent, extractToolCalls, hasToolCalls } from '../_shared/lovable-client.ts';
import { redactPII } from '../_shared/pii-redaction.ts';
import { recordMetric } from '../_shared/metrics-helper.ts';
import { createLogger } from '../_shared/structured-logger.ts';
import { kpiLog } from '../_shared/kpi.ts';
import { handleEdgeFunctionError, corsHeaders } from '../_shared/error-handler.ts';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

Deno.serve(createAuthenticatedHandler('sales-agent', async (req, { supabase, user }) => {
  const logger = createLogger('sales-agent', req);
  const correlationId = req.headers.get('x-correlation-id') || (crypto as any).randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  let messages: Message[] = [];
  let userContext: any = undefined;
  let directOrder = false;
  try {
      const body = await req.json();
      messages = body?.messages ?? [];
      userContext = body?.userContext;
      directOrder = !!body?.directOrder;
    } catch (_) {
      // Fallback: aceitar texto puro e tratar como ordem direta
      const text = await req.text();
      messages = [{ role: 'user', content: typeof text === 'string' ? text : '' }];
      directOrder = true;
    }
    if (!messages?.length || !messages[0]?.content) {
      return new Response(JSON.stringify({ error: 'Mensagem vazia', error_code: 'empty_message', correlation_id: correlationId }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    logger.info('sales-agent: request start', { 
      method: req.method, 
      directOrder, 
      path: new URL(req.url).pathname,
      correlationId 
    });
    
    // Se for uma ordem direta do formulário
    if (directOrder) {
      const content = messages[0].content || '';

      // Tenta parsear JSON primeiro; se falhar, aceita texto com labels
      const parseDirectOrder = (raw: string) => {
        let data: any = {};
        const trimmed = (raw || '').trim();
        if (trimmed.startsWith('{')) {
          try { data = JSON.parse(trimmed); } catch { data = {}; }
        }
        if (!Object.keys(data).length) {
          const extractValue = (label: string) => {
            const regex = new RegExp(`${label}:\\s*(.+)`, 'i');
            const match = raw.match(regex);
            return match ? match[1].trim() : '';
          };
          data = {
            name: extractValue('Nome'),
            email: extractValue('Email'),
            phone: extractValue('Telefone'),
            cpf: extractValue('CPF'),
            birthDate: extractValue('Data Nascimento'),
            cep: extractValue('CEP'),
            address: extractValue('Endereço'),
            planName: extractValue('Plano'),
            appointmentDate: extractValue('Data Instalação'),
            appointmentPeriod: extractValue('Período'),
            paymentDay: parseInt(extractValue('Dia Pagamento')) || 10,
          };
        }
        // Normalização de chaves vindas do front/LLM
        const normalized = {
          name: data.name || data.customerName || '',
          email: data.email || data.customerEmail || '',
          phone: data.phone || data.customerPhone || '',
          cpf: data.cpf || data.customerCpf || '',
          birthDate: data.birthDate || data.customerBirthDate || '',
          cep: data.cep || data.customerCep || '',
          address: data.address || data.customerAddress || '',
          plan_id: data.plan_id || data.planId || '',
          planName: data.planName || data.plan || '',
          appointmentDate: data.appointmentDate || data.installation_date || '',
          appointmentPeriod: data.appointmentPeriod || data.installation_period || '',
          paymentDay: Number(data.paymentDay ?? data.payment_day ?? 10) || 10,
        };
        return normalized;
      };

      const orderData = parseDirectOrder(content);

      logger.info('Pedido recebido (normalizado)', {
        ...orderData,
        cpf: orderData.cpf ? `${orderData.cpf.slice(0,3)}***` : '',
      });

      // Validação mínima
      const required = ['name','email','phone','cpf','cep','address','appointmentDate','appointmentPeriod'] as const;
      const missing = required.filter((k) => !orderData[k]);
      if (missing.length) {
        return new Response(JSON.stringify({
          error: 'Campos obrigatórios ausentes',
          error_code: 'missing_fields',
          missing,
          correlation_id: correlationId,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Buscar plano por id (preferencial) ou por nome
      let plan: any = null;
      let planLookup: { by: 'id' | 'name'; value: string } | null = null;
      if (orderData.plan_id) {
        const { data } = await supabase
          .from('plans')
          .select('*')
          .eq('id', orderData.plan_id)
          .maybeSingle();
        plan = data;
        planLookup = { by: 'id', value: orderData.plan_id };
      } else if (orderData.planName) {
        const { data } = await supabase
          .from('plans')
          .select('*')
          .eq('name', orderData.planName)
          .maybeSingle();
        plan = data;
        planLookup = { by: 'name', value: orderData.planName };
      } else {
        return new Response(JSON.stringify({ error: 'Plano não informado', error_code: 'plan_missing', correlation_id: correlationId }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!plan) {
        return new Response(JSON.stringify({
          error: 'Plano não encontrado',
          error_code: 'plan_not_found',
          lookup: planLookup,
          correlation_id: correlationId,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        // 1. Criar cliente no IXC
        logger.info('Criando cliente no IXC', { correlationId });
        const { data: customerResult, error: customerError } = await supabase.functions.invoke('ixc-integration', {
          body: {
            action: 'createCustomer',
            params: {
              customerData: {
                name: orderData.name,
                cpf: orderData.cpf,
                email: orderData.email,
                phone: orderData.phone,
                birthDate: orderData.birthDate,
                address: orderData.address,
                cep: orderData.cep,
              },
            },
          },
        });

        if (customerError) {
          logger.error('Erro ao criar cliente no IXC', customerError, { correlationId });
          return new Response(
            JSON.stringify({ error: 'IXC: falha ao criar cliente', error_code: 'ixc_invoke_failed', details: customerError.message || 'Erro desconhecido', correlation_id: correlationId }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        const ixcResp = (customerResult && (customerResult.data ?? customerResult.response ?? customerResult)) as Record<string, unknown>;
        if (ixcResp?.type === 'error' || ixcResp?.error) {
          const msg: string = ixcResp?.message || ixcResp?.error || 'Erro ao criar cliente no IXC';
          let status = 400;
          let error_code = 'ixc_error';
          let existing_customer_id: string | undefined;
          try {
            const idMatch = msg.match(/ID:\s*(\d+)/i);
            if (/hotsite/i.test(msg) && /Cadastrado/i.test(msg)) {
              status = 409;
              error_code = 'ixc_duplicate_email';
              existing_customer_id = idMatch?.[1];
            }
          } catch {}
          logger.error('IXC retornou erro ao criar cliente', new Error(msg), { 
            correlationId, 
            ixcResp 
          });
          return new Response(
            JSON.stringify({ error: 'IXC: falha ao criar cliente', error_code, details: msg, existing_customer_id, correlation_id: correlationId }),
            { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        const customerId =
          customerResult?.data?.response?.id ||
          customerResult?.data?.id ||
          customerResult?.data?.registro?.id ||
          ixcResp?.id ||
          ixcResp?.registro?.id;
        logger.info('Cliente criado no IXC', { customerId, correlationId });

        if (!customerId) {
          logger.error('Resposta IXC sem ID do cliente', new Error('Missing customer ID'), { 
            correlationId, 
            ixcResp 
          });
          return new Response(
            JSON.stringify({ error: 'IXC não retornou ID do cliente', error_code: 'ixc_missing_customer_id', details: 'Verifique os dados enviados (CPF, endereço, etc.)', correlation_id: correlationId }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        // 2. Criar contrato no IXC (vincula o plano ao cliente)
        let contractId: string | null = null;
        if (plan.ixc_plan_id) {
          logger.info('Criando contrato no IXC', { 
            planId: plan.ixc_plan_id, 
            correlationId 
          });
          const { data: contractResult, error: contractError } = await supabase.functions.invoke('ixc-integration', {
            body: {
              action: 'createContract',
              params: {
                customerId: customerId,
                contractData: {
                  planId: plan.ixc_plan_id,
                  planName: plan.name,
                },
              },
            },
          });

          if (contractError) {
            logger.error('Erro ao criar contrato no IXC', contractError, { correlationId });
            // Não falha aqui, apenas loga o erro e continua
          } else {
            contractId = contractResult?.data?.contractId || contractResult?.data?.response?.id;
            logger.info('Contrato criado no IXC', { contractId, correlationId });
          }
        } else {
          logger.info('Plano não possui ixc_plan_id - pulando contrato', { correlationId });
        }

        // 3. Criar atendimento no IXC
        logger.info('Criando atendimento no IXC', { correlationId });
        const { data: atendimentoResult, error: atendimentoError } = await supabase.functions.invoke('ixc-integration', {
          body: {
            action: 'createAtendimento',
            params: {
              customerId: customerId,
              atendimentoData: {
                customerName: orderData.name,
                cpf: orderData.cpf,
                email: orderData.email,
                phone: orderData.phone,
                address: orderData.address,
                cep: orderData.cep,
                planName: plan.name,
                planSpeed: plan.speed,
                planPrice: plan.price,
                paymentDay: orderData.paymentDay,
                installationDate: orderData.appointmentDate,
                installationPeriod: orderData.appointmentPeriod,
              },
            },
          },
        });

        if (atendimentoError) {
          logger.error('Erro ao criar atendimento no IXC', atendimentoError, { correlationId });
          throw new Error('Erro ao criar atendimento no IXC');
        }

        const atendimentoId = atendimentoResult?.data?.id || atendimentoResult?.data?.registro?.id;
        logger.info('Atendimento criado no IXC', { atendimentoId, correlationId });

        // 4. Criar registro local do agendamento usando RPC seguro
        const { data: appointmentId, error } = await supabase.rpc('create_installation_appointment', {
          p_customer_name: orderData.name,
          p_customer_cpf: orderData.cpf,
          p_customer_email: orderData.email,
          p_customer_phone: orderData.phone,
          p_customer_birth_date: (orderData.birthDate || new Date().toISOString().split('T')[0]),
          p_customer_address: orderData.address,
          p_customer_cep: orderData.cep,
          p_plan_name: plan.name,
          p_plan_speed: plan.speed,
          p_plan_price: plan.price,
          p_payment_day: Number(orderData.paymentDay) || 10,
          p_appointment_date: orderData.appointmentDate,
          p_appointment_period: orderData.appointmentPeriod,
          p_observations: `Cliente IXC ID: ${customerId}${contractId ? `, Contrato IXC ID: ${contractId}` : ''}, Atendimento IXC ID: ${atendimentoId}`,
        });

        if (error) {
          logger.error('Erro ao criar agendamento local', error, { correlationId });
          throw new Error('Falha ao criar agendamento: ' + error.message);
        }

        return new Response(
          JSON.stringify({
            success: true,
            correlation_id: correlationId,
            appointment_id: appointmentId,
            ixc_customer_id: customerId,
            ixc_contract_id: contractId,
            ixc_atendimento_id: atendimentoId,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      } catch (ixcError) {
        logger.error('Erro na integração IXC', 
          ixcError instanceof Error ? ixcError : new Error(String(ixcError)), 
          { correlationId }
        );
        return new Response(
          JSON.stringify({
            error: 'Erro ao processar no sistema IXC. Tente novamente ou entre em contato.',
            error_code: 'ixc_unhandled_exception',
            details: ixcError instanceof Error ? ixcError.message : 'Erro desconhecido',
            correlation_id: correlationId,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }
    
    // LOVABLE_API_KEY verificado em lovable-client.ts

    // Busca planos ativos
    const { data: plans } = await supabase
      .from('plans')
      .select('*')
      .eq('active', true)
      .order('display_order');

    // Busca configurações do sistema
    const { data: settings } = await supabase
      .from('system_settings')
      .select('company_whatsapp')
      .single();

    // 🆕 RAG: Buscar contexto relevante da base vetorizada
    let ragContext = '';
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const lastUserMessage = messages.length > 0 ? messages[messages.length - 1].content : '';
    
    if (openaiApiKey && lastUserMessage) {
      try {
        const { retrieveKnowledgeContext } = await import('../_shared/rag-helper.ts');
        const ragResult = await retrieveKnowledgeContext(
          supabase,
          lastUserMessage,
          openaiApiKey,
          {
            top_k: 3,
            similarity_threshold: 0.5,
            agentTypes: ['sales-agent', 'vicente']
          }
        );
        
        if (ragResult.success) {
          ragContext = `\n\n${ragResult.contextText}\n`;
          logger.info('✅ RAG ativado no sales-agent', { 
            method: ragResult.searchMethod,
            docsFound: ragResult.documents.length 
          });
        }
      } catch (ragError) {
        logger.error('Erro no RAG (sales-agent)', 
          ragError instanceof Error ? ragError : new Error(String(ragError))
        );
      }
    }

    // Extrai protocolo se disponível  
    const protocol = (userContext as any)?.protocol;
    const protocolMsg = protocol ? `\n\nProtocolo de atendimento: ${protocol}` : '';

    const systemPrompt = `Você é o Vicente, consultor de Vendas especializado em planos de internet fibra óptica.

SEU OBJETIVO: Vender planos de internet e agendar instalação de forma CONVERSACIONAL.${protocolMsg}

PLANOS DISPONÍVEIS:
${plans?.map(p => `- ${p.name}: ${p.speed} por R$ ${p.price}/mês - ${p.description || ''}`).join('\n')}${ragContext}

PROCESSO DE VENDA (CONVERSACIONAL):
1. Cumprimente o cliente de forma amigável
2. Pergunte o CEP para verificar cobertura usando a tool check_cep_coverage
3. Apresente os planos disponíveis na região
4. Destaque benefícios: fibra óptica, velocidade garantida, suporte 24/7
5. Após o cliente escolher um plano, colete os dados UM POR VEZ de forma natural:
   a) Nome completo
   b) CPF
   c) Email
   d) Telefone/WhatsApp
   e) Data de nascimento
   f) Endereço completo (rua, número, complemento, bairro)
   g) Dia preferido para vencimento - IMPORTANTE: Quando perguntar sobre o dia de vencimento, explique:
      "Disponibilizamos as datas dos dias 01, 05, 10, 15, 20, 25 de cada mês para a escolha do pagamento. A primeira mensalidade sempre será cobrada proporcionalmente ao dia de escolha do pagamento, exemplo: Caso sua internet seja instalada no dia 08 e opte o pagamento para o dia 25, mandaremos um boleto com o proporcional de uso do dia 8 até o dia 25. As demais mensalidades obedecerá o fluxo de 30 dias."
   h) Data preferida para instalação - IMPORTANTE: Explique que:
      - NÃO instalamos aos domingos
      - Aos sábados, instalamos SOMENTE pela MANHÃ (até 11h)
      - Períodos disponíveis: Manhã (8h-12h) ou Tarde (13h-18h)
      Pergunte a data e o período desejado
6. Confirme TODOS os dados com o cliente antes de finalizar
7. Só use a tool create_installation_order quando tiver TODOS os dados confirmados

IMPORTANTE:
- Pergunte UMA informação por vez, de forma natural e amigável
- Aguarde a resposta do cliente antes de pedir a próxima informação
- Seja consultivo e ajude o cliente a escolher o melhor plano
- Explique que a instalação é GRATUITA
- Use linguagem natural e amigável
- Não invente informações sobre cobertura
- Valide CPF, email e telefone antes de confirmar

CONTEXTO DO USUÁRIO: ${userContext ? JSON.stringify(userContext) : 'Novo cliente'}

WhatsApp para contato: ${settings?.company_whatsapp || '(11) 99999-9999'}`;

    logger.debug('Chamando Lovable AI', { correlationId });
    
    const aiResponse = await callLovableAI({
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      tools: [
          {
            type: 'function',
            function: {
              name: 'check_cep_coverage',
              description: 'Verifica se o CEP tem cobertura da SUPERNET FIBRA',
              parameters: {
                type: 'object',
                properties: {
                  cep: { type: 'string', description: 'CEP para verificar (somente números)' }
                },
                required: ['cep']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'create_installation_order',
              description: 'Cria atendimento no IXC após coletar e confirmar todos os dados do cliente',
              parameters: {
                type: 'object',
                properties: {
                  customer_name: { type: 'string', description: 'Nome completo do cliente' },
                  customer_cpf: { type: 'string', description: 'CPF (somente números)' },
                  customer_email: { type: 'string', description: 'Email' },
                  customer_phone: { type: 'string', description: 'Telefone/WhatsApp' },
                  customer_birth_date: { type: 'string', description: 'Data de nascimento (YYYY-MM-DD)' },
                  customer_address: { type: 'string', description: 'Endereço completo' },
                  customer_cep: { type: 'string', description: 'CEP' },
                  plan_id: { type: 'string', description: 'ID do plano escolhido' },
                  payment_day: { type: 'number', description: 'Dia do vencimento (01, 05, 10, 15, 20 ou 25)' },
                  installation_date: { type: 'string', description: 'Data desejada para instalação (YYYY-MM-DD)' },
                  installation_period: { type: 'string', description: 'Período da instalação: manha ou tarde' }
                },
                required: [
                  'customer_name', 'customer_cpf', 'customer_email', 
                  'customer_phone', 'customer_birth_date', 'customer_address',
                  'customer_cep', 'plan_id', 'payment_day', 'installation_date', 'installation_period'
                ]
              }
            }
          }
        ],
        tool_choice: 'auto'
    }, correlationId);

    // Verificar se há tool calls
    if (hasToolCalls(aiResponse)) {
      const toolCalls = extractToolCalls(aiResponse);
      const toolResults = [];
      
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        
        console.log(`Executando tool: ${functionName}`, args);
        
        if (functionName === 'check_cep_coverage') {
          // Verifica cobertura do CEP
          const { data: coverage } = await supabase
            .from('cep_coverage')
            .select('*, cep_plans(plan:plans(*))')
            .eq('available', true)
            .gte('cep_end', args.cep)
            .lte('cep_start', args.cep)
            .single();
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify({
              has_coverage: !!coverage,
              region: coverage?.region_name,
              available_plans: coverage?.cep_plans?.map((cp: any) => cp.plan) || []
            })
          });
          
          // KPI: Verificação de CEP
          kpiLog({
            action: "cep_check",
            fluxo: "sales-agent",
            conversation_id: correlationId,
            extras: {
              cep: args.cep,
              has_coverage: !!coverage,
              region: coverage?.region_name
            }
          });
        } else if (functionName === 'create_installation_order') {
          // Busca dados do plano
          const { data: plan } = await supabase
            .from('plans')
            .select('*')
            .eq('id', args.plan_id)
            .single();

          if (!plan) {
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: functionName,
              content: JSON.stringify({ success: false, error: 'Plano não encontrado' })
            });
            continue;
          }

          try {
            // 1. Criar cliente no IXC
            console.log('Criando cliente no IXC via tool...');
            const { data: customerResult, error: customerError } = await supabase.functions.invoke('ixc-integration', {
              body: {
                action: 'createCustomer',
                params: {
                  customerData: {
                    name: args.customer_name,
                    cpf: args.customer_cpf,
                    email: args.customer_email,
                    phone: args.customer_phone,
                    birthDate: args.customer_birth_date,
                    address: args.customer_address,
                    cep: args.customer_cep
                  }
                }
              }
            });

            if (customerError) {
              console.error('Erro ao criar cliente no IXC:', customerError);
              throw new Error('Erro ao criar cliente no IXC');
            }

            const customerId = customerResult?.data?.id || customerResult?.data?.registro?.id;
            console.log('Cliente criado no IXC com ID:', customerId);

            // 2. Criar atendimento no IXC
            console.log('Criando atendimento no IXC via tool...');
            const { data: atendimentoResult, error: atendimentoError } = await supabase.functions.invoke('ixc-integration', {
              body: {
                action: 'createAtendimento',
                params: {
                  customerId: customerId,
                  atendimentoData: {
                    customerName: args.customer_name,
                    cpf: args.customer_cpf,
                    email: args.customer_email,
                    phone: args.customer_phone,
                    address: args.customer_address,
                    cep: args.customer_cep,
                    planName: plan.name,
                    planSpeed: plan.speed,
                    planPrice: plan.price,
                    paymentDay: args.payment_day,
                    installationDate: args.installation_date,
                    installationPeriod: args.installation_period
                  }
                }
              }
            });

            if (atendimentoError) {
              console.error('Erro ao criar atendimento no IXC:', atendimentoError);
              throw new Error('Erro ao criar atendimento no IXC');
            }

            const atendimentoId = atendimentoResult?.data?.id || atendimentoResult?.data?.registro?.id;
            console.log('Atendimento criado no IXC com ID:', atendimentoId);

            // 3. Criar registro local
            const { data: appointment, error } = await supabase
              .from('installation_appointments')
              .insert({
                customer_name: args.customer_name,
                customer_cpf: args.customer_cpf,
                customer_email: args.customer_email,
                customer_phone: args.customer_phone,
                customer_birth_date: args.customer_birth_date,
                customer_address: args.customer_address,
                customer_cep: args.customer_cep,
                plan_name: plan.name,
                plan_speed: plan.speed,
                plan_price: plan.price,
                payment_day: args.payment_day,
                appointment_date: args.installation_date,
                appointment_period: args.installation_period,
                status: 'pendente',
                observations: `Cliente IXC ID: ${customerId}, Atendimento IXC ID: ${atendimentoId}`
              })
              .select()
              .single();

            if (error) {
              console.error('Erro ao criar registro local:', error);
            }

            // KPI: Pedido de instalação criado
            kpiLog({
              action: "installation_order_created",
              fluxo: "sales-agent",
              conversation_id: correlationId,
              extras: {
                plan_name: plan.name,
                plan_price: plan.price,
                customer_cpf: args.customer_cpf,
                ixc_customer_id: customerId,
                ixc_atendimento_id: atendimentoId
              }
            });

            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: functionName,
              content: JSON.stringify({ 
                success: true, 
                appointment_id: appointment?.id,
                ixc_customer_id: customerId,
                ixc_atendimento_id: atendimentoId,
                message: 'Atendimento criado com sucesso no IXC!'
              })
            });
          } catch (ixcError) {
            console.error('Erro na criação via tool:', ixcError);
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: functionName,
              content: JSON.stringify({ 
                success: false, 
                error: ixcError instanceof Error ? ixcError.message : 'Erro ao criar atendimento'
              })
            });
          }
        }
      }

      // Fazer segunda chamada com os resultados dos tools para continuar a conversa
      const assistantMessage = aiResponse.choices[0].message;
      
      const followUpResponse = await callLovableAI({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
          assistantMessage,
          ...toolResults
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'check_cep_coverage',
              description: 'Verifica se o CEP tem cobertura da SUPERNET FIBRA',
              parameters: {
                type: 'object',
                properties: {
                  cep: { type: 'string', description: 'CEP para verificar (somente números)' }
                },
                required: ['cep']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'create_installation_order',
              description: 'Cria atendimento no IXC após coletar e confirmar todos os dados do cliente',
              parameters: {
                type: 'object',
                properties: {
                  customer_name: { type: 'string', description: 'Nome completo do cliente' },
                  customer_cpf: { type: 'string', description: 'CPF do cliente' },
                  customer_email: { type: 'string', description: 'Email do cliente' },
                  customer_phone: { type: 'string', description: 'Telefone/WhatsApp do cliente' },
                  customer_birth_date: { type: 'string', description: 'Data de nascimento (YYYY-MM-DD)' },
                  customer_address: { type: 'string', description: 'Endereço completo' },
                  customer_cep: { type: 'string', description: 'CEP' },
                  plan_id: { type: 'string', description: 'ID do plano escolhido' },
                  payment_day: { type: 'number', description: 'Dia do vencimento (01, 05, 10, 15, 20 ou 25)' },
                  installation_date: { type: 'string', description: 'Data desejada para instalação (YYYY-MM-DD)' },
                  installation_period: { type: 'string', description: 'Período da instalação: manha ou tarde' }
                },
                required: [
                  'customer_name', 'customer_cpf', 'customer_email', 
                  'customer_phone', 'customer_birth_date', 'customer_address',
                  'customer_cep', 'plan_id', 'payment_day', 'installation_date', 'installation_period'
                ]
              }
            }
          }
        ],
        tool_choice: 'auto'
      }, correlationId);

      const finalMessage = extractContent(followUpResponse);

      // Retorna resposta final processada
      return new Response(JSON.stringify({ 
        message: finalMessage,
        tool_results: toolResults
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  // Retorna resposta sem tool calls
  const responseContent = extractContent(aiResponse);
  return new Response(JSON.stringify({ 
    message: responseContent
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}));
