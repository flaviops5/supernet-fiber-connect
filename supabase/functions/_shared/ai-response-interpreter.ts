/**
 * AI Response Interpreter
 * Usa Lovable AI para interpretar respostas ambíguas do cliente
 */

interface InterpretationResult {
  intent: 'confirmou' | 'negou' | 'incerto' | 'fora_contexto';
  confidence: number; // 0-1
  reasoning: string;
  mood?: 'neutro' | 'confuso' | 'irritado' | 'satisfeito';
}

type MoodType = 'neutro' | 'confuso' | 'irritado' | 'satisfeito';

/**
 * Detecta humor/estado emocional do cliente
 */
export function detectMood(message: string): MoodType {
  const frustration = detectFrustration(message);
  
  if (frustration.isFrustrated) {
    return 'irritado';
  }
  
  const normalized = normalizeText(message);
  
  // Padrões de confusão
  const confusionPatterns = [
    /nao\s+entendi/i,
    /como\s+(faz|fazer|funciona)/i,
    /pode\s+explicar/i,
    /o\s+que\s+e/i,
    /^\?+$/,
    /^\s*hein/i,
    /^\s*como\s+assim/i
  ];
  
  for (const pattern of confusionPatterns) {
    if (pattern.test(normalized)) {
      return 'confuso';
    }
  }
  
  // Padrões de satisfação
  const satisfactionPatterns = [
    /obrigad(o|a)/i,
    /valeu/i,
    /perfeito/i,
    /otimo/i,
    /excelente/i,
    /resolveu/i,
    /funcionou/i,
    /consegui/i
  ];
  
  for (const pattern of satisfactionPatterns) {
    if (pattern.test(normalized)) {
      return 'satisfeito';
    }
  }
  
  return 'neutro';
}

/**
 * Detecta sinais de frustração do cliente
 */
export function detectFrustration(message: string): {
  isFrustrated: boolean;
  intensity: 'low' | 'medium' | 'high';
  indicators: string[];
} {
  const normalized = normalizeText(message);
  const indicators: string[] = [];
  
  // Padrões de frustração
  const frustrationPatterns = {
    high: [
      /ja\s+falei/i,
      /quantas\s+vezes/i,
      /eu\s+disse/i,
      /nao\s+entende/i,
      /idiota/i,
      /burro/i,
      /incompetente/i,
      /pqp/i,
      /desgraca/i,
      /merda/i
    ],
    medium: [
      /de\s+novo/i,
      /outra\s+vez/i,
      /repetir/i,
      /ja\s+respondi/i,
      /nao\s+aguento\s+mais/i,
      /que\s+saco/i,
      /meu\s+deus/i,
      /serio/i
    ],
    low: [
      /afe/i,
      /nossa/i,
      /caramba/i,
      /po\s/i,
      /\bpo\b/i
    ]
  };
  
  let intensity: 'low' | 'medium' | 'high' = 'low';
  let isFrustrated = false;
  
  // Verificar padrões de alta intensidade
  for (const pattern of frustrationPatterns.high) {
    if (pattern.test(normalized)) {
      indicators.push(pattern.source);
      intensity = 'high';
      isFrustrated = true;
    }
  }
  
  // Se não encontrou high, verificar medium
  if (!isFrustrated) {
    for (const pattern of frustrationPatterns.medium) {
      if (pattern.test(normalized)) {
        indicators.push(pattern.source);
        intensity = 'medium';
        isFrustrated = true;
      }
    }
  }
  
  // Se não encontrou medium, verificar low
  if (!isFrustrated) {
    for (const pattern of frustrationPatterns.low) {
      if (pattern.test(normalized)) {
        indicators.push(pattern.source);
        intensity = 'low';
        isFrustrated = true;
      }
    }
  }
  
  // Detectar repetição excessiva (mesma palavra 3+ vezes)
  const words = normalized.split(/\s+/);
  const wordCount: Record<string, number> = {};
  for (const word of words) {
    if (word.length > 3) { // Ignorar palavras muito curtas
      wordCount[word] = (wordCount[word] || 0) + 1;
      if (wordCount[word] >= 3) {
        indicators.push(`repetição: "${word}"`);
        isFrustrated = true;
        if (intensity === 'low') intensity = 'medium';
      }
    }
  }
  
  // Detectar CAPS LOCK (>50% maiúsculas)
  const uppercaseCount = (message.match(/[A-Z]/g) || []).length;
  const letterCount = (message.match(/[A-Za-z]/g) || []).length;
  if (letterCount > 5 && uppercaseCount / letterCount > 0.5) {
    indicators.push('CAPS LOCK');
    isFrustrated = true;
    if (intensity === 'low') intensity = 'medium';
  }
  
  // Detectar múltiplos pontos de exclamação
  const exclamationCount = (message.match(/!/g) || []).length;
  if (exclamationCount >= 3) {
    indicators.push('múltiplos !!!');
    isFrustrated = true;
  }
  
  return {
    isFrustrated,
    intensity,
    indicators
  };
}

