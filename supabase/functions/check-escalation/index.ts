import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";
import { createLogger } from "../_shared/logger.ts";
import { z } from "https://deno.land/x/zod/mod.ts";

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
      await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

Deno.serve(createAuthenticatedHandler(
  'check-escalation',
  async (req, { supabase, user }) => {
    const logger = createLogger('check-escalation', req);
    const raw = await req.json().catch(() => null);
    const body = BodySchema.safeParse(raw);
    if (!body.success) {
      logger.warn('invalid_body', { issues: body.error.format() });
      throw new Error("Invalid request body");
    }

    const { conversation_id, message_content, current_department } = body.data;

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

    if (settingsRes.error) { 
      logger.error('settings_error', new Error(settingsRes.error.message), { error: settingsRes.error }); 
    }
    if (rulesRes.error) { 
      logger.error('rules_error', new Error(rulesRes.error.message), { error: rulesRes.error }); 
    }

    const settings = settingsRes.data;
    const rules = rulesRes.data ?? [];

    if (!settings?.enabled) {
      return { should_escalate: false, reason: "Escalation disabled" };
    }
    if (rules.length === 0) {
      return { should_escalate: false, reason: "No rules found" };
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
        logger.info('skip_idempotent', { conversation_id, to_department: rule.to_department });
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
        logger.warn('no_agents_available', { to_department: rule.to_department });
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
        logger.error('insert_history_error', new Error(ins.error.message), { 
          error: ins.error, 
          conversation_id 
        });
        continue;
      }

      return {
        should_escalate: true,
        escalation_mode: settings.mode,
        target_department: rule.to_department,
        target_agent_id: target.user_id,
        rule_id: rule.id,
        matched_keywords: keywords.filter(k => msgNorm.includes(normalize(k))),
      };
    }

    return { should_escalate: false, reason: "No matching rules" };
  }
));