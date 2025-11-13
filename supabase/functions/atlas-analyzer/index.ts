// =====================================================================
// 🧠 atlas-analyzer v2.0 — Production Ready
// - Thresholds dinâmicos via atlas_config
// - Deduplicação (15min)
// - Agrupamento inteligente (PON/CTO/REGIÃO)
// - Tendência (últimos 3 insights)
// - Integração IXC (clientes offline)
// - Notificação WhatsApp em HIGH
// - Structured logging (não bloqueante)
// =====================================================================
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";
import { createLogger } from "../_shared/structured-logger.ts";
import { callIxcWithRetry } from "../_shared/ixc-client.ts";

// --------------------------- Utils ------------------------------------
type Severity = "LOW" | "MEDIUM" | "HIGH";
type Cause =
  | "power_outage"
  | "bgp"
  | "backbone_break"
  | "integration_instability"
  | "unknown";

const WINDOW_DEDUP_MINUTES = 15;

function asNumber(n: unknown, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function calcTrend(last3: Array<{ kpis?: any }>): "worsening" | "stable" | "improving" {
  if (!last3 || last3.length < 2) return "stable";
  const series = last3
    .map((x) => asNumber(x?.kpis?.errors_per_min, 0))
    .filter((x) => Number.isFinite(x));
  if (series.length < 2) return "stable";
  const diffs = series.slice(1).map((v, i) => v - series[i]);
  const avgDiff =
    diffs.reduce((a, b) => a + b, 0) / (diffs.length || 1);
  if (avgDiff > 0.5) return "worsening";
  if (avgDiff < -0.5) return "improving";
  return "stable";
}

// Agrupa eventos por prioridade: PON > CTO > REGION
function groupKeysFromOutages(events: any[]): string[] {
  const map = new Map<string, number>();
  for (const e of events || []) {
    const md = e?.metadata || {};
    const pon = md.pon_port ? `PON:${md.pon_port}` : undefined;
    const cto = md.cto ? `CTO:${md.cto}` : undefined;
    const region = e?.region_pattern || (md.region ? `REGION:${md.region}` : undefined);
    const key = pon || cto || region || "UNKNOWN";
    map.set(key, (map.get(key) || 0) + 1);
  }
  // ordena por contagem desc
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}

// Causa provável com heurísticas multi-sinal
function inferCause(
  { dyingGaspHints, bgpHints, ixcTimeouts, evoTimeouts, criticalOutagesCount }: {
    dyingGaspHints: number;
    bgpHints: number;
    ixcTimeouts: number;
    evoTimeouts: number;
    criticalOutagesCount: number;
  }
): Cause {
  if (dyingGaspHints >= 2 || criticalOutagesCount > 0) return "power_outage";
  if (bgpHints > 0) return "bgp";
  if (criticalOutagesCount >= 2) return "backbone_break";
  if (ixcTimeouts + evoTimeouts >= 4) return "integration_instability";
  return "unknown";
}

// P0 FIX: Convertido para createAuthenticatedHandler
// Análise de atlas manipula dados críticos de infraestrutura
Deno.serve(createAuthenticatedHandler('atlas-analyzer', async (req, { supabase, user }) => {
  const logger = createLogger("atlas-analyzer-v2", req);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const EVOLUTION_INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME") || "SDR2";
  
  // IXC Proxy URL construído corretamente
  const IXC_PROXY_URL = `${SUPABASE_URL}/functions/v1/ixc-proxy`;

    // 1) Entrada
    const { windowMinutes = 90 } = await req.json().catch(() => ({}));
    const safeWindow = Math.max(15, Math.min(240, Number(windowMinutes)));
    const sinceIso = new Date(Date.now() - safeWindow * 60 * 1000).toISOString();

    logger.info("Analyzer start", { windowMinutes: safeWindow });

    // 2) Config dinâmica
    const { data: cfg } = await supabase
      .from("atlas_config")
      .select("thresholds")
      .maybeSingle();

    const thresholdsCfg = cfg?.thresholds?.errors_per_min || { LOW: 2, MEDIUM: 5, HIGH: 10 };
    const THRESH_LOW = asNumber(thresholdsCfg.LOW, 2);
    const THRESH_MED = asNumber(thresholdsCfg.MEDIUM, 5);
    const THRESH_HIGH = asNumber(thresholdsCfg.HIGH, 10);

    // 3) Coleta de dados
    const [{ data: logs, error: logsErr }, { data: outages, error: outErr }] = await Promise.all([
      supabase
        .from("monitoring_logs")
        .select("level,message,context,created_at")
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase
        .from("mass_outage_events")
        .select("*")
        .eq("status", "active")
        .order("detected_at", { ascending: false })
        .limit(500),
    ]);
    if (logsErr) throw logsErr;
    if (outErr) throw outErr;

    // 3.1) Correlação com IXC - usando endpoint correto
    let offlineCount = 0;
    try {
      const offline = await callIxcWithRetry(
        IXC_PROXY_URL,
        "POST",
        "/webservice/v1/radusuarios",
        {
          qtype: "radusuarios.online",
          query: "N",
          oper: "=",
          page: "1",
          rp: "500",
          sortname: "radusuarios.id",
          sortorder: "desc",
        }
      );
      const regs = offline?.data?.registros || [];
      offlineCount = Array.isArray(regs) ? regs.length : (regs ? Object.keys(regs).length : 0);
    } catch (ixcErr) {
      logger.warn("IXC offline lookup failed", { error: (ixcErr as Error).message });
    }

    const totalLogs = logs?.length || 0;
    const totalOutages = outages?.length || 0;

    // 4) Análises
    const errors = (logs || []).filter((l) => String(l.level).toUpperCase() === "ERROR").length;
    const warns = (logs || []).filter((l) => String(l.level).toUpperCase() === "WARN").length;
    const errorsPerMin = Number((errors / safeWindow).toFixed(2));

    const dyingGaspHints = (logs || []).filter((l) =>
      (l.message || "").toLowerCase().includes("dying gasp")
    ).length;
    const bgpHints = (logs || []).filter((l) =>
      /bgp.*(down|flap|unstable)/i.test(l.message || "")
    ).length;
    
    // Filtrar IXC timeouts excluindo mensagem conhecida de recurso indisponível
    const ixcTimeouts = (logs || []).filter((l) => {
      const msg = l.message || "";
      if (msg.includes("Recurso cliente_equipamento não está disponível")) return false;
      return /(ixc).*(timeout|5\d\d|unavailable)/i.test(msg);
    }).length;
    
    const evoTimeouts = (logs || []).filter((l) =>
      /(evolution|whatsapp).*(timeout|5\d\d|unavailable)/i.test(l.message || "")
    ).length;

    // eventos críticos (ex.: >=10 afetados)
    const criticalOutages = (outages || []).filter((e) => asNumber(e.affected_count, 0) >= 10);
    const groups = groupKeysFromOutages(criticalOutages);

    // 5) Severidade com thresholds dinâmicos
    let severity: Severity = "LOW";
    if (errorsPerMin >= THRESH_HIGH || criticalOutages.length >= 1) severity = "HIGH";
    else if (errorsPerMin >= THRESH_MED) severity = "MEDIUM";
    else severity = "LOW";

    // 6) Causa provável multi-sinal
    const probableCause: Cause = inferCause({
      dyingGaspHints,
      bgpHints,
      ixcTimeouts,
      evoTimeouts,
      criticalOutagesCount: criticalOutages.length,
    });

    // 7) Tendência (últimos 3 insights)
    const { data: last3 } = await supabase
      .from("atlas_insights")
      .select("kpis")
      .order("created_at", { ascending: false })
      .limit(3);

    const trend = calcTrend(last3 || []);

    // 8) Deduplicação (15min same severity+cause)
    const dedupSince = new Date(Date.now() - WINDOW_DEDUP_MINUTES * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("atlas_insights")
      .select("id")
      .gte("created_at", dedupSince)
      .eq("severity", severity)
      .eq("probable_cause", probableCause)
      .limit(1)
      .maybeSingle();

    if (recent) {
      logger.info("Duplicate insight detected — skipping", { severity, probableCause });
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "duplicate_within_15min",
          severity,
          probableCause,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 9) Recomendação
    const recommendation = (() => {
      if (probableCause === "power_outage")
        return "Despachar equipe para checar energia nas CTOs/PONs afetadas; confirmar Dying Gasp e escopo em OLT.";
      if (probableCause === "bgp")
        return "Auditar sessões BGP na CCR1036; validar rotas, anúncios e failover; aplicar playbook de contingência.";
      if (probableCause === "backbone_break")
        return "Verificar backbone/rompimento físico; mapear rotas alternativas; acionar equipe de campo e provedores.";
      if (probableCause === "integration_instability")
        return "Checar saúde do IXC/Evolution (timeouts/5xx); elevar retentativas e monitoramento até normalizar.";
      return "Monitorar; sem causa dominante. Reavaliar se métricas subirem.";
    })();

    const kpis = {
      window_minutes: safeWindow,
      total_logs: totalLogs,
      warns,
      errors,
      errors_per_min: errorsPerMin,
      active_events: totalOutages,
      critical_outages: criticalOutages.length,
      dying_gasp_hints: dyingGaspHints,
      ixc_timeouts: ixcTimeouts,
      evo_timeouts: evoTimeouts,
      ixc_offline_count: offlineCount,
      trend,
    };

    // 10) Persistência
    const insertData = {
      timeframe_minutes: safeWindow,
      severity,
      probable_cause: probableCause,
      kpis,
      groups,
      recommendation,
      notifications: [],
    };

    const { data: inserted, error: insErr } = await supabase
      .from("atlas_insights")
      .insert([insertData])
      .select()
      .single();
    if (insErr) throw insErr;

    // 11) Notificação em HIGH
    let notified = false;
    const notificationDetails: Array<{ type: string; message: string; data?: unknown }> = [];
    
    if (severity === "HIGH") {
      // buscar responsáveis
      const { data: resp } = await supabase
        .from("responsaveis_alerta")
        .select("nome,telefone,funcao")
        .eq("ativo", true)
        .eq("tipo_evento", "mass_outage");

      const msg = `🚨 Atlas: Severidade ALTA
Causa provável: ${probableCause}
Erros/min: ${errorsPerMin}
Eventos ativos: ${totalOutages}
Grupos: ${groups.slice(0, 5).join(", ") || "—"}
IXC offline (amostra): ${offlineCount}
Ação: ${recommendation}`;

      const tasks = (resp || []).map(async (r) => {
        try {
          const { data, error } = await supabase.functions.invoke("send-whatsapp-message", {
            body: { 
              phone: r.telefone, 
              message: msg, 
              instanceName: EVOLUTION_INSTANCE_NAME 
            },
          });
          
          if (error) throw error;
          
          notificationDetails.push({
            recipient: r.nome,
            phone: r.telefone,
            status: "sent",
          });
          return true;
        } catch (err) {
          notificationDetails.push({
            recipient: r.nome,
            phone: r.telefone,
            status: "failed",
            error: (err as Error).message,
          });
          return false;
        }
      });
      
      const results = await Promise.allSettled(tasks);
      notified = results.some((r) => r.status === "fulfilled" && r.value === true);

      // anexa ao insight
      await supabase
        .from("atlas_insights")
        .update({
          notifications: [{
            type: "whatsapp",
            sent_at: new Date().toISOString(),
            recipients: notificationDetails,
            overall_status: notified ? "partial_success" : "failed",
          }],
        })
        .eq("id", inserted.id);
    }

  logger.info("Insight created", {
    id: inserted.id,
    severity,
    probableCause,
    groups: groups.slice(0, 5),
    notified,
    notificationsSent: notificationDetails.length,
  });

  return {
    success: true,
    insight_id: inserted.id,
    severity,
    probable_cause: probableCause,
    kpis,
    groups,
    notified,
    notification_details: notificationDetails,
  };
}));
