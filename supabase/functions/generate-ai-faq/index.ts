import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

interface AIFaqItem {
  question: string;
  answer: string;
  suggestedIcon?: string;
  category?: string;
  qualityScore?: number;
  suggestions?: string[];
}

interface AIFaqResponse {
  faqs: AIFaqItem[];
}

Deno.serve(createAuthenticatedHandler(
  'generate-ai-faq',
  async (req, { supabase, user }) => {
    const { theme } = await req.json();

    if (!theme || theme.trim().length === 0) {
      throw new Error('Theme is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `Você é um assistente especializado em criar FAQs (Perguntas Frequentes) para empresas de telecomunicações.

Seu objetivo é gerar FAQs completas, profissionais e úteis baseadas no tema/contexto fornecido pelo usuário.

INSTRUÇÕES CRÍTICAS:
1. Gere EXATAMENTE 3 a 5 FAQs completas
2. Cada FAQ deve ter:
   - question: Pergunta clara e direta (máx 150 caracteres)
   - answer: Resposta detalhada, profissional e útil (200-500 caracteres)
   - suggestedIcon: Nome do ícone mais apropriado (escolha entre: Network, Wrench, Router, Signal, Zap, Headphones, ShoppingCart, MapPin, CreditCard, Shield, Globe, Download, Settings, Camera, Tv, DollarSign, Clock, Wifi)
   - category: Categoria principal (ex: "Instalação", "Técnico", "Comercial", "Suporte")
   - qualityScore: Score de qualidade de 0-100 (baseado em clareza, completude e utilidade)
   - suggestions: Array com 1-3 sugestões de melhoria (opcional)

3. As FAQs devem:
   - Ser baseadas em dúvidas REAIS que clientes teriam
   - Ter respostas COMPLETAS e ÚTEIS (não genéricas)
   - Usar linguagem profissional mas acessível
   - Incluir detalhes técnicos quando apropriado
   - Antecipar dúvidas relacionadas

4. Retorne APENAS o JSON válido no formato:
{
  "faqs": [
    {
      "question": "string",
      "answer": "string",
      "suggestedIcon": "string",
      "category": "string",
      "qualityScore": number,
      "suggestions": ["string", "string"]
    }
  ]
}`;

    const userPrompt = `Tema/Contexto: ${theme}

Gere 3-5 FAQs completas baseadas neste tema. Pense em dúvidas reais que clientes teriam e forneça respostas profissionais e úteis.`;

    console.log('Calling Lovable AI for FAQ generation...');

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 2000
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content;

    if (!aiMessage) {
      throw new Error('No content in AI response');
    }

    console.log('AI Response received:', aiMessage.substring(0, 200));

    // Parse JSON response
    let parsedResponse: AIFaqResponse;
    try {
      // Remove markdown code blocks if present
      const cleanedMessage = aiMessage
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      parsedResponse = JSON.parse(cleanedMessage) as AIFaqResponse;
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw message:', aiMessage);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate response structure
    if (!parsedResponse.faqs || !Array.isArray(parsedResponse.faqs)) {
      throw new Error('Invalid response structure: missing faqs array');
    }

    // Validate each FAQ
    const validatedFAQs = parsedResponse.faqs.map((faq: AIFaqItem, index: number) => {
      if (!faq.question || !faq.answer || !faq.suggestedIcon || !faq.category) {
        console.error(`Invalid FAQ at index ${index}:`, faq);
        throw new Error(`Invalid FAQ structure at index ${index}`);
      }

      return {
        question: String(faq.question).trim(),
        answer: String(faq.answer).trim(),
        suggestedIcon: String(faq.suggestedIcon).trim(),
        category: String(faq.category).trim(),
        qualityScore: Number(faq.qualityScore) || 75,
        suggestions: Array.isArray(faq.suggestions) ? faq.suggestions : []
      };
    });

    console.log(`Successfully generated ${validatedFAQs.length} FAQs`);

    return { 
      faqs: validatedFAQs,
      theme: theme 
    };
  }
));
