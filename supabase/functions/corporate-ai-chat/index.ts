import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate embedding for user query using OpenAI API
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: message.slice(0, 8000)
      })
    });

    if (!embeddingResponse.ok) {
      console.error('Embedding API error:', await embeddingResponse.text());
      throw new Error('Failed to generate query embedding');
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Perform semantic search on knowledge_index
    console.log('🔍 Performing semantic search...');
    const { data: knowledgeBase, error: kbError } = await supabase
      .rpc('match_knowledge', {
        query_embedding: queryEmbedding,
        top_k: 5,
        similarity_threshold: 0.5
      });

    if (kbError) {
      console.error('❌ Error fetching knowledge base:', kbError);
    } else {
      console.log(`✅ Found ${knowledgeBase?.length || 0} relevant documents`);
      if (knowledgeBase && knowledgeBase.length > 0) {
        console.log('📄 Top results:', knowledgeBase.map(kb => ({
          title: kb.title,
          category: kb.category,
          similarity: (kb.similarity * 100).toFixed(1) + '%'
        })));
      } else {
        console.log('⚠️ No documents found above similarity threshold');
      }
    }

    // Get conversation history for context
    let conversationHistory: Array<{role: string, content: string}> = [];
    if (conversationId) {
      const { data: messages, error: msgError } = await supabase
        .from('ai_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(10); // Last 10 messages for context

      if (msgError) {
        console.error('Error fetching conversation history:', msgError);
      } else {
        conversationHistory = messages || [];
      }
    }

    // Build context with semantic results or fallback keyword search
    let kbResults = knowledgeBase || [];
    if (!kbResults || kbResults.length === 0) {
      const lowerMsg = message.toLowerCase();
      const terms: string[] = [];
      if (lowerMsg.includes('pon')) terms.push('pon');
      if (lowerMsg.includes('gpon')) terms.push('gpon');
      if (lowerMsg.includes('olt')) terms.push('olt');
      if (lowerMsg.includes('onu')) terms.push('onu');
      // Always add first significant token as last resort
      const firstToken = (lowerMsg.match(/[a-z0-9]{3,}/g) || [])[0];
      if (firstToken && !terms.includes(firstToken)) terms.push(firstToken);

      const termLike = terms.length > 0 ? terms[0] : 'pon';
      const { data: fallbackDocs, error: fbError } = await supabase
        .from('knowledge_base')
        .select('title, category, content, content_type')
        .or(`title.ilike.%${termLike}%,content.ilike.%${termLike}%`)
        .limit(5);

      if (fbError) {
        console.error('❌ Fallback keyword search error:', fbError);
      } else if (fallbackDocs && fallbackDocs.length > 0) {
        console.log(`🔎 Fallback found ${fallbackDocs.length} docs for "${termLike}"`);
        // Normalize to match expected shape (add similarity ~0.35 to signal low-confidence)
        kbResults = fallbackDocs.map(d => ({ ...d, similarity: 0.35 }));
      } else {
        console.log('⚠️ Fallback keyword search returned no results');
      }
    }

    const contextInfo = (kbResults && kbResults.length > 0)
      ? kbResults.map(item =>
          `[${item.category || 'Geral'} - ${item.content_type || 'documento'}] ${item.title}: ${item.content}${item.similarity !== undefined ? ` (Relevância: ${(item.similarity * 100).toFixed(1)}%)` : ''}`
        ).join('\n\n')
      : 'Nenhuma informação específica da empresa disponível.';

    // Build conversation context
    const conversationContext = conversationHistory.map(msg => 
      `${msg.role === 'user' ? 'Funcionário' : 'IA'}: ${msg.content}`
    ).join('\n');

    // Create system prompt
    const systemPrompt = `Você é a IA Corporativa da SUPERNET FIBRA, uma empresa de internet por fibra óptica. 

Sua função é ajudar os funcionários com:
- Dúvidas sobre políticas e procedimentos da empresa
- Informações sobre treinamentos
- Questões técnicas relacionadas ao trabalho
- Informações institucionais
- Suporte geral para funcionários

INFORMAÇÕES DA EMPRESA:
${contextInfo}

CONTEXTO DA CONVERSA:
${conversationContext}

DIRETRIZES IMPORTANTES:
1. Seja sempre profissional, útil e amigável
2. Use as informações da base de conhecimento para responder
3. Se não encontrar no contexto, diga: "não encontrei na base de conhecimento desta instância" e liste títulos relacionados; evite dizer que "não tem acesso a documentos internos"
4. Mantenha o foco nas necessidades dos funcionários da SUPERNET FIBRA
5. Dê respostas claras e práticas
6. Use um tom colaborativo e de apoio
7. Para termos técnicos (ex.: PON/GPON/OLT/ONU), priorize documentos técnicos e cite o título de onde retirou a informação

Responda sempre em português brasileiro de forma clara e objetiva.`;

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log(`AI Chat - User: "${message.substring(0, 50)}..." -> Response: "${aiResponse.substring(0, 50)}..."`);

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in corporate AI chat:', error);
    
    // Return a friendly error message
    const fallbackResponse = "Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente em alguns instantes ou entre em contato com o suporte técnico.";
    
    return new Response(
      JSON.stringify({ response: fallbackResponse }),
      {
        status: 200, // Return 200 to avoid breaking the UI
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});