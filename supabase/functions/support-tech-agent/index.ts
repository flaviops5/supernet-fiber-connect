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

    // Get technical knowledge base
    const { data: techKnowledge } = await supabase
      .from('knowledge_base')
      .select('title, content')
      .in('category', ['suporte_tecnico', 'configuracoes', 'troubleshooting'])
      .eq('is_active', true);

    const knowledgeContext = techKnowledge?.map(k => `${k.title}\n${k.content}`).join('\n\n') || '';

    const systemPrompt = `Você é um agente de Suporte Técnico N1 da SUPERNET FIBRA, especializado em resolver problemas técnicos de internet e configurações básicas.

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

INFORMAÇÕES DO CLIENTE:
${customerData?.name ? `Nome: ${customerData.name}` : 'Não identificado'}
${customerData?.phone ? `Telefone: ${customerData.phone}` : ''}
${customerData?.ixc_client_id ? `ID IXC: ${customerData.ixc_client_id}` : ''}

BASE DE CONHECIMENTO:
${knowledgeContext}

DIRETRIZES:
- Seja empático e paciente
- Use linguagem simples, evite termos técnicos complexos
- Sempre confirme se o cliente conseguiu executar cada passo
- Se o problema persistir após 3 tentativas, escalona para N2
- Documente todas as tentativas de solução
- Sempre pergunte se há mais algo em que pode ajudar
- Informe tempo estimado quando aplicável
- Se não souber, seja honesto e escalona

CHECKLIST PADRÃO:
1. Equipamento está ligado? (luzes acesas?)
2. Cabos conectados corretamente?
3. Já tentou reiniciar o equipamento?
4. Problema é só no Wi-Fi ou cabo também?
5. Quantos dispositivos estão conectados?
6. Problema começou quando? Algo mudou?

FRASES IMPORTANTES:
- "Vou ajudá-lo a resolver isso. Vamos começar com algumas verificações básicas."
- "Isso é normal, vamos tentar [solução]."
- "Por favor, me confirme quando tiver feito esse passo."
- "Se isso não resolver, vou abrir um chamado técnico para nosso time especializado."

Mantenha suas respostas objetivas, práticas e fáceis de seguir.`;

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
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          ...messages
        ],
        temperature: 0.7,
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