/**
 * Normaliza texto para comparação
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Decompor caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^\w\s]/g, ' ') // Remover pontuação
    .replace(/\s+/g, ' ') // Normalizar espaços
    .trim();
}

/**
 * Calcula similaridade entre duas strings (Levenshtein simplificado)
 */
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

/**
 * Tenta detectar confirmação usando similaridade textual
 */
export function detectBySimilarity(message: string, expectedPhrases: string[]): {
  match: boolean;
  confidence: number;
  bestMatch?: string;
} {
  const normalized = normalizeText(message);
  
  let bestSimilarity = 0;
  let bestPhrase = '';
  
  for (const phrase of expectedPhrases) {
    const sim = similarity(normalized, normalizeText(phrase));
    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestPhrase = phrase;
    }
  }
  
  return {
    match: bestSimilarity >= 0.7, // 70% de similaridade
    confidence: bestSimilarity,
    bestMatch: bestPhrase
  };
}

/**
 * Interpreta resposta usando AI (Lovable AI)
 */
export async function interpretWithAI(
  clientMessage: string,
  context: {
    expectedAction: string; // "verificar energia", "manipular fibra", etc
    previousAgentMessage: string;
    detectMood?: boolean;
  }
): Promise<InterpretationResult> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const moodInstruction = context.detectMood ? `
- Detecte também o humor do cliente: "neutro", "confuso", "irritado" ou "satisfeito"
- Adicione campo "mood" no JSON de resposta` : '';

  const prompt = `Você é um assistente que interpreta respostas de clientes em um chat de suporte técnico.

CONTEXTO:
- Ação esperada do cliente: "${context.expectedAction}"
- Última mensagem do agente: "${context.previousAgentMessage}"
- Resposta do cliente: "${clientMessage}"

TAREFA:
Analise se o cliente confirmou que executou a ação, negou, ou a resposta está incerta/fora de contexto.${moodInstruction}

EXEMPLOS:
- Cliente disse "voltou" após manipular fibra → CONFIRMOU (confiança: 0.9)
- Cliente disse "não" → NEGOU (confiança: 1.0)
- Cliente disse "o que?" → INCERTO (confiança: 0.5)
- Cliente disse "onde fica?" → FORA_CONTEXTO (confiança: 0.8)

Responda APENAS com um JSON válido seguindo este formato exato:
{
  "intent": "confirmou" | "negou" | "incerto" | "fora_contexto",
  "confidence": 0.0-1.0,
  "reasoning": "breve explicação da interpretação"${context.detectMood ? ',\n  "mood": "neutro" | "confuso" | "irritado" | "satisfeito"' : ''}
}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash", // Rápido e eficiente
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3, // Mais determinístico
        max_tokens: 200
      })
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Extrair JSON da resposta (pode vir com markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid AI response format");
    }
    
    const result = JSON.parse(jsonMatch[0]) as InterpretationResult;
    
    // Validar resultado
    if (!['confirmou', 'negou', 'incerto', 'fora_contexto'].includes(result.intent)) {
      throw new Error("Invalid intent in AI response");
    }
    
    return result;
  } catch (error) {
    console.error("Error interpreting with AI:", error);
    
    // Fallback: retornar incerto
    return {
      intent: 'incerto',
      confidence: 0,
      reasoning: `Erro na interpretação AI: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Sistema Híbrido: Tenta regex primeiro, depois similaridade, depois AI
 */
