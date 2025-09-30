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
    const { messages, userContext, directOrder } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Se for uma ordem direta do formulário
    if (directOrder) {
      const orderData = JSON.parse(messages[0].content);
      const { data: plan } = await supabase
        .from('plans')
        .select('*')
        .eq('id', orderData.plan_id)
        .single();

      if (!plan) {
        return new Response(JSON.stringify({ error: 'Plano não encontrado' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
          payment_day: parseInt(orderData.paymentDay) || 10,
          appointment_date: orderData.installation_date,
          appointment_period: orderData.installation_period,
          status: 'pendente'
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar agendamento:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true,
        appointment_id: appointment.id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

SEU OBJETIVO: Vender planos de internet e agendar instalação.

PLANOS DISPONÍVEIS:
${plans?.map(p => `- ${p.name}: ${p.speed} por R$ ${p.price}/mês - ${p.description || ''}`).join('\n')}

PROCESSO DE VENDA:
1. Cumprimente o cliente de forma amigável
2. Pergunte o CEP para verificar cobertura
3. Apresente os planos disponíveis na região
4. Destaque benefícios: fibra óptica, velocidade garantida, suporte 24/7
5. Colete dados para instalação:
   - Nome completo
   - CPF
   - Email
   - Telefone/WhatsApp
   - Data de nascimento
   - Endereço completo
   - Dia preferido para vencimento (1-28)
   - Data preferida para instalação

IMPORTANTE:
- Seja consultivo e ajude o cliente a escolher o melhor plano
- Explique que a instalação é GRATUITA
- Confirme todos os dados antes de finalizar
- Use linguagem natural e amigável
- Não invente informações sobre cobertura
- Quando tiver todos os dados, confirme com o cliente antes de criar a OS

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
              description: 'Cria ordem de serviço de instalação no IXC após coletar todos os dados do cliente',
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
                  payment_day: { type: 'number', description: 'Dia do vencimento (1-28)' },
                  installation_date: { type: 'string', description: 'Data desejada para instalação (YYYY-MM-DD)' }
                },
                required: [
                  'customer_name', 'customer_cpf', 'customer_email', 
                  'customer_phone', 'customer_birth_date', 'customer_address',
                  'customer_cep', 'plan_id', 'payment_day', 'installation_date'
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

          // Cria agendamento
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
              appointment_period: 'manhã',
              status: 'pendente'
            })
            .select()
            .single();

          if (error) {
            console.error('Erro ao criar agendamento:', error);
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: functionName,
              content: JSON.stringify({ success: false, error: error.message })
            });
          } else {
            console.log('Agendamento criado:', appointment.id);
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: functionName,
              content: JSON.stringify({ 
                success: true, 
                appointment_id: appointment.id,
                message: 'Ordem de instalação criada com sucesso!'
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
                description: 'Cria ordem de serviço de instalação no IXC após coletar todos os dados do cliente',
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
                    payment_day: { type: 'number', description: 'Dia do vencimento (1-28)' },
                    installation_date: { type: 'string', description: 'Data desejada para instalação (YYYY-MM-DD)' }
                  },
                  required: [
                    'customer_name', 'customer_cpf', 'customer_email', 
                    'customer_phone', 'customer_birth_date', 'customer_address',
                    'customer_cep', 'plan_id', 'payment_day', 'installation_date'
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
