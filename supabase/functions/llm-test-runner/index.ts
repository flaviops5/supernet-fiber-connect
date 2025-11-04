/**
 * LLM Test Runner - PR#50-R3 FINAL
 * Sistema de QA conversacional usando Lovable AI
 * Gera mensagens com Gemini-flash, avalia com Gemini-pro
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// CONFIGURAÇÃO
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const ROUTING_ENDPOINT = `${supabaseUrl}/functions/v1/routing-agent`;

// Timeouts em ms
const TIMEOUT_GENERATION = 15000;
const TIMEOUT_ROUTING = 30000;
const TIMEOUT_EVALUATION = 20000;

// ============================================
// CONTEXTO DOCUMENTAL
// ============================================

const CONTEXT_DOCS = {
  scenarios: `
CENÁRIO A: Cliente Offline (Sem Energia/Conexão)
- Sintomas: "internet caiu", "sem conexão", "modem apagado"
- Diagnóstico: TX/RX = null ou não disponível
- Fluxo: Cloé orienta verificar energia/cabos → transfere Luan se persistir

CENÁRIO B: Equipamento Travado (Sinal OK)
- Sintomas: "internet lenta", "travando", "sites não abrem"
- Diagnóstico: TX/RX normais, mas equipamento instável
- Fluxo: Cloé sugere reboot → escala Luan se persistir após reboot

CENÁRIO C: Sinal Fraco/Instável
- Sintomas: "quedas constantes", "instável", "cai toda hora"
- Diagnóstico: TX alto (> -20 dBm) ou RX baixo (< -30 dBm)
- Fluxo: Cloé transfere direto para Luan (problema de infraestrutura)
`,
  routing: `
FLUXO DE ROTEAMENTO ESPERADO:
1. Cloé recebe mensagem inicial
2. Solicita CPF se não fornecido
3. Classifica intenção: técnico → Luan, financeiro → Julia, comercial → Vicente
4. Transfere ao agente correto mantendo contexto completo
5. Agente especializado resolve ou escala conforme necessário

AGENTES:
- Cloé: Roteamento inicial, coleta de dados, triagem
- Luan: Suporte técnico N1, diagnóstico, resolução de problemas
- Julia: Financeiro, boletos, PIX, negociações
- Vicente: Comercial, vendas, upgrades, cancelamentos
`,
  success_criteria: `
CRITÉRIOS DE AVALIAÇÃO (escala 0-1):

routing_score: 1.0 se roteou para o agente correto
- Penalizar 0.5 se roteou para agente errado
- Penalizar 0.3 se não transferiu quando deveria

clarity_score: 0.8-1.0 se explicou claramente o próximo passo
- Linguagem acessível, sem jargão técnico excessivo
- Instruções objetivas e acionáveis

context_score: 0.9-1.0 se manteve contexto da conversa
- Referenciou informações anteriores
- Não pediu dados já fornecidos
- Manteve tom consistente

tone_score: 0.9-1.0 se foi cordial e profissional
- Empatia com problema do cliente
- Tom respeitoso e acolhedor
- Evitou frieza ou robotização

timing_score: 0.8-1.0 se respondeu em tempo adequado
- Respostas esperadas em < 5s
- Penalizar 0.2 por cada 5s adicionais
`
};

// ============================================
// TIPOS
// ============================================

interface Scenario {
  id: string;
  category: string;
  name: string;
  prompt: string;
  expected_agent: string;
  metadata: Record<string, unknown>;
}

interface EvaluationResult {
  routing_score: number;
  clarity_score: number;
  context_score: number;
  tone_score: number;
  timing_score: number;
  detected_agent: string;
  expected_agent: string;
  pass: boolean;
  justification: string;
}

interface TestResult {
  scenario_id: string;
  scenario: string;
  expected: string;
  detected: string;
  pass: boolean;
  scores: EvaluationResult;
  latency: number;
  error?: string;
}

// ============================================
// UTILITÁRIOS
// ============================================

function buildSystemPrompt(): string {
  return `
Você é um avaliador de qualidade conversacional da Loveable, um sistema de atendimento multiagente.

Use o seguinte contexto para avaliar:

${CONTEXT_DOCS.scenarios}

${CONTEXT_DOCS.routing}

${CONTEXT_DOCS.success_criteria}

IMPORTANTE:
- Seja objetivo e técnico na avaliação
- Considere o contexto completo da conversa
- Avalie se o roteamento foi correto para o cenário
- Verifique se a comunicação foi clara e empática

Responda APENAS com JSON válido (sem markdown, sem formatação):
{
  "routing_score": 0.0-1.0,
  "clarity_score": 0.0-1.0,
  "context_score": 0.0-1.0,
  "tone_score": 0.0-1.0,
  "timing_score": 0.0-1.0,
  "detected_agent": "cloe|luan|julia|vicente|desconhecido",
  "expected_agent": "cloe|luan|julia|vicente",
  "pass": true|false,
  "justification": "Explicação detalhada da avaliação"
}`;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

async function callLovableAI(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number,
  responseFormat?: { type: string }
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  };

  if (responseFormat) {
    body.response_format = responseFormat;
  }

  const response = await fetchWithTimeout(
    LOVABLE_AI_URL,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    },
    timeoutMs
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lovable AI error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ============================================
// LÓGICA PRINCIPAL
// ============================================

async function generateUserMessage(basePrompt: string): Promise<string> {
  try {
    const generated = await callLovableAI(
      "google/gemini-2.5-flash",
      "Você gera UMA ÚNICA variação natural de mensagem de cliente em português brasileiro. Seja espontâneo, use linguagem informal mas respeitosa. Responda APENAS com a mensagem variada, nada mais.",
      `Varie esta mensagem de forma natural e concisa: "${basePrompt}"`,
      TIMEOUT_GENERATION
    );
    // Pegar apenas a primeira linha se vier múltiplas
    const firstLine = generated.trim().split('\n')[0];
    return firstLine.replace(/^[">*-]\s*/, '').trim() || basePrompt;
  } catch (error) {
    console.error("Error generating message variation:", error);
    return basePrompt; // Fallback para prompt original
  }
}

