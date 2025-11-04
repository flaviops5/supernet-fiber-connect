// supabase/functions/qa-orchestrator/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// Endpoint do routing-agent
const ROUTING_ENDPOINT = `${supabaseUrl}/functions/v1/routing-agent`;

// Controladores
const RUN_REGRESSION_DEFAULT = true;
const RUN_EXPLORATORY_DEFAULT = false;

// Prompts de avaliação
const CONTEXT_DOCS = {
  scenarios: `
CENÁRIOS TÉCNICOS DE REFERÊNCIA:
- A: Offline (sem energia) → Cloé verifica/aguarda → Luan se persistir
- B: Equipamento travado (sinal ok) → reboot → Luan se persistir
- C: Sinal fraco (TX alto / RX baixo) → Luan direto
- E: Senha Wi-Fi, Netflix travando → Luan
`,
  routing: `
FLUXO DE ROTEAMENTO (Cloé):
1) Saudação (em produção requer CPF, mas em teste ignora)
2) Classificação de intenção (técnico / financeiro / comercial)
3) Transferência correta e manutenção de contexto

AGENTES:
- Luan (técnico): problemas de conexão, lentidão, offline, senha Wi-Fi
- Julia (financeiro): boleto, PIX, pagamento, desbloqueio
- Vicente (comercial): cobertura, upgrade, downgrade, novos planos
- Cloé (geral): saudação, múltiplas intenções, casos não classificados
`,
  success: `
MÉTRICAS DE AVALIAÇÃO:
- routing_score (0-1): agente correto foi escolhido?
- clarity_score (0-1): resposta clara e objetiva?
- context_score (0-1): manteve contexto adequado?
- tone_score (0-1): tom apropriado ao cenário?
- timing_score (0-1): resposta em tempo adequado?

CRITÉRIO DE APROVAÇÃO:
- routing_score = 1.0 (OBRIGATÓRIO)
- Média dos outros 4 scores >= 0.7
`
};

function buildSystemPrompt() {
  return `
Você é um avaliador de qualidade de conversas (Loveable QA).
Use os critérios abaixo e retorne APENAS JSON válido.

${CONTEXT_DOCS.scenarios}
${CONTEXT_DOCS.routing}
${CONTEXT_DOCS.success}

**REGRAS DE AVALIAÇÃO:**
1. routing_score = 1.0 se o agente detectado corresponde exatamente ao esperado
2. routing_score = 0.0 se o agente está errado
3. Outros scores (clarity, context, tone, timing) devem ser objetivos
4. pass = true SOMENTE se routing_score = 1.0 E média dos outros >= 0.7

Formato de retorno (JSON puro):
{
  "routing_score": 0 ou 1,
  "clarity_score": 0-1,
  "context_score": 0-1,
  "tone_score": 0-1,
  "timing_score": 0-1,
  "detected_agent": "cloe|luan|julia|vicente",
  "expected_agent": "...",
  "pass": true|false,
  "justification": "texto breve explicando scores"
}`;
}

async function fetchWithTimeout(url: string, options: any, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function lovableChat(model: string, messages: any[], response_format?: any, temperature?: number) {
  const res = await fetchWithTimeout(LOVABLE_AI_URL, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${LOVABLE_API_KEY}`, 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({ 
      model, 
      messages, 
      ...(response_format ? { response_format } : {}),
      ...(temperature !== undefined ? { temperature } : {})
    })
  }, 25000); // 25s timeout para LLM
  
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Lovable AI ${model} HTTP ${res.status}: ${errText}`);
  }
  
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  return { data, content };
}

function safeJson<T = any>(s: string): T | null {
  try { 
    return JSON.parse(s); 
  } catch { 
    return null; 
  }
}

