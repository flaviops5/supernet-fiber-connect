import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from '../_shared/base-handler.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/structured-logger.ts";
import { massOutageContext } from "../_shared/mass-outage-helper.ts";
import { handleEdgeFunctionError, StandardError } from "../_shared/error-handler.ts";
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

// >>> REFACTORED MODULES - Phase 1
import { getApprovedSimulations, getApprovedQuestionForStep } from "./cache/simulation-cache.ts";
import { insertAgentMessageOnce, insertAgentMessage as insertAgentMessageHelper } from "./db/message-helpers.ts";
import { normalizeFlowState, setWaitingStep, persistIxcClientId } from "./db/flow-state-helpers.ts";
import { runParallelDiagnostics } from "./diagnostics/parallel-diagnostics.ts";
import { isWeakFromTxRx, isGoodSignal, isZeroSignal } from "./diagnostics/signal-helpers.ts";
import { sanitizeRedLightQuestion, detectIntentAndMood, withEffortAck } from "./utils/message-helpers.ts";
import { FastPathCircuitBreaker } from "./circuit-breakers/fast-path-circuit-breaker.ts";
import { isFastPathEnabled, hasStableSignal } from "./feature-flags/fast-path-flag.ts";
import { shouldUseRefactoredScenarios, getRefactoringRolloutStatus } from "./feature-flags/refactoring-rollout-flag.ts";
import { logB } from "./logging/scenario-logging.ts";
import { safeTestConnectivity } from "./services/connectivity-service.ts";
import { executeConfiguredTools } from "./tools/tool-executor.ts";
// <<< REFACTORED MODULES

// >>> TYPES - Conversation Metadata
interface FlowStateData {
  continue?: string;
  hybrid_mode_active?: boolean;
  timeout_attempts?: number;
  waiting_step?: string;
  ixc_client_id?: string;
  geo?: {
    cidade?: string;
    source?: string;
  };
  [key: string]: unknown;
}

interface SignalData {
  tx?: number;
  rx?: number;
  serial?: string;
  onu_serial?: string;
  [key: string]: unknown;
}

interface ConversationMetadata {
  flow_state?: FlowStateData | string;
  signal_data?: SignalData;
  cpf_retry_count?: number;
  clarification_attempts?: number;
  last_clarification_step?: string;
  scenario?: string;
  [key: string]: unknown;
}

interface Conversation {
  id?: string;
  customer_name?: string;
  customer_phone?: string;
  metadata?: ConversationMetadata;
  updated_at?: string;
}

interface MessageAttachment {
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  mime_type?: string;
}
// <<< TYPES


