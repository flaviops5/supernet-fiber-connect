import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/structured-logger.ts";
import { massOutageContext } from "../_shared/mass-outage-helper.ts";
import { handleEdgeFunctionError, corsHeaders, StandardError } from "../_shared/error-handler.ts";
import { hybridInterpret, normalizeText, detectFrustration, detectMood } from "../_shared/ai-response-interpreter.ts";
import { textReply, jsonReply, textReplyWithContext } from "../_shared/replies.ts";
import { updateFlowState } from "../_shared/flow-state.ts";
import { getApprovedScenarioReply } from "../_shared/get-approved-variation.ts";
import { logAudit } from "../_shared/audit-logger.ts";
import { kpiLog } from "../_shared/kpi.ts";
// >>> PR10A - Geolocalização
import { ensureGeo, withGeo } from "../_shared/geo.ts";
// <<< PR10A
// >>> PR26 - Scenario E: WAN/Wi-Fi diagnostics
import { isOpticalGood, isLikelyWanDown, isLikelyWifiIssue } from "../_shared/wan-diagnostics.ts";
// <<< PR26
// >>> PR19 - Aging + ONU + Retests
import { markAgingEvent } from "../_shared/aging.ts";
import { trackOnuSnapshot } from "../_shared/onu-tracker.ts";
import { logRetest } from "../_shared/retests.ts";
// <<< PR19
// >>> FLOW-MANAGER: Sistema dinâmico de flows do banco de dados
import { getStepMessage, getScenarioConfig } from "../_shared/flow-adapter.ts";
// <<< FLOW-MANAGER

// >>> REFACTORED SCENARIOS - Modular architecture
import type { ScenarioContext, ScenarioResult, ScenarioType } from "./types/scenario-context.ts";
import { detectScenario, shouldUseRefactoredScenario } from "./detection/scenario-detector.ts";
import { handleScenarioA } from "./scenarios/scenario-a.ts";
import { handleScenarioB } from "./scenarios/scenario-b.ts";
import { handleScenarioC } from "./scenarios/scenario-c.ts";
import { handleScenarioD } from "./scenarios/scenario-d.ts";
import { handleScenarioE } from "./scenarios/scenario-e.ts";
import { 
  buildScenarioContext, 
  adaptScenarioResult, 
  validateInlineContext,
  type InlineContextData 
} from "./adapters/context-adapter.ts";
// <<< REFACTORED SCENARIOS

// Cache de simulações aprovadas (5 minutos - reduzido para refletir mudanças mais rápido)
const simulationCache = new Map<string, { data: any, timestamp: number }>();

/**
 * Buscar exemplos de simulações aprovadas para incluir no contexto
 * Retorna array de mensagens aprovadas para usar no fluxo
 */
async function getApprovedSimulations(supabase: any, subject: string): Promise<any[]> {
  const cacheKey = `approved_simulations_${subject}`;
  const cached = simulationCache.get(cacheKey);
  
  if (
    cached &&
    Date.now() - cached.timestamp < 5 * 60 * 1000 &&
    Array.isArray(cached.data) && cached.data.length > 0
  ) {
    return cached.data;
  }
  
  const { data: approvals, error } = await supabase
    .from('agent_flow_scenario_approvals')
    .select('scenario_key, variation_path, approved_messages, updated_at')
    .eq('agent_type', 'support-tech-agent')
    .eq('subject_key', subject)
    .eq('status', 'approved')
    .not('approved_messages', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1);
  
  let messages: any[] = [];
  if (!error && approvals && approvals.length > 0) {
    messages = approvals[0].approved_messages || [];
  }
  
  // Fallback inteligente: se não houver mensagens aprovadas, usar perguntas dos steps ativos do assunto
  if (!messages || messages.length === 0) {
    const { data: steps, error: stepsError } = await supabase
      .from('agent_flow_steps')
      .select('step_key, question')
      .eq('agent_type', 'support-tech-agent')
      .eq('subject_key', subject)
      .eq('is_active', true);
    
    if (!stepsError && steps && steps.length > 0) {
      messages = steps
        .filter((s: any) => s.step_key && s.question)
        .map((s: any) => ({ step_key: s.step_key, question: s.question }));
    }
  }
  
  simulationCache.set(cacheKey, {
    data: messages,
    timestamp: Date.now()
  });
  
  return messages;
}

// Evita salvar mensagens duplicadas do agente (ex.: mesma resposta em milissegundos)
async function insertAgentMessageOnce(supabase: any, conversation_id: string, content: string) {
  try {
    if (!content || !conversation_id) return { skipped: true };

    const { data: last } = await supabase
      .from('conversation_messages')
      .select('id, content, created_at, sender_name, sender_type')
      .eq('conversation_id', conversation_id)
      .eq('sender_type', 'agent')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = Date.now();
    if (last && last.sender_name === 'Luan Silva' && last.content === content) {
      const diff = now - new Date(last.created_at).getTime();
      if (diff < 5000) {
        logger.warn('Duplicate agent message detected, skipping', { conversation_id });
        return { skipped: true };
      }
    }

    return await supabase.from('conversation_messages').insert({
      conversation_id,
      sender_type: 'agent',
      sender_name: 'Luan Silva',
      content,
      ai_suggestion: false
    });
  } catch (e) {
    logger.error('insertAgentMessageOnce error', { error: e });
    return await supabase.from('conversation_messages').insert({
      conversation_id,
      sender_type: 'agent',
      sender_name: 'Luan Silva',
      content,
      ai_suggestion: false
    });
  }
}

/**
 * C0: Detectar sinal fraco baseado em TX/RX
 */
function isWeakFromTxRx(tx?: number | null, rx?: number | null): boolean {
  // RX fraco típico entre ~ -27 e -30 dBm
  if (typeof rx === "number" && rx <= -27 && rx > -32) return true;
  return false;
}

/**
 * Sanitizar TODAS as menções incorretas de PON piscando
 */
function sanitizeRedLightQuestion(text: string): string {
  if (!text) return text;
  let out = text;

  // Remover TODAS as referências a "PON piscando" ou "LOS ou PON piscando"
  out = out.replace(/\*\*LOS\*\*\s*(ou|\/)\s*\*\*PON\*\*/gi, '**LOS (vermelha)**');
  out = out.replace(/luz\s+\*\*PON\*\*\s*(ou|\/)\s*\*\*LOS\*\*/gi, 'luz **LOS (vermelha)**');
  out = out.replace(/\*\*PISCANDO\*\*\s*\(não fixa\)/gi, '**PISCANDO** (intermitente)');
  
  // Garantir que sempre mencione que PON é verde
  if (!/PON.*verde/i.test(out)) {
    out = out.replace(/Está piscando\?/, 'Você está vendo a **luz LOS** piscando? 🔴\n\nObs.: a **luz PON** normalmente é **VERDE** (fixa ou piscando).');
  }

  return out;
}

/**
 * Buscar a pergunta aprovada para um step específico
 */
function getApprovedQuestionForStep(approvedMessages: any[], stepKey: string): string | null {
  if (!approvedMessages || approvedMessages.length === 0) return null;
  
  const message = approvedMessages.find((msg: any) => msg.step_key === stepKey);
  let question: string | null = message?.question || null;
  
  // SEMPRE sanitizar cenario_a_verificar_luz_vermelha
  if (question && stepKey === 'cenario_a_verificar_luz_vermelha') {
    question = sanitizeRedLightQuestion(question);
  }
  
  return question;
}

// >>> PR7: helpers do Cenário B
async function logB(supabaseClient: any, conversation_id: string, acao: string, detalhes: Record<string, any> = {}) {
  await supabaseClient.from("registros_de_monitoramento").insert({
    fluxo: "support-tech",
    acao,
    conversation_id,
    detalhes
  });
}

async function setWaitingStep(supabaseClient: any, conversationId: string, meta: any, step: string, extra: Record<string, any> = {}) {
  await supabaseClient
    .from("conversations")
    .update({
      metadata: {
        ...(meta || {}),
        flow_state: {
          ...((meta?.flow_state) || {}),
          ...extra,
          waiting_step: step
        }
      }
    })
    .eq("id", conversationId);
}

async function safeTestConnectivity(supabaseClient: any, ixcId: string) {
  // 1ª tentativa: API refatorada (ixc_client_id)
  let conn = await supabaseClient.functions.invoke("test-equipment-connectivity", {
    body: { ixc_client_id: ixcId, timeout: 5000 }
  });

  // Fallback: busca IP no IXC e testa por IP
  if (conn?.error || conn?.data?.ok === undefined) {
    const rad = await supabaseClient.functions.invoke("ixc-integration", {
      body: { action: "radusuario_ip", id_cliente: ixcId }
    });
    const ip = rad?.data?.ip || rad?.data?.framedipaddress;
    if (ip) {
      conn = await supabaseClient.functions.invoke("test-equipment-connectivity", {
        body: { ip, timeout: 5000 }
      });
    }
  }
  return conn;
}

/**
 * PR#17 - Diagnósticos paralelos com timeout e error handling
 * Executa signal check e connectivity test simultaneamente
 */