export async function hybridInterpret(
  message: string,
  context: {
    regexDetectors: {
      confirmed: RegExp;
      denied: RegExp;
    };
    similarityPhrases: {
      confirmed: string[];
      denied: string[];
    };
    aiContext: {
      expectedAction: string;
      previousAgentMessage: string;
    };
  }
): Promise<{
  result: 'confirmou' | 'negou' | 'incerto';
  confidence: number;
  method: 'regex' | 'similarity' | 'ai';
  reasoning?: string;
}> {
  const normalized = normalizeText(message);
  
  // ETAPA 0: Detectar humor se solicitado
  let mood: MoodType | undefined;
  if (context.moodDetection) {
    mood = detectMood(message);
  }
  
  // ETAPA 1: Tentar Regex (mais rápido)
  if (context.regexDetectors?.confirmed?.test(message)) {
    return {
      result: 'confirmou',
      intent: 'confirmacao',
      confidence: 1.0,
      method: 'regex',
      mood
    };
  }
  
  if (context.regexDetectors?.denied?.test(message)) {
    return {
      result: 'negou',
      intent: 'negacao',
      confidence: 1.0,
      method: 'regex',
      mood
    };
  }
  
  // ETAPA 2: Tentar Similaridade Textual
  if (context.similarityPhrases) {
    const confirmedSimilarity = context.similarityPhrases.confirmed 
      ? detectBySimilarity(message, context.similarityPhrases.confirmed)
      : { match: false, confidence: 0 };
    
    const deniedSimilarity = context.similarityPhrases.denied
      ? detectBySimilarity(message, context.similarityPhrases.denied)
      : { match: false, confidence: 0 };
    
    if (confirmedSimilarity.match && confirmedSimilarity.confidence > 0.75) {
      return {
        result: 'confirmou',
        intent: 'confirmacao',
        confidence: confirmedSimilarity.confidence,
        method: 'similarity',
        reasoning: `Similar a: "${confirmedSimilarity.bestMatch}"`,
        mood
      };
    }
    
    if (deniedSimilarity.match && deniedSimilarity.confidence > 0.75) {
      return {
        result: 'negou',
        intent: 'negacao',
        confidence: deniedSimilarity.confidence,
        method: 'similarity',
        reasoning: `Similar a: "${deniedSimilarity.bestMatch}"`,
        mood
      };
    }
  }
  
  // ETAPA 3: Usar AI para casos ambíguos (se contexto fornecido)
  if (context.aiContext) {
    console.log("🤖 Usando AI para interpretar resposta ambígua:", message);
    
    const aiResult = await interpretWithAI(message, {
      ...context.aiContext,
      detectMood: context.moodDetection
    });
    
    if (aiResult.intent === 'confirmou' || aiResult.intent === 'negou') {
      return {
        result: aiResult.intent,
        intent: aiResult.intent === 'confirmou' ? 'confirmacao' : 'negacao',
        confidence: aiResult.confidence,
        method: 'ai',
        reasoning: aiResult.reasoning,
        mood: aiResult.mood || mood
      };
    }
    
    // Não conseguiu determinar
    return {
      result: 'incerto',
      intent: 'incerto',
      confidence: 0,
      method: 'ai',
      reasoning: aiResult.reasoning,
      mood: aiResult.mood || mood
    };
  }
  
  // Fallback: apenas retorna mood se detectado
  return {
    result: 'incerto',
    intent: 'incerto',
    confidence: 0,
    method: 'mood',
    mood
  };
}
