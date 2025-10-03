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
    
    // Use system prompt from database configuration
    const systemPrompt = agentConfig.system_prompt + `

Você é o Luan, agente de Suporte Técnico N1.

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

IMPORTANTE: O cliente JÁ FOI IDENTIFICADO pela Cloé. 
NÃO PEÇA O CPF NOVAMENTE!
Cumprimente-o pelo nome (${customerFirstName}) e vá direto para entender o problema técnico.
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
   - Receber e registrar chamados técnicos
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

4. **Procedimentos Padrão**
   - Primeiro: verificar se o equipamento está ligado e conectado
   - Segundo: testar reinicialização (desligar 30s e ligar)
   - Terceiro: verificar luzes indicadoras do modem/roteador
   - Quarto: testar conexão com cabo direto (sem Wi-Fi)
   - Quinto: verificar se outros dispositivos funcionam

5. **Escalonamento para N2/N3**
   Se identificar que o problema requer:
   - Visita técnica presencial
   - Troca de equipamento
   - Problemas na rede externa
   - Configurações avançadas
   - Problemas de sinal ou infraestrutura
`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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
    const assistantMessage = aiData.choices[0].message.content;

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
