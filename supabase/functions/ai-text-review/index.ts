import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || text.trim().length === 0) {
      throw new Error('Texto é obrigatório');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const systemPrompt = `Você é um revisor de texto especializado em atendimento ao cliente.

Sua tarefa é revisar o texto fornecido e:
1. Corrigir erros ortográficos e gramaticais
2. Melhorar a clareza e organização
3. Manter o tom profissional e empático
4. Preservar o significado original
5. Deixar o texto mais conciso quando possível

Regras importantes:
- NÃO adicione informações que não estavam no texto original
- NÃO remova informações importantes
- Mantenha o estilo de comunicação do WhatsApp (use emojis se o original tiver)
- Retorne APENAS o texto revisado, sem comentários ou explicações adicionais

Texto para revisar:
${text}

Texto revisado:`;

    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: systemPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error('Erro ao revisar texto');
    }

    const aiResult = await openaiResponse.json();
    const reviewedText = aiResult.choices[0]?.message?.content?.trim();

    if (!reviewedText) {
      throw new Error('Nenhuma revisão gerada');
    }

    // Log the review
    await supabase.from('agent_metrics').insert({
      agent_name: 'ai_text_review',
      action_type: 'review_text',
      success: true,
      duration_ms: 0,
      metadata: { 
        original_length: text.length,
        reviewed_length: reviewedText.length 
      }
    });

    return new Response(
      JSON.stringify({ reviewedText }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error reviewing text:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        reviewedText: null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
