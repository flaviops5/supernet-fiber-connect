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
    
    console.log('Support Financial Agent - Processing request');
    
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

    // Get financial knowledge base
    const { data: financialKnowledge } = await supabase
      .from('knowledge_base')
      .select('title, content')
      .in('category', ['financeiro', 'cobranca', 'pagamento'])
      .eq('is_active', true);

    const knowledgeContext = financialKnowledge?.map(k => `${k.title}\n${k.content}`).join('\n\n') || '';

    // Get system settings for company info
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    // Use system prompt from database configuration
    const systemPrompt = agentConfig.system_prompt + `

INFORMAÇÕES DA EMPRESA:
- Nome: ${settings?.company_name || 'SUPERNET FIBRA'}
- E-mail: ${settings?.company_email || 'contato@supernetfibra.com.br'}
- Telefone: ${settings?.company_phone || '(11) 99999-9999'}
- WhatsApp: ${settings?.company_whatsapp || '5511999999999'}

BASE DE CONHECIMENTO:
${knowledgeContext}

INFORMAÇÕES DO CLIENTE:

${customerData?.name ? `Nome: ${customerData.name}` : 'Não identificado'}
${customerData?.email ? `E-mail: ${customerData.email}` : ''}
${customerData?.phone ? `Telefone: ${customerData.phone}` : ''}
${customerData?.cpf ? `CPF: ${customerData.cpf}` : ''}
${customerData?.ixc_client_id ? `ID IXC: ${customerData.ixc_client_id}` : ''}
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
