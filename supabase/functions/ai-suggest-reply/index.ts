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
    const { conversation_id } = await req.json();

    if (!conversation_id) {
      throw new Error('conversation_id is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load conversation details
    const { data: conversation } = await supabase
      .from('conversations')
      .select('customer_name, department, tags, ixc_client_id')
      .eq('id', conversation_id)
      .single();

    // Load last 10 messages for context
    const { data: messages } = await supabase
      .from('conversation_messages')
      .select('sender_type, sender_name, content, created_at')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ 
          suggestion: 'Olá! Como posso ajudá-lo(a) hoje?' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context for AI
    const conversationContext = messages
      .reverse()
      .map(m => `${m.sender_name} (${m.sender_type}): ${m.content}`)
      .join('\n');

    const systemPrompt = `Você é Clóe, assistente virtual da SUPERNET FIBRA.
Seu papel é sugerir respostas profissionais e empáticas para o atendente.

Contexto do cliente:
- Nome: ${conversation?.customer_name}
- Departamento: ${conversation?.department || 'geral'}
- Tags: ${conversation?.tags?.join(', ') || 'nenhuma'}
${conversation?.ixc_client_id ? '- Cliente encontrado no sistema' : '- Cliente novo'}

Diretrizes:
1. Seja empático, profissional e objetivo
2. Responda apenas o necessário (máximo 2-3 linhas)
3. Use linguagem natural e amigável
4. Se for questão técnica, foque na solução
5. Se for financeiro, seja claro sobre opções

Conversação atual:
${conversationContext}

Sugira UMA resposta apropriada que o atendente pode usar ou editar:`;

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Gere uma sugestão de resposta agora.' }
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API error');
    }

    const aiResult = await openaiResponse.json();
    const suggestion = aiResult.choices[0]?.message?.content?.trim();

    if (!suggestion) {
      throw new Error('No suggestion generated');
    }

    // Log the suggestion (optional)
    await supabase.from('agent_metrics').insert({
      agent_name: 'ai_suggestion',
      action_type: 'generate_suggestion',
      success: true,
      duration_ms: 0,
      conversation_id: conversation_id,
      metadata: { suggestion_length: suggestion.length }
    });

    return new Response(
      JSON.stringify({ suggestion }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error generating suggestion:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        suggestion: 'Como posso ajudá-lo(a)?'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
