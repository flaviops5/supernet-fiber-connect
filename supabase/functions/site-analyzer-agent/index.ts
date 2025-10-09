import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Lovable AI não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Você é um analista experiente de desenvolvimento web especializado em React, TypeScript, Supabase e Tailwind CSS.

Seu papel é:
- Analisar código e identificar bugs, vulnerabilidades e problemas de performance
- Sugerir melhorias de arquitetura e boas práticas
- Propor soluções detalhadas e práticas para problemas
- Revisar UI/UX e sugerir melhorias de usabilidade
- Identificar oportunidades de otimização de SEO e acessibilidade

Ao responder:
1. Seja específico e técnico quando necessário
2. Forneça exemplos de código quando apropriado
3. Explique o "porquê" das suas sugestões
4. Priorize soluções práticas e implementáveis
5. Considere sempre as melhores práticas da indústria

Contexto do projeto:
- Stack: React 18, TypeScript, Vite, Tailwind CSS, Supabase
- Funcionalidades: Gestão de planos de internet, campanhas, NPS, agentes IA, integração IXC
- Arquitetura: Multi-agente com routing, sales, support (tech/financial), automation, telemedicine`;

    // Construir histórico de mensagens
    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    console.log('Calling Lovable AI with model: google/gemini-2.5-flash');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos em Settings → Workspace → Usage.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in site-analyzer-agent:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao processar análise',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
