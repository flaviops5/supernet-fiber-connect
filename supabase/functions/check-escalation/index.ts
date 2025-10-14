import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://deno.land/x/zod/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// -------- utils --------
const log = (level: "info" | "warn" | "error", msg: string, meta: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ ts: new Date().toISOString(), fn: "check-escalation", level, msg, ...meta }));

const normalize = (text: string) =>
  (text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")     // remove acentos
    .replace(/[^\w\s]/g, " ")            // remove pontuação/emoji
    .replace(/\s+/g, " ")                // espaços múltiplos
    .trim()
    .toLowerCase();

const BodySchema = z.object({
  conversation_id: z.string().uuid(),
  message_content: z.string().min(1),
  current_department: z.string().min(1),
});

// retry helper
async function withRetry<T>(fn: () => Promise<T>, tries = 3, baseDelayMs = 300): Promise<T> {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, i))); // 300, 600, 1200
    }
  }
  throw lastErr;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const raw = await req.json().catch(() => null);
    const body = BodySchema.safeParse(raw);
    if (!body.success) {
      log("warn", "invalid_body", { issues: body.error.format() });
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conversation_id, message_content, current_department } = body.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    // ⚠️ Use a ANON KEY aqui! A RLS vai proteger as tabelas.
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, { 
      global: { 
        headers: { 
          Authorization: req.headers.get("Authorization") ?? "" 
        } 
      } 
    });

    // carrega settings + regras em paralelo
    const [settingsRes, rulesRes] = await Promise.all([
      supabase.from("escalation_settings").select("*").single(),
      supabase
        .from("escalation_rules")
        .select("*")
        .eq("from_department", current_department)
        .eq("enabled", true)
        .order("priority", { ascending: true }),
    ]);

    if (settingsRes.error) { log("error", "settings_error", { error: settingsRes.error }); }
    if (rulesRes.error) { log("error", "rules_error", { error: rulesRes.error }); }

    const settings = settingsRes.data;
    const rules = rulesRes.data ?? [];

    if (!settings?.enabled) {
      return new Response(JSON.stringify({ should_escalate: false, reason: "Escalation disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (rules.length === 0) {
      return new Response(JSON.stringify({ should_escalate: false, reason: "No rules found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const msgNorm = normalize(message_content);

    for (const rule of rules as Array<{
      id: string; from_department: string; to_department: string; priority: number;
      conditions: { keywords?: string[] } | null; enabled: boolean;
    }>) {
      const keywords = rule.conditions?.keywords ?? [];
      const match = keywords.some(k => msgNorm.includes(normalize(k)));
      if (!match) continue;

      // idempotência: evita múltiplas escalas da mesma conversa em curtíssimo prazo
      const idempo = await supabase
        .from("escalation_history")
        .select("id, created_at")
        .eq("conversation_id", conversation_id)
        .eq("to_department", rule.to_department)
        .gt("created_at", new Date(Date.now() - 60_000).toISOString()) // 60s
        .limit(1);
      if (idempo.data && idempo.data.length > 0) {
        log("info", "skip_idempotent", { conversation_id, to_department: rule.to_department });
        continue;
      }

      // tenta buscar agentes disponíveis com retry
      const availableAgents = await withRetry(async () => {
        const { data, error } = await supabase.rpc("get_available_agents_for_department", {
          dept: rule.to_department, include_universal: true,
        });
        if (error) throw error;
        return data as Array<{ user_id: string }>;
      }, 3, 300);

      if (!availableAgents || availableAgents.length === 0) {
        log("warn", "no_agents_available", { to_department: rule.to_department });
        continue;
      }

      const target = availableAgents[0];

      // registra escalonamento (RLS/RPC deve proteger)
      const ins = await supabase.from("escalation_history").insert({
        conversation_id,
        from_department: current_department,
        to_department: rule.to_department,
        to_agent_id: target.user_id,
        rule_id: rule.id,
        escalation_type: settings.mode,
        reason: `keywords:${(keywords || []).join(",")}`,
        customer_notified: settings.mode === "explicit",
      }).select("id").single();

      if (ins.error) {
        log("error", "insert_history_error", { error: ins.error, conversation_id });
        continue;
      }

      return new Response(JSON.stringify({
        should_escalate: true,
        escalation_mode: settings.mode,
        target_department: rule.to_department,
        target_agent_id: target.user_id,
        rule_id: rule.id,
        matched_keywords: keywords.filter(k => msgNorm.includes(normalize(k))),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ should_escalate: false, reason: "No matching rules" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log("error", "unexpected_error", { error: String(error) });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});