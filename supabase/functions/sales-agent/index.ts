import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const correlationId = (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    console.log('sales-agent: request start', { correlationId, method: req.method, directOrder, path: new URL(req.url).pathname });
    
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

      console.log('Pedido recebido (normalizado):', {
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
        console.log('Criando cliente no IXC...');
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
          console.error('Erro ao criar cliente no IXC:', { correlationId, customerError });
          return new Response(
            JSON.stringify({ error: 'IXC: falha ao criar cliente', error_code: 'ixc_invoke_failed', details: customerError.message || 'Erro desconhecido', correlation_id: correlationId }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        const ixcResp: any = (customerResult && (customerResult.data ?? customerResult.response ?? customerResult)) as any;
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
          console.error('IXC retornou erro ao criar cliente:', { correlationId, ixcResp });
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
        console.log('Cliente criado no IXC com ID:', customerId);

        if (!customerId) {
          console.error('Resposta IXC sem ID do cliente:', { correlationId, ixcResp });
          return new Response(
            JSON.stringify({ error: 'IXC não retornou ID do cliente', error_code: 'ixc_missing_customer_id', details: 'Verifique os dados enviados (CPF, endereço, etc.)', correlation_id: correlationId }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        // 2. Criar contrato no IXC (vincula o plano ao cliente)
        let contractId: string | null = null;
        if (plan.ixc_plan_id) {
          console.log('Criando contrato no IXC com plano:', plan.ixc_plan_id);
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
            console.error('Erro ao criar contrato no IXC:', contractError);
            // Não falha aqui, apenas loga o erro e continua
          } else {
            contractId = contractResult?.data?.contractId || contractResult?.data?.response?.id;
            console.log('Contrato criado no IXC com ID:', contractId);
          }
        } else {
          console.log('Plano não possui ixc_plan_id configurado, pulando criação de contrato');
        }

        // 3. Criar atendimento no IXC
        console.log('Criando atendimento no IXC...');
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
          console.error('Erro ao criar atendimento no IXC:', atendimentoError);
          throw new Error('Erro ao criar atendimento no IXC');
        }

        const atendimentoId = atendimentoResult?.data?.id || atendimentoResult?.data?.registro?.id;
        console.log('Atendimento criado no IXC com ID:', atendimentoId);

        // 4. Criar registro local do agendamento
        const { data: appointment, error } = await supabase
          .from('installation_appointments')
          .insert({
            customer_name: orderData.name,
            customer_cpf: orderData.cpf,
            customer_email: orderData.email,
            customer_phone: orderData.phone,
            customer_birth_date: orderData.birthDate || new Date().toISOString().split('T')[0],
            customer_address: orderData.address,
            customer_cep: orderData.cep,
            plan_name: plan.name,
            plan_speed: plan.speed,
            plan_price: plan.price,
            payment_day: Number(orderData.paymentDay) || 10,
            appointment_date: orderData.appointmentDate,
            appointment_period: orderData.appointmentPeriod,
            status: 'pendente',
            ixc_contract_id: contractId,
            observations: `Cliente IXC ID: ${customerId}${contractId ? `, Contrato IXC ID: ${contractId}` : ''}, Atendimento IXC ID: ${atendimentoId}`,
          })
          .select()
          .single();

        if (error) {
          console.error('Erro ao criar agendamento local:', error);
        }

        return new Response(
          JSON.stringify({
            success: true,
            correlation_id: correlationId,
            appointment_id: appointment?.id,
            ixc_customer_id: customerId,
            ixc_contract_id: contractId,
            ixc_atendimento_id: atendimentoId,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      } catch (ixcError) {
        console.error('Erro na integração IXC:', { correlationId, error: ixcError });
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
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

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

    const systemPrompt = `Você é um agente de vendas virtual da SUPERNET FIBRA, especializado em planos de internet fibra óptica.

SEU OBJETIVO: Vender planos de internet e agendar instalação de forma CONVERSACIONAL.

PLANOS DISPONÍVEIS:
${plans?.map(p => `- ${p.name}: ${p.speed} por R$ ${p.price}/mês - ${p.description || ''}`).join('\n')}

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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        modalities: ['text', 'image'],
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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Muitas requisições. Por favor, aguarde um momento.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Créditos insuficientes. Entre em contato com o suporte.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('Erro na API do AI Gateway');
    }

    const data = await response.json();
    const message = data.choices[0].message;

    // Se houve chamada de ferramenta, execute
    if (message.tool_calls) {
      const toolResults = [];
      
      for (const toolCall of message.tool_calls) {
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
      const followUpResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
            message,
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
        }),
      });

      if (!followUpResponse.ok) {
        console.error('Erro na chamada de follow-up');
        throw new Error('Erro ao processar resposta da IA');
      }

      const followUpData = await followUpResponse.json();
      const finalMessage = followUpData.choices[0].message;

      // Retorna resposta final processada
      return new Response(JSON.stringify({ 
        message: finalMessage.content,
        tool_results: toolResults
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      message: message.content 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no agente de vendas:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
