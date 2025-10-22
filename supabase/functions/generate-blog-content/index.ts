import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createPublicHandler } from "../_shared/base-handler.ts";

Deno.serve(createPublicHandler(
  'generate-blog-content',
  async (req, { supabase }) => {
    const { prompt, type, category } = await req.json();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'title':
        systemPrompt = 'Você é um especialista em marketing digital e criação de títulos atrativos para blog posts sobre tecnologia e telecomunicações. Crie títulos que sejam SEO-friendly, chamem atenção e sejam relevantes para o público interessado em internet fibra óptica.';
        userPrompt = `Crie 5 títulos atrativos para um blog post sobre: ${prompt}. Os títulos devem ser otimizados para SEO e atrair cliques. Retorne apenas os títulos, um por linha.`;
        break;
      case 'excerpt':
        systemPrompt = 'Você é um copywriter especializado em criar resumos envolventes para artigos de blog sobre tecnologia e telecomunicações.';
        userPrompt = `Crie um resumo atrativo de 2-3 frases para um artigo com o título: "${prompt}". O resumo deve despertar curiosidade e incentivar a leitura do artigo completo.`;
        break;
      case 'content':
        systemPrompt = 'Você é um especialista em telecomunicações e fibra óptica com vasta experiência em marketing de conteúdo. Escreva artigos informativos, envolventes e otimizados para SEO.';
        userPrompt = `Escreva um artigo completo sobre: "${prompt}". 

O artigo deve ter:
- Introdução envolvente
- Subtítulos organizados (use ## para H2 e ### para H3)
- Conteúdo informativo e útil
- Listas com bullet points quando apropriado
- Conclusão que incentive ação
- Entre 800-1200 palavras
- Linguagem acessível mas profissional
- Foco em benefícios para o consumidor
- Informações sobre fibra óptica e internet quando relevante

Categoria: ${category}

Use formato Markdown para formatação.`;
        break;
      default:
        throw new Error('Tipo de conteúdo não suportado');
    }

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
          { role: 'user', content: userPrompt }
        ],
        max_tokens: type === 'content' ? 2000 : 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    return { 
      content: generatedContent,
      success: true 
    };
  }
));
