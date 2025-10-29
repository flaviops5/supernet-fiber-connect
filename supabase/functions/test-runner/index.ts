// >>> PR31 – test-runner (funcional + latência) v2 – 10/10
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TestCase = { 
  name: string; 
  payload: any; 
  targetFn: string;
  expectedScenario?: string;
};

const CASES: TestCase[] = [
  { 
    name: "Scenario A – TX/RX zero", 
    payload: { tx: 0, rx: 0, testHarness: true }, 
    targetFn: "support-tech-agent",
    expectedScenario: "A"
  },
  { 
    name: "Scenario B – Bom & Travado", 
    payload: { tx: 0.5, rx: -20, testHarness: true }, 
    targetFn: "support-tech-agent",
    expectedScenario: "B"
  },
  { 
    name: "Scenario C – Fraco", 
    payload: { tx: -2, rx: -27, testHarness: true }, 
    targetFn: "support-tech-agent",
    expectedScenario: "C"
  },
  { 
    name: "Scenario D – RX Crítico", 
    payload: { tx: -5, rx: -31, testHarness: true }, 
    targetFn: "support-tech-agent",
    expectedScenario: "D"
  }
];

async function runCase(supabase: any, tc: TestCase) {
  const start = performance.now();
  
  try {
    const { data, error } = await supabase.functions.invoke(tc.targetFn, {
      body: tc.payload
    });
    
    const ms = performance.now() - start;
    
    return { 
      ok: !error, 
      ms: Math.round(ms), 
      scenario: data?.scenario || "unknown",
      expected: tc.expectedScenario,
      match: data?.scenario === tc.expectedScenario,
      error: error?.message 
    };
  } catch (e) {
    const ms = performance.now() - start;
    return { 
      ok: false, 
      ms: Math.round(ms), 
      error: String(e),
      match: false
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    console.log("🧪 Iniciando test-runner...");

    const results = [];
    for (const c of CASES) {
      console.log(`  → Testando: ${c.name}`);
      const r = await runCase(supabase, c);
      results.push({ case: c.name, ...r });
      console.log(`    ${r.ok ? '✅' : '❌'} ${r.ms}ms ${r.match ? '(match)' : '(mismatch)'}`);
    }

    const avg = results.reduce((a, r) => a + r.ms, 0) / results.length;
    const passed = results.filter(r => r.ok && r.match).length;
    
    // Alertas progressivos
    let severity = "info";
    if (avg > 5000) severity = "error";      // > 5s = crítico
    else if (avg > 3000) severity = "warning"; // > 3s = alerta
    
    if (avg > 3000) {
      EdgeRuntime.waitUntil(
        supabase.from("registros_de_monitoramento").insert({
          fluxo: "test-runner",
          acao: "latency_alert",
          detalhes: { 
            avg_ms: Math.round(avg), 
            threshold_3s: 3000,
            threshold_5s: 5000,
            severity,
            passed,
            total: CASES.length
          }
        })
      );
    }

    console.log(`📊 Média: ${Math.round(avg)}ms | Aprovados: ${passed}/${CASES.length}`);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        avg_ms: Math.round(avg), 
        passed,
        total: CASES.length,
        severity,
        results 
      }), 
      { headers: { ...corsHeaders, "content-type": "application/json" } }
    );

  } catch (e) {
    console.error("❌ Erro test-runner:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, "content-type": "application/json" } 
      }
    );
  }
});
// <<< PR31
