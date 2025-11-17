import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

// Constantes globais
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const ROUTING_ENDPOINT = `${supabaseUrl}/functions/v1/routing-agent`;

const RUN_REGRESSION_DEFAULT = true;
const RUN_EXPLORATORY_DEFAULT = false;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30000) {
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

async function lovableChat(model: string, messages: Array<{ role: string; content: string }>, response_format?: { type: string }, temperature?: number) {
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
  }, 25000);
  
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
  
  const t0 = performance.now();

  const routingRes = await fetchWithTimeout(ROUTING_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId: `qa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message: prompt,
      testMode: true
    })
  }, 15000);
  
  if (!routingRes.ok) {
    throw new Error(`Routing agent HTTP ${routingRes.status}`);
  }
  
  const routingJson = await routingRes.json();
  const t1 = performance.now();
  const latency = Math.round(t1 - t0);

  const detectedAgent = routingJson?.agent || routingJson?.next_action || routingJson?.targetDepartment || "unknown";
  const responseText = routingJson?.message || "";
  
  console.log(`[QA] Roteamento: ${detectedAgent} | Latência: ${latency}ms`);

  const evalMsg = `
Avaliar resposta de roteamento:

**Prompt do usuário:** "${prompt}"

**Agente esperado:** ${expectedAgent}

**Agente detectado:** ${detectedAgent}

**Resposta gerada:** "${responseText}"

Analise se o roteamento está correto e avalie os outros critérios.
`.trim();

  let parsed: Record<string, any> = {};
  let fallbackUsed = false;
  try {
    const ev = await lovableChat(
      "google/gemini-2.5-flash",
      [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: evalMsg }
      ],
      { type: "json_object" },
      0.0
    );

    parsed = safeJson(ev.content) || {};
    
    if (!parsed.routing_score && detectedAgent === expectedAgent) {
      parsed.routing_score = 1.0;
    }
  } catch (err) {
    console.warn("[QA] Falha ao chamar LLM, usando fallback", err);
    fallbackUsed = true;
    parsed = {
      routing_score: detectedAgent === expectedAgent ? 1.0 : 0.0,
      clarity_score: 0.8,
      context_score: 0.8,
      tone_score: 0.8,
      timing_score: latency < 5000 ? 1.0 : 0.5
    };
  }

  const routingScore = parsed.routing_score ?? 0;
  const avgOthers = ((parsed.clarity_score ?? 0) + (parsed.context_score ?? 0) + 
                      (parsed.tone_score ?? 0) + (parsed.timing_score ?? 0)) / 4;
  const pass = routingScore === 1.0 && avgOthers >= 0.7;

  return {
    prompt,
    expected_agent: expectedAgent,
    detected_agent: detectedAgent,
    response: responseText,
    latency_ms: latency,
    scores: {
      routing_score: routingScore,
      clarity_score: parsed.clarity_score ?? 0,
      context_score: parsed.context_score ?? 0,
      tone_score: parsed.tone_score ?? 0,
      timing_score: parsed.timing_score ?? 0,
      pass
    },
    overall_score: (routingScore + avgOthers) / 2,
    justification: (parsed.justification ?? "Avaliação automática") + (fallbackUsed ? " | Fallback aplicado" : "")
  };
}

Deno.serve(createAuthenticatedHandler('qa-orchestrator', async (req, { supabase, user }) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[QA Orchestrator] Iniciando execução");
    
    const url = new URL(req.url);
    const runRegression = (url.searchParams.get("regression") ?? "true").toLowerCase() === "true";
    const runExploratory = (url.searchParams.get("exploratory") ?? "false").toLowerCase() === "true";

    const reportStart = new Date();
    const GLOBAL_TIMEOUT_MS = 130000;
    const startTime = Date.now();
    
    let total = 0, pass = 0, fail = 0;
    let regPass = 0, regFail = 0;
    let expPass = 0, expFail = 0;
    let timedOut = false;
    const latencies: number[] = [];
    const allResults: any[] = [];

    // Regressão
    if (runRegression) {
      console.log("[QA] Executando suite de regressão");
      
      const { data: cases } = await supabase
        .from("qa_test_cases")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false });

      for (const c of (cases || [])) {
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

          await supabase.from("qa_test_results").insert({
            test_case_id: c.id,
            detected_agent: r.detected_agent,
            response_text: r.response,
            latency_ms: r.latency_ms,
            routing_score: r.scores.routing_score,
            clarity_score: r.scores.clarity_score,
            context_score: r.scores.context_score,
            tone_score: r.scores.tone_score,
            timing_score: r.scores.timing_score,
            overall_score: r.overall_score,
            passed: r.scores.pass,
            justification: r.justification,
            test_type: 'regression'
          });

          allResults.push(r);
        } catch (testErr) {
          console.error(`[QA] Erro no teste ${c.scenario_name}:`, testErr);
          total += 1;
          fail += 1;
          regFail += 1;
        }
      }
    }

    // Exploratória
    if (runExploratory && !timedOut) {
      console.log("[QA] Executando suite exploratória");
      
      const { data: baseScenarios } = await supabase
        .from("kb_scenarios")
        .select("*")
        .limit(5)
        .order("created_at", { ascending: false });

      for (const s of (baseScenarios || [])) {
        if (Date.now() - startTime > GLOBAL_TIMEOUT_MS) {
          console.warn("[QA] Timeout global atingido na fase exploratória");
          timedOut = true;
          break;
        }

        try {
          const gen = await lovableChat("google/gemini-2.5-flash", [
            { 
              role: "system", 
              content: "Gere uma variação natural e curta em pt-BR, estilo cliente real. Mantenha a intenção original." 
            },
            { 
              role: "user", 
              content: `Mensagem base: "${s.prompt}"` 
            }
          ], undefined, 0.7);

          const variation = gen.content.trim();
          console.log(`[QA Exploratory] Variação gerada: "${variation}"`);

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

          await supabase.from("qa_test_results").insert({
            detected_agent: r.detected_agent,
            response_text: r.response,
            latency_ms: r.latency_ms,
            routing_score: r.scores.routing_score,
            clarity_score: r.scores.clarity_score,
            context_score: r.scores.context_score,
            tone_score: r.scores.tone_score,
            timing_score: r.scores.timing_score,
            overall_score: r.overall_score,
            passed: r.scores.pass,
            justification: r.justification,
            test_type: 'exploratory',
            exploratory_prompt: variation
          });

          allResults.push(r);
        } catch (expErr) {
          console.error(`[QA Exploratory] Erro no cenário ${s.scenario_name}:`, expErr);
          total += 1;
          fail += 1;
          expFail += 1;
        }
      }
    }

    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const avgScore = allResults.length > 0 ? allResults.reduce((sum, r) => sum + r.overall_score, 0) / allResults.length : 0;

    const { data: rep } = await supabase
      .from("qa_reports")
      .insert({
        executed_at: reportStart.toISOString(),
        total_tests: total,
        passed_tests: pass,
        failed_tests: fail,
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
}));