async function callRoutingAgent(message: string): Promise<{ agent?: string; response?: string; latency: number }> {
  const startTime = Date.now();
  
  try {
    const testConversationId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const response = await fetchWithTimeout(
      ROUTING_ENDPOINT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          conversationId: testConversationId,
          message,
          phone: "+5511999999999",
          testMode: true
        })
      },
      TIMEOUT_ROUTING
    );

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Routing agent error:", errorText);
      return { latency, response: `Error: ${response.status}` };
    }

    const data = await response.json();
    return {
      agent: data.next_action || data.agent,
      response: data.message || data.response || JSON.stringify(data),
      latency
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error("Error calling routing agent:", error);
    return {
      latency,
      response: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

async function evaluateResponse(
  scenario: Scenario,
  userMessage: string,
  agentResponse: string,
  detectedAgent: string | undefined,
  latency: number
): Promise<EvaluationResult> {
  try {
    const evalPrompt = `
Avaliar esta interação:

CENÁRIO: ${scenario.name}
CATEGORIA: ${scenario.category}
MENSAGEM DO CLIENTE: "${userMessage}"
RESPOSTA DO SISTEMA: "${agentResponse}"
AGENTE ESPERADO: ${scenario.expected_agent}
AGENTE DETECTADO: ${detectedAgent || "desconhecido"}
LATÊNCIA: ${latency}ms

Avalie a qualidade do roteamento e da resposta.
`;

    const evalText = await callLovableAI(
      "google/gemini-2.5-pro",
      buildSystemPrompt(),
      evalPrompt,
      TIMEOUT_EVALUATION,
      { type: "json_object" }
    );

    let evaluation: EvaluationResult;
    try {
      evaluation = JSON.parse(evalText) as EvaluationResult;
    } catch (parseError) {
      console.error("Error parsing evaluation JSON:", evalText);
      throw new Error(`Invalid JSON response: ${parseError}`);
    }
    
    // Validar estrutura e aplicar defaults
    evaluation.routing_score = evaluation.routing_score ?? 0.5;
    evaluation.clarity_score = evaluation.clarity_score ?? 0.5;
    evaluation.context_score = evaluation.context_score ?? 0.5;
    evaluation.tone_score = evaluation.tone_score ?? 0.5;
    evaluation.timing_score = evaluation.timing_score ?? 0.5;
    evaluation.detected_agent = evaluation.detected_agent || detectedAgent || "desconhecido";
    evaluation.expected_agent = scenario.expected_agent;
    evaluation.pass = evaluation.pass ?? false;
    evaluation.justification = evaluation.justification || "Avaliação incompleta";

    return evaluation;
  } catch (error) {
    console.error("Error evaluating response:", error);
    // Retornar avaliação neutra em caso de erro
    return {
      routing_score: 0.5,
      clarity_score: 0.5,
      context_score: 0.5,
      tone_score: 0.5,
      timing_score: 0.5,
      detected_agent: detectedAgent || "desconhecido",
      expected_agent: scenario.expected_agent,
      pass: false,
      justification: `Erro na avaliação: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

async function runTest(scenario: Scenario): Promise<TestResult> {
  console.log(`\n🧪 Testando: ${scenario.name}`);
  
  const startTime = Date.now();
  
  try {
    // 1️⃣ Gerar variação natural da mensagem
    const userMessage = await generateUserMessage(scenario.prompt);
    console.log(`📝 Mensagem gerada: "${userMessage}"`);
    
    // 2️⃣ Chamar routing agent
    const { agent, response, latency } = await callRoutingAgent(userMessage);
    console.log(`🤖 Agente: ${agent}, Latência: ${latency}ms`);
    
    // 3️⃣ Avaliar resposta
    const evaluation = await evaluateResponse(
      scenario,
      userMessage,
      response || "",
      agent,
      latency
    );
    
    const executionTime = Date.now() - startTime;
    
    // 4️⃣ Salvar resultado
    await supabase.from("llm_test_results").insert({
      scenario_id: scenario.id,
      category: scenario.category,
      scenario: scenario.name,
      expected_agent: scenario.expected_agent,
      detected_agent: evaluation.detected_agent,
      model_generation: "google/gemini-2.5-flash",
      model_evaluator: "google/gemini-2.5-pro",
      routing_score: evaluation.routing_score,
      clarity_score: evaluation.clarity_score,
      context_score: evaluation.context_score,
      tone_score: evaluation.tone_score,
      timing_score: evaluation.timing_score,
      pass: evaluation.pass,
      response: response || "",
      evaluation: evaluation.justification,
      user_message: userMessage,
      latency_ms: latency,
      execution_time_ms: executionTime,
      metadata: scenario.metadata
    });
    
    return {
      scenario_id: scenario.id,
      scenario: scenario.name,
      expected: scenario.expected_agent,
      detected: evaluation.detected_agent,
      pass: evaluation.pass,
      scores: evaluation,
      latency
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Erro no teste: ${errorMessage}`);
    
    // Registrar erro
    await supabase.from("llm_test_results").insert({
      scenario_id: scenario.id,
      category: scenario.category,
      scenario: scenario.name,
      expected_agent: scenario.expected_agent,
      detected_agent: null,
      pass: false,
      error_details: errorMessage,
      execution_time_ms: Date.now() - startTime
    });
    
    return {
      scenario_id: scenario.id,
      scenario: scenario.name,
      expected: scenario.expected_agent,
      detected: "error",
      pass: false,
      scores: {
        routing_score: 0,
        clarity_score: 0,
        context_score: 0,
        tone_score: 0,
        timing_score: 0,
        detected_agent: "error",
        expected_agent: scenario.expected_agent,
        pass: false,
        justification: errorMessage
      },
      latency: 0,
      error: errorMessage
    };
  }
}

// ============================================
// SERVIDOR HTTP
// ============================================

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Iniciando LLM Test Runner...");
    
    // Buscar todos os cenários ativos
    const { data: allScenarios, error: scenariosError } = await supabase
      .from("kb_scenarios")
      .select("*")
      .eq("is_active", true);

    if (scenariosError) {
      throw new Error(`Error fetching scenarios: ${scenariosError.message}`);
    }

    if (!allScenarios || allScenarios.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active scenarios found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Randomizar e pegar até 3 cenários (evitar timeout do Edge Function)
    const shuffled = allScenarios.sort(() => Math.random() - 0.5);
    const scenarios = shuffled.slice(0, Math.min(3, shuffled.length));

    console.log(`📋 Executando ${scenarios.length} testes de ${allScenarios.length} cenários disponíveis...`);
    
    // Executar testes sequencialmente (para evitar rate limits)
    const results: TestResult[] = [];
    for (const scenario of scenarios) {
      const result = await runTest(scenario);
      results.push(result);
      
      // Pequeno delay entre testes
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Calcular estatísticas
    const passed = results.filter(r => r.pass).length;
    const failed = results.length - passed;
    const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
    const avgRouting = results.reduce((sum, r) => sum + r.scores.routing_score, 0) / results.length;
    const avgOverall = results.reduce((sum, r) => {
      return sum + (
        r.scores.routing_score * 0.3 +
        r.scores.clarity_score * 0.25 +
        r.scores.context_score * 0.2 +
        r.scores.tone_score * 0.15 +
        r.scores.timing_score * 0.1
      );
    }, 0) / results.length;

    console.log(`✅ Testes concluídos: ${passed}/${results.length} aprovados`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: results.length,
          passed,
          failed,
          pass_rate: (passed / results.length * 100).toFixed(2) + "%",
          avg_latency_ms: Math.round(avgLatency),
          avg_routing_score: avgRouting.toFixed(2),
          avg_overall_score: avgOverall.toFixed(2)
        },
        results: results.map(r => ({
          scenario: r.scenario,
          expected: r.expected,
          detected: r.detected,
          pass: r.pass,
          latency: r.latency,
          overall_score: (
            r.scores.routing_score * 0.3 +
            r.scores.clarity_score * 0.25 +
            r.scores.context_score * 0.2 +
            r.scores.tone_score * 0.15 +
            r.scores.timing_score * 0.1
          ).toFixed(2),
          error: r.error
        }))
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("❌ Fatal error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
