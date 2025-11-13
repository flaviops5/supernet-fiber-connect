// >>> PR31 – stress-runner (carga controlada) v2 – 10/10
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // 🔒 RBAC: Apenas administradores podem executar stress tests
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.warn('Stress test attempted without authentication');
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.warn('Stress test attempted with invalid token');
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar role de admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!userRole) {
      console.warn('Stress test attempted by non-admin user', user.id);
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json().catch(() => ({}));
    const sessions = Math.min(body.sessions || 20, 50); // Limite seguro: máx 50

    console.log(`🔥 Stress test: ${sessions} sessões simultâneas (Admin: ${user.id})`);

    const tasks: Promise<any>[] = [];
    const start = performance.now();

    // Dispara todas as sessões em paralelo
    for (let i = 0; i < sessions; i++) {
      tasks.push(
        supabase.functions.invoke("support-tech-agent", {
          body: { 
            testHarness: true, 
            tx: -2, 
            rx: -27, 
            seed: i 
          }
        })
      );
    }

    const settled = await Promise.allSettled(tasks);
    const ms = performance.now() - start;

    const ok = settled.filter(s => s.status === "fulfilled").length;
    const fail = sessions - ok;
    const avgPerSession = Math.round(ms / sessions);

    console.log(`📊 Resultado: ${ok}✅ ${fail}❌ | Total: ${Math.round(ms)}ms | Média/sessão: ${avgPerSession}ms`);

    // Alertas: avg > 5s por sessão OU taxa de falha > 10%
    let severity = "info";
    const failRate = fail / sessions;
    
    if (avgPerSession > 5000 || failRate > 0.1) {
      severity = "error";
    } else if (avgPerSession > 3000 || failRate > 0.05) {
      severity = "warning";
    }

    if (severity !== "info") {
      EdgeRuntime.waitUntil(
        supabase.from("registros_de_monitoramento").insert({
          fluxo: "stress-runner",
          acao: "stress_alert",
          detalhes: { 
            total_sessions: sessions, 
            total_ms: Math.round(ms),
            avg_per_session_ms: avgPerSession,
            ok, 
            fail,
            fail_rate: Math.round(failRate * 100),
            severity
          }
        })
      );
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        sessions, 
        success: ok, 
        failed: fail,
        fail_rate_percent: Math.round(failRate * 100),
        total_ms: Math.round(ms),
        avg_per_session_ms: avgPerSession,
        severity
      }), 
      { headers: { ...corsHeaders, "content-type": "application/json" } }
    );

  } catch (e) {
    console.error("❌ Erro stress-runner:", e);
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
