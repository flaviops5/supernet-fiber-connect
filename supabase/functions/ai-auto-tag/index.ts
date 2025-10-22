import { createPublicHandler } from '../_shared/base-handler.ts';

const AVAILABLE_TAGS = [
  'financeiro',
  'tecnico',
  'vendas',
  'suporte',
  'instalacao',
  'cancelamento',
  'upgrade',
  'boleto',
  'internet-lenta',
  'sem-conexao',
  'duvida',
  'reclamacao',
  'elogio',
  'urgente'
];

Deno.serve(createPublicHandler('ai-auto-tag', async (req, { supabase }) => {
  const { conversation_id, message_content } = await req.json();

  if (!conversation_id || !message_content) {
    throw new Error('conversation_id and message_content are required');
  }

  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

    // Load current conversation tags
    const { data: conversation } = await supabase
      .from('conversations')
      .select('tags, customer_name')
      .eq('id', conversation_id)
      .single();

    const currentTags = conversation?.tags || [];

    // Call OpenAI to analyze and suggest tags
    const systemPrompt = `Você é um analisador de conversas para classificação automática.

Tags disponíveis: ${AVAILABLE_TAGS.join(', ')}

Analise a mensagem e retorne APENAS tags relevantes (máximo 3).
Retorne como array JSON: ["tag1", "tag2"]

Critérios:
- financeiro: dúvidas sobre pagamento, boleto, faturas
- tecnico: problemas de conexão, configuração, suporte técnico
- vendas: interesse em contratar, planos, preços
- instalacao: agendamento, instalação de serviço
- cancelamento: pedidos de cancelamento
- upgrade: mudança de plano, aumento de velocidade
- boleto: especificamente sobre boletos
- internet-lenta: reclamações de velocidade
- sem-conexao: internet não conecta
- duvida: perguntas gerais
- reclamacao: insatisfação, problemas
- elogio: feedback positivo
- urgente: problemas críticos, emergências

Mensagem do cliente:
"${message_content}"`;

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
          { role: 'user', content: 'Retorne as tags em formato JSON array.' }
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API error');
    }

    const aiResult = await openaiResponse.json();
    const suggestedTagsText = aiResult.choices[0]?.message?.content?.trim();

    let suggestedTags: string[] = [];
    try {
      suggestedTags = JSON.parse(suggestedTagsText);
    } catch {
      // Fallback: extract tags from text
      suggestedTags = AVAILABLE_TAGS.filter(tag => 
        suggestedTagsText.toLowerCase().includes(tag)
      ).slice(0, 3);
    }

    // Merge with current tags (avoid duplicates)
    const newTags = [...new Set([...currentTags, ...suggestedTags])];

    // Update conversation tags
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ tags: newTags })
      .eq('id', conversation_id);

    if (updateError) {
      console.error('Error updating tags:', updateError);
    }

  // Log the auto-tagging
  await supabase.from('agent_metrics').insert({
    agent_name: 'ai_auto_tag',
    action_type: 'auto_tag',
    success: true,
    duration_ms: 0,
    conversation_id: conversation_id,
    metadata: { 
      added_tags: suggestedTags,
      final_tags: newTags 
    }
  });

  return { 
    suggested_tags: suggestedTags,
    all_tags: newTags
  };
}));
