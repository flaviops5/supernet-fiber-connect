// >>> PR31 – test-runner (funcional + latência) v2 – 10/10
// P2 Security Fix: RBAC + Sanitized Results
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TestCase = { 
  name: string; 
  payload: Record<string, unknown>; 
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
  },
  { 
    name: "Scenario E – Interação Atípica", 
    payload: { message: "Quero cancelar", testHarness: true }, 
    targetFn: "support-tech-agent",
    expectedScenario: "E"
  }
];

async function runCase(supabase: SupabaseClient, tc: TestCase) {
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
      usedRefactored: data?.usedRefactored || false,
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

    // RBAC: Admin-only access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn('⚠️ Unauthorized access attempt - no auth header');
      return new Response(
        JSON.stringify({ ok: false, error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.warn('⚠️ Invalid authentication token');
      return new Response(
        JSON.stringify({ ok: false, error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const { data: hasAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasAdmin) {
      console.warn(`⚠️ Unauthorized access attempt by user ${user.id}`);
      return new Response(
        JSON.stringify({ ok: false, error: 'Acesso negado: apenas administradores' }),
        { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

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
    const refactoredCount = results.filter(r => r.usedRefactored).length;
    
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
    console.log(`🔄 Cenários refatorados: ${refactoredCount}/${CASES.length}`);

    // Sanitized response - remove detailed error messages and payloads
    const sanitizedResults = results.map(r => ({
      case: r.case,
      ok: r.ok,
      ms: r.ms,
      match: r.match,
      scenario: r.scenario,
      expected: r.expected
      // Removed: error details, payloads, internal data
    }));

    return new Response(
      JSON.stringify({ 
        ok: true, 
        avg_ms: Math.round(avg), 
        passed,
        total: CASES.length,
        refactoredPercentage: Math.round((refactoredCount / CASES.length) * 100),
        severity,
        results: sanitizedResults 
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