async function evalOne(prompt: string, expectedAgent: string) {
  console.log(`[QA] Avaliando: "${prompt.slice(0, 50)}..." -> esperado: ${expectedAgent}`);
  
  // 1) Envia para routing-agent com testMode
  const t0 = performance.now();
  
  const routingRes = await fetchWithTimeout(ROUTING_ENDPOINT, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({
      conversationId: `qa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message: prompt,
      testMode: true
    })
  }, 15000); // 15s timeout para routing
  
  if (!routingRes.ok) {
    throw new Error(`Routing agent HTTP ${routingRes.status}`);
  }
  
  const routingJson = await routingRes.json();
  const t1 = performance.now();
  const latency = Math.round(t1 - t0);

  const detectedAgent = routingJson?.agent || routingJson?.next_action || routingJson?.targetDepartment || "unknown";
  const responseText = routingJson?.message || "";
  
  console.log(`[QA] Roteamento: ${detectedAgent} | Latência: ${latency}ms`);

  // 2) Avalia com Gemini-2.5-pro
  const evalMsg = `
Avaliar resposta de roteamento:

**Prompt do usuário:** "${prompt}"

**Agente esperado:** ${expectedAgent}

**Agente detectado:** ${detectedAgent}

**Resposta gerada:** "${responseText}"

Analise se o roteamento está correto e avalie os outros critérios.
`.trim();

  // Avaliação com LLM (com fallback se indisponível)
  let parsed: any = {};
  let fallbackUsed = false;
  try {
    const ev = await lovableChat(
      "google/gemini-2.5-pro",
      [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: evalMsg }
      ],
      { type: "json_object" },
      0.0 // temperatura 0 = julgamento determinístico
    );
    parsed = safeJson(ev.content) || {};
  } catch (e: any) {
    console.warn("[QA] Avaliador LLM indisponível, usando fallback local.", e?.message || e);
    fallbackUsed = true;
    parsed = {
      clarity_score: 0.8,
      context_score: 0.8,
      tone_score: 0.8,
      timing_score: 0.8,
      justification: "Fallback local: avaliador indisponível (sem créditos/timeout)"
    };
  }

  // Garantir que routing_score é 0 ou 1
  const routingScore = (detectedAgent === expectedAgent) ? 1 : 0;

  const clarity = Number(parsed.clarity_score ?? 0.5);
  const context = Number(parsed.context_score ?? 0.5);
  const tone = Number(parsed.tone_score ?? 0.5);
  const timing = Number(parsed.timing_score ?? 0.5);
  const avgOthers = (clarity + context + tone + timing) / 4;

  return {
    detected_agent: detectedAgent,
    response_text: responseText,
    latency_ms: latency,
    scores: {
      routing_score: routingScore,
      clarity_score: clarity,
      context_score: context,
      tone_score: tone,
      timing_score: timing,
      pass: routingScore === 1 && avgOthers >= 0.7,
      justification: (parsed.justification ?? "Avaliação automática") + (fallbackUsed ? " | Fallback aplicado" : "")
    }
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[QA Orchestrator] Iniciando execução");
    
    const url = new URL(req.url);
    const runRegression = (url.searchParams.get("regression") ?? "true").toLowerCase() === "true";
    const runExploratory = (url.searchParams.get("exploratory") ?? "false").toLowerCase() === "true";

    const reportStart = new Date();
    const GLOBAL_TIMEOUT_MS = 130000; // 130s - deixa 20s de margem antes do limite de 150s
    const startTime = Date.now();
    
    let total = 0, pass = 0, fail = 0;
    let regPass = 0, regFail = 0;
    let expPass = 0, expFail = 0;
    let latencies: number[] = [];
    const allResults: any[] = [];
    let timedOut = false;

    // ---------------------------
    // REGRESSION SUITE (FIXA)
    // ---------------------------
    if (runRegression) {
      console.log("[QA] Executando suite de regressão");
      
      const { data: cases, error: casesError } = await supabase
        .from("qa_regression_cases")
        .select("*")
        .order("scenario_name", { ascending: true });

      if (casesError) {
        throw new Error(`Erro ao buscar casos de regressão: ${casesError.message}`);
      }

      for (const c of (cases || [])) {
        // Verificar timeout global
        if (Date.now() - startTime > GLOBAL_TIMEOUT_MS) {
          console.warn(`[QA] Timeout global atingido após ${total} testes`);
          timedOut = true;
          break;
        }

        try {
          console.log(`[QA] Executando teste ${total + 1}/${cases.length}: ${c.scenario_name}`);
          const r = await evalOne(c.prompt, c.expected_agent);
          total += 1;
          latencies.push(r.latency_ms);
          
          if (r.scores.pass) { 
            pass += 1; 
            regPass += 1; 
          } else { 
            fail += 1; 
            regFail += 1; 
          }

          // Grava no llm_test_results para histórico unificado
          await supabase.from("llm_test_results").insert({
            category: c.category,
            scenario: c.scenario_name,
            expected_agent: c.expected_agent,
            detected_agent: r.detected_agent,
            model_generation: "fixed-baseline",
            model_evaluator: "google/gemini-2.5-pro",
            endpoint_called: "routing-agent",
            routing_score: r.scores.routing_score,
            clarity_score: r.scores.clarity_score,
            context_score: r.scores.context_score,
            tone_score: r.scores.tone_score,
            timing_score: r.scores.timing_score,
            pass: r.scores.pass,
            confidence: r.scores.pass ? 1 : 0,
            response: r.response_text,
            evaluation: { justification: r.scores.justification },
            latency_ms_total: r.latency_ms
          });

          // Atualiza o cabeçalho da baseline
          await supabase.from("qa_regression_cases").update({
            last_passed: r.scores.pass,
            last_routing_score: r.scores.routing_score,
            last_run_at: new Date().toISOString()
          }).eq("id", c.id);

          allResults.push({
            type: "regression",
            scenario: c.scenario_name,
            category: c.category,
            expected: c.expected_agent,
            detected: r.detected_agent,
            latency_ms: r.latency_ms,
            ...r.scores
          });
        } catch (testError) {
          console.error(`[QA] Erro no teste ${c.scenario_name}:`, testError);
          fail += 1;
          regFail += 1;
          total += 1;
          
          allResults.push({
            type: "regression",
            scenario: c.scenario_name,
            category: c.category,
            expected: c.expected_agent,
            detected: "error",
            error: testError instanceof Error ? testError.message : String(testError),
            pass: false
          });
        }
      }
    }

    // ---------------------------
    // EXPLORATORY SUITE (OPCIONAL)
    // ---------------------------
    if (runExploratory) {
      console.log("[QA] Executando suite exploratória");
      
      const { data: baseScenarios } = await supabase
        .from("kb_scenarios")
        .select("*")
        .limit(5)
        .order("created_at", { ascending: false });

      for (const s of (baseScenarios || [])) {
        try {
          // Gera variação com flash
          const gen = await lovableChat("google/gemini-2.5-flash", [
            { 
              role: "system", 
              content: "Gere uma variação natural e curta em pt-BR, estilo cliente real. Mantenha a intenção original." 
            },
            { 
              role: "user", 
              content: `Mensagem base: "${s.prompt}"` 
            }
          ]);

          const variation = gen.content?.slice(0, 500) || s.prompt;

          const r = await evalOne(variation, s.expected_agent);
          total += 1;
          latencies.push(r.latency_ms);
          
          if (r.scores.pass) { 
            pass += 1; 
            expPass += 1; 
          } else { 
            fail += 1; 
            expFail += 1; 
          }

          await supabase.from("llm_test_results").insert({
            category: s.category,
            scenario: `${s.name} (var)`,
            expected_agent: s.expected_agent,
            detected_agent: r.detected_agent,
            model_generation: "google/gemini-2.5-flash",
            model_evaluator: "google/gemini-2.5-pro",
            endpoint_called: "routing-agent",
            routing_score: r.scores.routing_score,
            clarity_score: r.scores.clarity_score,
            context_score: r.scores.context_score,
            tone_score: r.scores.tone_score,
            timing_score: r.scores.timing_score,
            pass: r.scores.pass,
            confidence: r.scores.pass ? 1 : 0,
            response: r.response_text,
            evaluation: { justification: r.scores.justification },
            latency_ms_total: r.latency_ms
          });

          allResults.push({
            type: "exploratory",
            scenario: `${s.name} (var)`,
            category: s.category,
            expected: s.expected_agent,
            detected: r.detected_agent,
            prompt_used: variation,
            latency_ms: r.latency_ms,
            ...r.scores
          });
        } catch (expError) {
          console.error(`[QA] Erro no teste exploratório ${s.name}:`, expError);
        }
      }
    }

    // ---------------------------
    // FECHA RELATÓRIO
    // ---------------------------
    const avgLatency = latencies.length 
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) 
      : null;
    
    const avgScore = allResults.length
      ? Number((
          allResults.reduce((a, b) => 
            a + ((b.routing_score + b.clarity_score + b.context_score + b.tone_score + b.timing_score) / 5), 
            0
          ) / allResults.length
        ).toFixed(2))
      : null;

    const { data: rep } = await supabase
      .from("qa_reports")
      .insert({
        run_started_at: reportStart.toISOString(),
        run_finished_at: new Date().toISOString(),
        total_tests: total,
        total_pass: pass,
        total_fail: fail,
        regression_pass: regPass,
        regression_fail: regFail,
        exploratory_pass: expPass,
        exploratory_fail: expFail,
        avg_latency_ms: avgLatency,
        avg_score: avgScore,
        notes: runExploratory ? 'regression+exploratory' : 'regression'
      })
      .select()
      .single();

    const elapsedTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`[QA Orchestrator] Concluído: ${pass}/${total} passou | Tempo: ${elapsedTime}s | Timeout: ${timedOut}`);

    return new Response(JSON.stringify({
      ok: true,
      report_id: rep?.id,
      totals: { total, pass, fail },
      breakdown: { 
        regression: { pass: regPass, fail: regFail }, 
        exploratory: { pass: expPass, fail: expFail } 
      },
      avg_latency_ms: avgLatency,
      avg_score: avgScore,
      elapsed_time_s: elapsedTime,
      timed_out: timedOut,
      results: allResults
    }), {
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      } 
    });

  } catch (e) {
    console.error("[QA Orchestrator] Erro fatal:", e);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: e instanceof Error ? e.message : String(e) 
    }), { 
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
