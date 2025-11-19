import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  quantidade: number;
  temaGeral: string;
  publicoAlvo: string;
  tom: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  console.log('generate-blog-batch started', {
    requestId,
    timestamp: new Date().toISOString(),
  });

  try {
    const { quantidade, temaGeral, publicoAlvo, tom }: RequestBody = await req.json();

    // Validate input
    if (!temaGeral || !publicoAlvo) {
      throw new Error('Tema geral e público alvo são obrigatórios');
    }

    if (quantidade < 1 || quantidade > 10) {
      throw new Error('Quantidade deve estar entre 1 e 10');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Generating batch of posts', {
      requestId,
      quantidade,
      temaGeral,
      tom,
    });

    const systemPrompt = `Você é o assistente de conteúdo oficial da Supernet Fibra.

Gere ${quantidade} posts de blog otimizados para:
- SEO clássico (Google)
- AEO (AI Engine Optimization para Google SGE, Meta AI, Perplexity, ChatGPT)

Regras gerais:

1. Tema geral: ${temaGeral}
2. Público alvo: ${publicoAlvo}
3. Tom: ${tom}
4. Cada post deve:
   - Ter um foco de palavra-chave diferente, mas dentro do tema geral
   - Ter título forte
   - Ter excerpt chamativo (1–2 frases)
   - Conteúdo com 800–1200 palavras
   - Parágrafos curtos, diretos
   - Seções com H2 / H3
   - FAQ com 2–4 perguntas/respostas
   - Frases de "Resumo para IA" em alguns pontos
5. Otimizar para AEO:
   - Incluir respostas diretas e objetivas
   - Incluir listas
   - Evitar enrolação
   - Manter factualidade

FORMATO DE SAÍDA OBRIGATÓRIO:
Um array JSON contendo objetos no formato:

{
  "slug": "kebab-case-do-titulo-em-portugues",
  "title": "Título do Post",
  "category": "Tecnologia",
  "excerpt": "Resumo chamativo em 1–2 frases.",
  "content": "Conteúdo completo em markdown.",
  "author": "Equipe Supernet Fibra",
  "featured": false,
  "featured_image": "",
  "read_time": 5
}

RESPONDA APENAS COM O JSON ARRAY. NÃO adicione explicações antes ou depois.`;

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
          { role: 'user', content: `Gere ${quantidade} posts sobre: ${temaGeral}` }
        ],
        max_tokens: 4000,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log('Raw AI response received', {
      requestId,
      contentLength: generatedContent.length,
    });

    // Parse JSON response
    let posts;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = generatedContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      posts = JSON.parse(cleanedContent);
      
      if (!Array.isArray(posts)) {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response', {
        requestId,
        error: parseError,
        content: generatedContent.substring(0, 500),
      });
      throw new Error('Failed to parse AI response as JSON');
    }

    const duration = Date.now() - startTime;

    console.log('generate-blog-batch completed', {
      requestId,
      duration,
      postsGenerated: posts.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        posts,
        count: posts.length,
        duration,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('generate-blog-batch error', {
      requestId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