// P0 FIX: Convertido para createAuthenticatedHandler
// Support Tech Agent manipula dados sensíveis de diagnóstico
Deno.serve(createAuthenticatedHandler('support-tech-agent', async (req, { supabase: authSupabase, user }) => {
  const logger = createLogger("support-tech-agent", req);

  try {
    // Usar service role para operações privilegiadas
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    // 🆕 RAG: Buscar contexto relevante da base vetorizada
    let ragContext = '';
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (openaiApiKey && lastUserMessage && !testHarness) {
      try {
        const { retrieveKnowledgeContext } = await import('../_shared/rag-helper.ts');
        const ragResult = await retrieveKnowledgeContext(
          createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          ),
          lastUserMessage,
          openaiApiKey,
          {
            top_k: 3,
            similarity_threshold: 0.5,
            agentTypes: ['support-tech-agent', 'luan', 'tecnico']
          }
        );
        
        if (ragResult.success) {
          ragContext = `\n\n${ragResult.contextText}\n`;
          logger.info('✅ RAG ativado no support-tech-agent', { 
            method: ragResult.searchMethod,
            docsFound: ragResult.documents.length 
          });
        }
      } catch (ragError) {
        logger.error('Erro no RAG (support-tech-agent)', { error: ragError });
      }
    }

    // >>> MODE TEST-RUNNER: Enhanced to test refactored scenarios
    let testModeScenario: string | null = null;
    const SKIP_DB_OPS = testHarness === true;
    let scenario: string | undefined = undefined;
    
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
      scenario = "unknown";
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
      return insertAgentMessageHelper(supabase, conversationId, content, senderName, SKIP_DB_OPS, logger);
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
    if (ixc_client_id && typeof ixc_client_id === "string" && ixc_client_id.trim().length > 0 && !SKIP_DB_OPS) {
      await persistIxcClientId(supabase, conversation_id, ixc_client_id, logger);
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
    const rawFlowState = convWithPhone?.metadata?.flow_state;
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
            ...(convWithPhone?.metadata || {}),
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
      const imageAttachments = attachments.filter((a: MessageAttachment) => a.type === 'image');
      
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

    const currentFlowState = currentConversation?.metadata?.flow_state as FlowStateData | undefined;
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
                ...(currentConversation?.metadata || {}),
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
                ...(currentConversation?.metadata || {}),
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
                ...(currentConversation?.metadata || {}),
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
    const signal = currentConversation?.metadata?.signal_data;
    const ixcId = (currentConversation?.metadata?.flow_state as FlowStateData)?.ixc_client_id ?? ixc_client_id;
    const waitingStep = (currentConversation?.metadata?.flow_state as FlowStateData)?.waiting_step;

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
      const cpfRetryCount = conversation?.metadata?.cpf_retry_count || 0;

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
                ...(conversation?.metadata || {}),
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
                  ...(conversation?.metadata || {}),
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
                ...(conversation?.metadata || {}),
                cpf_retry_count: 0
              }
            })
            .eq("id", conversation_id);
        }

      // ============================================================================
      // 🚀 ROUTING LAYER - Refactored vs Inline Scenarios (MOVED UP - Priority 1)
      // ============================================================================
      
      // Feature flag para controlar uso de código refatorado (gradual rollout)
      const USE_REFACTORED_SCENARIOS = await shouldUseRefactoredScenarios(
        supabase, 
        conversation_id
      );
      
      // Log status do rollout para debug
      const rolloutStatus = await getRefactoringRolloutStatus(supabase);
      logger.info("🎚️ Refactoring rollout status", {
        useRefactored: USE_REFACTORED_SCENARIOS,
        flagEnabled: rolloutStatus.enabled,
        rolloutPercentage: rolloutStatus.rollout_percentage,
        conversationId: conversation_id
      });
      
      if (USE_REFACTORED_SCENARIOS) {
        // 🔍 DETECTOR DE CENÁRIO AUTOMÁTICO
        let detectedScenario: string | null =
          (testModeScenario && testModeScenario !== 'unknown') ? testModeScenario :
          (scenario && scenario !== 'unknown') ? scenario :
          null;
        
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
            detectedScenario = "A";
          } else if (txNum >= -5 && txNum <= 2 && rxNum >= -24) {
            const problemKeywords = ["lent", "trav", "não carrega", "não abre", "demora", "ruim"];
            if (problemKeywords.some(kw => message.toLowerCase().includes(kw))) {
              detectedScenario = "B";
            }
          } else if (txNum > -5 && rxNum >= -28 && rxNum < -24) {
            detectedScenario = "C";
          } else if (rxNum < -28) {
            detectedScenario = "D";
          }
        }
        
        if (!detectedScenario) {
          const cancelKeywords = ["cancelar", "cancela", "desistir", "quero sair"];
          if (cancelKeywords.some(kw => message.toLowerCase().includes(kw))) {
            detectedScenario = "E";
          }
        }
        
        const activeScenario = detectedScenario as ScenarioType | null;
        logger.info("🧭 Pós-detecção", { detectedScenario, activeScenario, hasOnuSignal: !!onu_signal });
        if (activeScenario && ['A', 'B', 'C', 'D', 'E'].includes(activeScenario)) {
          logger.info("🔀 Roteamento para cenário refatorado", {
            scenario: activeScenario,
            conversationId: conversation_id,
            testMode: testHarness
          });
          
          try {
            // 🧪 MODO DE TESTE: Criar dados mock
            if (testHarness === true) {
              if (!onu_signal) {
                interface MockSignal {
                  tx_power: number;
                  rx_power: number;
                  status: 'online' | 'offline';
                }
                const mockSignals: Record<string, MockSignal> = {
                  'A': { tx_power: 0, rx_power: 0, status: 'offline' },
                  'B': { tx_power: 0.5, rx_power: -20, status: 'online' },
                  'C': { tx_power: -2, rx_power: -27, status: 'online' },
                  'D': { tx_power: -5, rx_power: -31, status: 'online' },
                  'E': { tx_power: -3, rx_power: -25, status: 'online' }
                };
                onu_signal = mockSignals[activeScenario];
                logger.info("🧪 Mock ONU signal created", { scenario: activeScenario, signal: onu_signal });
              }
              
              if (!currentConversation) {
                currentConversation = {
                  id: conversation_id || 'test-conversation',
                  customer_name: 'Cliente Teste',
                  customer_phone: '(11) 99999-9999',
                  metadata: { scenario: activeScenario }
                } as Conversation;
                logger.info("🧪 Mock conversation created");
              }
            }
            
            // Montar contexto inline para adaptação
            const inlineData: InlineContextData = {
              conversation_id: conversation_id || 'test-conversation',
              customer_name: currentConversation?.customer_name || "Cliente",
              customer_cpf,
              customer_phone: currentConversation?.customer_phone || "",
              ixc_client_id: ixc_client_id || (currentFlowState?.ixc_client_id) || (testHarness ? 'test-client' : undefined),
              flowState: currentFlowState || {},
              signal: {
                tx: onu_signal?.tx_power || Number(tx) || 0,
                rx: onu_signal?.rx_power || Number(rx) || 0,
                serial: (onu_signal as SignalData)?.serial || (onu_signal as SignalData)?.onu_serial
              },
              message: message || "",
              normalizedMessage: message ? normalizeText(message) : undefined,
              messageHistory,
              imageAnalysis,
              ragContext
            };
            
            // Validar contexto
            const validation = validateInlineContext(activeScenario, inlineData);
            if (!validation.valid) {
              logger.warn("⚠️ Contexto inválido para cenário refatorado - usando inline", {
                scenario: activeScenario,
                missing: validation.missing
              });
            } else {
              // Construir contexto específico do cenário
              const scenarioContext = buildScenarioContext(activeScenario, inlineData);
              
              // Chamar handler refatorado apropriado
              let scenarioResult: ScenarioResult;
              const startTime = Date.now();
              
              switch (activeScenario) {
                case 'A':
                  scenarioResult = await handleScenarioA(supabase, logger, scenarioContext);
                  break;
                case 'B':
                  scenarioResult = await handleScenarioB(supabase, logger, scenarioContext);
                  break;
                case 'C':
                  scenarioResult = await handleScenarioC(supabase, logger, scenarioContext);
                  break;
                case 'D':
                  scenarioResult = await handleScenarioD(supabase, logger, scenarioContext);
                  break;
                case 'E':
                  scenarioResult = await handleScenarioE(supabase, logger, scenarioContext);
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
              
              // Retornar resposta IMEDIATAMENTE
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
          }
        }
      }
      
      // ============================================================================
      // CÓDIGO INLINE (Fallback quando não usa refatorado)
      // ============================================================================
      
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
          let scenarioMessage = "";

          if (tx === 0 && rx === 0) {
            // >>> PR #14 — MediaGuided Energia/ONU
            scenario = "A";
            
            // Registrar estado inicial do Cenário A
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(conversation?.metadata || {}),
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
                  ...(conversation?.metadata || {}),
                  flow_state: {
                    ...((conversation?.metadata?.flow_state as FlowStateData) || {}),
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
                  ...(conversation?.metadata || {}),
                  flow_state: {
                    ...((conversation?.metadata?.flow_state as FlowStateData) || {}),
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
                ...(conversation?.metadata || {}),
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

      const continueFlowState = currentConversation?.metadata?.flow_state;
      scenario = currentConversation?.metadata?.scenario as string | undefined;

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
                ...(currentConversation?.metadata || {}),
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
      const clarificationAttempts = currentConversation?.metadata?.clarification_attempts || 0;
      const lastClarificationStep = currentConversation?.metadata?.last_clarification_step;
      
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
                ...(currentConversation?.metadata || {}),
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
      const USE_REFACTORED_SCENARIOS = await shouldUseRefactoredScenarios(
        supabase, 
        conversation_id
      );
      
      // Log status do rollout para debug
      const rolloutStatus = await getRefactoringRolloutStatus(supabase);
      logger.info("🎚️ Refactoring rollout status", {
        useRefactored: USE_REFACTORED_SCENARIOS,
        flagEnabled: rolloutStatus.enabled,
        rolloutPercentage: rolloutStatus.rollout_percentage,
        conversationId: conversation_id
      });
      
      if (USE_REFACTORED_SCENARIOS) {
        // 🔍 DETECTOR DE CENÁRIO AUTOMÁTICO
        // Prioridade 1: Usar cenário do modo de teste se disponível
        // Prioridade 2: Usar cenário já definido no metadata
        // Prioridade 3: Detectar baseado em sinal e contexto
         let detectedScenario: string | null =
           (testModeScenario && testModeScenario !== 'unknown') ? testModeScenario :
           (scenario && scenario !== 'unknown') ? scenario :
           null;
        
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
                interface MockSignal {
                  tx_power: number;
                  rx_power: number;
                  status: 'online' | 'offline';
                }
                const mockSignals: Record<string, MockSignal> = {
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
                } as Conversation;
                logger.info("🧪 Mock conversation created");
              }
            }
            
            // Montar contexto inline para adaptação
            const inlineData: InlineContextData = {
              conversation_id: conversation_id || 'test-conversation',
              customer_name: currentConversation?.customer_name || "Cliente",
              customer_cpf,
              customer_phone: currentConversation?.customer_phone || "",
              ixc_client_id: ixc_client_id || (currentFlowState?.ixc_client_id) || (testHarness ? 'test-client' : undefined),
              flowState: currentFlowState || {},
              signal: {
                tx: onu_signal?.tx_power || Number(tx) || 0,
                rx: onu_signal?.rx_power || Number(rx) || 0,
                serial: (onu_signal as SignalData)?.serial || (onu_signal as SignalData)?.onu_serial
              },
              message: message || "",
              normalizedMessage: message ? normalizeText(message) : undefined,
              messageHistory,
              imageAnalysis,
              ragContext // 🆕 Adicionar contexto RAG
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
                  scenarioResult = await handleScenarioA(supabase, logger, scenarioContext);
                  break;
                case 'B':
                  scenarioResult = await handleScenarioB(supabase, logger, scenarioContext);
                  break;
                case 'C':
                  scenarioResult = await handleScenarioC(supabase, logger, scenarioContext);
                  break;
                case 'D':
                  scenarioResult = await handleScenarioD(supabase, logger, scenarioContext);
                  break;
                case 'E':
                  scenarioResult = await handleScenarioE(supabase, logger, scenarioContext);
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
      // 📜 FALLBACK: Resposta genérica se nenhum cenário foi ativado
      // ============================================================================
      
      logger.warn("⚠️ Nenhum cenário refatorado ativado - usando resposta genérica", {
        scenario,
        hasFlowState: !!continueFlowState,
        conversationId: conversation_id
      });
      
      // Resposta genérica de fallback
      let responseMessage = "Entendi! Vou te ajudar com isso. 🔧\n\nPode me dar mais detalhes sobre o que está acontecendo? Quanto mais informações você me passar, mais rápido conseguimos resolver!";
      
      // Inserir mensagem genérica
      if (scenario !== "A" && responseMessage) {
        const { error: insertErr } = await insertAgentMessageOnce(supabase, conversation_id, responseMessage);
        
        if (insertErr) {
          logger.error("Erro ao inserir mensagem de continuação", { error: insertErr instanceof Error ? insertErr.message : String(insertErr) });
          throw insertErr;
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