async function runParallelDiagnostics(
  ixc_client_id: string,
  conversation_id: string,
  supabase: any,
  logger: any
): Promise<{
  signalResult: PromiseSettledResult<any>;
  connectivityResult: PromiseSettledResult<any>;
  elapsed: number;
}> {
  const start = Date.now();
  
  // Helper: adiciona timeout a uma promise
  const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout: ${label} (${ms}ms)`)), ms)
      )
    ]);
  };

  logger.info("🔄 PR#17: Iniciando diagnósticos paralelos", { ixc_client_id });

  // Executar ambos em paralelo com timeouts independentes
  const [signalResult, connectivityResult] = await Promise.allSettled([
    withTimeout(
      supabase.functions.invoke("ixc-onu-signal", {
        body: { ixc_client_id }
      }),
      8000, // 8s para signal (IXC pode ser lento)
      "ixc-onu-signal"
    ),
    withTimeout(
      supabase.functions.invoke("test-equipment-connectivity", {
        body: { ixc_client_id, timeout: 5000 }
      }),
      6000, // 6s para connectivity (já tem timeout interno de 5s)
      "test-equipment-connectivity"
    )
  ]);

  const elapsed = Date.now() - start;

  // Log detalhado para auditoria
  await logAudit({
    acao: "parallel_diag_finished",
    fluxo: "support-tech",
    conversation_id,
    detalhes: {
      elapsed_ms: elapsed,
      signal_status: signalResult.status,
      signal_ok: signalResult.status === "fulfilled",
      signal_error: signalResult.status === "rejected" 
        ? (signalResult.reason?.message || String(signalResult.reason))
        : null,
      connectivity_status: connectivityResult.status,
      connectivity_ok: connectivityResult.status === "fulfilled",
      connectivity_error: connectivityResult.status === "rejected"
        ? (connectivityResult.reason?.message || String(connectivityResult.reason))
        : null
    },
    supabaseClient: supabase
  });

  logger.info("✅ PR#17: Diagnósticos paralelos concluídos", {
    elapsed,
    signal_ok: signalResult.status === "fulfilled",
    connectivity_ok: connectivityResult.status === "fulfilled"
  });

  return { signalResult, connectivityResult, elapsed };
}

function isGoodSignal(signal?: any) {
  const rx = Number(signal?.rx);
  return Number.isFinite(rx) && rx > -24; // bom acima de -24 dBm
}

/**
 * GAP #2: Feature Flag - Verificar se fast-path está habilitado
 * Suporta rollout gradual baseado em hash do conversation_id
 */
async function isFastPathEnabled(supabase: any, conversation_id: string): Promise<boolean> {
  try {
    const { data: flag, error } = await supabase
      .from('feature_flags')
      .select('enabled, rollout_percentage')
      .eq('flag_key', 'pr17_fast_path')
      .single();

    if (error || !flag) return true; // Default: ativado se não encontrar flag

    if (!flag.enabled) return false;

    // Rollout gradual baseado em hash do conversation_id
    if (flag.rollout_percentage < 100) {
      const hash = conversation_id.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const percentage = Math.abs(hash) % 100;
      return percentage < flag.rollout_percentage;
    }

    return true;
  } catch (err) {
    // Em caso de erro, ativar por padrão (fail-open)
    return true;
  }
}

/**
 * GAP #5: Circuit Breaker - Proteção contra cascata de falhas
 */
class FastPathCircuitBreaker {
  private static instance: FastPathCircuitBreaker;
  private failures = 0;
  private threshold = 5; // 5 falhas consecutivas
  private resetTimeout = 300000; // 5 minutos
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private lastFailure: number | null = null;

  static getInstance(): FastPathCircuitBreaker {
    if (!FastPathCircuitBreaker.instance) {
      FastPathCircuitBreaker.instance = new FastPathCircuitBreaker();
    }
    return FastPathCircuitBreaker.instance;
  }

  async execute<T>(fn: () => Promise<T>, supabase: any, logger: any): Promise<T | null> {
    // Estado OPEN: não executar, retornar null imediatamente
    if (this.state === 'open') {
      if (this.lastFailure && Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
        logger.info('🔄 Circuit breaker: Tentando recuperação (half-open)');
      } else {
        logger.warn('⚠️ Circuit breaker: OPEN - fast-path desabilitado');
        return null;
      }
    }

    try {
      const result = await fn();
      
      // Sucesso: resetar contador
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
        logger.info('✅ Circuit breaker: Recuperado (closed)');
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();

      if (this.failures >= this.threshold) {
        this.state = 'open';
        
        // Notificar admins
        try {
          await supabase.from('system_alerts').insert({
            alert_type: 'fast_path_circuit_open',
            severity: 'high',
            message: `Fast-path desabilitado automaticamente após ${this.failures} falhas`,
            metadata: { error: String(error) }
          });
        } catch (alertError) {
          logger.error('Erro ao criar alerta de circuit breaker', alertError);
        }

        logger.error('🚨 Circuit breaker: OPEN - desabilitando fast-path', { 
          failures: this.failures 
        });
      }

      throw error;
    }
  }

  getState(): string {
    return this.state;
  }
}

/**
 * GAP #4: Edge Cases - Verificar estabilidade do sinal
 * Analisa últimas leituras para detectar RX instável
 */
async function hasStableSignal(supabase: any, ixc_client_id: string): Promise<boolean> {
  try {
    const { data: recentReadings } = await supabase
      .from('registros_de_monitoramento')
      .select('detalhes')
      .eq('acao', 'parallel_diag_finished')
      .order('created_at', { ascending: false })
      .limit(3);

    if (!recentReadings || recentReadings.length < 2) return true;

    const rxValues = recentReadings
      .map((r: any) => Number(r.detalhes?.signal_rx))
      .filter((v: number) => !isNaN(v));

    if (rxValues.length < 2) return true;

    // Calcular variância
    const mean = rxValues.reduce((a: number, b: number) => a + b, 0) / rxValues.length;
    const variance = Math.sqrt(
      rxValues.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / rxValues.length
    );

    return variance < 2; // Variação < 2 dBm = estável
  } catch (error) {
    // Em caso de erro, assumir estável
    return true;
  }
}

function isZeroSignal(signal?: any) {
  const rx = Number(signal?.rx);
  const tx = Number(signal?.tx);
  return (tx === 0 || tx === 0.0) && (rx === 0 || rx === 0.0);
}
// <<< PR7

/**
 * Detecção leve de intenção e humor via regex (sem dependências externas)
 */
function detectIntentAndMood(msg: string): { intent: string; mood: string } {
  const text = (msg || "").toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, ""); // remove acentos
  
  const intent =
    /^(ja (fiz|tentei)|fiz isso|reiniciei|reiniciei o roteador|ja reiniciei|ja desliguei|ja liguei|ja reconectei)/.test(text) ? "ja_fiz" :
    /(sim|ok|feito|pronto|consegui|deu certo)(!|\.)?$/.test(text) ? "confirmacao" :
    /(repete|nao entendi|como assim|pode explicar|poderia explicar|duvida)/.test(text) ? "duvida" :
    /(de novo isso|sempre isso|ja falei|nao aguento|absurdo|ridiculo|pessimo|horrivel|estou irritado|irritante)/.test(text) ? "repetir" :
    "";
  
  const mood =
    /(raiva|irritado|irritante|absurdo|ridiculo|pessimo|horrivel|nao aguento|isso de novo)/.test(text)
      ? "irritado" : "neutro";
  
  return { intent, mood };
}

/**
 * Opcional (para uso futuro): compõe mensagem reconhecendo esforço
 */
function withEffortAck(intent: string, base: string): string {
  return (intent === "ja_fiz" || intent === "confirmacao" || intent === "repetir")
    ? `Perfeito, já validou essa parte 👏 ${base}`
    : base;
}

/**
 * Busca e executa tools configuradas para um step/subject específico
 * @param supabase - Cliente Supabase
 * @param logger - Logger estruturado
 * @param stepKey - Chave do step atual (opcional)
 * @param subjectKey - Chave do subject (fallback se stepKey não fornecido)
 * @param context - Contexto com dados para executar tools (ixc_client_id, etc)
 * @returns Resultados das tools executadas
 */
async function executeConfiguredTools(
  supabase: any,
  logger: any,
  stepKey: string | null,
  subjectKey: string,
  context: {
    ixc_client_id?: string;
    customer_name?: string;
    ticket_subject?: string;
    ticket_description?: string;
    ticket_priority?: string;
  }
): Promise<{
  test_connectivity_result?: { is_online: boolean; tx_power?: number; rx_power?: number };
  ticket_created?: boolean;
  ticket_id?: string;
  errors?: string[];
}> {
  const results: Record<string, unknown> = {};
  const errors: string[] = [];

  try {
    // Buscar configuração do step (se fornecido)
    let toolsList: string[] = [];
    
    if (stepKey) {
      const { data: stepConfig } = await supabase
        .from('agent_flow_steps')
        .select('step_tools, subject_key')
        .eq('step_key', stepKey)
        .eq('agent_type', 'support-tech-agent')
        .maybeSingle();

      if (stepConfig?.step_tools && Array.isArray(stepConfig.step_tools)) {
        toolsList = stepConfig.step_tools;
        logger.info("Tools do step carregadas", { stepKey, tools: toolsList });
      } else if (stepConfig?.subject_key) {
        // Buscar default_tools do subject
        const { data: subjectConfig } = await supabase
          .from('agent_flow_subjects')
          .select('default_tools')
          .eq('subject_key', stepConfig.subject_key)
          .eq('agent_type', 'support-tech-agent')
          .maybeSingle();

        if (subjectConfig?.default_tools && Array.isArray(subjectConfig.default_tools)) {
          toolsList = subjectConfig.default_tools;
          logger.info("Tools do subject carregadas", { subjectKey: stepConfig.subject_key, tools: toolsList });
        }
      }
    }

    // Fallback: buscar por subjectKey direto se não tiver step ou tools
    if (toolsList.length === 0 && subjectKey) {
      const { data: subjectConfig } = await supabase
        .from('agent_flow_subjects')
        .select('default_tools')
        .eq('subject_key', subjectKey)
        .eq('agent_type', 'support-tech-agent')
        .maybeSingle();

      if (subjectConfig?.default_tools && Array.isArray(subjectConfig.default_tools)) {
        toolsList = subjectConfig.default_tools;
        logger.info("Tools do subject (fallback) carregadas", { subjectKey, tools: toolsList });
      }
    }

    // Se não há tools configuradas, retornar vazio (não é erro)
    if (toolsList.length === 0) {
      logger.info("Nenhuma tool configurada para este step/subject", { stepKey, subjectKey });
      return results;
    }

    // Executar tools configuradas
    for (const toolName of toolsList) {
      try {
        if (toolName === 'test-equipment-connectivity' && context.ixc_client_id) {
          logger.info("Executando tool: test-equipment-connectivity", { ixc_client_id: context.ixc_client_id });
          
          const response = await supabase.functions.invoke("test-equipment-connectivity", {
            body: { ixc_client_id: context.ixc_client_id }
          });

          if (response.data) {
            results.test_connectivity_result = response.data;
            logger.info("Tool test-equipment-connectivity executada", { result: response.data });
          } else if (response.error) {
            errors.push(`test-equipment-connectivity: ${response.error.message}`);
            logger.error("Erro ao executar test-equipment-connectivity", { error: response.error });
          }
        } 
        else if (toolName === 'criar_atendimento_ixc' && context.ixc_client_id) {
          logger.info("Executando tool: criar_atendimento_ixc", { 
            ixc_client_id: context.ixc_client_id,
            subject: context.ticket_subject 
          });

          const response = await supabase.functions.invoke("criar_atendimento_ixc", {
            body: {
              client_id: context.ixc_client_id,
              subject: context.ticket_subject || "Atendimento técnico",
              description: context.ticket_description || "Atendimento aberto automaticamente pelo sistema",
              priority: context.ticket_priority || "normal"
            }
          });

          if (response.data?.ticket_id) {
            results.ticket_created = true;
            results.ticket_id = response.data.ticket_id;
            logger.info("Tool criar_atendimento_ixc executada", { ticket_id: response.data.ticket_id });
          } else if (response.error) {
            errors.push(`criar_atendimento_ixc: ${response.error.message}`);
            logger.error("Erro ao executar criar_atendimento_ixc", { error: response.error });
          }
        }
        else {
          logger.warn("Tool não implementada ou contexto insuficiente", { 
            toolName, 
            hasIxcClientId: !!context.ixc_client_id 
          });
        }
      } catch (toolError) {
        const errorMsg = toolError instanceof Error ? toolError.message : String(toolError);
        errors.push(`${toolName}: ${errorMsg}`);
        logger.error(`Erro ao executar tool ${toolName}`, { error: errorMsg });
      }
    }

    if (errors.length > 0) {
      results.errors = errors;
    }

    return results;
  } catch (error) {
    logger.error("Erro ao buscar/executar tools configuradas", { 
      error: error instanceof Error ? error.message : String(error),
      stepKey,
      subjectKey
    });
    return { errors: [error instanceof Error ? error.message : String(error)] };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logger = createLogger("support-tech-agent", req);

  try {
    const body = await req.json();
    let { 
      conversation_id, 
      customer_cpf, 
      message, 
      attachments,
      ixc_client_id, 
      reboot_attempted, 
      reboot_result, 
      onu_signal,
      client_is_offline, 
      cpf_not_found,
      testHarness,
      tx,
      rx
    } = body;

    // Define lastUserMessage globalmente para uso em todo o handler
    const lastUserMessage = message || "";

    // >>> MODE TEST-RUNNER: Enhanced to test refactored scenarios
    let testModeScenario: string | null = null;
    const SKIP_DB_OPS = testHarness === true;
    
    if (testHarness === true) {
      logger.info("🧪 Test mode activated - SKIP_DB_OPS enabled", { tx, rx, message });
      
      // Criar IDs mock para evitar erros de NOT NULL constraints
      if (!conversation_id) {
        conversation_id = crypto.randomUUID();
        logger.info("🧪 Mock conversation_id created", { conversation_id });
      }
      if (!customer_cpf) {
        customer_cpf = `test-cpf-${Date.now()}`;
        logger.info("🧪 Mock customer_cpf created", { customer_cpf });
      }
      
      // Determine scenario based on tx/rx values OR message content
      let scenario = "unknown";
      let scenarioDescription = "";
      
      const txNum = Number(tx);
      const rxNum = Number(rx);
      
      // Prioridade 1: Detectar Cenário E baseado em mensagem
      const msgLower = (message || "").toLowerCase();
      const cancelKeywords = ["cancelar", "cancela", "desistir", "quero sair"];
      if (cancelKeywords.some(kw => msgLower.includes(kw))) {
        scenario = "E";
        scenarioDescription = "Atypical interaction - Customer wants to cancel or exit";
      }
      // Prioridade 2: Detectar cenários A-D baseados em sinal
      else if (txNum === 0 && rxNum === 0) {
        scenario = "A";
        scenarioDescription = "TX/RX zero - Equipment disconnected or powered off";
      } else if (rxNum > -24 && txNum > 0) {
        scenario = "B";
        scenarioDescription = "Good signal but equipment stuck - Needs reboot";
      } else if (rxNum >= -30 && rxNum <= -27) {
        scenario = "C";
        scenarioDescription = "Weak signal - Optical connector issue";
      } else if (rxNum < -30) {
        scenario = "D";
        scenarioDescription = "Critical RX - Fiber optic problem";
      }
      
      testModeScenario = scenario !== "unknown" ? scenario : null;
      
      logger.info("🎯 Test scenario determined", { scenario, tx, rx, message, description: scenarioDescription });
      
      // NÃO retornar aqui - deixar o fluxo continuar para testar código refatorado
    }
    // <<< MODE TEST-RUNNER

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 🧪 Helper function to insert messages with SKIP_DB_OPS support
    const insertAgentMessage = async (conversationId: string, content: string, senderName = "Luan Silva") => {
      if (SKIP_DB_OPS) {
        logger.info("🧪 SKIP_DB_OPS: Mensagem não inserida", { 
          content: content.substring(0, 50),
          senderName 
        });
        return { error: null };
      }
      return await supabase.from("conversation_messages").insert({
        conversation_id: conversationId,
        sender_type: "agent",
        sender_name: senderName,
        content,
        ai_suggestion: false
      });
    };

    logger.info("Luan atendendo", { 
      conversation_id, 
      customer_cpf, 
      message,
      has_attachments: !!attachments && attachments.length > 0,
      ixc_client_id,
      reboot_attempted,
      has_onu_signal: !!onu_signal,
      client_is_offline,
      cpf_not_found
    });

    // PR19 ✅: Marcar início do atendimento
    markAgingEvent(supabase, {
      conversation_id,
      step: 'start',
      meta: { agent: 'support-tech', ixc_client_id }
    });

    // PATCH 2: Persistir ixc_client_id no flow_state
    if (ixc_client_id && typeof ixc_client_id === "string" && ixc_client_id.trim().length > 0) {
      const { data: currentConv } = await supabase
        .from("conversations")
        .select("metadata")
        .eq("id", conversation_id)
        .single();

      const existingState = (currentConv?.metadata as any)?.flow_state;
      
      if (!existingState?.ixc_client_id || existingState?.ixc_client_id !== ixc_client_id) {
        await supabase
          .from("conversations")
          .update({
            metadata: {
              ...(currentConv?.metadata as any || {}),
              flow_state: {
                ...existingState,
                ixc_client_id
              }
            }
          })
          .eq("id", conversation_id);

        await supabase
          .from("registros_de_monitoramento")
          .insert({
            acao: "persist_ixc_client_id",
            fluxo: "support-tech",
            conversation_id,
            detalhes: { ixc_client_id }
          });
        
        logger.info("IXC client_id persistido", { ixc_client_id });
      }
    }

    // >>> PR10A - Captura geolocalização
    let convWithPhone;
    if (!SKIP_DB_OPS) {
      const { data } = await supabase
        .from("conversations")
        .select("metadata, customer_phone")
        .eq("id", conversation_id)
        .single();
      convWithPhone = data;
    } else {
      // Mock data for test mode
      convWithPhone = {
        metadata: { flow_state: {} },
        customer_phone: "+5511999999999"
      };
      logger.info("🧪 Mock convWithPhone created");
    }

    // Normalizar flow_state para evitar espalhar string em chaves '0','1',...
    const rawFlowState = (convWithPhone?.metadata as any)?.flow_state;
    const normalizeFlowState = (fs: any) => {
      if (typeof fs === "string") return { continue: fs };
      if (!fs || typeof fs !== "object" || Array.isArray(fs)) return {};
      return fs;
    };

    let flowState = normalizeFlowState(rawFlowState);
    // Disponibiliza a versão string (quando existir) para detecção de cenário
    const continueFlowState = typeof rawFlowState === "string" ? rawFlowState : (flowState?.continue || "");
    
    if (ixc_client_id && !SKIP_DB_OPS) {
      const geoData = await ensureGeo(
        supabase,
        { conversation_id, flowState },
        ixc_client_id,
        convWithPhone?.customer_phone
      );
      flowState = { ...flowState, geo: geoData };
      logger.info("Geolocalização capturada", { cidade: geoData.cidade, source: geoData.source });
    }
    // <<< PR10A

    // ===== PATCH 1: Feature Flag - 50% Hybrid Mode A/B Test =====

    const existingFlowState = flowState;
    const isHybridEnabled = (existingFlowState?.hybrid_mode_active !== undefined)
      ? existingFlowState.hybrid_mode_active
      : Math.random() < 0.5; // 50% dos atendimentos

    if (!SKIP_DB_OPS) {
      await supabase
        .from("conversations")
        .update({
          metadata: {
            ...(convWithPhone?.metadata as any || {}),
            flow_state: {
              ...existingFlowState,
              hybrid_mode_active: isHybridEnabled
            }
          }
        })
        .eq("id", conversation_id);


      await logAudit({
        action: "hybrid_test_assignment",
        conversation_id,
        detalhes: {
          hybrid_mode: isHybridEnabled ? "hybrid" : "deterministic",
          assigned_at: new Date().toISOString()
        },
        supabaseClient: supabase
      });
    }

    logger.info("Modo híbrido definido", { 
      isHybridEnabled,
      test_group: isHybridEnabled ? "hybrid" : "deterministic"
    });

    // Detecção leve de intenção/humor (somente logs, sem alterar fluxo)
    let detectedIntent = "";
    let detectedMood = "neutro";
    if (message && typeof message === "string" && message.trim() !== "") {
      try {
        const detected = detectIntentAndMood(message);
        detectedIntent = detected.intent;
        detectedMood = detected.mood;
        logger.info("Intent/mood detectado", { intent: detectedIntent, mood: detectedMood });
      } catch (_) {
        // Não bloquear fluxo se detecção falhar
      }
    }

    // 📷 PROCESSAR IMAGENS COM VISÃO AI
    let imageAnalysis = "";
    if (attachments && attachments.length > 0) {
      const imageAttachments = attachments.filter((a: any) => a.type === 'image');
      
      if (imageAttachments.length > 0) {
        logger.info("Processando imagens com visão AI", { 
          imageCount: imageAttachments.length 
        });
        
        try {
          const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
          if (!LOVABLE_API_KEY) {
            throw new Error('LOVABLE_API_KEY not configured');
          }

          // Montar o prompt para análise de imagem
          const imagePrompt = `Você é o Luan Silva, técnico de suporte da SUPERNET FIBRA.
          
O cliente enviou uma imagem relacionada a um problema de internet.

Analise a imagem e identifique:
- Se é um teste de velocidade (fast.com, speedtest, etc), identifique os valores de download/upload
- Se é uma foto do equipamento/luzes, identifique quais luzes estão acesas/apagadas/piscando
- Se é um erro/mensagem, identifique o erro
- Qualquer outra informação técnica relevante

Seja objetivo e direto. Extraia apenas os dados técnicos importantes.`;

          // Preparar conteúdo com imagem
          const imageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
            {
              type: "text",
              text: imagePrompt
            }
          ];

          // Adicionar todas as imagens
          for (const img of imageAttachments) {
            imageContent.push({
              type: "image_url",
              image_url: {
                url: img.url
              }
            });
          }

          // Chamar Lovable AI com visão
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "user",
                  content: imageContent
                }
              ],
              max_tokens: 500
            })
          });

          if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            logger.error("Erro na API de visão", { 
              status: aiResponse.status,
              error: errorText
            });
          } else {
            const aiData = await aiResponse.json();
            imageAnalysis = aiData.choices?.[0]?.message?.content || "";
            
            logger.info("Análise de imagem concluída", {
              analysisLength: imageAnalysis.length,
              preview: imageAnalysis.substring(0, 100)
            });
          }
        } catch (error) {
          logger.error("Erro ao processar imagem com AI", { 
            error: error instanceof Error ? error.message : String(error)
          });
          // Continua sem análise se houver erro
        }
      }
    }

    // Buscar histórico de mensagens da conversa
    let messageHistory;
    if (!SKIP_DB_OPS) {
      const { data } = await supabase
        .from("conversation_messages")
        .select("sender_type, content")
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: true });
      messageHistory = data;
    } else {
      // Mock empty history for test mode
      messageHistory = [];
      logger.info("🧪 Mock messageHistory created (empty)");
    }

    const hasHistory = messageHistory && messageHistory.length > 0;

    // Verificar se é a primeira mensagem (quando vem do routing-agent sem message)
    const isFirstMessage = !message || message.trim() === "" || !hasHistory;
    
    logger.info("Verificação de primeira mensagem", {
      isFirstMessage,
      hasMessage: !!message,
      messageLength: message?.length,
      hasHistory,
      historyLength: messageHistory?.length
    });

    // 🔥 HÍBRIDO SEGURO: Buscar flowState para timeout e intent detection
    let currentConversation;
    if (!SKIP_DB_OPS) {
      const { data } = await supabase
        .from("conversations")
        .select("customer_name, metadata, updated_at")
        .eq("id", conversation_id)
        .single();
      currentConversation = data;
    } else {
      // Mock conversation for test mode
      currentConversation = {
        customer_name: "Test Customer",
        metadata: {
          flow_state: {},
          signal_data: { tx: Number(tx) || 0, rx: Number(rx) || 0 }
        },
        updated_at: new Date().toISOString()
      };
      logger.info("🧪 Mock currentConversation created");
    }

    const currentFlowState = (currentConversation?.metadata as any)?.flow_state;
    const lastInteraction = currentConversation?.updated_at 
      ? new Date(currentConversation.updated_at) 
      : new Date();
    const minutesWithoutReply = Math.floor(
      (new Date().getTime() - lastInteraction.getTime()) / 60000
    );

    // ✅ TIMEOUT PROTOCOL: Timeouts escalonados conforme documentação
    // 1ª tentativa: 1:30min | 2ª tentativa: 5min | 3ª tentativa: 15min (fechar)
    if (!isFirstMessage && minutesWithoutReply >= 1.5) {
      const timeoutAttempts = (currentFlowState?.timeout_attempts || 0);
      
      // ⏱️ Timeout intermediário 1: 1:30min (primeira tentativa)
      if (minutesWithoutReply >= 1.5 && minutesWithoutReply < 5 && timeoutAttempts === 0) {
        logger.info("Timeout 1ª tentativa: Cliente sem resposta há 1:30min", {
          minutesWithoutReply,
          conversation_id
        });

        await supabase
          .from("conversations")
          .update({
            metadata: {
              ...(currentConversation?.metadata as any || {}),
              flow_state: {
                ...currentFlowState,
                timeout_attempts: 1,
                last_timeout_at: new Date().toISOString()
              }
            }
          })
          .eq("id", conversation_id);

        const customerName = (currentConversation?.customer_name || "cliente").split(' ')[0];
        return textReply(
          `${customerName}, ainda está aí? Aguardo seu retorno para continuar o atendimento 🙂`
        );
      }
      
      // ⏱️ Timeout intermediário 2: 5min (segunda tentativa)
      if (minutesWithoutReply >= 5 && minutesWithoutReply < 15 && timeoutAttempts === 1) {
        logger.info("Timeout 2ª tentativa: Cliente sem resposta há 5min", {
          minutesWithoutReply,
          conversation_id
        });

        await supabase
          .from("conversations")
          .update({
            metadata: {
              ...(currentConversation?.metadata as any || {}),
              flow_state: {
                ...currentFlowState,
                timeout_attempts: 2,
                last_timeout_at: new Date().toISOString()
              }
            }
          })
          .eq("id", conversation_id);

        const customerName = (currentConversation?.customer_name || "cliente").split(' ')[0];
        return textReply(
          `${customerName}, preciso do seu retorno para continuar te ajudando. Está aí?`
        );
      }
      
      // ⏱️ Timeout final: 15min (fechar interação)
      if (minutesWithoutReply >= 15) {
        logger.info("Timeout final: Cliente sem resposta há 15min - fechando interação", {
          minutesWithoutReply,
          conversation_id
        });

        const customerName = (currentConversation?.customer_name || "cliente").split(' ')[0];

        await supabase
          .from("conversations")
          .update({
            status: "closed",
            metadata: {
              ...(currentConversation?.metadata as any || {}),
              flow_state: {
                ...currentFlowState,
                timeout_attempts: 3,
                closed_reason: "timeout_15min"
              },
              closed_reason: "timeout",
              closed_at: new Date().toISOString()
            }
          })
          .eq("id", conversation_id);

        return textReply(
          `${customerName}, estou finalizando aqui por falta de retorno. Se precisar, é só me chamar novamente! 👋`
        );
      }
    }

    // >>> PR7: DETECÇÃO AUTOMÁTICA DE ENTRADA NO CENÁRIO B
    // (coloque logo após a obtenção de signal/flow_state/ixc_client_id)
    const signal = (currentConversation?.metadata as any)?.signal_data;
    const ixcId = (currentConversation?.metadata as any)?.flow_state?.ixc_client_id ?? ixc_client_id;
    const waitingStep = (currentConversation?.metadata as any)?.flow_state?.waiting_step;

    // 🔍 Detectar sintomas de problema de navegação (regex expandido)
    const userReportsConnectivityIssue = !isFirstMessage && message && 
      /(nao carrega|não carrega|nao abre|não abre|lento|nao funciona|não funciona|trav|parou|sem net|cai|nao navega|não navega|congelou|travou|intermit|instavel|instável|oscila|perde|perdendo|desconect|sem internet|ruim|não acessa|nao acessa)/i.test(message);

    if (!isFirstMessage && !waitingStep && isGoodSignal(signal) && userReportsConnectivityIssue) {
      // Teste leve de conectividade para inferir travamento
      const testConn = await safeTestConnectivity(supabase, ixcId);
      const reachable = testConn?.data?.ok === true;
      await logB(supabase, conversation_id, "scenario_b_probe", { signal, reachable });

      // Critério B: sinal bom + comportamento de travamento percebido (sem navegação/instável)
      if (!reachable) {
        await setWaitingStep(supabase, conversation_id, currentConversation?.metadata, "scenario_b_power_cycle_request", { ixc_client_id: ixcId });
        responseMessage = `Vamos fazer o básico que resolve a maioria dos travamentos 👍

1️⃣ Desligue o **roteador** da tomada  
2️⃣ Aguarde **60 segundos**  
3️⃣ Ligue novamente e aguarde **1 minuto**

Me avise quando ligar, por favor.  
(Se já fez agora há pouco, me diga também)`;

        await logB(supabase, conversation_id, "scenario_b_start", { reason: "good_signal_but_unreachable" });
      }
    }
    // <<< PR7

    // Verificar se há pane massiva ativa (contexto em memória)
    let outageActive = massOutageContext.active;
    let outageRegion = massOutageContext.affectedRegion || "";
    let outageCount = massOutageContext.affectedCount || 0;
    
    if (outageActive) {
      logger.info("Pane massiva detectada", { 
        region: outageRegion, 
        affected: outageCount 
      });
    }
    
    let responseMessage = "";

    // Se é a primeira mensagem, enviar saudação
    if (isFirstMessage) {
      logger.info("Luan enviando mensagem inicial", {
        outageActive,
        reboot_attempted,
        has_onu_signal: !!onu_signal,
        client_is_offline,
        ixc_client_id,
        cpf_not_found
      });
      
      // Buscar informações da conversa para personalizar a mensagem
      const { data: conversation } = await supabase
        .from("conversations")
        .select("customer_name, metadata")
        .eq("id", conversation_id)
        .single();

      // Extrair apenas o primeiro nome
      const fullName = conversation?.customer_name || "cliente";
      const customerName = fullName.split(' ')[0];
      const cpfRetryCount = (conversation?.metadata as any)?.cpf_retry_count || 0;

      // 🚨 CASO ESPECIAL: CPF não encontrado
      if (cpf_not_found) {
        if (cpfRetryCount >= 2) {
          // Já tentou 3 vezes (0, 1, 2) - transferir para humano
          logger.info("Luan: CPF não encontrado após 3 tentativas - transferindo para humano");
          responseMessage = `${customerName}, não consegui localizar seu CPF no sistema após algumas tentativas. 😕\n\nVou te transferir para um atendente humano que pode te ajudar melhor com isso. Só um momento! ⏳`;
          
          // Atualizar conversa para status "aguardando humano"
          await supabase
            .from("conversations")
            .update({
              status: "active",
              department: "tecnico",
              assigned_agent_id: null,
              metadata: {
                ...(conversation?.metadata as any || {}),
                needs_human_transfer: true,
                transfer_reason: "cpf_not_found_after_retries"
              }
            })
            .eq("id", conversation_id);
        } else {
          // Primeira ou segunda tentativa - pedir CPF novamente
          const attemptNumber = cpfRetryCount + 1;
          logger.info(`Luan: CPF não encontrado - tentativa ${attemptNumber}/3`);
          
          responseMessage = await textReplyWithContext(
            supabase,
            { conversation_id, flowState },
            `${customerName}, não encontrei esse CPF no nosso sistema. 🔍\n\nPode confirmar o CPF para mim? Digite apenas os números, por favor.\n\n(Tentativa ${attemptNumber} de 3)`
          ).then(r => r.json()).then(j => j.reply);
          
          // Incrementar contador de retry
          await supabase
            .from("conversations")
            .update({
              metadata: {
                ...(conversation?.metadata as any || {}),
                cpf_retry_count: cpfRetryCount + 1
              }
            })
            .eq("id", conversation_id);
        }
      } else {
        // Resetar contador se CPF foi encontrado
        if (cpfRetryCount > 0) {
          await supabase
            .from("conversations")
            .update({
              metadata: {
                ...(conversation?.metadata as any || {}),
                cpf_retry_count: 0
              }
            })
            .eq("id", conversation_id);
        }

      // =============================================================================
      // PR#17 - FAST-PATH: Detecção rápida para clientes com bom sinal + conectividade
      // =============================================================================
      
      // Guard 1: Verificar se usuário não está em outro fluxo ativo
      const currentStep = flowState?.waiting_step;
      const isInActiveFlow = currentStep && 
        !['initial', 'cpf_validation', 'awaiting_response'].includes(currentStep);

      let fastPathActivated = false;

      if (!isInActiveFlow && ixc_client_id) {
        try {
          logger.info('🔄 PR#17: Avaliando fast-path', { ixc_client_id });
          
          // GAP #2: Verificar feature flag antes de executar
          const fastPathEnabled = await isFastPathEnabled(supabase, conversation_id);
          if (!fastPathEnabled) {
            logger.info('⏭️ PR#17: Fast-path desabilitado via feature flag');
          } else {
            // GAP #5: Usar circuit breaker para proteção
            const circuitBreaker = FastPathCircuitBreaker.getInstance();
            const circuitState = circuitBreaker.getState();
            
            if (circuitState === 'open') {
              logger.warn('⚠️ PR#17: Circuit breaker OPEN - pulando fast-path');
            } else {
              // GAP #4: Verificar estabilidade do sinal
              const isStable = await hasStableSignal(supabase, ixc_client_id);
              if (!isStable) {
                logger.info('⚠️ PR#17: RX instável detectado - pulando fast-path');
                await logAudit({
                  acao: "fast_path_skipped",
                  fluxo: "support-tech",
                  conversation_id,
                  detalhes: { reason: "unstable_signal" },
                  supabaseClient: supabase
                });
              } else {
                // Executar diagnósticos paralelos com circuit breaker
                const diagnosticResult = await circuitBreaker.execute(
                  () => runParallelDiagnostics(ixc_client_id, conversation_id, supabase, logger),
                  supabase,
                  logger
                );

                if (!diagnosticResult) {
                  logger.warn('⚠️ PR#17: Circuit breaker impediu execução');
                } else {
                  const { signalResult, connectivityResult, elapsed } = diagnosticResult;

                  // Processar resultados
                  const signal = signalResult.status === "fulfilled" 
                    ? signalResult.value?.data 
                    : null;
                  
                  const isConnectivityAlive = 
                    connectivityResult.status === "fulfilled" && 
                    connectivityResult.value?.data?.ok === true;

                  // Validação robusta do RX (evitar NaN e valores inválidos)
                  let rxValue: number | null = null;
                  if (signal?.rx != null) {
                    const parsed = Number(signal.rx);
                    if (!isNaN(parsed)) {
                      rxValue = parsed;
                    }
                  }

                  const isGoodSignal = rxValue !== null && rxValue > -24;

                  logger.info("📊 PR#17: Heurística avaliada", {
                    rx_value: rxValue,
                    is_good_signal: isGoodSignal,
                    is_connectivity_alive: isConnectivityAlive,
                    elapsed_ms: elapsed
                  });

                  // Heurística: RX bom + Conectividade OK = Fast-Path
                  if (isConnectivityAlive && isGoodSignal) {
                    logger.info("⚡ PR#17: FAST-PATH ATIVADO!", { rx: rxValue });
                    fastPathActivated = true;

                    // Auditoria
                    await logAudit({
                      acao: "fast_path_enabled",
                      fluxo: "support-tech",
                      conversation_id,
                      detalhes: {
                        reason: "signal_and_connectivity_good",
                        elapsed_ms: elapsed,
                        rx_value: rxValue,
                        connectivity_ok: true
                      },
                      supabaseClient: supabase
                    });

                    // KPI tracking (fire-and-forget)
                    kpiLog({
                      action: "fast_path_enabled",
                      fluxo: "support-tech",
                      conversation_id,
                      extras: {
                        signal_rx: rxValue,
                        elapsed_ms: elapsed,
                        pr17_enabled: true
                      }
                    });

                    // Resposta rápida com contexto
                    responseMessage = `Perfeito! 🙌  
Seu equipamento está **online** e com **bom sinal** 📶  
Vamos apenas confirmar 1 coisinha rápido aqui…`;

                    await updateFlowState(
                      supabase,
                      { conversation_id, flowState },
                      { waiting_step: "fast_path_check_experience" }
                    );

                    await insertAgentMessage(conversation_id, responseMessage);

                    logger.info("PR#17: Fast-path ativado - aguardando confirmação do cliente");
                    
                    return new Response(
                      JSON.stringify({ reply: responseMessage }),
                      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                  } else {
                    logger.info("⏩ PR#17: Fast-path não aplicável", {
                      rx: rxValue,
                      connectivity: isConnectivityAlive
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          logger.error("❌ PR#17: Erro no fast-path - continuando fluxo normal", { error });
          // Em caso de erro, continuar com fluxo normal (fail-safe)
        }
      } else if (isInActiveFlow) {
        logger.info('⏭️ PR#17: Fast-path skip - usuário já em fluxo', { currentStep });
      }

      // Mensagem inicial seguindo o prompt do sistema
        if (!fastPathActivated && outageActive && outageRegion) {
          // Caso especial: Pane massiva
          responseMessage = `Olá ${customerName}! Sou o **Luan Silva**, do Suporte Técnico da SUPERNET. 👋\n\n⚠️ **ATENÇÃO**: Detectamos uma instabilidade geral na região de ${outageRegion} afetando ${outageCount} clientes.\n\nNossa equipe técnica já está trabalhando para normalizar o serviço. Você não está sozinho nessa! Vou te manter informado sobre o andamento.`;
        } else if (!fastPathActivated && reboot_attempted && onu_signal) {
          // Cloé já tentou reboot - começar diagnóstico TX/RX
          const tx = onu_signal.tx_power || 0;
          const rx = onu_signal.rx_power || 0;

          logger.info("Luan: Analisando sinal ONU após reboot falho", { tx, rx });

          // Determinar cenário baseado em TX/RX
          let scenario = "";
          let scenarioMessage = "";

          if (tx === 0 && rx === 0) {
            // >>> PR #14 — MediaGuided Energia/ONU
            scenario = "A";
            
            // Registrar estado inicial do Cenário A
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(conversation?.metadata as any || {}),
                  flow_state: "cenario_a_verificar_luzes",
                  scenario: "A" // 🔧 Sempre definir o scenario
                }
              })
              .eq("id", conversation_id);
            
            // >>> FLOW-MANAGER: Buscar mensagem do banco ou usar fallback
            const fullMessage = await getStepMessage(
              supabase,
              'support-tech-agent',
              'cenario_a_verificar_luzes',
              `Olá ${customerName}! Sou o **Luan Silva**, do Suporte Técnico. 👋\n\nA Cloé tentou reiniciar seu equipamento, mas detectei que o sinal óptico está **zerado** (TX/RX: 0.00/0.00).\n\nIsso indica problema de energia ou no cabo de fibra.\n\n🔍 Confirme pra mim se o equipamento está com as luzes acesas igual nesta imagem 👇`,
              { customer_name: customerName }
            );
            // <<< FLOW-MANAGER
            
            await textReplyWithContext(
              supabase,
              conversation_id,
              fullMessage,
              { scenario: "A", waiting_step: "scenario_a_check_power" },
              "onu_visual"
            );
            
            return new Response(JSON.stringify({
              reply: fullMessage,
              media_context: "onu_visual"
            }), { headers: corsHeaders });
            // <<< PR #14 ✅
               
          } else if (rx >= -23 && rx <= -18 && tx >= -1 && tx <= 2) {
            // CENÁRIO B: Sinal normal mas offline (equipamento travado)
            scenario = "B";
            // >>> FLOW-MANAGER: Buscar mensagem do banco ou usar fallback
            scenarioMessage = await getStepMessage(
              supabase,
              'support-tech-agent',
              'scenario_b_wait_restart',
              `Olá ${customerName}! Sou o **Luan Silva**, do Suporte Técnico. 👋\n\nA Cloé tentou reiniciar remotamente, mas você ainda está offline.\n\nVerifiquei o sinal da ONU e está **dentro dos padrões** (RX: ${rx} dBm / TX: ${tx} dBm).\n\n🔧 Vamos desligar e ligar o roteador da tomada e aguardar 1 minuto, por favor.`,
              { customer_name: customerName, rx, tx }
            );
            // <<< FLOW-MANAGER
            
            // PATCH 3: Registrar estado inicial do Cenário B
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(conversation?.metadata as any || {}),
                  flow_state: {
                    ...((conversation?.metadata as any)?.flow_state || {}),
                    waiting_step: "scenario_b_wait_restart",
                    scenario: "B",
                    ixc_client_id
                  }
                }
              })
              .eq("id", conversation_id);

            await supabase
              .from("registros_de_monitoramento")
              .insert({
                acao: "ask_power_cycle_router_b0",
                fluxo: "support-tech",
                conversation_id
              });
            
            logger.info("Cenário B iniciado - aguardando reinício do roteador");
          } else if (rx >= -28 && rx <= -24 && tx > 0) {
            // CENÁRIO C: Sinal fraco - Iniciar verificação de instabilidade
            scenario = "C";
            
            // Registrar estado inicial do Cenário C
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(conversation?.metadata as any || {}),
                  flow_state: {
                    ...((conversation?.metadata as any)?.flow_state || {}),
                    waiting_step: "scenario_c_check_instability",
                    scenario: "C",
                    ixc_client_id,
                    signal_data: { tx, rx }
                  }
                }
              })
              .eq("id", conversation_id);

            await supabase.from("registros_de_monitoramento").insert({
              acao: "scenario_c_detected",
              fluxo: "support-tech",
              conversation_id,
              detalhes: withGeo({ signal: "weak", tx, rx }, flowState)
            });

            scenarioMessage = `Olá ${customerName}! Sou o **Luan Silva**, do Suporte Técnico. 👋\n\nA Cloé tentou reiniciar remotamente, mas você ainda está offline.\n\n🔍 Estou vendo que o sinal da fibra está um pouco fraco (RX: ${rx} dBm).\n\nIsso pode causar instabilidade às vezes.\n\nVocê está percebendo que a conexão cai e volta, ou fica muito lenta em alguns momentos?`;
            
            logger.info("Cenário C iniciado - verificando instabilidade", { tx, rx });
          } else {
            // CENÁRIO D: Sinal crítico
            scenario = "D";
            scenarioMessage = `Olá ${customerName}! Sou o **Luan Silva**, do Suporte Técnico. 👋\n\nA Cloé tentou reiniciar remotamente, mas você ainda está offline.\n\nDetectei um **PROBLEMA CRÍTICO** no sinal da fibra (RX: ${rx} dBm).\n\n⚠️ Isso requer inspeção urgente da nossa equipe técnica.\n\nVou abrir um atendimento prioritário agora mesmo!`;
          }

          responseMessage = scenarioMessage;
          logger.info("Cenário diagnosticado", { scenario, tx, rx });
        } else if (client_is_offline) {
          // Cliente offline sem tentativa de reboot (fallback)
          logger.info("Luan: Cliente offline detectado - iniciando troubleshooting");
          responseMessage = await textReplyWithContext(
            supabase,
            { conversation_id, flowState },
            `Olá ${customerName}! Sou o **Luan Silva**, do Suporte Técnico da SUPERNET. 👋\n\nEntendo que ficar sem internet é frustrante. Vi que você está offline. Vamos resolver isso agora!\n\nPara começar, me diga: **as luzes do seu equipamento estão acesas?**`
          ).then(r => r.json()).then(j => j.reply);
          
          // Registrar estado inicial
          await supabase
            .from("conversations")
            .update({
              metadata: {
                ...(conversation?.metadata as any || {}),
                flow_state: "cenario_a_verificar_luzes",
                scenario: "A" // 🔧 Sempre definir o scenario
              }
            })
            .eq("id", conversation_id);
            
        } else {
          // Mensagem genérica para outros casos
          responseMessage = await textReplyWithContext(
            supabase,
            { conversation_id, flowState },
            `Olá ${customerName}! Sou o **Luan Silva**, do Suporte Técnico da SUPERNET. 👋\n\nEntendo que ficar sem internet é frustrante. Vou te ajudar a resolver isso agora!\n\nVamos começar: **qual problema você está enfrentando?**`
          ).then(r => r.json()).then(j => j.reply);
        }
      }

      const { error: insertErr } = await insertAgentMessage(conversation_id, responseMessage);
      
      if (insertErr) {
        logger.error("Erro ao inserir mensagem", { error: insertErr.message });
        throw insertErr;
      }

      logger.info("Mensagem inicial do Luan enviada");
      } else {
        // Continuar atendimento com análise contextual
        logger.info("Luan continuando atendimento", { message, historyLength: messageHistory?.length });

      // Buscar estado atual do fluxo
      const { data: currentConversation } = await supabase
        .from("conversations")
        .select("metadata")
        .eq("id", conversation_id)
        .single();

      const continueFlowState = (currentConversation?.metadata as any)?.flow_state;
      const scenario = (currentConversation?.metadata as any)?.scenario;

      // Normaliza flow_state para avaliação segura
      const flowStateHasEnergia = Array.isArray(continueFlowState)
        ? continueFlowState.includes("energia")
        : typeof continueFlowState === "string"
          ? continueFlowState.includes("energia")
          : false;

      // Carregar exemplos aprovados de energia se estiver no cenário A
      let approvedExamples = "";
      if (scenario === "A" || flowStateHasEnergia) {
        approvedExamples = await getApprovedSimulations(supabase, "energia");
        logger.info("Exemplos de energia carregados", { 
          hasExamples: approvedExamples.length > 0,
          examplesLength: approvedExamples.length,
          message: approvedExamples ? "Variações aprovadas disponíveis para referência" : "Nenhuma variação aprovada encontrada"
        });
        
        // Log das variações aprovadas para documentação
        if (approvedExamples.length > 0) {
          logger.info("Variações aprovadas em uso", {
            total: approvedExamples.length,
            context: "Fluxo de energia seguindo protocolos aprovados"
          });
        }
      }

      logger.info("Estado do fluxo", { flowState: continueFlowState, scenario });

      // 🚨 DETECTOR DE FRUSTRAÇÃO (Priority #2)
      const frustration = detectFrustration(message);
      if (frustration.isFrustrated) {
        logger.info("🚨 Frustração detectada", {
          intensity: frustration.intensity,
          indicators: frustration.indicators
        });
        
        // Frustração alta ou média → transferir imediatamente
        if (frustration.intensity === 'high' || frustration.intensity === 'medium') {
          responseMessage = `${customerName}, percebo que você está frustrado. 😔\n\nVou te transferir agora mesmo para um atendente humano que pode te ajudar melhor!\n\nSó um momento! ⏳`;
          
          await supabase
            .from("conversations")
            .update({
              status: "active",
              department: "tecnico",
              assigned_agent_id: null,
              metadata: {
                ...(currentConversation?.metadata as any || {}),
                needs_human_transfer: true,
                transfer_reason: "client_frustrated",
                frustration_level: frustration.intensity,
                frustration_indicators: frustration.indicators
              }
            })
            .eq("id", conversation_id);
          
          // Salvar resposta e retornar
          await supabase
            .from("conversation_messages")
            .insert({
              conversation_id,
              sender_type: "agent",
              content: responseMessage
            });
          
          return new Response(JSON.stringify({ 
            message: responseMessage,
            transferred: true,
            reason: 'frustration'
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      // 📊 CONTADOR DE TENTATIVAS DE CLARIFICAÇÃO (Priority #1)
      const clarificationAttempts = (currentConversation?.metadata as any)?.clarification_attempts || 0;
      const lastClarificationStep = (currentConversation?.metadata as any)?.last_clarification_step;
      
      // Se já tentou clarificar 2x no mesmo step → transferir para humano
      if (clarificationAttempts >= 2 && lastClarificationStep === continueFlowState) {
        logger.info("⚠️ Limite de clarificações atingido", {
          attempts: clarificationAttempts,
          step: continueFlowState
        });
        
        responseMessage = `${customerName}, estou tendo dificuldade em entender suas respostas. 😅\n\nVou te transferir para um atendente humano que pode te ajudar melhor!\n\nSó um momento! ⏳`;
        
        if (!SKIP_DB_OPS) {
          await supabase
            .from("conversations")
            .update({
              status: "active",
              department: "tecnico",
              assigned_agent_id: null,
              metadata: {
                ...(currentConversation?.metadata as any || {}),
                needs_human_transfer: true,
                transfer_reason: "clarification_limit_exceeded",
                clarification_attempts: clarificationAttempts
              }
            })
            .eq("id", conversation_id);
          
          // Salvar resposta e retornar
          await supabase
            .from("conversation_messages")
            .insert({
              conversation_id,
              sender_type: "agent",
              content: responseMessage
            });
        } else {
          logger.info("🧪 SKIP_DB_OPS: Transferência para humano não executada");
        }
        
        return new Response(JSON.stringify({ 
          message: responseMessage,
          transferred: true,
          reason: 'clarification_limit'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Analisar contexto baseado no histórico
      const conversationContext = messageHistory.map(m => m.content.toLowerCase()).join(" ");
      const currentMessage = message.toLowerCase();

      // ============================================================================
      // 🚀 ROUTING LAYER - Refactored vs Inline Scenarios
      // ============================================================================
      
      // Feature flag para controlar uso de código refatorado (gradual rollout)
      const USE_REFACTORED_SCENARIOS = true; // ✅ Ativado - usando cenários refatorados
      
      if (USE_REFACTORED_SCENARIOS) {
        // 🔍 DETECTOR DE CENÁRIO AUTOMÁTICO
        // Prioridade 1: Usar cenário do modo de teste se disponível
        // Prioridade 2: Usar cenário já definido no metadata
        // Prioridade 3: Detectar baseado em sinal e contexto
        let detectedScenario: string | null = testModeScenario || scenario || null;
        
        logger.info("🔍 Detector de cenário", {
          testModeScenario,
          scenario,
          detectedScenario,
          hasOnuSignal: !!onu_signal,
          testHarness
        });
        
        if (!detectedScenario && onu_signal) {
          const txNum = Number(onu_signal.tx_power || 0);
          const rxNum = Number(onu_signal.rx_power || 0);
          
          // Lógica de detecção baseada em sinal
          if (txNum === 0 && rxNum === 0) {
            detectedScenario = "A"; // Sem sinal = problema de energia
          } else if (txNum >= -5 && txNum <= 2 && rxNum >= -24) {
            // Sinal bom mas cliente reclama
            const problemKeywords = ["lent", "trav", "não carrega", "não abre", "demora", "ruim"];
            if (problemKeywords.some(kw => message.toLowerCase().includes(kw))) {
              detectedScenario = "B";
            }
          } else if (txNum > -5 && rxNum >= -28 && rxNum < -24) {
            detectedScenario = "C"; // Sinal fraco
          } else if (rxNum < -28) {
            detectedScenario = "D"; // RX crítico
          }
        }
        
        // Detectar Cenário E - interações atípicas
        if (!detectedScenario) {
          const cancelKeywords = ["cancelar", "cancela", "desistir", "quero sair"];
          if (cancelKeywords.some(kw => message.toLowerCase().includes(kw))) {
            detectedScenario = "E";
          }
        }
        
        // Detectar cenário ativo
        const activeScenario = detectedScenario as ScenarioType | null;
        
        if (activeScenario && ['A', 'B', 'C', 'D', 'E'].includes(activeScenario)) {
          logger.info("🔀 Roteamento para cenário refatorado", {
            scenario: activeScenario,
            conversationId: conversation_id,
            testMode: testHarness
          });
          
          try {
            // 🧪 MODO DE TESTE: Criar dados mock quando necessário
            if (testHarness === true) {
              // Criar sinal mock baseado no cenário
              if (!onu_signal) {
                const mockSignals: Record<string, any> = {
                  'A': { tx_power: 0, rx_power: 0, status: 'offline' },
                  'B': { tx_power: 0.5, rx_power: -20, status: 'online' },
                  'C': { tx_power: -2, rx_power: -27, status: 'online' },
                  'D': { tx_power: -5, rx_power: -31, status: 'online' },
                  'E': { tx_power: -3, rx_power: -25, status: 'online' }
                };
                onu_signal = mockSignals[activeScenario];
                logger.info("🧪 Mock ONU signal created", { scenario: activeScenario, signal: onu_signal });
              }
              
              // Criar conversação mock se não existir
              if (!currentConversation) {
                currentConversation = {
                  id: conversation_id || 'test-conversation',
                  customer_name: 'Cliente Teste',
                  customer_phone: '(11) 99999-9999',
                  metadata: { scenario: activeScenario }
                } as any;
                logger.info("🧪 Mock conversation created");
              }
            }
            
            // Montar contexto inline para adaptação
            const inlineData: InlineContextData = {
              conversationId: conversation_id || 'test-conversation',
              customerId: customer_id || 'test-customer',
              customerName: currentConversation?.customer_name || "Cliente",
              customerPhone: currentConversation?.customer_phone || "",
              flowState: continueFlowState,
              waitingStep: waitingStep,
              currentMessage: message,
              messageHistory,
              signalData: {
                tx: onuTx,
                rx: onuRx,
                status: onuStatus || "unknown"
              },
              analysisResult: {
                scenario,
                needsEscalation: false,
                hasImages: userImages.length > 0,
                imageAnalysis
              }
            };
            
            // Validar contexto
            const validation = validateInlineContext(activeScenario, inlineData);
            if (!validation.valid) {
              logger.warn("⚠️ Contexto inválido para cenário refatorado - usando inline", {
                scenario: activeScenario,
                missing: validation.missing
              });
              // Continuar com código inline (não fazer nada, vai cair nos ifs abaixo)
            } else {
              // Construir contexto específico do cenário
              const scenarioContext = buildScenarioContext(activeScenario, inlineData);
              
              // Chamar handler refatorado apropriado
              let scenarioResult: ScenarioResult;
              const startTime = Date.now();
              
              switch (activeScenario) {
                case 'A':
                  scenarioResult = await handleScenarioA(scenarioContext, supabase, logger);
                  break;
                case 'B':
                  scenarioResult = await handleScenarioB(scenarioContext, supabase, logger);
                  break;
                case 'C':
                  scenarioResult = await handleScenarioC(scenarioContext, supabase, logger);
                  break;
                case 'D':
                  scenarioResult = await handleScenarioD(scenarioContext, supabase, logger);
                  break;
                case 'E':
                  scenarioResult = await handleScenarioE(scenarioContext, supabase, logger);
                  break;
                default:
                  throw new Error(`Cenário não suportado: ${activeScenario}`);
              }
              
              const executionTime = Date.now() - startTime;
              
              // Adaptar resultado de volta para formato inline
              const adaptedResult = adaptScenarioResult(activeScenario, scenarioResult);
              
              // Log de performance
              logger.info("✅ Cenário refatorado executado com sucesso", {
                scenario: activeScenario,
                executionTime,
                nextStep: adaptedResult.nextFlowState,
                messageLength: adaptedResult.message?.length || 0
              });
              
              // Retornar resposta
              return new Response(
                JSON.stringify({ 
                  ok: true, 
                  agent: "support_tech",
                  message: adaptedResult.message,
                  scenario: activeScenario,
                  usedRefactored: true
                }),
                { 
                  status: 200, 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                }
              );
            }
          } catch (refactoredError) {
            logger.error("❌ Erro no cenário refatorado - fallback para inline", {
              scenario: activeScenario,
              error: refactoredError instanceof Error ? refactoredError.message : String(refactoredError)
            });
            // Continuar com código inline (não fazer nada, vai cair nos ifs abaixo)
          }
        }
      }
      
      // ============================================================================
      // 📜 INLINE SCENARIOS - Original monolithic code (fallback)
      // ============================================================================

      // 🔴 CENÁRIO A: Fluxo de diagnóstico de energia
      // Detectar Cenário A pelo flowState (mais confiável que scenario)
      const isCenarioA = (typeof continueFlowState === "string" && continueFlowState.startsWith("cenario_a")) || scenario === "A";
      
      if (isCenarioA && continueFlowState) {
        logger.info("Processando Cenário A - Fluxo de Energia", { 
          flowState: continueFlowState,
          scenario,
          approvedVariations: approvedExamples.length || 0,
          context: "Seguindo protocolo de energia com variações aprovadas como referência"
        });

        // Detectores de resposta (melhorados para capturar variações naturais)
        const isNegation = /\b(n[ãa]o|nao|nn?|nem)\b/i.test(currentMessage);
        
        const saysOff = /(apag(ad[oa]s?|ou)|sem luz|desligad[oa]s?|tud[oa] (apagad|desligad|escur)|escur[oa])/i.test(currentMessage) ||
          (isNegation && /(aces[ao]s?|acesas|acessas|piscando)/i.test(currentMessage));
        
        // Detectar confirmação de energia ou que as luzes voltaram/acenderam
        const saysPowerAvailable = (
          // Confirmações diretas
          (/(sim|s[ií]|ok|claro|com certeza|t[aá]|tem|j[aá]|est[aáã]|funcion)/i.test(currentMessage) &&
           /(ligad[oa]s?|na tomada|conectad|energia|luz|for[cç]a|corrente|plug(ad)?)/i.test(currentMessage)) ||
          // Luzes voltaram/acenderam (implica que energia voltou)
          /(volt(ou|aram)|acend(eu|eram)|funcion(ou|ando)|normal(iz)?)/i.test(currentMessage) &&
          /(luz(es)?|equipamento|internet|tudo)/i.test(currentMessage)
        );
        
        const hasRedLightBlinking = /(sim|s[ií]|t[aá]|tem|est[aáã]|aparec)/i.test(currentMessage) &&
          /(vermelh[oa]|los|pisca(nd[oa])?|intermitente)/i.test(currentMessage);
        
        const noRedLight = isNegation && /(vermelh[oa]|los|pisca)/i.test(currentMessage);
        
        const fiberReconnected = /(reconect(ei|ado)|tirei\s*e\s*(re)?coloquei|manipul(ei|ado)|fiz|terminei|test(ei|ado))/i.test(currentMessage) &&
          /(conector|fibra|verde|cabo)/i.test(currentMessage);
        
        // Detectar sucesso: luz verde OU resolução
        const lightTurnedGreen = (
          // Luz verde específica
          (/(sim|s[ií]|verde|parou|fixa|ok|funcionou)/i.test(currentMessage) &&
           /(verde|parou|luz|fixa)/i.test(currentMessage)) ||
          // Resoluções gerais: voltou, funcionou, resolveu
          /(volt(ou|aram)|resolv(eu|ido)|funcion(ou|ando)|t[aá] (funcionando|online|ok|normal)|conseg[ou])/i.test(currentMessage)
        );
        
        const lightStillRed = (isNegation || /continua|ainda/i.test(currentMessage)) &&
          /(vermelh[oa]|pisca)/i.test(currentMessage);

        // ETAPA 1: Verificar se luzes estão acesas (Priority #3 - Cobertura completa)
        if (flowState === "cenario_a_verificar_luzes") {
          const lightInterpretation = await hybridInterpret(currentMessage, {
            regexDetectors: {
              confirmed: /(sim|s[ií]|aces[ao]s?|acesas|ligad|pisca|verde)/i,
              denied: /(n[ãa]o|nao|apag|deslig|sem\s+luz|escur|tud[oa]\s+(apag|deslig))/i
            },
            similarityPhrases: {
              confirmed: [
                "sim estão acesas",
                "as luzes estão ligadas",
                "tem luz sim",
                "está piscando",
                "tem luzes acesas"
              ],
              denied: [
                "não tem luz",
                "está tudo apagado",
                "sem nenhuma luz",
                "tudo escuro",
                "apagadas"
              ]
            },
            aiContext: {
              expectedAction: "verificar se as luzes do equipamento estão acesas ou apagadas",
              previousAgentMessage: "As luzes do equipamento estão acesas ou apagadas?"
            }
          });
          
          logger.info("Interpretação híbrida - Luzes", {
            result: lightInterpretation.result,
            confidence: lightInterpretation.confidence,
            method: lightInterpretation.method
          });
          
          // Buscar mensagens aprovadas para usar textos customizados
          const approvedMessages = await getApprovedSimulations(supabase, 'energia');
          
          if (lightInterpretation.result === 'negou' && lightInterpretation.confidence >= 0.6) {
            // Luzes apagadas → Verificar energia
            const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_a_verificar_energia');
            responseMessage = approvedQuestion || `Entendi! Se as luzes do equipamento não estão acesas, vamos verificar a energia. 🔌\n\nPor favor, confira:\n\n1️⃣ **Equipamento está ligado na tomada?** ✅\n2️⃣ **Fonte de energia está conectada?** 🔌\n3️⃣ **Botão Power está ligado (se houver)?** 💡\n4️⃣ **Tem energia elétrica no local?** Teste com outro aparelho\n\nMe avise após verificar!`;
            
            await logger.info("🎯 Usando texto aprovado para verificar_energia", {
              conversation_id,
              usando_aprovado: !!approvedQuestion
            });
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: "cenario_a_verificar_energia",
                  clarification_attempts: 0 // Reset contador
                }
              })
              .eq("id", conversation_id);
              
          } else if (lightInterpretation.result === 'confirmou' && lightInterpretation.confidence >= 0.6) {
            // Luzes acesas → Pular para verificação de luz vermelha
            const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_a_verificar_luz_vermelha');
            responseMessage = approvedQuestion || `Ok! As luzes estão acesas. 💡\n\nAgora verifique se a **luz LOS (vermelha)** está **PISCANDO** no equipamento.\n\nObs.: a luz PON normalmente é **VERDE** (fixa ou piscando).\n\nVocê está vendo a luz LOS piscando? 🔴`;
            
            await logger.info("🎯 Usando texto aprovado para verificar_luz_vermelha", {
              conversation_id,
              usando_aprovado: !!approvedQuestion
            });
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: "cenario_a_verificar_luz_vermelha",
                  clarification_attempts: 0 // Reset contador
                }
              })
              .eq("id", conversation_id);
          } else {
            // Resposta ambígua - incrementar contador
            const newAttempts = clarificationAttempts + 1;
            responseMessage = `Desculpe, não entendi se você está dizendo que as luzes estão **ACESAS** (ligadas, piscando) ou **APAGADAS** (sem nenhuma luz). 🤔\n\nPor favor, me responda apenas:\n- **"acesas"** se tem alguma luz ligada\n- **"apagadas"** se não tem nenhuma luz`;
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  clarification_attempts: newAttempts,
                  last_clarification_step: flowState
                }
              })
              .eq("id", conversation_id);
          }
        }
        
        // ETAPA 2: Verificar energia (após confirmar luzes apagadas)
        else if (flowState === "cenario_a_verificar_energia") {
          // Usar sistema híbrido para interpretar resposta
          const interpretation = await hybridInterpret(currentMessage, {
            regexDetectors: {
              confirmed: /(sim|s[ií]|ok|claro|com certeza|t[aá]|tem|j[aá]|est[aáã]|funcion|volt(ou|aram)|acend(eu|eram)|normal)/i,
              denied: /\b(n[ãa]o|nao|nn?|nem)\b/i
            },
            similarityPhrases: {
              confirmed: [
                "sim está ligado",
                "está na tomada",
                "tem energia",
                "voltou a energia",
                "as luzes acenderam",
                "está funcionando",
                "tudo ligado"
              ],
              denied: [
                "não tem energia",
                "está desligado",
                "não está ligado",
                "sem energia"
              ]
            },
            aiContext: {
              expectedAction: "verificar se o equipamento está com energia elétrica",
              previousAgentMessage: "Por favor, confira: Equipamento está ligado na tomada? Fonte de energia está conectada?"
            }
          });
          
          logger.info("Interpretação híbrida - Energia", {
            result: interpretation.result,
            confidence: interpretation.confidence,
            method: interpretation.method,
            reasoning: interpretation.reasoning
          });
          
          // Buscar mensagens aprovadas
          const approvedMessages = await getApprovedSimulations(supabase, 'energia');
          
          if (interpretation.result === 'confirmou' && interpretation.confidence >= 0.6) {
            // Energia OK → Verificar luz vermelha
            const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_a_verificar_luz_vermelha');
            responseMessage = approvedQuestion || `Ok! O equipamento está com energia. 💡\n\nAgora verifique se a **luz LOS (vermelha)** está **PISCANDO** no equipamento.\n\nObs.: a luz PON normalmente é **VERDE** (fixa ou piscando).\n\nVocê está vendo a luz LOS piscando? 🔴`;
            
            await logger.info("🎯 Usando texto aprovado para verificar_luz_vermelha", {
              conversation_id,
              usando_aprovado: !!approvedQuestion
            });
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: "cenario_a_verificar_luz_vermelha"
                }
              })
              .eq("id", conversation_id);
          } else if (interpretation.result === 'negou' && interpretation.confidence >= 0.6) {
            // Sem energia → Orientar cliente a resolver energia primeiro
            responseMessage = `Entendi! Parece que o problema é na energia elétrica. ⚡\n\nAntes de continuar, você precisa:\n1️⃣ Verificar o disjuntor\n2️⃣ Testar outra tomada\n3️⃣ Garantir que há energia no local\n\nAssim que tiver energia, me avise que continuo o diagnóstico!`;
          } else {
            // Incerto → Pedir clarificação com mais detalhe
            const newAttempts = clarificationAttempts + 1;
            responseMessage = `Desculpe, não entendi se você está dizendo que o equipamento **TEM ENERGIA** (está ligado na tomada e funcionando) ou **NÃO TEM ENERGIA** (sem energia elétrica). 🤔\n\nPor favor, me responda:\n- **"tem energia"** se o equipamento está ligado e com luz\n- **"sem energia"** se não tem energia no local`;
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  clarification_attempts: newAttempts,
                  last_clarification_step: flowState
                }
              })
              .eq("id", conversation_id);
          }
        }
        
        // ETAPA 3: Verificar luz vermelha LOS/PON (Priority #3)
        else if (flowState === "cenario_a_verificar_luz_vermelha") {
          const redLightInterpretation = await hybridInterpret(currentMessage, {
            regexDetectors: {
              confirmed: /(sim|s[ií]|t[aá]|tem|est[aáã]|aparec|vermelh|los|pisca)/i,
              denied: /(n[ãa]o|nao|nem|verde|normal|fixa)/i
            },
            similarityPhrases: {
              confirmed: [
                "sim está piscando",
                "tem luz vermelha",
                "o los está vermelho",
                "está piscando vermelho",
                "tem uma luz vermelha piscando"
              ],
              denied: [
                "não tem luz vermelha",
                "está verde",
                "não está piscando",
                "tudo normal"
              ]
            },
            aiContext: {
              expectedAction: "verificar se a luz LOS (vermelha) está piscando no equipamento",
              previousAgentMessage: "Você está vendo a luz LOS (vermelha) piscando no equipamento?"
            }
          });
          
          logger.info("Interpretação híbrida - Luz Vermelha", {
            result: redLightInterpretation.result,
            confidence: redLightInterpretation.confidence,
            method: redLightInterpretation.method
          });
          
          // Buscar mensagens aprovadas
          const approvedMessages = await getApprovedSimulations(supabase, 'energia');
          
          if (redLightInterpretation.result === 'confirmou' && redLightInterpretation.confidence >= 0.6) {
            // Tem luz vermelha → Instruir manipulação do conector
            const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_a_aguardando_manipulacao');
            responseMessage = approvedQuestion || `Perfeito! Essa luz vermelha indica problema no sinal da fibra óptica. 🔴\n\nVou te enviar as instruções para tentar resolver:\n\n⚠️ **ATENÇÃO ao manusear:**\n- Segure o conector pela **BASE** (não pelo cabo)\n- Retire com **cuidado** (não force)\n- **Não dobre** o cabo\n- Reconecte **firmemente** até ouvir um 'click'\n\n📋 **Passo a passo:**\n1️⃣ Localize o cabo fino (fibra óptica) - é um cabo bem fininho que entra no equipamento\n2️⃣ **Retire** com cuidado o conector que está encaixado\n3️⃣ **Recoloque firmemente** - empurre o conector de volta até ouvir um 'click'\n4️⃣ Aguarde **1 minuto** para sincronização\n5️⃣ Veja se a luz ficou **VERDE FIXA**\n\nMe avise quando terminar! 🔧`;
            
            await logger.info("🎯 Usando texto aprovado para aguardando_manipulacao", {
              conversation_id,
              usando_aprovado: !!approvedQuestion
            });
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: "cenario_a_aguardando_manipulacao",
                  clarification_attempts: 0 // Reset
                }
              })
              .eq("id", conversation_id);
          } else if (redLightInterpretation.result === 'negou' && redLightInterpretation.confidence >= 0.6) {
            // Não tem luz vermelha → Abrir ticket
            logger.info("Cenário A: Cliente sem luz vermelha - abrindo ticket");
            
            // Executar tools configuradas (criar_atendimento_ixc)
            if (ixc_client_id) {
              const toolResults = await executeConfiguredTools(
                supabase,
                logger,
                "cenario_a_sem_luz_vermelha", // step específico
                "energia", // subject fallback
                {
                  ixc_client_id,
                  customer_name: customerName,
                  ticket_subject: "Equipamento offline sem sinal óptico",
                  ticket_description: `Cliente ${customerName} reportou equipamento offline. Diagnóstico: luzes acesas mas sem luz vermelha LOS. Possível problema no equipamento ou fibra.`,
                  ticket_priority: "high"
                }
              );
              
              if (toolResults.ticket_created) {
                logger.info("Ticket criado via tools configuradas", { ticket_id: toolResults.ticket_id });
              }
            }
            
            responseMessage = `Ok! Se não há luz vermelha mas o equipamento continua sem conexão, vou abrir um atendimento técnico prioritário. 🔧\n\nNossa equipe vai entrar em contato para agendar uma visita e resolver isso o mais rápido possível.\n\nPreciso de mais alguma coisa agora?`;
            
            await supabase
              .from("conversations")
              .update({
                status: "active",
                department: "tecnico",
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  needs_human_transfer: true,
                  transfer_reason: "sem_luz_vermelha_equipamento_offline"
                }
              })
                .eq("id", conversation_id);
          } else {
            // Incerto → Explicação detalhada
            const newAttempts = clarificationAttempts + 1;
            responseMessage = `Desculpe, não entendi se você está vendo ou não a luz vermelha. 🤔\n\nOlhe no equipamento e me diga:\n- **"sim"** se você VÊ a luz **LOS (vermelha)** **PISCANDO**\n- **"não"** se NÃO TEM luz **LOS vermelha** piscando e a **PON está VERDE/fixa**`;
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  clarification_attempts: newAttempts,
                  last_clarification_step: flowState
                }
              })
              .eq("id", conversation_id);
          }
        }
        
        // ETAPA 4: Aguardando manipulação do conector (Priority #3)
        else if (flowState === "cenario_a_aguardando_manipulacao") {
          const manipulationInterpretation = await hybridInterpret(currentMessage, {
            regexDetectors: {
              confirmed: /(reconect|tirei|coloquei|manipul|fiz|terminei|test|pront|feito|ok)/i,
              denied: /(n[ãa]o|nao|ainda|espera|aguard)/i
            },
            similarityPhrases: {
              confirmed: [
                "já fiz",
                "já reconectei",
                "terminei de fazer",
                "pronto",
                "feito",
                "manipulei o cabo"
              ],
              denied: [
                "ainda não fiz",
                "ainda não mexi",
                "não consegui"
              ]
            },
            aiContext: {
              expectedAction: "manipular (retirar e reconectar) o cabo de fibra óptica do equipamento",
              previousAgentMessage: "Retire e reconecte o conector da fibra. Me avise quando terminar!"
            }
          });
          
          logger.info("Interpretação híbrida - Manipulação", {
            result: manipulationInterpretation.result,
            confidence: manipulationInterpretation.confidence,
            method: manipulationInterpretation.method
          });
          
          // Buscar mensagens aprovadas
          const approvedMessages = await getApprovedSimulations(supabase, 'energia');
          
          if (manipulationInterpretation.result === 'confirmou' && manipulationInterpretation.confidence >= 0.6) {
            // Cliente manipulou o conector → Verificar resultado
            const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_a_verificar_resultado_manipulacao');
            responseMessage = approvedQuestion || `Perfeito! Aguarde mais **1 minuto** para sincronização completa. ⏳\n\nAgora me diga: a luz **LOS** parou de **PISCAR** e ficou **VERDE FIXA**?`;
            
            await logger.info("🎯 Usando texto aprovado para verificar_resultado_manipulacao", {
              conversation_id,
              usando_aprovado: !!approvedQuestion
            });
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: "cenario_a_verificar_resultado_manipulacao",
                  clarification_attempts: 0 // Reset
                }
              })
              .eq("id", conversation_id);
          } else if (manipulationInterpretation.result === 'negou' && manipulationInterpretation.confidence >= 0.6) {
            // Cliente não fez ainda
            responseMessage = `Ok! Sem pressa. 😊\n\nQuando você retirar e reconectar o cabo de fibra, me avise para continuar o diagnóstico! 🔧`;
          } else {
            // Incerto
            const newAttempts = clarificationAttempts + 1;
            responseMessage = `Desculpe, não entendi se você já fez o procedimento. 🤔\n\nVocê já **RETIROU e RECONECTOU** o cabo de fibra do equipamento?\n\nMe responda:\n- **"sim"** ou **"feito"** se já fez\n- **"não"** se ainda não fez`;
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  clarification_attempts: newAttempts,
                  last_clarification_step: flowState
                }
              })
              .eq("id", conversation_id);
          }
        }
        
        // ETAPA 5: Verificar resultado após manipulação
        else if (flowState === "cenario_a_verificar_resultado_manipulacao") {
          // Usar sistema híbrido para interpretar resultado
          const resultInterpretation = await hybridInterpret(currentMessage, {
            regexDetectors: {
              confirmed: /(sim|s[ií]|verde|parou|fixa|ok|funcionou|volt(ou|aram)|resolv(eu|ido)|conseg[ou])/i,
              denied: /(n[ãa]o|nao|continua|ainda).*?(vermelh[oa]|pisca)/i
            },
            similarityPhrases: {
              confirmed: [
                "ficou verde",
                "parou de piscar",
                "luz fixa agora",
                "voltou",
                "funcionou",
                "resolveu",
                "está normal",
                "consigo navegar"
              ],
              denied: [
                "continua vermelha",
                "ainda piscando",
                "não resolveu",
                "não funcionou"
              ]
            },
            aiContext: {
              expectedAction: "verificar se a luz LOS parou de piscar e ficou verde fixa após manipular o cabo de fibra",
              previousAgentMessage: "Agora me diga: a luz LOS parou de PISCAR e ficou VERDE FIXA?"
            }
          });
          
          logger.info("Interpretação híbrida - Resultado", {
            result: resultInterpretation.result,
            confidence: resultInterpretation.confidence,
            method: resultInterpretation.method,
            reasoning: resultInterpretation.reasoning
          });
          
          // Buscar mensagens aprovadas
          const approvedMessages = await getApprovedSimulations(supabase, 'energia');
          
          if (resultInterpretation.result === 'confirmou' && resultInterpretation.confidence >= 0.6) {
            // Luz ficou verde → Consultar IXC para verificar se voltou online
            logger.info("Cenário A: Luz ficou verde - consultando IXC");
            
            let isOnlineNow = false;
            
            // Executar tools configuradas (test-equipment-connectivity)
            const toolResults = await executeConfiguredTools(
              supabase,
              logger,
              "cenario_a_verificar_resultado", // step específico
              "energia", // subject fallback
              {
                ixc_client_id,
                customer_name: customerName
              }
            );
            
            if (toolResults.test_connectivity_result) {
              isOnlineNow = toolResults.test_connectivity_result.is_online || false;
              logger.info("Resultado consulta via tools configuradas", { isOnlineNow });
            }
            
            if (isOnlineNow) {
              // Cliente voltou online → Perguntar se consegue navegar
              const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_a_verificar_navegacao');
              const questionText = approvedQuestion || `Ótimo! Você já está **online** novamente! 🎉\n\nConsegue navegar na internet normalmente?`;
              responseMessage = await textReplyWithContext(
                supabase,
                { conversation_id, flowState },
                questionText
              ).then(r => r.json()).then(j => j.reply);
              
              await logger.info("🎯 Usando texto aprovado para verificar_navegacao", {
                conversation_id,
                usando_aprovado: !!approvedQuestion
              });
              
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: "cenario_a_verificar_navegacao",
                  clarification_attempts: 0 // Reset
                }
              })
              .eq("id", conversation_id);
          } else {
            // Continua offline → Abrir ticket
              logger.info("Cenário A: Luz verde mas continua offline - abrindo ticket");
              
              // Executar tools configuradas (criar_atendimento_ixc)
              if (ixc_client_id) {
                await executeConfiguredTools(
                  supabase,
                  logger,
                  "cenario_a_luz_verde_offline", // step específico
                  "energia", // subject fallback
                  {
                    ixc_client_id,
                    customer_name: customerName,
                    ticket_subject: "Equipamento com sinal mas offline",
                    ticket_description: `Cliente ${customerName} manipulou conector de fibra, luz ficou verde mas equipamento continua offline. Necessário verificação técnica.`,
                    ticket_priority: "high"
                  }
                );
              }
              
              responseMessage = `Entendi. A luz ficou verde mas você ainda está sem conexão. 🔧\n\nVou abrir uma chamada técnica prioritária. Nossa equipe vai verificar o problema na rede e entrar em contato com você.\n\nEnquanto isso, preciso de mais alguma coisa?`;
              
              await supabase
                .from("conversations")
                .update({
                  status: "active",
                  department: "tecnico",
                  metadata: {
                    ...(currentConversation?.metadata as any || {}),
                    needs_human_transfer: true,
                    transfer_reason: "luz_verde_mas_offline"
                  }
                })
                .eq("id", conversation_id);
            }
          } else if (resultInterpretation.result === 'negou' && resultInterpretation.confidence >= 0.6) {
            // Luz continua vermelha → Pedir foto + ticket + humano
            logger.info("Cenário A: Luz continua vermelha - solicitando foto");
            
            // Executar tools configuradas (criar_atendimento_ixc)
            if (ixc_client_id) {
              await executeConfiguredTools(
                supabase,
                logger,
                "cenario_a_luz_vermelha_persistente", // step específico
                "energia", // subject fallback
                {
                  ixc_client_id,
                  customer_name: customerName,
                  ticket_subject: "Luz vermelha persistente após manipulação",
                  ticket_description: `Cliente ${customerName} manipulou conector de fibra mas luz LOS continua vermelha. Possível problema na fibra ou equipamento. Necessário visita técnica.`,
                  ticket_priority: "urgent"
                }
              );
            }
            
            responseMessage = await textReplyWithContext(
              supabase,
              { conversation_id, flowState },
              `Tudo bem. Se a luz continua vermelha, pode ser um problema mais complexo. 🔴\n\nVocê consegue tirar uma **foto da parte de trás do equipamento** mostrando onde o cabo fino (fibra) está conectado e me enviar?\n\nEnquanto isso, já vou abrir um chamado técnico prioritário. Pode ser necessário o deslocamento de um técnico.`
            ).then(r => r.json()).then(j => j.reply);
            
            await supabase
              .from("conversations")
              .update({
                status: "active",
                department: "tecnico",
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  needs_human_transfer: true,
                  transfer_reason: "luz_vermelha_persistente",
                  awaiting_photo: true
                }
              })
              .eq("id", conversation_id);
          } else {
            responseMessage = await textReplyWithContext(
              supabase,
              { conversation_id, flowState },
              `Desculpe, não entendi. 🤔\n\nA luz **parou de piscar** e ficou **VERDE FIXA**?\n\nOu continua **VERMELHA**?`
            ).then(r => r.json()).then(j => j.reply);
          }
        }
        
        // ETAPA 6: Verificar navegação (após confirmar que está online)
        else if (flowState === "cenario_a_verificar_navegacao") {
          // Usar sistema híbrido para verificar se consegue navegar
          const navInterpretation = await hybridInterpret(currentMessage, {
            regexDetectors: {
              confirmed: /(sim|s[ií]|consigo|funciona|ok|normal|t[aá]|volta)/i,
              denied: /(n[ãa]o|nao|ainda|continua).*?(consigo|funciona|lent|trava)/i
            },
            similarityPhrases: {
              confirmed: [
                "sim consigo",
                "está funcionando",
                "voltou normal",
                "tá tudo ok",
                "navega normal"
              ],
              denied: [
                "não consigo",
                "ainda não funciona",
                "continua sem internet",
                "não navega"
              ]
            },
            aiContext: {
              expectedAction: "testar se consegue navegar na internet normalmente",
              previousAgentMessage: "Consegue navegar na internet normalmente?"
            }
          });
          
          logger.info("Interpretação híbrida - Navegação", {
            result: navInterpretation.result,
            confidence: navInterpretation.confidence,
            method: navInterpretation.method
          });
          
          if (navInterpretation.result === 'confirmou' && navInterpretation.confidence >= 0.6) {
            // Consegue navegar → Encerrar com sucesso
            responseMessage = `Perfeito! Problema resolvido! 🎉\n\nPreciso de mais alguma coisa?`;
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: "cenario_a_resolvido",
                  clarification_attempts: 0 // Reset
                }
              })
              .eq("id", conversation_id);
          } else if (navInterpretation.result === 'negou' && navInterpretation.confidence >= 0.6) {
            // Não consegue navegar → Ticket + humano
            logger.info("Cenário A: Online mas não navega - abrindo ticket");
            
            // Executar tools configuradas (criar_atendimento_ixc)
            if (ixc_client_id) {
              await executeConfiguredTools(
                supabase,
                logger,
                "cenario_a_online_sem_navegacao", // step específico
                "energia", // subject fallback
                {
                  ixc_client_id,
                  customer_name: customerName,
                  ticket_subject: "Cliente online mas sem navegação",
                  ticket_description: `Cliente ${customerName} está online no sistema mas não consegue navegar. Possível problema de configuração ou DNS.`,
                  ticket_priority: "high"
                }
              );
            }
            
            responseMessage = `Entendi. Você está online mas não consegue acessar sites. 🔧\n\nVou abrir um chamado técnico para verificar isso. Nossa equipe vai entrar em contato.\n\nEnquanto isso, tente:\n1️⃣ Fechar e abrir o navegador\n2️⃣ Desligar e ligar o Wi-Fi do celular/computador\n\nMe avise se resolver!`;
            
            await supabase
              .from("conversations")
              .update({
                status: "active",
                department: "tecnico",
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  needs_human_transfer: true,
                  transfer_reason: "online_mas_nao_navega"
                }
              })
              .eq("id", conversation_id);
          } else {
            // Incerto → Explicação detalhada
            const newAttempts = clarificationAttempts + 1;
            responseMessage = await textReplyWithContext(
              supabase,
              { conversation_id, flowState },
              `Desculpe, não entendi se a internet está funcionando. 🤔\n\nPor favor, tente abrir um site (como Google ou YouTube) e me diga:\n- **"sim"** se você CONSEGUE navegar e abrir sites\n- **"não"** se NÃO CONSEGUE acessar a internet`
            ).then(r => r.json()).then(j => j.reply);
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  clarification_attempts: newAttempts,
                  last_clarification_step: flowState
                }
              })
              .eq("id", conversation_id);
          }
        }
        
        // Inserir mensagem do Cenário A
        if (responseMessage) {
          const { error: insertErr } = await insertAgentMessageOnce(supabase, conversation_id, responseMessage);
          
          if (insertErr) {
            logger.error("Erro ao inserir mensagem do Cenário A", { error: (insertErr as any).message });
            throw insertErr as any;
          }
          
          logger.info("Luan respondeu ao cliente no Cenário A", { flowState });
        }
      }
      
      // ===== CENÁRIO A APRIMORADO: TX/RX = 0.00 → Energia + LOS =====
      const txRxZero = (currentConversation?.metadata as any)?.signal_data?.tx === 0.00 &&
                       (currentConversation?.metadata as any)?.signal_data?.rx === 0.00;
      
      // Detectar entrada no Cenário A
      if (txRxZero && !flowState?.waiting_step && !isCenarioA) {
        logger.info("🔴 Detectado TX/RX = 0.00 → Iniciando Cenário A Aprimorado");
        
        await supabase
          .from("conversations")
          .update({
            metadata: {
              ...(currentConversation?.metadata as any || {}),
              flow_state: {
                ...((currentConversation?.metadata as any)?.flow_state || {}),
                waiting_step: "scenario_a_check_power",
                ixc_client_id: ixcClientId
              }
            }
          })
          .eq("id", conversation_id);

        await supabase.from("registros_de_monitoramento").insert({
          acao: "scenario_a_detected",
          fluxo: "support-tech",
          conversation_id,
          detalhes: withGeo({ signal: "0.00/0.00" }, flowState)
        });

        responseMessage = "Vamos fazer uma checagem rápida por aqui ✅\n\nRapidinho, só para garantir:\n\n• A tomada funciona? (mesmo se tiver filtro de linha)\n• A fonte está bem encaixada?\n• O botão Power está ligado?\n• Nenhum cabo frouxo?\n• Não está ligado em uma extensão com defeito?\n\nMe avise quando tudo estiver OK 🙏";
      }
      
      // ===== HANDLERS DO CENÁRIO A APRIMORADO =====
      const scenarioAStep = (currentConversation?.metadata as any)?.flow_state?.waiting_step;
      
      if (scenarioAStep === "scenario_a_check_power") {
        const interpretation = await hybridInterpret(lastUserMessage, {
          regexDetectors: {
            confirmed: /(sim|s[ií]|ok|j[aá]|fiz|tudo|certinho|ligad|conectad)/i,
            denied: /(n[ãa]o|sem energia|apagad|desligad)/i
          },
          similarityPhrases: {
            confirmed: ["sim, tudo ok", "já conferi", "tudo certo", "tá ligado"],
            denied: ["não", "sem luz", "apagado", "desligado"]
          }
        });

        if (interpretation.intent === "confirmed") {
          await supabase
            .from("conversations")
            .update({
              metadata: {
                ...(currentConversation?.metadata as any || {}),
                flow_state: {
                  ...((currentConversation?.metadata as any)?.flow_state || {}),
                  waiting_step: "scenario_a_check_los"
                }
              }
            })
            .eq("id", conversation_id);

          await supabase.from("registros_de_monitoramento").insert({
            acao: "scenario_a_power_confirmed",
            fluxo: "support-tech",
            conversation_id,
            detalhes: withGeo({ confidence: interpretation.confidence }, flowState)
          });

          // >>> PR #14 — MediaGuided LOS
          const replyText = "Obrigado 🙏\n\nAgora, consegue ver para mim:\n\n🚨 A luz **LOS (vermelha)** está **PISCANDO**?\n\nIsso me ajuda a saber se o problema está na fibra 👍";
          
          await textReplyWithContext(
            supabase,
            conversation_id,
            replyText,
            { waiting_step: "scenario_a_check_los" },
            "los_detected"
          );
          
          return new Response(JSON.stringify({
            reply: replyText,
            media_context: "los_detected"
          }), { headers: corsHeaders });
          // <<< PR #14 ✅
        }
        
        // Cliente informou que equipamento está DESLIGADO
        else if (interpretation.intent === "denied") {
          await supabase.from("registros_de_monitoramento").insert({
            acao: "scenario_a_power_denied",
            fluxo: "support-tech",
            conversation_id,
            detalhes: withGeo({ confidence: interpretation.confidence }, flowState)
          });

          // Manter no mesmo step para aguardar cliente ligar o equipamento
          const replyText = "Ok, por favor, **LIGUE o equipamento na tomada** e certifique-se de que o botão Power está ligado (se houver).\n\nAguarde 1-2 minutos para o equipamento sincronizar com a rede.\n\nVeja se alguma luz acendeu no aparelho e me avise 🙏";
          
          return new Response(JSON.stringify({
            reply: replyText
          }), { headers: corsHeaders });
        }
      }
      
      else if (scenarioAStep === "scenario_a_check_los") {
        const lower = lastUserMessage.toLowerCase();
        const losPisc = /(los.*pisc|vermelh.*pisc|pisc.*vermelh|vermelh.*intermit)/i.test(lower);

        await supabase.from("registros_de_monitoramento").insert({
          acao: "scenario_a_check_los",
          fluxo: "support-tech",
          conversation_id,
          detalhes: withGeo({ losPisc }, flowState)
        });

        if (losPisc) {
          await supabase
            .from("conversations")
            .update({
              metadata: {
                ...(currentConversation?.metadata as any || {}),
                flow_state: {
                  ...((currentConversation?.metadata as any)?.flow_state || {}),
                  waiting_step: "scenario_a_optical"
                }
              }
            })
            .eq("id", conversation_id);

          // >>> PR #14 — MediaGuided Fibra
          const replyTextLos = "Entendi ✅ A luz LOS piscando indica que a fibra pode estar solta.\n\nVeja como reconectar o conector verde com cuidado 👇";
          
          await textReplyWithContext(
            supabase,
            conversation_id,
            replyTextLos,
            { waiting_step: "scenario_a_optical" },
            "fiber_reconnect"
          );
          
          return new Response(JSON.stringify({
            reply: replyTextLos,
            media_context: "fiber_reconnect"
          }), { headers: corsHeaders });
          // <<< PR #14 ✅
        } else {
          // Energia OK + sem LOS → reconectar fibra preventivamente
          await supabase
            .from("conversations")
            .update({
              metadata: {
                ...(currentConversation?.metadata as any || {}),
                flow_state: {
                  ...((currentConversation?.metadata as any)?.flow_state || {}),
                  waiting_step: "scenario_a_optical"
                }
              }
            })
            .eq("id", conversation_id);

          // >>> PR #14 — MediaGuided Fibra
          const replyTextFiber = "Vamos conferir o conector verde para garantir a fibra ✅\n\nVeja como reconectar com cuidado 👇";
          
          await textReplyWithContext(
            supabase,
            conversation_id,
            replyTextFiber,
            { media_context: "fiber_reconnect" }
          );
          
          return new Response(JSON.stringify({
            reply: replyTextFiber,
            media_context: "fiber_reconnect"
          }), { headers: corsHeaders });
          // <<< PR #14 ✅
        }
      }
      
      else if (scenarioAStep === "scenario_a_optical") {
        const interpretation = await hybridInterpret(lastUserMessage, {
          regexDetectors: {
            confirmed: /(fiz|reconect|terminei|pronto|ok)/i
          },
          similarityPhrases: {
            confirmed: ["já fiz", "reconectei", "terminei", "pronto"]
          }
        });

        if (interpretation.intent === "confirmed") {
          const ixcId = (currentConversation?.metadata as any)?.flow_state?.ixc_client_id;
          
          await supabase.from("registros_de_monitoramento").insert({
            acao: "scenario_a_fiber_reconnected",
            fluxo: "support-tech",
            conversation_id
          });

          const { data: afterOptic } = await supabase.functions.invoke("test-equipment-connectivity", {
            body: { ixc_client_id: ixcId }
          });

          await supabase.from("registros_de_monitoramento").insert({
            acao: "scenario_a_post_optical_test",
            fluxo: "support-tech",
            conversation_id,
            detalhes: withGeo({ connectivity_ok: afterOptic?.ok === true }, flowState)
          });

          if (afterOptic?.ok === true) {
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: {
                    ...((currentConversation?.metadata as any)?.flow_state || {}),
                    waiting_step: "scenario_a_success"
                  }
                }
              })
              .eq("id", conversation_id);

            // KPI: Cenário A resolvido (non-blocking)
            kpiLog({
              action: "kpi_update",
              conversation_id,
              scenario_completed: "A",
              hybrid_mode: (currentConversation?.metadata as any)?.flow_state?.hybrid_mode_active ? "ON" : "OFF",
              resolved: true,
              escalated: false,
            });

            responseMessage = "Perfeito ✅ Pode testar a navegação agora e me dizer se voltou?";
            
            // ✅ CORREÇÃO #1: Salvar pergunta para anti-fuga
            await updateFlowState(supabase, { conversation_id, flowState }, {
              last_agent_question: "A internet voltou a funcionar?"
            });
          } else {
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: {
                    ...((currentConversation?.metadata as any)?.flow_state || {}),
                    waiting_step: "scenario_a_fail_escalate"
                  }
                }
              })
              .eq("id", conversation_id);

            responseMessage = "Ainda sem conexão? Vou abrir um atendimento para seguir 🚀";
          }
        }
      }
      
      else if (scenarioAStep === "scenario_a_fail_escalate") {
        const ixcId = (currentConversation?.metadata as any)?.flow_state?.ixc_client_id;
        
        logger.info("Criando ticket IXC - Cenário A persistente", { ixc_client_id: ixcId });

        const { data: ticketData, error: ticketError } = await supabase.functions.invoke("ixc-integration", {
          body: {
            action: "criar_atendimento",
            id_cliente: ixcId,
            assunto: "Falha persistente após diagnóstico completo",
            descricao: `Cliente ${customerName} sem conexão. Cenário A concluído: energia OK, fibra reconectada, mas equipamento não responde. TX/RX = 0.00.`,
            prioridade: "alta"
          }
        });

        await supabase
          .from("conversations")
          .update({
            metadata: {
              ...(currentConversation?.metadata as any || {}),
              flow_state: {
                ...((currentConversation?.metadata as any)?.flow_state || {}),
                waiting_step: null,
                scenario_completed: "A",
                ticket_created: !ticketError
              }
            }
          })
          .eq("id", conversation_id);

        await supabase.from("registros_de_monitoramento").insert({
          acao: "scenario_a_ticket_created",
          fluxo: "support-tech",
          conversation_id,
          detalhes: withGeo({ 
            ticket_id: ticketData?.id_atendimento,
            success: !ticketError 
          }, flowState)
        });

        // KPI: Cenário A escalado (non-blocking)
        kpiLog({
          action: "kpi_update",
          conversation_id,
          scenario_completed: "A",
          hybrid_mode: (currentConversation?.metadata as any)?.flow_state?.hybrid_mode_active ? "ON" : "OFF",
          resolved: false,
          escalated: true,
          ticket_id: ticketData?.id_atendimento ?? null,
        });

        if (!ticketError && ticketData?.id_atendimento) {
          responseMessage = `✅ Protocolo IXC: ${ticketData.id_atendimento}\n\nNossa equipe técnica já vai agir 🚀`;
        } else {
          responseMessage = "✅ Atendimento registrado!\n\nNossa equipe técnica já vai agir 🚀";
        }
      }

      // >>> PR #8 v3 — CENÁRIO D: RX CRÍTICO (≤ -28 dBm) COM URGÊNCIA ===
      // Ordem de prioridade: A → D → C → B
      const massOutageActive = massOutageContext.active;
      const signal = (currentConversation?.metadata as any)?.signal_data;
      
      // D0: DETECÇÃO AUTOMÁTICA DE SINAL CRÍTICO
      if (
        !massOutageActive &&
        !flowState?.waiting_step &&
        signal &&
        Number.isFinite(Number(signal?.rx)) &&
        Number(signal?.rx) <= -28 // RX crítico
      ) {
        await supabase
          .from("conversations")
          .update({
            metadata: {
              ...(currentConversation?.metadata as any || {}),
              flow_state: {
                ...((currentConversation?.metadata as any)?.flow_state || {}),
                waiting_step: "scenario_d_open_ticket",
                ixc_client_id: ixcClientId,
                scenario_started: "D"
              }
            }
          })
          .eq("id", conversation_id);

        await logAudit({
          action: "scenario_d_detected",
          fluxo: "support-tech",
          conversation_id,
          detalhes: { 
            rx: Number(signal?.rx), 
            tx: Number(signal?.tx) 
          },
          supabaseClient: supabase
        });

        kpiLog({
          action: "scenario_detected",
          fluxo: "support-tech",
          conversation_id,
          scenario_completed: "D",
          rx_dbm: Number(signal?.rx),
          tx_dbm: Number(signal?.tx),
        }).catch(() => {}); // Non-blocking

        // PR19 ✅: Registrar sinal crítico + marcar aging
        const rx = Number(signal?.rx);
        const tx = Number(signal?.tx);
        
        trackOnuSnapshot(supabase, {
          conversation_id,
          ixc_client_id: ixcClientId,
          onu_serial: signal?.serial || signal?.onu_serial || null,
          rx_dbm: Number.isFinite(rx) ? rx : null,
          tx_dbm: Number.isFinite(tx) ? tx : null,
          status: 'critical',
          source: 'signal_tool'
        });

        markAgingEvent(supabase, {
          conversation_id,
          step: 'scenario_d_start',
          meta: { scenario: 'D', reason: 'critical_signal', rx, tx }
        });

        responseMessage = await textReply(
          `Sinal óptico **muito baixo** 😕  
Vou abrir um atendimento **com prioridade máxima** agora mesmo! ⏳🔧`
        );
      }

      // D1: ABRIR TICKET URGENTE E FINALIZAR
      if (waitingStep === "scenario_d_open_ticket") {
        const ixcId = (currentConversation?.metadata as any)?.flow_state?.ixc_client_id;
        
        if (!ixcId) {
          logger.warn("Cenário D: ixc_client_id não encontrado, não é possível criar ticket");
          
          await supabase
            .from("conversations")
            .update({
              metadata: {
                ...(currentConversation?.metadata as any || {}),
                flow_state: {
                  ...((currentConversation?.metadata as any)?.flow_state || {}),
                  waiting_step: null,
                  scenario_completed: "D",
                  ticket_created: false
                }
              }
            })
            .eq("id", conversation_id);

          responseMessage = await textReply(
            `✅ Atendimento URGENTE registrado!  
Nossa equipe técnica já está atuando com prioridade máxima ⚡`
          );
        } else {
          const { data, error } = await supabase.functions.invoke("ixc-integration", {
            body: {
              action: "criar_atendimento",
              id_cliente: ixcId,
              assunto: "Sinal crítico RX",
              descricao: `Sinal crítico RX <= -28 dBm. Necessária visita técnica urgente.`,
              prioridade: "alta" // ✅ compatível com IXC
            }
          });

          await supabase
            .from("conversations")
            .update({
              metadata: {
                ...(currentConversation?.metadata as any || {}),
                flow_state: {
                  ...((currentConversation?.metadata as any)?.flow_state || {}),
                  waiting_step: null,
                  scenario_completed: "D",
                  ticket_created: !error,
                  ixc_ticket_id: data?.id_atendimento || null
                }
              }
            })
            .eq("id", conversation_id);

          await logAudit({
            action: "scenario_d_ticket_created",
            fluxo: "support-tech",
            conversation_id,
            detalhes: { 
              ticket_id: data?.id_atendimento, 
              success: !error 
            },
            supabaseClient: supabase
          });

          kpiLog({
            action: "ticket_created",
            fluxo: "support-tech",
            conversation_id,
            scenario_completed: "D",
            hybrid_mode: (currentConversation?.metadata as any)?.flow_state?.hybrid_mode_active ? "ON" : "OFF",
            resolved: false,
            escalated: true,
            ticket_id: data?.id_atendimento ?? null,
            rx_dbm: Number(signal?.rx),
            tx_dbm: Number(signal?.tx),
          }).catch(() => {}); // Non-blocking

          responseMessage = await textReply(
            data?.id_atendimento
              ? `Prontinho! ✅ Protocolo IXC: **${data.id_atendimento}**  
Nossa equipe técnica vai te atender com urgência máxima 🚀`
              : `✅ Atendimento registrado!  
Nossa equipe técnica já está a caminho de uma solução ⚡`
          );
        }
      }
      // <<< PR #8 v3 CENÁRIO D COMPLETO ===

      // 🔵 CENÁRIO B: Fluxo de equipamento travado (sinal OK)
      const isCenarioB = scenario === "B" || flowState?.waiting_step?.startsWith("scenario_b");
      
      if (isCenarioB && waitingStep) {
        logger.info("Processando Cenário B - Equipamento Travado", { 
          waitingStep,
          scenario
        });

        const userMsgCenarioB = message || "";
        
        // >>> PR7: CENÁRIO B — CONFIRMAÇÃO DO DESLIGA/LIGA (B2)
        if (waitingStep === "scenario_b_wait_restart" || waitingStep === "scenario_b_power_cycle_request") {
          const interpret = await hybridInterpret(userMsgCenarioB || "", {
            regexDetectors: {
              confirmed: /(pronto|liguei|já liguei|ok|feito|terminei|reinic|desliguei)/i,
              denied: /(n[ãa]o|nao fiz|ainda n)/i,
              already: /(já fiz|fiz isso|tentei antes|mil vezes)/i
            },
            similarityPhrases: {
              confirmed: ["já liguei", "terminei", "pronto"],
              denied: ["ainda não"],
              already: ["já fiz isso"]
            }
          });

          await logB(supabase, conversation_id, "scenario_b_power_cycle_ack", { intent: interpret?.intent, confidence: interpret?.confidence });

          if (interpret?.intent === "denied") {
            responseMessage = "Sem problemas! Pode fazer agora, por favor? 😉 Depois me avise aqui.";
          } else {
            // Confirmado ou já fez — segue para pós-ação
            await setWaitingStep(supabase, conversation_id, currentConversation?.metadata, "scenario_b_post_reboot_test", {});
            responseMessage = "Perfeito! Vou validar aqui rapidinho se estabilizou. ⏳";
          }
        }
        // <<< PR7

        // >>> PR7: CENÁRIO B — TESTE PÓS-AÇÃO E ROTEAMENTO ADAPTATIVO (B3)
        else if (waitingStep === "scenario_b_post_reboot_test") {
          // 1) Recoleta de sinal + teste de conectividade
          const ixcId = (currentConversation?.metadata as any)?.flow_state?.ixc_client_id || ixc_client_id;
          const testConn = await safeTestConnectivity(supabase, ixcId);
          const reachable = testConn?.data?.ok === true;

          // 🔄 Buscar sinal fresco após reinício para decisão precisa
          const { data: freshSignal } = await supabase.functions.invoke("get_onu_signal_status", {
            body: { client_id: ixcId }
          });
          const refreshedSignal = freshSignal?.signal || signal;
          await logB(supabase, conversation_id, "scenario_b_post_reboot_probe", { reachable, signal: refreshedSignal });

          // 2) Decisão adaptativa
          if (isZeroSignal(refreshedSignal)) {
            // Virou A: sem energia ou desconectado
            await setWaitingStep(supabase, conversation_id, currentConversation?.metadata, null, { scenario_redirect: "A" });
            responseMessage = `Opa, aqui ficou sem sinal óptico (TX/RX zerados).  
Vou ajustar o fluxo pra resolver isso rapidinho. ✅`;
          } else {
            // Checa indícios de LOS por texto do cliente (se respondeu)
            const lower = (lastUserMessage || "").toLowerCase();
            const losPisc = /(los.*pisc|vermelh.*pisc|pisc.*vermelh|vermelh.*intermit)/i.test(lower);

            if (losPisc) {
              // Virou C: mau contato/atenuação
              await setWaitingStep(supabase, conversation_id, currentConversation?.metadata, "scenario_c_optical", {});
              responseMessage = `Entendi. A luz vermelha **LOS** piscando indica falha no sinal da fibra.  
Vamos fazer o ajuste no conector verde rapidinho 👍`;
            } else if (reachable) {
              // Sucesso remoto
              await setWaitingStep(supabase, conversation_id, currentConversation?.metadata, null, { scenario_completed: "B" });
              responseMessage = `Que ótimo! 👏  
Só me confirma, você já está conseguindo **navegar normalmente** aí? 👌`;
              await logB(supabase, conversation_id, "scenario_b_success", { reachable: true });
              
              // KPI: Cenário B resolvido
              kpiLog({
                action: "kpi_update",
                conversation_id,
                scenario_completed: "B",
                hybrid_mode: (currentConversation?.metadata as any)?.flow_state?.hybrid_mode_active ? "ON" : "OFF",
                resolved: true,
                escalated: false,
              });
            } else {
              // Persistiu travamento: abre atendimento técnico no IXC
              const ticket = await supabase.functions.invoke("ixc-integration", {
                body: {
                  action: "criar_atendimento",
                  id_cliente: ixcId,
                  assunto: "Equipamento travado mesmo após reinício (sinal óptico bom)",
                  descricao: "Cliente com RX > -24 dBm. Reinício manual orientado e teste posterior falhou. Persistem sintomas de travamento.",
                  prioridade: "alta"
                }
              });

              await setWaitingStep(supabase, conversation_id, currentConversation?.metadata, null, { scenario_completed: "B", ticket_created: !ticket?.error, ixc_ticket_id: ticket?.data?.id_atendimento || null });
              responseMessage = ticket?.data?.id_atendimento
                ? `Entendido. Registrei um atendimento para você.  
**Protocolo IXC:** ${ticket.data.id_atendimento}  
Nossa equipe técnica vai atuar na sua linha. 🔧`
                : `Registrei o atendimento técnico e nossa equipe vai atuar na sua linha. 🔧`;
              await logB(supabase, conversation_id, "scenario_b_ticket_created", { success: !ticket?.error, ticket_id: ticket?.data?.id_atendimento || null });
              
              // KPI: Cenário B escalado
              kpiLog({
                action: "kpi_update",
                conversation_id,
                scenario_completed: "B",
                hybrid_mode: (currentConversation?.metadata as any)?.flow_state?.hybrid_mode_active ? "ON" : "OFF",
                resolved: false,
                escalated: true,
                ticket_id: ticket?.data?.id_atendimento ?? null,
              });
            }
          }
        }
        // <<< PR7
        
        // Inserir mensagem do Cenário B
        if (responseMessage && typeof responseMessage === "string") {
          const { error: insertErr } = await insertAgentMessage(conversation_id, responseMessage);
          
          if (insertErr) {
            logger.error("Erro ao inserir mensagem do Cenário B", { error: insertErr.message });
            throw insertErr;
          }
          
          logger.info("Luan respondeu ao cliente no Cenário B", { waitingStep });
        }
      }
      
      // ===== PREPARAR DADOS DE SINAL PARA CENÁRIOS =====
      const lastSignalData = (currentConversation?.metadata as any)?.signal_data;
      const txDbm = lastSignalData?.tx_dbm ?? lastSignalData?.tx ?? null;
      const rxDbm = lastSignalData?.rx_dbm ?? lastSignalData?.rx ?? null;
      
      // ===== B1: DETECTAR ENTRADA NO CENÁRIO B (SINAL BOM + PROBLEMA DE NAVEGAÇÃO) =====
      const signalGood = typeof rxDbm === "number" && rxDbm > -24 && typeof txDbm === "number" && txDbm > 0;
      const userReportsConnectivityIssue = /(nao carrega|não carrega|nao abre|não abre|lento|nao funciona|não funciona|trav|parou|sem net|cai|nao navega|não navega|congelou|travou|intermit|instavel|instável|oscila|perde|perdendo|desconect|sem internet|ruim|não acessa|nao acessa|não está navegando|nao esta navegando)/i
        .test((lastUserMessage ?? "").toLowerCase());

      if (signalGood && userReportsConnectivityIssue && !flowState?.waiting_step && !isCenarioA) {
        logger.info("🟢 Detectado sinal bom + problema de navegação → Iniciando Cenário B", {
          tx: txDbm,
          rx: rxDbm,
          user_message: lastUserMessage
        });
        
        await supabase
          .from("conversations")
          .update({
            metadata: {
              ...(currentConversation?.metadata as any || {}),
              flow_state: {
                ...((currentConversation?.metadata as any)?.flow_state || {}),
                waiting_step: "scenario_b_wait_restart",
                ixc_client_id: ixc_client_id
              }
            }
          })
          .eq("id", conversation_id);

        await supabase.from("registros_de_monitoramento").insert({
          acao: "scenario_b_auto_trigger",
          fluxo: "support-tech",
          conversation_id,
          detalhes: {
            rxDbm,
            txDbm,
            user_message: lastUserMessage,
            trigger_reason: "signal_good_but_connectivity_issue"
          }
        });

        await logAudit({
          action: "kpi_update",
          conversation_id,
          detalhes: {
            scenario: "B",
            trigger: "auto",
            hybrid_mode: isHybridEnabled,
            signal_quality: "good",
            timestamp: new Date().toISOString()
          },
          supabaseClient: supabase
        });

        const responseMessage =
          "Vejo que o sinal está bom, mas você está com problema de navegação 🔍\n\n" +
          "Vamos tentar resolvê-lo rapidinho ✅\n\n" +
          "Desligue e ligue o roteador da tomada e espere 1 minuto 👍\n" +
          "Me avise quando estiver pronto!";

        const { error: insertErr } = await insertAgentMessage(conversation_id, responseMessage);
        
        if (insertErr) {
          logger.error("Erro ao inserir mensagem do Cenário B", { error: insertErr.message });
          throw insertErr;
        }
        
        return textReply(responseMessage);
      }
      
      // ===== CENÁRIO D: SINAL CRÍTICO (RX <= -28) =====
      const isCriticalSignal = typeof rxDbm === "number" && rxDbm <= -28;

      if (isCriticalSignal && !flowState?.waiting_step) {
        logger.info("🔴 SINAL CRÍTICO detectado → Cenário D", {
          rx: rxDbm,
          threshold: -28
        });

        await supabase.from("registros_de_monitoramento").insert({
          acao: "scenario_d_detected",
          fluxo: "support-tech",
          conversation_id,
          detalhes: withGeo({ rxDbm, threshold: -28 }, flowState)
        });

        await supabase
          .from("conversations")
          .update({
            metadata: {
              ...(currentConversation?.metadata as any || {}),
              flow_state: {
                ...((currentConversation?.metadata as any)?.flow_state || {}),
                waiting_step: "scenario_d_open_ticket",
                ixc_client_id: ixc_client_id
              }
            }
          })
          .eq("id", conversation_id);

        responseMessage = 
          "Aqui é grave 😕\n" +
          "O sinal óptico da sua fibra está bem abaixo do normal.\n" +
          "Vou acionar nossa equipe técnica AGORA ⚠️\n\n" +
          "Só um instante… 🔧";

        await insertAgentMessage(conversation_id, responseMessage);

        return textReply(responseMessage);
      }

      // ===== AÇÕES DO TICKET DO CENÁRIO D =====
      if (flowState?.waiting_step === "scenario_d_open_ticket") {
        const ixcId = flowState?.ixc_client_id;

        logger.info("Abrindo ticket urgente para Cenário D", { 
          ixcId, 
          rxDbm 
        });

        const { data: ticketData, error: ticketError } =
          await supabase.functions.invoke("ixc-integration", {
            body: {
              action: "criar_atendimento",
              id_cliente: ixcId,
              assunto: "Sinal crítico de fibra óptica",
              descricao: `Sinal RX muito fraco: ${rxDbm} dBm. Necessária intervenção urgente.`,
              prioridade: "urgente"
            }
          });

        await supabase
          .from("conversations")
          .update({
            metadata: {
              ...(currentConversation?.metadata as any || {}),
              flow_state: {
                ...((currentConversation?.metadata as any)?.flow_state || {}),
                waiting_step: null,
                scenario_completed: "D",
                ticket_created: !ticketError
              }
            }
          })
          .eq("id", conversation_id);

        await supabase.from("registros_de_monitoramento").insert({
          acao: "scenario_d_ticket_created",
          fluxo: "support-tech",
          conversation_id,
          detalhes: withGeo({ 
            rxDbm,
            success: !ticketError,
            ticket_id: ticketData?.id_atendimento
          }, flowState)
        });

        // KPI: Cenário D escalado (non-blocking)
        kpiLog({
          action: "kpi_update",
          conversation_id,
          scenario_completed: "D",
          hybrid_mode: (currentConversation?.metadata as any)?.flow_state?.hybrid_mode_active ? "ON" : "OFF",
          resolved: false,
          escalated: true,
          ticket_id: ticketData?.id_atendimento ?? null,
          rx_dbm: rxDbm ?? null,
        });

        if (!ticketError && ticketData?.id_atendimento) {
          responseMessage = 
            `✅ Protocolo IXC: ${ticketData.id_atendimento}\n\n` +
            "Nossa equipe vai atuar na sua fibra com máxima prioridade! 🚀";
        } else {
          responseMessage = 
            "✅ Atendimento registrado!\n" +
            "Nossa equipe técnica vai atuar com urgência! 🚀";
        }

        await insertAgentMessage(conversation_id, responseMessage);

        return textReply(responseMessage);
      }

      // >>> PR #12A - DETECÇÃO DE FRUSTRAÇÃO PROGRESSIVA ✅
      const userMsgFrustration = message || "";
      const msg = userMsgFrustration.toLowerCase();
      
      // Verificar se já foi transferido para humano
      if (flowState?.transferred_to_human) {
        return textReply("Um atendente humano já está cuidando do seu caso! 🙏");
      }

      const frustrationRegex = /(voc[eê] (n[aã]o|nem)|isso [aíe] um absurdo|que inferno|que saco|pelo amor de deus|cansei|rid[ií]culo|n[aã]o aguento|estou esperando|não funciona nunca|desisto|fala com humano|quero pessoa)/i;

      let frustrationDetected = false;

      // Regras extras de "irritação progressiva"
      if ((flowState?.irritation_score || 0) >= 3) {
        frustrationDetected = true;
      }

      if (frustrationRegex.test(msg)) {
        frustrationDetected = true;
      }

      // Aumenta pontuação em cada sinal de frustração
      if (frustrationDetected) {
        await updateFlowState(supabase, { conversation_id, flowState }, {
          irritation_score: (flowState?.irritation_score || 0) + 1
        });

        await logAudit({
          fluxo: "support-tech",
          acao: "irritation_detected",
          conversation_id,
          detalhes: withGeo({
            msg: lastUserMessage,
            irritation_score: (flowState?.irritation_score || 0) + 1
          }, flowState),
          supabaseClient: supabase
        });
      }
      // <<< PR #12A ✅

      // >>> PR #12B - ESCALAÇÃO SEGURA PARA HUMANO ✅
      if ((flowState?.irritation_score || 0) >= 4) {
        const clientName = currentConversation?.customer_name?.split(' ')[0] || "amigo";

        await updateFlowState(supabase, { conversation_id, flowState }, {
          waiting_step: null,
          scenario_completed: "HUMANO",
          transferred_to_human: true,
          transfer_reason: "client_frustration"
        });

        // Atualizar apenas status da conversation (transferred_to_human já está em agent_flow_states)
        await supabase
          .from("conversations")
          .update({ status: "awaiting_human" })
          .eq("id", conversation_id);

        await logAudit({
          fluxo: "support-tech",
          acao: "transferred_human_frustration",
          conversation_id,
          detalhes: withGeo({
            score: flowState?.irritation_score,
            client_name: clientName
          }, flowState),
          supabaseClient: supabase
        });

        // KPI: Transferência por frustração
        kpiLog({
          action: "kpi_update",
          conversation_id,
          scenario_completed: "HUMANO",
          hybrid_mode: (currentConversation?.metadata as any)?.flow_state?.hybrid_mode_active ? "ON" : "OFF",
          resolved: false,
          escalated: true,
          transfer_reason: "frustration"
        }).catch(() => {}); // Non-blocking

        return textReply(
          `Poxa 😞\n\nEu realmente sinto muito pelo transtorno, ${clientName}.\n\nVou pedir para um atendente humano continuar e resolver isso com você!\n\nSó um instante, por favor 🙏`
        );
      }
      // <<< PR #12B ✅

      // >>> PR #12 FASE 2 - DETECÇÃO DE LOOP DE MENSAGENS REPETIDAS ✅
      const previousMessages = flowState?.recent_messages || [];
      const normalized = lastUserMessage.trim().toLowerCase().replace(/[!?.,]/g, '');
      
      // Regex de mensagens de baixa informação
      const lowInfo = /^(oi+|eai+|\?|al[oô]|al[oô]\?|tem algu[eé]m\??|responde|socorro|boa tarde|bom dia|boa noite|ol[aá])$/i;
      const isLowInfo = lowInfo.test(normalized);
      
      // Verificar se as últimas 2 mensagens são iguais à atual
      const isRepeated = previousMessages.length >= 2 && 
                        previousMessages.slice(-2).every(m => m === normalized);
      
      // Sempre atualizar histórico de mensagens recentes (últimas 5)
      await updateFlowState(supabase, { conversation_id, flowState }, {
        recent_messages: [...previousMessages.slice(-4), normalized]
      });
      
      // Se é loop, incrementar contador
      if (isLowInfo || isRepeated) {
        const loopCount = (flowState?.loop_count || 0) + 1;
        
        await updateFlowState(supabase, { conversation_id, flowState }, {
          loop_count: loopCount
        });
        
        await logAudit({
          fluxo: "support-tech",
          acao: "loop_detected",
          conversation_id,
          detalhes: withGeo({
            loop_count: loopCount,
            message: normalized,
            is_low_info: isLowInfo,
            is_repeated: isRepeated
          }, flowState),
          supabaseClient: supabase
        });
        
        // Após 5 loops, transferir para humano
        if (loopCount >= 5) {
          const clientName = currentConversation?.customer_name?.split(' ')[0] || "amigo";
          
          await updateFlowState(supabase, { conversation_id, flowState }, {
            waiting_step: null,
            scenario_completed: "HUMANO",
            transferred_to_human: true,
            transfer_reason: "message_loop",
            loop_count: loopCount
          });
          
          // Atualizar apenas status da conversation (transferred_to_human já está em agent_flow_states)
          await supabase
            .from("conversations")
            .update({ status: "awaiting_human" })
            .eq("id", conversation_id);
          
          await logAudit({
            fluxo: "support-tech",
            acao: "transferred_human_loop",
            conversation_id,
            detalhes: withGeo({
              loop_count: loopCount,
              client_name: clientName
            }, flowState),
            supabaseClient: supabase
          });
          
          // KPI: Transferência por loop
          kpiLog({
            action: "kpi_update",
            conversation_id,
            scenario_completed: "HUMANO",
            hybrid_mode: (currentConversation?.metadata as any)?.flow_state?.hybrid_mode_active ? "ON" : "OFF",
            resolved: false,
            escalated: true,
            transfer_reason: "message_loop"
          }).catch(() => {}); // Non-blocking
          
          return textReply(
            `Oi ${clientName}! 👋\n\nVejo que está com dificuldade de explicar o problema.\n\nVou chamar um atendente humano para te ajudar melhor! 🙋\n\nSó um instante, por favor...`
          );
        }
        
        // Após 3 loops, pedir mais detalhes
        if (loopCount >= 3) {
          return textReplyWithContext(
            supabase,
            { conversation_id, flowState },
            `Oi! Estou aqui 👋\n\nPara eu te ajudar, preciso saber:\n\n1️⃣ A internet está **lenta** ou **sem sinal**?\n2️⃣ Está funcionando **agora**?\n\nMe conta aí! 💬`
          );
        }
      } else {
        // Mensagem válida - resetar contador de loop
        await updateFlowState(supabase, { conversation_id, flowState }, {
          loop_count: 0
        });
      }
      // <<< PR #12 FASE 2 ✅

      // >>> PR #13 — ANTI-FUGA DE FLUXO ✅
      const activeStep = flowState?.waiting_step;
      const userMsgAntiEscape = message || "";

      // Se há um diagnóstico em andamento e cliente muda de assunto
      if (activeStep && flowState?.scenario_started) {

        // Palavras que indicam cooperação técnica
        const cooperationWords = /(sim|já|ok|pronto|fiz|reconect|deslig|reinic|test|voltou|funciona|piscando|energia|los|verde|luz|roteador|modem)/i;
        
        // Palavras que indicam mudança de assunto (financeiro/comercial)
        const unrelatedTopic = /(boleto|contrato|plano|preço|valor|quanto.*custa|instala[cç][aã]o|cancel|mudar|financeiro|vendas|upgrade|downgrade|fatura|pagamento)/i;

        // Cliente mudou de assunto?
        if (!cooperationWords.test(lastUserMessage) && unrelatedTopic.test(lastUserMessage)) {

          const warnings = (flowState?.context_warnings || 0) + 1;

          await updateFlowState(supabase, { conversation_id, flowState }, {
            context_warnings: warnings
          });

          // 1️⃣ Primeira tentativa: gentilmente redirecionar
          if (warnings === 1) {
            return await textReplyWithContext(
              supabase,
              { conversation_id, flowState },
              `Já te ajudo com isso 👌\n\nMas antes preciso **finalizar este teste** aqui.\n\nPode me confirmar o que pedi na última mensagem? 😊`
            );
          }

          // 2️⃣ Segunda tentativa: reforço com contexto
          if (warnings === 2) {
            const lastQuestion = flowState?.last_agent_question || "o que pedi antes";
            return await textReplyWithContext(
              supabase,
              { conversation_id, flowState },
              `Prometo que vamos falar disso! 🤝\n\nMas só consigo continuar se você me responder:\n\n👉 ${lastQuestion}`
            );
          }

          // 3️⃣ Terceira vez: transferência humana
          if (warnings >= 3) {
            await updateFlowState(supabase, { conversation_id, flowState }, {
              waiting_step: null,
              transferred_to_human: true,
              transfer_reason: "context_escape"
            });

            // Atualizar apenas status da conversation (transferred_to_human já está em agent_flow_states)
            await supabase
              .from("conversations")
              .update({ status: "awaiting_human" })
              .eq("id", conversation_id);

            await logAudit({
              fluxo: "support-tech",
              acao: "context_escape_transfer",
              conversation_id,
              detalhes: withGeo({
                activeStep,
                scenarioStarted: flowState?.scenario_started,
                warnings
              }, flowState),
              supabaseClient: supabase
            });

            // KPI: Transferência por fuga de contexto
            kpiLog({
              action: "kpi_update",
              conversation_id,
              scenario_completed: "HUMANO",
              hybrid_mode: (currentConversation?.metadata as any)?.flow_state?.hybrid_mode_active ? "ON" : "OFF",
              resolved: false,
              escalated: true,
              extras: { transfer_reason: "context_escape" }
            }).catch(() => {}); // Non-blocking

            return await textReplyWithContext(
              supabase,
              { conversation_id, flowState },
              `Vou te transferir para um atendente humano, ok? 👨‍💼`
            );
          }
        } else {
          // ✅ CORREÇÃO #2: Mensagem válida - resetar contador e registrar cooperação
          const previousWarnings = flowState?.context_warnings || 0;
          
          if (previousWarnings > 0) {
            await updateFlowState(supabase, { conversation_id, flowState }, {
              context_warnings: 0
            });

            // KPI: Cliente voltou a cooperar
            kpiLog({
              action: "context_cooperation",
              conversation_id,
              resolved: null,
              extras: {
                active_flow: activeStep,
                previous_warnings: previousWarnings
              }
            }).catch(() => {}); // Non-blocking
          }
        }
      }
      // <<< PR #13 ✅

      // ===== B1: DETECTAR ENTRADA NO CENÁRIO B (SINAL BOM, MAS CLIENTE RECLAMA) =====
      const scenarioBKeywords = [
        "não carrega", "não abre", "lento", "travou", "travando", "trava",
        "demora", "não funciona", "ruim", "péssimo", "horrível",
        "vídeo não carrega", "netflix", "youtube", "streaming"
      ];
      
      const msgScenarioB = (message || "").toLowerCase();
      const hasScenarioBKeyword = scenarioBKeywords.some(kw => msgScenarioB.includes(kw));
      
      const scenarioBSignal = onu_signal || flowState?.last_signal;
      const isSignalGood = scenarioBSignal && 
        Number(scenarioBSignal?.tx) < 2 && Number(scenarioBSignal?.tx) > -5 &&
        Number(scenarioBSignal?.rx) > -24;
      
      if (
        !massOutageActive &&
        !flowState?.waiting_step &&
        isSignalGood &&
        hasScenarioBKeyword &&
        !flowState?.scenario_started &&
        !flowState?.scenario_started?.startsWith("A")
      ) {
        const geoData = await ensureGeo(
          supabase,
          { conversation_id, flowState },
          ixc_client_id,
          currentConversation?.customer_phone
        );
        
        const newState = await updateFlowState(
          supabase,
          { conversation_id, flowState },
          {
            waiting_step: "scenario_b_confirm_reboot",
            scenario_started: "B",
            ixc_client_id
          }
        );
        
        await logAudit({
          fluxo: "support-tech",
          acao: "scenario_b_detected",
          conversation_id,
          detalhes: {
            rx_dbm: Number(scenarioBSignal?.rx),
            tx_dbm: Number(scenarioBSignal?.tx),
            rx_weak: false,
            cidade: geoData.cidade,
            bairro: geoData.bairro
          },
          supabaseClient: supabase
        });
        
        kpiLog({
          action: "scenario_b_detected",
          fluxo: "support-tech",
          conversation_id,
          extras: { scenario: "B" }
        }).catch(() => {});
        
        responseMessage = 
          `Entendi 👍\n\n` +
          `Parece que o sinal está bom, mas algo travou no equipamento.\n\n` +
          `Pode fazer um teste rapidinho comigo? Vamos **reiniciar o roteador** da internet 🔌\n\n` +
          `Depois teste abrindo um site ou aplicativo e me confirma se voltou?`;
        
        responseMessage = await textReplyWithContext(
          supabase,
          { conversation_id, flowState },
          responseMessage
        ).then(r => r.json()).then(j => j.reply);
        
        // ✅ CORREÇÃO #1: Salvar pergunta para anti-fuga
        await updateFlowState(supabase, { conversation_id, flowState }, {
          last_agent_question: "Já reiniciou o roteador e testou se voltou?"
        });
        
        await insertAgentMessage(conversation_id, responseMessage);
        
        logger.info("Cenário B detectado - sinal bom mas cliente reclama", {
          tx: scenarioBSignal?.tx,
          rx: scenarioBSignal?.rx
        });
        
        return textReply(responseMessage);
      }
      
      // =============================================================================
      // PR#17 - Handler do FAST-PATH CHECK EXPERIENCE
      // =============================================================================
      if (flowState?.waiting_step === "fast_path_check_experience") {
        logger.info("🔄 PR#17: Processando resposta do fast-path");

        // Interpretar resposta do cliente
        const interpretation = await hybridInterpret(
          normalizedMessage,
          "Está funcionando bem ou tem algum problema?"
        );

        if (interpretation.intent === "negou" || interpretation.intent === "problema") {
          // Cliente confirmou que TEM problema
          logger.info("⚠️ PR#17: Cliente confirmou problema - escalando");

          // Auditoria
          await logAudit({
            acao: "fast_path_problem_confirmed",
            fluxo: "support-tech",
            conversation_id,
            detalhes: {
              user_message: normalizedMessage,
              interpretation: interpretation.intent
            },
            supabaseClient: supabase
          });

          // Redirecionar para fluxo diagnóstico completo (Cenário B/C)
          responseMessage = `Entendi. Vamos fazer um diagnóstico completo para identificar o problema. 🔍`;

          await updateFlowState(
            supabase,
            { conversation_id, flowState },
            { waiting_step: "diagnosing_full", scenario: null }
          );

          await insertAgentMessage(conversation_id, responseMessage);

          return textReply(responseMessage);
          
        } else if (interpretation.intent === "confirmou" || interpretation.intent === "funcionando") {
          // Cliente confirmou que está OK
          logger.info("✅ PR#17: Cliente confirmou funcionamento - caso resolvido");

          // KPI de sucesso
          kpiLog({
            action: "fast_path_resolved",
            fluxo: "support-tech",
            conversation_id,
            resolved: true,
            scenario_completed: "FAST",
            extras: {
              pr17_success: true,
              resolution_time_estimate: "< 60s"
            }
          });

          // Auditoria
          await logAudit({
            acao: "fast_path_resolved",
            fluxo: "support-tech",
            conversation_id,
            detalhes: {
              user_message: normalizedMessage,
              interpretation: interpretation.intent,
              resolved: true
            },
            supabaseClient: supabase
          });

          responseMessage = `Ótimo! 🎉  
Fico feliz que está tudo funcionando.

Qualquer coisa, pode me chamar! 👋`;

          await updateFlowState(
            supabase,
            { conversation_id, flowState },
            { resolved: true, waiting_step: null }
          );

          // Fechar conversa
          await supabase
            .from("conversations")
            .update({
              status: "closed",
              resolved_at: new Date().toISOString()
            })
            .eq("id", conversation_id);

          await insertAgentMessage(conversation_id, responseMessage);

          return textReply(responseMessage);
          
        } else {
          // Resposta ambígua - pedir esclarecimento
          logger.warn("❓ PR#17: Resposta ambígua no fast-path");

          responseMessage = `Desculpe, não entendi bem. 🤔  
Me responde com:  
- **"Está funcionando"** se tudo OK  
- **"Tem problema"** se algo não funciona`;

          await insertAgentMessage(conversation_id, responseMessage);
          
          return textReply(responseMessage);
        }
        
        if (interpret.intent === "confirmed" || /voltou|funcionou|resolveu|deu certo/i.test(lastUserMessage)) {
          const geoData = await ensureGeo(
            supabase,
            { conversation_id, flowState },
            ixc_client_id,
            currentConversation?.customer_phone
          );
          
          await updateFlowState(
            supabase,
            { conversation_id, flowState },
            {
              waiting_step: null,
              scenario_completed: "B",
              resolved_remote: true
            }
          );
          
          await logAudit({
            fluxo: "support-tech",
            acao: "scenario_b_resolved",
            conversation_id,
            detalhes: {
              resolved_remote: true,
              cidade: geoData.cidade,
              bairro: geoData.bairro
            },
            supabaseClient: supabase
          });
          
          kpiLog({
            action: "scenario_b_resolved",
            fluxo: "support-tech",
            conversation_id,
            scenario_completed: "B",
            resolved_remote: true
          }).catch(() => {});
          
          // PR19 ✅: Marcar resolução
          markAgingEvent(supabase, {
            conversation_id,
            step: 'resolved',
            meta: { method: 'remote', scenario: 'B' }
          });
          
          const questionText = 
            `✅ Ótimo!\n\n` +
            `Ficou funcionando certinho agora? 🎉\n\n` +
            `Pode testar abrindo um site, Netflix ou YouTube pra confirmar!`;
          
          responseMessage = await textReplyWithContext(
            supabase,
            { conversation_id, flowState },
            questionText
          ).then(r => r.json()).then(j => j.reply);
          
          await insertAgentMessage(conversation_id, responseMessage);
          
          return textReply(responseMessage);
        }
        
        // Se não resolveu ou não confirmou claramente
        await updateFlowState(
          supabase,
          { conversation_id, flowState },
          { waiting_step: "scenario_b_create_ticket" }
        );
        
        const questionText = 
          `Hmm… ainda não voltou? 😕\n\n` +
          `Vou pedir ajuda da nossa equipe técnica então 👇`;
        
        responseMessage = await textReplyWithContext(
          supabase,
          { conversation_id, flowState },
          questionText
        ).then(r => r.json()).then(j => j.reply);
        
          await insertAgentMessage(conversation_id, responseMessage);
          
          return textReply(responseMessage);
      }
      
      // ===== B3: CRIAR TICKET (CENÁRIO B) =====
      if (flowState?.waiting_step === "scenario_b_create_ticket") {
        const ixcId = flowState?.ixc_client_id;
        
        if (!ixcId || typeof ixcId !== "string" || ixcId.trim().length === 0) {
          logger.error("IXC client_id ausente no Cenário B - ticket", { flowState });
          
          responseMessage = 
            `✅ Atendimento registrado!\n\n` +
            `Nossa equipe técnica já está cuidando disso 👷`;
        } else {
          logger.info("Criando ticket IXC - Cenário B", { ixc_client_id: ixcId });
          
          const { data: ticketData, error: ticketError } = await supabase.functions.invoke("ixc-integration", {
            body: {
              action: "criar_atendimento",
              id_cliente: ixcId,
              assunto: "Conexão lenta/travada - Sinal OK",
              descricao: `Cliente reporta lentidão ou travamento mesmo com sinal óptico adequado. Cenário B: necessária verificação técnica do equipamento.`,
              prioridade: "media"
            }
          });
          
          const geoData = await ensureGeo(
            supabase,
            { conversation_id, flowState },
            ixcId,
            currentConversation?.customer_phone
          );
          
          await updateFlowState(
            supabase,
            { conversation_id, flowState },
            {
              waiting_step: null,
              scenario_completed: "B",
              ticket_created: true,
              ixc_ticket_id: ticketData?.id_atendimento
            }
          );
          
          await logAudit({
            fluxo: "support-tech",
            acao: "scenario_b_ticket_created",
            conversation_id,
            detalhes: {
              ticket_id: ticketData?.id_atendimento,
              cidade: geoData.cidade,
              bairro: geoData.bairro
            },
            supabaseClient: supabase
          });
          
          kpiLog({
            action: "scenario_b_completed",
            fluxo: "support-tech",
            conversation_id,
            scenario_completed: "B",
            ticket_id: ticketData?.id_atendimento,
            escalated: true
          }).catch(() => {});
          
          if (!ticketError && ticketData?.id_atendimento) {
            responseMessage = 
              `✅ Protocolo IXC: **${ticketData.id_atendimento}**\n\n` +
              `Nossa equipe técnica vai te atender em instantes! 🚀`;
          } else {
            responseMessage = 
              `✅ Atendimento registrado!\n\n` +
              `Nossa equipe já está cuidando disso 👷`;
          }
        }
        
        await insertAgentMessage(conversation_id, responseMessage);
        
        return textReply(responseMessage);
      }

      // ===== C1: DETECTAR ENTRADA NO CENÁRIO C (SINAL FRACO) =====
      const isWeakSignal = isWeakFromTxRx(txDbm, rxDbm);
      
      // Detectar entrada no Cenário C (sinal fraco mas não zero)
      if (isWeakSignal && !flowState?.waiting_step && !isCenarioA && !isCenarioB) {
        logger.info("🟠 Detectado sinal fraco → Iniciando Cenário C", {
          tx: txDbm,
          rx: rxDbm,
          threshold: "-27 dBm"
        });
        
        await supabase
          .from("conversations")
          .update({
            metadata: {
              ...(currentConversation?.metadata as any || {}),
              flow_state: {
                ...((currentConversation?.metadata as any)?.flow_state || {}),
                waiting_step: "scenario_c_check_instability",
                ixc_client_id: ixc_client_id
              }
            }
          })
          .eq("id", conversation_id);

        await supabase.from("registros_de_monitoramento").insert({
          acao: "scenario_c_detected",
          fluxo: "support-tech",
          conversation_id,
          detalhes: withGeo({ 
            tx: txDbm, 
            rx: rxDbm, 
            threshold_rx_dbm: -27 
          }, flowState)
        });

        const questionText = "Estou vendo que o sinal da fibra está um pouco fraco 🔍\n\n" +
          "Isso pode causar instabilidade às vezes.\n\n" +
          "Você percebe que a conexão cai e volta, ou fica muito lenta em alguns momentos?";
        
        responseMessage = await textReplyWithContext(
          supabase,
          { conversation_id, flowState },
          questionText
        ).then(r => r.json()).then(j => j.reply);
        
        // Inserir mensagem e retornar
        if (responseMessage) {
          await insertAgentMessage(conversation_id, responseMessage);
          
          return new Response(JSON.stringify({ message: responseMessage }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
      
      // 🟠 CENÁRIO C: Fluxo de sinal fraco (TX > 0, RX entre -28 e -24)
      const isCenarioC = scenario === "C" || flowState?.waiting_step?.startsWith("scenario_c");
      const scenarioCStep = (currentConversation?.metadata as any)?.flow_state?.waiting_step;
      
      if (isCenarioC && scenarioCStep) {
        logger.info("Processando Cenário C - Sinal Fraco", { 
          waitingStep: scenarioCStep,
          scenario
        });

        const userMsgCenarioC = message || "";
        
        // ===== Confirmação de instabilidade =====
        if (scenarioCStep === "scenario_c_check_instability") {
          const interpretation = await hybridInterpret(userMsgCenarioC, {
            regexDetectors: {
              confirmed: /(sim|s[ií]|cai|oscil|instavel|lent|trava|intermitent)/i,
              denied: /(n[ãa]o|nao|nem|normal|est[aá]vel)/i
            },
            similarityPhrases: {
              confirmed: [
                "sim, cai e volta",
                "fica caindo",
                "muito instável",
                "oscilando bastante",
                "internet cai toda hora"
              ],
              denied: [
                "não",
                "está normal",
                "não percebi isso",
                "tá estável"
              ]
            }
          });

          await supabase.from("registros_de_monitoramento").insert({
            acao: "scenario_c_instability_response",
            fluxo: "support-tech",
            conversation_id,
            detalhes: { 
              intent: interpretation.intent,
              confidence: interpretation.confidence 
            }
          });

          if (interpretation.intent === "confirmed") {
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: {
                    ...((currentConversation?.metadata as any)?.flow_state || {}),
                    waiting_step: "scenario_c_check_los"
                  }
                }
              })
              .eq("id", conversation_id);

            responseMessage = await textReplyWithContext(
              supabase,
              { conversation_id, flowState },
              "Obrigado! 🙌\n\nAgora me diz:\n\n🚨 A luz **LOS** (vermelha) está **piscando**?\n\n(piscando = falha na fibra)"
            ).then(r => r.json()).then(j => j.reply);
          } else if (interpretation.intent === "denied") {
            // Sem instabilidade percebida → limpar waiting_step
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: {
                    ...((currentConversation?.metadata as any)?.flow_state || {}),
                    waiting_step: null
                  }
                }
              })
              .eq("id", conversation_id);

            await supabase.from("registros_de_monitoramento").insert({
              acao: "scenario_c_instability_denied",
              fluxo: "support-tech",
              conversation_id,
              detalhes: { message: "Cliente negou instabilidade" }
            });

            responseMessage = "Entendi. Vou continuar monitorando o sinal.\n\nSe perceber qualquer oscilação, me avisa 👍";
          }
        }
        
        // ===== Checagem de LOS =====
        else if (scenarioCStep === "scenario_c_check_los") {
          const lower = lastUserMessage.toLowerCase();
          const losPisc = /(los.*pisc|vermelh.*pisc|pisc.*vermelh|vermelh.*intermit)/i.test(lower);

          await supabase.from("registros_de_monitoramento").insert({
            acao: "scenario_c_check_los",
            fluxo: "support-tech",
            conversation_id,
            detalhes: { losPisc }
          });

          if (losPisc) {
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: {
                    ...((currentConversation?.metadata as any)?.flow_state || {}),
                    waiting_step: "scenario_c_optical"
                  }
                }
              })
              .eq("id", conversation_id);

            responseMessage = "Perfeito, isso me ajuda ✅\n\nVamos reconectar o conector verde da fibra com cuidado\ne ver se estabiliza 👍\n\nMe avise quando terminar!";
          } else {
            // Sem LOS piscando mas com sinal fraco → reconectar preventivamente
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: {
                    ...((currentConversation?.metadata as any)?.flow_state || {}),
                    waiting_step: "scenario_c_optical"
                  }
                }
              })
              .eq("id", conversation_id);

            responseMessage = "Entendi 👍\n\nMesmo sem LOS piscando, pode haver mau contato.\n\nVamos reconectar o conector verde para garantir ✅";
          }
        }
        
        // ===== Teste pós reconexão =====
        else if (scenarioCStep === "scenario_c_optical") {
          const interpretation = await hybridInterpret(lastUserMessage, {
            regexDetectors: {
              confirmed: /(fiz|reconect|terminei|pronto|ok)/i
            },
            similarityPhrases: {
              confirmed: ["já fiz", "reconectei", "terminei", "pronto"]
            }
          });

          if (interpretation.intent === "confirmed") {
            const ixcId = (currentConversation?.metadata as any)?.flow_state?.ixc_client_id;
            
            const { data: retest, error: rtErr } = await supabase.functions.invoke("test-equipment-connectivity", {
              body: { ixc_client_id: ixcId }
            });

            // C4: Log detalhado do reteste
            await supabase.from("registros_de_monitoramento").insert({
              acao: "scenario_c_optical_retest",
              fluxo: "support-tech",
              conversation_id,
              detalhes: { 
                ok: retest?.ok === true,
                status: retest?.status ?? null,
                latency_ms: retest?.latency_ms ?? null,
                tx_power: retest?.tx_power ?? null,
                rx_power: retest?.rx_power ?? null,
                error: rtErr ? String(rtErr) : null
              }
            });

            // PR19 ✅: Log retest após reconexão óptica
            logRetest(supabase, {
              conversation_id,
              ixc_client_id: ixcId,
              step: 'post_optical',
              after_ok: retest?.ok === true,
              latency_ms_after: retest?.latency_ms
            });

            if (retest?.ok) {
              await supabase
                .from("conversations")
                .update({
                  metadata: {
                    ...(currentConversation?.metadata as any || {}),
                    flow_state: {
                      ...((currentConversation?.metadata as any)?.flow_state || {}),
                      waiting_step: "scenario_c_success"
                    }
                  }
                })
                .eq("id", conversation_id);

              // KPI: Cenário C resolvido (non-blocking)
              kpiLog({
                action: "kpi_update",
                conversation_id,
                scenario_completed: "C",
                hybrid_mode: (currentConversation?.metadata as any)?.flow_state?.hybrid_mode_active ? "ON" : "OFF",
                resolved: true,
                escalated: false,
              });

              responseMessage = await textReplyWithContext(
                supabase,
                { conversation_id, flowState },
                "Ótimo! ✅\n\nAgora pode testar a navegação e ver se estabilizou, por favor?"
              ).then(r => r.json()).then(j => j.reply);
            } else {
              await supabase
                .from("conversations")
                .update({
                  metadata: {
                    ...(currentConversation?.metadata as any || {}),
                    flow_state: {
                      ...((currentConversation?.metadata as any)?.flow_state || {}),
                      waiting_step: "scenario_c_ticket"
                    }
                  }
                })
                .eq("id", conversation_id);

              responseMessage = await textReplyWithContext(
                supabase,
                { conversation_id, flowState },
                "Ainda instável? Vou pedir para nossa equipe técnica verificar melhor 🔧"
              ).then(r => r.json()).then(j => j.reply);
            }
          }
        }
        
        // ===== Ticket Final =====
        else if (scenarioCStep === "scenario_c_ticket") {
          const ixcId = (currentConversation?.metadata as any)?.flow_state?.ixc_client_id;
          
          logger.info("Criando ticket IXC - Cenário C persistente", { ixc_client_id: ixcId });

          const { data: ticketData, error: ticketError } = await supabase.functions.invoke("ixc-integration", {
            body: {
              action: "criar_atendimento",
              id_cliente: ixcId,
              assunto: "Sinal fraco persistente",
              descricao: `Cliente ${customerName} com instabilidade. Cenário C: sinal fraco (RX entre -28 e -24 dBm) persistente após reconexão óptica. Requer verificação técnica.`,
              prioridade: "media"
            }
          });

          await supabase
            .from("conversations")
            .update({
              metadata: {
                ...(currentConversation?.metadata as any || {}),
                flow_state: {
                  ...((currentConversation?.metadata as any)?.flow_state || {}),
                  waiting_step: null,
                  scenario_completed: "C",
                  ticket_created: !ticketError
                }
              }
            })
            .eq("id", conversation_id);

          await supabase.from("registros_de_monitoramento").insert({
            acao: "scenario_c_ticket_created",
            fluxo: "support-tech",
            conversation_id,
            detalhes: withGeo({ 
              ticket_id: ticketData?.id_atendimento,
              success: !ticketError 
            }, flowState)
          });

          // KPI: Cenário C escalado (non-blocking)
          kpiLog({
            action: "kpi_update",
            conversation_id,
            scenario_completed: "C",
            hybrid_mode: (currentConversation?.metadata as any)?.flow_state?.hybrid_mode_active ? "ON" : "OFF",
            resolved: false,
            escalated: true,
            ticket_id: ticketData?.id_atendimento ?? null,
          });

          if (!ticketError && ticketData?.id_atendimento) {
            responseMessage = `✅ Protocolo IXC: ${ticketData.id_atendimento}\n\nNossa equipe técnica vai atuar na sua linha 🚀`;
          } else {
            responseMessage = "✅ Atendimento registrado!\n\nNossa equipe técnica vai atuar na sua linha 🚀";
          }
        }
        
        // Inserir mensagem do Cenário C
        if (responseMessage && typeof responseMessage === "string") {
          const { error: insertErr } = await insertAgentMessage(conversation_id, responseMessage);
          
          if (insertErr) {
            logger.error("Erro ao inserir mensagem do Cenário C", { error: insertErr.message });
            throw insertErr;
          }
          
          logger.info("Luan respondeu ao cliente no Cenário C", { waitingStep: scenarioCStep });
        }
      }

      // ===== PR #26 - CENÁRIO E: ROTEADOR / PORTA WAN / WI-FI =====
      // Detectar caso em que ONU e sinal óptico estão OK mas internet não funciona
      // Possíveis causas: Wi-Fi, porta WAN sem link, PPPoE down
      // 🔧 Bug #1 Fix: Removido !flowState?.waiting_step para permitir detecção inicial
      // 🔧 Bug #2 Fix: Validação de onu_signal antes de isOpticalGood
      if (!massOutageActive && onu_signal && typeof onu_signal === "object" && isOpticalGood(onu_signal)) {
        // 🔧 Bug #3 Fix: Executar probes antes de usar
        let routerProbe: any = null;
        let netProbe: any = null;
        
        // Tentar usar dados existentes primeiro, senão executar novos probes
        const existingRouterProbe = (currentConversation?.metadata as any)?.probes?.router;
        const existingNetProbe = (currentConversation?.metadata as any)?.probes?.internet;
        
        if (!existingRouterProbe || !existingNetProbe) {
          logger.info("🔍 PR#26: Executando connectivity probe para Scenario E");
          
          try {
            const { data: connectivityData, error: connectivityError } = await supabase.functions.invoke(
              "test-equipment-connectivity", 
              { body: { ixc_client_id, timeout: 5000 } }
            );
            
            if (!connectivityError && connectivityData) {
              routerProbe = {
                reachable: connectivityData.ok === true,
                latency_ms: connectivityData.latency_ms,
                http_status: connectivityData.http_status
              };
              netProbe = {
                dns_ok: connectivityData.dns_ok,
                http_ok: connectivityData.http_ok,
                last_speedtest_ok: connectivityData.last_speedtest_ok
              };
            }
          } catch (probeError) {
            logger.warn("⚠️ PR#26: Erro ao executar connectivity probe", { error: String(probeError) });
          }
        } else {
          routerProbe = existingRouterProbe;
          netProbe = existingNetProbe;
        }
        
        const lastUserText = (message || "").toString();

        const wanSuspect = isLikelyWanDown(routerProbe, netProbe);
        const wifiSuspect = isLikelyWifiIssue(lastUserText);

        if (wanSuspect || wifiSuspect) {
          logger.info("🟠 PR#26: Detectado Scenario E (WAN/Wi-Fi)", { 
            wanSuspect, 
            wifiSuspect,
            hasRouterProbe: !!routerProbe,
            hasNetProbe: !!netProbe
          });

          const geoData = await ensureGeo(
            supabase,
            { conversation_id, flowState },
            ixc_client_id,
            currentConversation?.customer_phone
          );

          await updateFlowState(
            supabase,
            { conversation_id, flowState },
            {
              waiting_step: "scenario_e_check_wifi_led",
              scenario_started: "E",
              ixc_client_id,
              wan_suspect: !!wanSuspect,
              wifi_suspect: !!wifiSuspect
            }
          );

          await supabase.from("registros_de_monitoramento").insert({
            acao: "scenario_e_detected",
            fluxo: "support-tech",
            conversation_id,
            detalhes: withGeo({ 
              wan_suspect: !!wanSuspect, 
              wifi_suspect: !!wifiSuspect 
            }, flowState)
          });

          // 🔧 Bug #4 Fix: Usar textReply diretamente
          responseMessage = "Vamos checar rapidinho o **Wi-Fi do roteador** e o cabo que liga a **porta WAN** (a porta que vai pra caixa da fibra).";

        await insertAgentMessage(conversation_id, responseMessage);
        
        return textReply(responseMessage);
        }
      }

      // ===== E1: CHECAR WI-FI E LED =====
      if (flowState?.waiting_step === "scenario_e_check_wifi_led") {
        await updateFlowState(
          supabase,
          { conversation_id, flowState },
          { waiting_step: "scenario_e_check_wan_cable" }
        );

        // 🔧 Bug #4 Fix: Usar string direta
        responseMessage = "Seu **celular conecta** na rede Wi-Fi mas **não navega**, ou **nem conecta**?\n\n" +
          "E as luzes do **Wi-Fi** no roteador estão **acesas**?\n\n" +
          "Me diga como está, por favor.";

        await insertAgentMessage(conversation_id, responseMessage);

        return textReply(responseMessage);
      }

      // ===== E2: VERIFICAR CABO WAN =====
      if (flowState?.waiting_step === "scenario_e_check_wan_cable") {
        await updateFlowState(
          supabase,
          { conversation_id, flowState },
          { waiting_step: "scenario_e_reseat_wan" }
        );

        // 🔧 Bug #4 Fix: Usar string direta
        responseMessage = "Agora vamos conferir o **cabo da porta WAN** (a que liga o roteador à **caixinha da fibra**):\n\n" +
          "1) Verifique se está **bem encaixado** em ambas as pontas (roteador e caixinha da fibra)\n" +
          "2) Retire e **reconecte** com firmeza (até encaixar bem)\n" +
          "3) Olhe se a luz/ícone de **Internet/WAN** do roteador acende\n\n" +
          "⚠️ Importante: **não** troque esse cabo para uma porta LAN — LAN é para rede interna e **não funciona** como WAN.";

        await insertAgentMessage(conversation_id, responseMessage);

        return textReply(responseMessage);
      }

      // ===== E3: RESEAT FEITO → CONFIRMAR INTERNET =====
      if (flowState?.waiting_step === "scenario_e_reseat_wan") {
        await updateFlowState(
          supabase,
          { conversation_id, flowState },
          { waiting_step: "scenario_e_router_reboot" }
        );

        // 🔧 Bug #4 Fix: Usar string direta
        responseMessage = "Obrigado! Agora vamos **reiniciar apenas o roteador Wi-Fi** (não a caixinha da fibra):\n\n" +
          "• Desligue o **roteador** da tomada\n" +
          "• Aguarde **60 segundos**\n" +
          "• Ligue novamente e aguarde **1 minuto**\n\n" +
          "Depois teste a navegação e me avise.";

        await insertAgentMessage(conversation_id, responseMessage);

        return textReply(responseMessage);
      }

      // ===== E4: PÓS-REBOOT: DECIDIR TICKET =====
      if (flowState?.waiting_step === "scenario_e_router_reboot") {
        // 🔧 Bug #6 Fix: Validar ixc_client_id
        const ixcId = flowState?.ixc_client_id || ixc_client_id;
        
        if (!ixcId) {
          logger.error("❌ PR#26: ixc_client_id não encontrado no flowState", { conversation_id });
          return textReply("Ops, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.");
        }

        // 🔧 Bug #5 Fix: Tratamento de erro para connectivity probe
        let internetOk = false;
        
        try {
          const { data: probe, error: probeError } = await supabase.functions.invoke(
            "test-equipment-connectivity", 
            { body: { ixc_client_id: ixcId } }
          );
          
          if (probeError) {
            logger.warn("⚠️ PR#26: Erro ao executar connectivity probe", { error: String(probeError) });
          } else {
            internetOk = probe?.ok === true;
          }
        } catch (probeException) {
          logger.error("❌ PR#26: Exceção ao executar connectivity probe", { error: String(probeException) });
        }

        await supabase.from("registros_de_monitoramento").insert({
          acao: "scenario_e_post_reboot_probe",
          fluxo: "support-tech",
          conversation_id,
          detalhes: withGeo({ internet_ok: !!internetOk }, flowState)
        });

        if (internetOk) {
          await updateFlowState(
            supabase,
            { conversation_id, flowState },
            { waiting_step: null, scenario_completed: "E" }
          );

          // PR#27: kpiLog agora é void (fire-and-forget)
          kpiLog({
            action: "kpi_update",
            conversation_id,
            scenario_completed: "E",
            hybrid_mode: (currentConversation?.metadata as any)?.flow_state?.hybrid_mode_active ? "ON" : "OFF",
            resolved: true,
            escalated: false,
          });

          // 🔧 Bug #4 Fix: Usar string direta
          responseMessage = "Perfeito! ✅\n\nParece que estabilizou. Se voltar a falhar, me avisa!";
        } else {
          await updateFlowState(
            supabase,
            { conversation_id, flowState },
            { waiting_step: "scenario_e_ticket" }
          );

          // 🔧 Bug #4 Fix: Usar string direta
          responseMessage = "Ainda sem navegação? Vou abrir um atendimento técnico para verificar **porta WAN, cabo ou configuração**.";
        }

        await insertAgentMessage(conversation_id, responseMessage);

        return textReply(responseMessage);
      }

      // ===== E5: TICKET FINAL =====
      if (flowState?.waiting_step === "scenario_e_ticket") {
        // 🔧 Bug #6 Fix: Validar ixc_client_id
        const ixcId = flowState?.ixc_client_id || ixc_client_id;
        
        if (!ixcId) {
          logger.error("❌ PR#26: ixc_client_id não encontrado no flowState", { conversation_id });
          return textReply("Ops, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.");
        }

        const { data, error } = await supabase.functions.invoke("ixc-integration", {
          body: {
            action: "criar_atendimento",
            id_cliente: ixcId,
            assunto: "Sem internet com ONU OK — suspeita de WAN/roteador",
            descricao: "ONU e sinal OK. Roteador responde localmente mas sem internet. Verificar porta WAN, cabo ou config WAN/PPPoE.",
            prioridade: "alta"
          }
        });

        const ticketId = data?.id_atendimento || null;

        await supabase.from("registros_de_monitoramento").insert({
          acao: "scenario_e_ticket_created",
          fluxo: "support-tech",
          conversation_id,
          detalhes: withGeo({ ticket_id: ticketId, success: !error }, flowState)
        });

        await updateFlowState(
          supabase,
          { conversation_id, flowState },
          { waiting_step: null, scenario_completed: "E", ixc_ticket_id: ticketId }
        );

        // PR#27: kpiLog agora é void (fire-and-forget)
        kpiLog({
          action: "kpi_update",
          conversation_id,
          scenario_completed: "E",
          hybrid_mode: (currentConversation?.metadata as any)?.flow_state?.hybrid_mode_active ? "ON" : "OFF",
          resolved: false,
          escalated: true,
          ticket_id: ticketId ?? null,
        });

        responseMessage = ticketId
          ? `✅ Protocolo IXC: **${ticketId}**. Nossa equipe vai verificar a porta WAN/cabo/config do roteador.`
          : "✅ Atendimento registrado! Nossa equipe vai verificar a porta WAN/cabo/config do roteador.";

        await insertAgentMessage(conversation_id, responseMessage);

        return textReply(responseMessage);
      }
      // <<< PR #26 - FIM CENÁRIO E
      
      // 🟡 FLUXOS GENÉRICOS (quando não está em um cenário específico)
      else if (conversationContext.includes("sem internet") || conversationContext.includes("offline")) {
        // Cliente está sem internet
        // Normalizar variações comuns de escrita (com erros de digitação e coloquialismo)
        const isNegation = /\b(n[ãa]o|nao|nn?|nem)\b/i.test(currentMessage);
        const mentionsLight = /(luz(es)?|led(s)?|pon|los|power|lampada|pisca|apag)/i.test(currentMessage);
        
        // Detecta relatos de que o equipamento NÃO LIGA de jeito nenhum
        const cantPowerOn = /((n[ãa]o|nao)\s*(liga|acende|d[aá]\s*sinal|funciona)(\s*de jeito nenhum|\s*nada)?|nao\s*liga|nao\s*acende|morto|queimad[oa]|pifad[oa]|sem\s*sinal\s*de\s*vida)/i.test(currentMessage);
        
        // Detecta "apagado/desligado/sem luz/tudo apagado" + variações de "não acesas"
        const saysOff =
          /(apag(ad[oa]s?|ou)|sem luz|desligad[oa]s?|tud[oa] (apagad|desligad|escur)|escur[oa])/i.test(currentMessage) ||
          (isNegation && /(aces[ao]s?|acesas|acessas|piscando)/i.test(currentMessage)) ||
          /(n[ãa]o\s*(t[aá]|est[aáã]o?)\s*(aces[sa]s?|ligad))/i.test(currentMessage);
        
        // Detecta confirmação de energia: "sim/ok/tá ligado/tem energia/na tomada"
        const saysPowerAvailable =
          /(sim|s[ií]|ok|claro|com certeza|t[aá]|tem|j[aá]|est[aáã]|funcion)/i.test(currentMessage) &&
          /(ligad[oa]s?|na tomada|conectad|energia|luz|for[cç]a|corrente|plug(ad)?)/i.test(currentMessage);
        
        // 🆕 Detecta confirmação de luz vermelha LOS piscando (✅ PON removido)
        const hasRedLightBlinking =
          /(sim|s[ií]|t[aá]|tem|est[aáã]|aparec)/i.test(currentMessage) &&
          /(vermelh[oa]|los|pisca(nd[oa])?|intermitente)/i.test(currentMessage);
        
        // 🆕 Detecta negação de luz vermelha LOS (✅ PON removido)
        const noRedLight =
          isNegation &&
          /(vermelh[oa]|los|pisca)/i.test(currentMessage);
        
        // Detecta conclusão do reboot: "terminei/já liguei/pronto/ok feito"
        const rebootCompleted =
          /(termin(ei|ado|ou)|re(liguei|ligado|conect)|pronto|feito|ok|fiz|j[aá]\s*(liguei|conectei|re(liguei|conect)))/i.test(currentMessage);
        
        // 🆕 Detecta conclusão da manipulação do conector de fibra
        const fiberReconnected =
          /(reconect(ei|ado)|tirei\s*e\s*(re)?coloquei|manipul(ei|ado)|fiz|terminei)/i.test(currentMessage) &&
          /(conector|fibra|verde|cabo)/i.test(currentMessage);

        if (cantPowerOn) {
          // Equipamento não liga de jeito nenhum -> foco total em energia/fonte
          responseMessage = `Entendi! O equipamento não liga de jeito nenhum. Vamos focar na alimentação. 🔌\n\nPor favor, teste:\n\n1️⃣ Conecte em **outra tomada** (de preferência sem filtro/benjamim)\n2️⃣ Verifique se a **fonte original** está bem conectada no roteador e na tomada\n3️⃣ Confira o **botão Power** (se houver) e o **cabo de energia**\n\nSe mesmo assim **não ligar**, me avise aqui que eu **abro um atendimento prioritário** para troca/visita técnica.`;
        } else if (saysOff) {
          // 🔌 FLUXO: Luzes apagadas = Verificação de energia (CENÁRIO A - PARTE 1)
          responseMessage = `Entendi! Se as luzes do equipamento não estão acesas, vamos verificar a energia. 🔌\n\nPor favor, confira:\n\n1️⃣ **Equipamento está ligado na tomada?** ✅\n2️⃣ **Fonte de energia está conectada?** 🔌  \n3️⃣ **Botão Power está ligado (se houver)?** 💡\n4️⃣ **Tem energia elétrica no local?** Teste com outro aparelho\n\nMe avise após verificar!`;
        } else if (hasRedLightBlinking) {
          // 🔴 FLUXO ENERGIA: Cliente confirmou luz LOS vermelha (CENÁRIO A - PARTE 3)
          responseMessage = `Perfeito! Essa luz vermelha indica problema no sinal da fibra óptica. 🔴\n\nVou te enviar as instruções para tentar resolver:\n\n⚠️ **ATENÇÃO ao manusear:**\n- Segure o conector pela **BASE** (não pelo cabo)\n- Retire com **cuidado** (não force)\n- **Não dobre** o cabo\n- Reconecte **firmemente** até ouvir um 'click'\n\n📋 **Passo a passo:**\n1️⃣ Localize o conector **VERDE** (cabo de fibra)\n2️⃣ **Retire** com cuidado o conector que está encaixado\n3️⃣ **Recoloque firmemente** - empurre o conector de volta até ouvir um 'click'\n4️⃣ Aguarde **1 minuto** para sincronização\n5️⃣ Veja se a luz **LOS** parou de **PISCAR** e ficou **VERDE FIXA**\n\nMe avise quando terminar! 🔧`;
        } else if (noRedLight) {
          // Cliente confirmou que NÃO tem luz vermelha piscando - abrir atendimento
          responseMessage = `Ok! Se não há luz vermelha mas o equipamento continua sem conexão, vou abrir um atendimento técnico prioritário. 🔧\n\nNossa equipe vai entrar em contato para agendar uma visita e resolver isso o mais rápido possível.\n\nPreciso de mais alguma coisa agora?`;
        } else if (fiberReconnected) {
          // Cliente concluiu manipulação do conector - verificar resultado
          responseMessage = `Perfeito! Aguarde mais **1 minuto** para sincronização completa. ⏳\n\nMe diga: a luz **LOS** parou de **PISCAR** e ficou **VERDE FIXA**?\n\nE você consegue navegar agora?`;
        } else if (saysPowerAvailable) {
          // 🔌 FLUXO ENERGIA: Cliente confirmou energia OK (CENÁRIO A - PARTE 2)
          const approvedMessages = await getApprovedSimulations(supabase, 'energia');
          const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_a_verificar_luz_vermelha');
          responseMessage = approvedQuestion || `Ok! O equipamento está com energia. 💡\n\nAgora verifique se a **luz LOS (vermelha)** está **PISCANDO** no equipamento.\n\nObs.: a luz PON normalmente é **VERDE** (fixa ou piscando).\n\nVocê está vendo a luz LOS piscando? 🔴`;
          
          await logger.info("🎯 [FLUXO LEGADO] Usando texto aprovado para verificar_luz_vermelha", {
            conversation_id,
            usando_aprovado: !!approvedQuestion
          });
        } else if (rebootCompleted) {
          // Cliente terminou o reboot manual
          responseMessage = `Perfeito! Aguarde mais 1 minuto para sincronização completa. ⏳\n\nEnquanto isso, me diga: **as luzes estabilizaram?** \n\n💡 **PON/LOS** - está verde fixo?  \n⚡ **POWER** - está verde fixo?`;
        } else if ((mentionsLight && !saysOff) || /aces[ao]s?|acesas|acessas/.test(currentMessage)) {
          // Luzes acesas mas sem internet
          responseMessage = "Ok, as luzes estão acesas. Vamos fazer mais alguns testes! 🔍\n\nComo estão as luzes especificamente?\n\n💡 LOS (vermelha) - Indica problema de sinal\n💚 PON/INTERNET (verde) - Indica conexão OK\n⚡ POWER (verde) - Indica energia OK\n\nQuais luzes estão acesas e quais não estão?";
        } else if (currentMessage.includes("sem internet")) {
          // Cliente acabou de reportar o problema - começar troubleshooting
          responseMessage = "Entendi, você está sem internet. Vamos resolver isso! 🔧\n\nPrimeiro passo: As luzes do seu equipamento estão acesas?\n\n💡 Me diga especialmente sobre a luz PON/LOS - está verde ou vermelha?";
        } else {
          responseMessage = "Certo. Vamos continuar o diagnóstico! 🔧\n\nVocê está conectado por cabo de rede ou Wi‑Fi?\n\nIsso vai me ajudar a identificar se o problema é no equipamento ou na conexão sem fio.";
        }

      } else if (conversationContext.includes("lento") || conversationContext.includes("devagar")) {
        // Cliente com internet lenta
        
        // Se enviou imagem de teste de velocidade, usar análise
        if (imageAnalysis) {
          responseMessage = `Vi o seu teste de velocidade! 📊\n\n${imageAnalysis}\n\nBaseado nesses valores, ${
            imageAnalysis.toLowerCase().includes('mbps') && parseInt(imageAnalysis.match(/\d+/)?.[0] || '0') < 100 
              ? "está abaixo do esperado. Vamos investigar!\n\n🔍 Você está conectado por cabo ou Wi-Fi?\n\nSe for Wi-Fi, tente se conectar por cabo para compararmos."
              : "vamos verificar se há algo consumindo banda.\n\n💡 Quantos dispositivos estão conectados agora?\nAlgum fazendo download/streaming?"
          }`;
        } else {
          responseMessage = "Certo, sobre a lentidão... Vamos fazer alguns testes!\n\n📊 Pode fazer um teste de velocidade em www.fast.com e me passar o resultado?\n\nEnquanto isso, me diga:\n1. Está conectado por cabo ou Wi-Fi?\n2. Quantos dispositivos estão conectados agora?";
        }
      } else if (imageAnalysis) {
        // Cliente enviou imagem mas contexto não é claro - usar análise da imagem
        responseMessage = `Vi a imagem que você enviou! 📷\n\n${imageAnalysis}\n\nBaseado nisso, como posso te ajudar?`;
      } else {
        // 🔥 HÍBRIDO SEGURO: Intent/Mood detection com Feature Flag A/B
        const isHybridEnabled = Math.random() < 0.1; // 10% rollout

        if (isHybridEnabled && !isFirstMessage) {
          logger.info("🧠 Camada híbrida ativada - detectando intent e mood");
          
          try {
            // Detectar frustração
            const frustrationResult = detectFrustration(currentMessage);
            
            logger.info("Análise de frustração", {
              is_frustrated: frustrationResult.isFrustrated,
              intensity: frustrationResult.intensity,
              indicators: frustrationResult.indicators
            });

            // Buscar nome do cliente
            const customerName = (currentConversation?.customer_name || "cliente").split(' ')[0];

            // Se cliente irritado, ajustar tom
            if (frustrationResult.isFrustrated && frustrationResult.intensity === 'high') {
              // Cliente muito irritado - ser mais direto e empático
              const approvedReply = await getApprovedScenarioReply(
                supabase,
                "support-tech",
                "resposta_cliente_irritado"
              );

              if (approvedReply && approvedReply.text && approvedReply.id !== "fallback") {
                responseMessage = approvedReply.text.replace("{name}", customerName);
                logger.info("Usando resposta aprovada para cliente irritado", {
                  approved_id: approvedReply.id
                });
              } else {
                responseMessage = `${customerName}, entendo sua frustração. Vamos focar no que resolve agora: me diga exatamente o que está acontecendo e vou priorizar seu atendimento. 🎯`;
              }
            } else {
              // Cliente calmo - usar resposta mais natural
              responseMessage = "Entendi! Vou te ajudar com isso. 🔧\n\nPode me dar mais detalhes sobre o que está acontecendo? Quanto mais informações você me passar, mais rápido conseguimos resolver!";
            }

            logger.info("Resposta híbrida gerada", {
              is_frustrated: frustrationResult.isFrustrated,
              intensity: frustrationResult.intensity,
              response_length: responseMessage.length
            });
          } catch (hybridError) {
            logger.error("Erro na camada híbrida - usando fallback", {
              error: hybridError instanceof Error ? hybridError.message : String(hybridError)
            });
            // Fallback para resposta genérica
            responseMessage = "Entendi! Vou te ajudar com isso. 🔧\n\nPode me dar mais detalhes sobre o que está acontecendo? Quanto mais informações você me passar, mais rápido conseguimos resolver!";
          }
        } else {
          // Resposta genérica contextualizada (comportamento original)
          responseMessage = "Entendi! Vou te ajudar com isso. 🔧\n\nPode me dar mais detalhes sobre o que está acontecendo? Quanto mais informações você me passar, mais rápido conseguimos resolver!";
          
          if (!isFirstMessage) {
            logger.info("Camada híbrida não ativada - usando fallback rule-based");
          }
        }
      }
      
      // Inserir mensagem apenas se não foi inserida no Cenário A
      if (scenario !== "A" && responseMessage) {
        const { error: insertErr } = await insertAgentMessageOnce(supabase, conversation_id, responseMessage);
        
        if (insertErr) {
          logger.error("Erro ao inserir mensagem de continuação", { error: (insertErr as any).message });
          throw insertErr as any;
        }

        logger.info("Luan respondeu ao cliente no fluxo genérico");
      }
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        agent: "support_tech",
        message: responseMessage,
        scenario,
        usedRefactored: false
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    return handleEdgeFunctionError(error, "support-tech-agent");
  }
});
