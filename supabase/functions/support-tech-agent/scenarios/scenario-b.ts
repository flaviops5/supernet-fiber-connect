/**
 * Cenário B: Sinal bom (RX > -24 dBm) mas equipamento offline
 * 
 * Fluxo:
 * 1. Detectar sinal bom + offline
 * 2. Verificar se já tentou reboot
 * 3. Instruir reboot (desligar 10s + ligar)
 * 4. Aguardar reboot (2-3min)
 * 5. Testar conectividade
 * 6. Verificar navegação ou escalar
 * 
 * Fast-path: Diagnósticos paralelos com circuit breaker
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Logger } from "../types/logger.types.ts";
import type { FlowState, ConversationMetadata } from "../types/database.types.ts";
import type { JsonObject } from "../../../_shared/error-types.ts";
import { ConversationService } from "../services/conversation-service.ts";
import { IXCService } from "../services/ixc-service.ts";
import { hybridInterpret } from "../../_shared/ai-response-interpreter.ts";
import { textReplyWithContext } from "../../_shared/replies.ts";
import { getApprovedSimulations, getApprovedQuestionForStep } from "../tools/approved-simulations.ts";
import { executeConfiguredTools } from "../tools/tool-executor.ts";
import { runParallelDiagnostics } from "../diagnostics/parallel-diagnostics.ts";
import { isGoodSignal } from "../diagnostics/signal-helpers.ts";
import { logRetest } from "../../_shared/retests.ts";
import { kpiLog } from "../../_shared/kpi.ts";

export interface ScenarioBContext {
  conversation_id: string;
  ixc_client_id?: string;
  customer_name: string;
  current_message: string;
  flow_state: FlowState;
  conversation_metadata: ConversationMetadata;
  clarification_attempts: number;
  signal_data?: {
    tx?: number;
    rx?: number;
  };
  reboot_attempted?: boolean;
  client_is_offline?: boolean;
}

export interface ScenarioBResult {
  message: string;
  should_insert: boolean;
  flow_updates?: JsonObject;
  escalate?: boolean;
  resolved?: boolean;
  use_fast_path?: boolean;
}

/**
 * Verificar se fast-path está habilitado (feature flag + circuit breaker)
 */
async function isFastPathEnabled(
  supabase: SupabaseClient, 
  conversation_id: string
): Promise<boolean> {
  try {
    const { data: flag, error } = await supabase
      .from('feature_flags')
      .select('enabled, rollout_percentage')
      .eq('flag_key', 'pr17_fast_path')
      .single();

    if (error || !flag) return true; // Default: ativado

    if (!flag.enabled) return false;

    // Rollout gradual baseado em hash
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
    return true; // Fail-open
  }
}

/**
 * Handler principal do Cenário B
 */
export async function handleScenarioB(
  supabase: SupabaseClient,
  logger: Logger,
  context: ScenarioBContext
): Promise<ScenarioBResult> {
  const {
    conversation_id,
    ixc_client_id,
    customer_name,
    current_message,
    flow_state,
    conversation_metadata,
    clarification_attempts,
    signal_data,
    reboot_attempted,
    client_is_offline
  } = context;

  const convService = new ConversationService(supabase, logger);
  const ixcService = new IXCService(supabase, logger);

  // Determinar step atual
  const currentStep = flow_state?.waiting_step || "";
  
  logger.info("🟡 Cenário B: Processando", {
    conversation_id,
    currentStep,
    hasMessage: !!current_message,
    signal_rx: signal_data?.rx,
    signal_tx: signal_data?.tx
  });

  // Buscar mensagens aprovadas
  const approvedMessages = await getApprovedSimulations(supabase, 'reboot');

  // ===== FAST-PATH: Detecção + Ação Imediata =====
  const fastPathEnabled = await isFastPathEnabled(supabase, conversation_id);
  const isInitialDetection = !currentStep || currentStep === "cenario_b_inicio";
  
  if (fastPathEnabled && isInitialDetection && !reboot_attempted && ixc_client_id) {
    logger.info("⚡ Fast-path habilitado - executando diagnósticos paralelos");

    // Executar diagnósticos em paralelo
    const { signalResult, connectivityResult, elapsed } = await runParallelDiagnostics(
      ixc_client_id,
      conversation_id,
      supabase,
      logger
    );

    // Verificar resultados
    const signalOk = signalResult.status === "fulfilled";
    const connectivityOk = connectivityResult.status === "fulfilled";
    const isOnline = connectivityOk && 
                     connectivityResult.value?.data?.is_online === true;

    logger.info("Fast-path results", {
      elapsed,
      signalOk,
      connectivityOk,
      isOnline
    });

    // Se continua offline com sinal bom → Instruir reboot imediatamente
    if (signalOk && !isOnline && isGoodSignal(signal_data)) {
      const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_b_instruir_reboot');
      const message = approvedQuestion || 
        `${customer_name.split(' ')[0]}, o sinal está perfeito mas o equipamento travou. 🔄\n\nVamos fazer um **reboot**:\n\n1️⃣ **DESLIGUE** o equipamento da energia\n2️⃣ Aguarde **10 segundos**\n3️⃣ **LIGUE** novamente\n4️⃣ Aguarde **2-3 minutos** para sincronizar\n\nMe avise quando terminar!`;

      logger.info("⚡ Fast-path: Instruindo reboot direto", {
        conversation_id,
        elapsed_ms: elapsed
      });

      await supabase.from("registros_de_monitoramento").insert({
        acao: "fast_path_enabled",
        fluxo: "support-tech",
        conversation_id,
        detalhes: {
          elapsed_ms: elapsed,
          signal_rx: signal_data?.rx,
          signal_tx: signal_data?.tx
        }
      });

      return {
        message,
        should_insert: true,
        use_fast_path: true,
        flow_updates: {
          waiting_step: "cenario_b_aguardar_reboot",
          scenario_started: "B",
          fast_path_used: true,
          reboot_attempts: 1,
          clarification_attempts: 0
        }
      };
    }
  }

  // ===== ETAPA 1: Iniciar fluxo de reboot =====
  if (!currentStep || currentStep === "cenario_b_inicio") {
    // Verificar se cliente já tentou reboot
    if (reboot_attempted) {
      logger.info("Cenário B: Cliente já tentou reboot");
      
      const message = `${customer_name.split(' ')[0]}, vi que você já tentou reiniciar. 🔄\n\nVamos verificar se o reboot foi feito corretamente:\n\n1️⃣ Você **DESLIGOU** da energia (não apenas do botão)?\n2️⃣ Aguardou pelo menos **10 segundos** desligado?\n3️⃣ **LIGOU** novamente?\n\nMe confirme se fez esses 3 passos.`;

      return {
        message,
        should_insert: true,
        flow_updates: {
          waiting_step: "cenario_b_verificar_reboot_correto",
          scenario_started: "B",
          reboot_attempts: 1
        }
      };
    }

    // Cliente não tentou reboot → Instruir
    const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_b_perguntar_reboot');
    const message = approvedQuestion || 
      `${customer_name.split(' ')[0]}, o sinal está bom mas o equipamento pode estar travado. 🔄\n\nVocê já tentou **reiniciar** (desligar e ligar) o equipamento?`;

    logger.info("Cenário B: Perguntando sobre reboot prévio", { conversation_id });

    return {
      message,
      should_insert: true,
      flow_updates: {
        waiting_step: "cenario_b_perguntar_reboot",
        scenario_started: "B",
        clarification_attempts: 0
      }
    };
  }

  // ===== ETAPA 2: Verificar se já tentou reboot =====
  if (currentStep === "cenario_b_perguntar_reboot") {
    const rebootInterpretation = await hybridInterpret(current_message, {
      regexDetectors: {
        confirmed: /(sim|s[ií]|ja (tentei|fiz)|reiniciei|desliguei)/i,
        denied: /(n[ãa]o|nao|ainda|nem)/i
      },
      similarityPhrases: {
        confirmed: [
          "sim já tentei",
          "já reiniciei",
          "já desliguei",
          "já fiz isso"
        ],
        denied: [
          "não tentei",
          "ainda não",
          "não fiz"
        ]
      },
      aiContext: {
        expectedAction: "confirmar se já tentou reiniciar o equipamento",
        previousAgentMessage: "Você já tentou reiniciar o equipamento?"
      }
    });

    logger.info("Interpretação híbrida - Reboot Prévio", {
      result: rebootInterpretation.result,
      confidence: rebootInterpretation.confidence
    });

    if (rebootInterpretation.result === 'confirmou' && rebootInterpretation.confidence >= 0.6) {
      // Já tentou → Verificar se foi correto
      const message = `Entendi. Vamos verificar se o reboot foi feito corretamente:\n\n1️⃣ Você **DESLIGOU da ENERGIA** (não apenas do botão)?\n2️⃣ Aguardou pelo menos **10 segundos**?\n3️⃣ **LIGOU** novamente?\n\nMe confirme se fez esses 3 passos.`;

      return {
        message,
        should_insert: true,
        flow_updates: {
          waiting_step: "cenario_b_verificar_reboot_correto",
          reboot_attempts: 1
        }
      };
    } else if (rebootInterpretation.result === 'negou' && rebootInterpretation.confidence >= 0.6) {
      // Não tentou → Instruir
      const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_b_instruir_reboot');
      const message = approvedQuestion || 
        `Ok! Vamos fazer o reboot agora. 🔄\n\nSiga estes passos:\n\n1️⃣ **DESLIGUE** o equipamento da energia\n2️⃣ Aguarde **10 segundos**\n3️⃣ **LIGUE** novamente\n4️⃣ Aguarde **2-3 minutos** para sincronizar\n\nMe avise quando terminar!`;

      logger.info("Cenário B: Instruindo reboot", { conversation_id });

      return {
        message,
        should_insert: true,
        flow_updates: {
          waiting_step: "cenario_b_aguardar_reboot",
          reboot_attempts: 1,
          clarification_attempts: 0
        }
      };
    } else {
      // Incerto
      const newAttempts = clarification_attempts + 1;
      return {
        message: `Desculpe, não entendi. 🤔\n\nVocê **já tentou REINICIAR** (desligar e ligar) o equipamento?\n\nResponda:\n- **"sim"** se já tentou\n- **"não"** se ainda não tentou`,
        should_insert: true,
        flow_updates: {
          clarification_attempts: newAttempts
        }
      };
    }
  }

  // ===== ETAPA 3: Verificar se reboot foi correto =====
  if (currentStep === "cenario_b_verificar_reboot_correto") {
    const correctRebootInterpretation = await hybridInterpret(current_message, {
      regexDetectors: {
        confirmed: /(sim|s[ií]|fiz|correto|todos)/i,
        denied: /(n[ãa]o|nao|s[oó] o bot[aã]o|nao da energia)/i
      },
      similarityPhrases: {
        confirmed: [
          "sim fiz tudo",
          "fiz correto",
          "todos os passos",
          "desliguei da energia"
        ],
        denied: [
          "só apertei o botão",
          "não desliguei da energia",
          "não aguardei"
        ]
      }
    });

    if (correctRebootInterpretation.result === 'confirmou' && correctRebootInterpretation.confidence >= 0.6) {
      // Reboot correto → Testar conectividade
      logger.info("Cenário B: Reboot correto - testando conectividade");

      if (!ixc_client_id) {
        logger.warn("Cenário B: ixc_client_id não disponível");
        return {
          message: `Aguarde mais **1 minuto** e tente acessar a internet.\n\nConsegue navegar agora?`,
          should_insert: true,
          flow_updates: {
            waiting_step: "cenario_b_verificar_navegacao"
          }
        };
      }

      // Executar teste de conectividade
      const toolResults = await executeConfiguredTools(
        supabase,
        logger,
        "cenario_b_pos_reboot",
        "reboot",
        { ixc_client_id, customer_name }
      );

      // Log retest
      await logRetest(supabase, {
        conversation_id,
        ixc_client_id,
        step: 'post_reboot',
        after_ok: toolResults.test_connectivity_result?.is_online || false,
        latency_ms_after: toolResults.test_connectivity_result?.latency_ms
      });

      const isOnlineNow = toolResults.test_connectivity_result?.is_online || false;

      if (isOnlineNow) {
        // Online → Verificar navegação
        const message = `Ótimo! O equipamento voltou online! 🎉\n\nConsegue **navegar** na internet agora?`;

        return {
          message,
          should_insert: true,
          flow_updates: {
            waiting_step: "cenario_b_verificar_navegacao",
            clarification_attempts: 0
          }
        };
      } else {
        // Ainda offline → Escalar
        logger.info("Cenário B: Continua offline após reboot correto");

        // Criar ticket
        if (ixc_client_id) {
          await executeConfiguredTools(
            supabase,
            logger,
            "cenario_b_offline_pos_reboot",
            "reboot",
            {
              ixc_client_id,
              customer_name,
              ticket_subject: "Offline após reboot - sinal bom",
              ticket_description: `Cliente ${customer_name} executou reboot correto (10s desligado) mas continua offline. Sinal óptico bom (RX: ${signal_data?.rx}, TX: ${signal_data?.tx}). Necessário análise técnica.`,
              ticket_priority: "high"
            }
          );
        }

        return {
          message: `Mesmo após o reboot, você ainda está offline. 🔧\n\nVou abrir um chamado técnico prioritário. Nossa equipe vai investigar o problema e entrar em contato.\n\nEnquanto isso, precisa de algo mais?`,
          should_insert: true,
          escalate: true,
          flow_updates: {
            needs_human_transfer: true,
            transfer_reason: "offline_pos_reboot_correto"
          }
        };
      }
    } else if (correctRebootInterpretation.result === 'negou' && correctRebootInterpretation.confidence >= 0.6) {
      // Reboot incorreto → Instruir novamente
      const message = `Entendi! O reboot precisa ser **da energia** (não do botão). ⚡\n\nVamos fazer correto:\n\n1️⃣ **RETIRE o cabo da energia** do equipamento\n2️⃣ Conte até **10**\n3️⃣ **CONECTE** o cabo novamente\n4️⃣ Aguarde **2-3 minutos**\n\nMe avise quando fizer!`;

      return {
        message,
        should_insert: true,
        flow_updates: {
          waiting_step: "cenario_b_aguardar_reboot",
          reboot_attempts: (flow_state?.reboot_attempts || 1) + 1
        }
      };
    } else {
      // Incerto
      const newAttempts = clarification_attempts + 1;
      return {
        message: `Desculpe, não entendi. 🤔\n\nVocê fez TODOS esses passos?\n\n1️⃣ Desligar **DA ENERGIA**\n2️⃣ Aguardar **10 segundos**\n3️⃣ Ligar novamente\n\nResponda:\n- **"sim"** se fez todos\n- **"não"** se não fez algum`,
        should_insert: true,
        flow_updates: {
          clarification_attempts: newAttempts
        }
      };
    }
  }

  // ===== ETAPA 4: Aguardar reboot =====
  if (currentStep === "cenario_b_aguardar_reboot") {
    const doneInterpretation = await hybridInterpret(current_message, {
      regexDetectors: {
        confirmed: /(pronto|feito|terminei|ja (fiz|liguei)|ok)/i,
        denied: /(ainda|espera|aguard|nao consegui)/i
      },
      similarityPhrases: {
        confirmed: [
          "pronto",
          "já fiz",
          "terminei",
          "feito",
          "já liguei"
        ],
        denied: [
          "ainda não",
          "aguarda",
          "não consegui"
        ]
      },
      aiContext: {
        expectedAction: "executar reboot do equipamento",
        previousAgentMessage: "Me avise quando terminar o reboot"
      }
    });

    if (doneInterpretation.result === 'confirmou' && doneInterpretation.confidence >= 0.6) {
      // Reboot feito → Aguardar sincronização
      const message = `Perfeito! Agora aguarde **2-3 minutos** para o equipamento sincronizar completamente. ⏳\n\nVou testar a conexão. Um momento...`;

      // Agendar teste após 2min (simular com flow_state)
      return {
        message,
        should_insert: true,
        flow_updates: {
          waiting_step: "cenario_b_testando_pos_reboot",
          reboot_completed_at: new Date().toISOString(),
          clarification_attempts: 0
        }
      };
    } else if (doneInterpretation.result === 'negou' && doneInterpretation.confidence >= 0.6) {
      // Ainda não fez
      return {
        message: `Sem problema! Me avise quando você desligar e ligar o equipamento. 😊\n\nLembre-se: desligar da **ENERGIA**, aguardar **10 segundos**, e ligar.`,
        should_insert: true
      };
    } else {
      // Incerto
      return {
        message: `Você já **desligou e ligou** o equipamento?\n\nResponda:\n- **"sim"** ou **"pronto"** se já fez\n- **"não"** se ainda não fez`,
        should_insert: true
      };
    }
  }

  // ===== ETAPA 5: Testar conectividade pós-reboot =====
  if (currentStep === "cenario_b_testando_pos_reboot") {
    if (!ixc_client_id) {
      logger.warn("Cenário B: ixc_client_id não disponível para teste");
      return {
        message: `Aguarde mais **1 minuto** e tente acessar a internet.\n\nConsegue navegar?`,
        should_insert: true,
        flow_updates: {
          waiting_step: "cenario_b_verificar_navegacao"
        }
      };
    }

    logger.info("Cenário B: Testando conectividade pós-reboot");

    // Executar teste
    const toolResults = await executeConfiguredTools(
      supabase,
      logger,
      "cenario_b_pos_reboot",
      "reboot",
      { ixc_client_id, customer_name }
    );

    // Log retest
    await logRetest(supabase, {
      conversation_id,
      ixc_client_id,
      step: 'post_reboot',
      after_ok: toolResults.test_connectivity_result?.is_online || false,
      latency_ms_after: toolResults.test_connectivity_result?.latency_ms
    });

    const isOnlineNow = toolResults.test_connectivity_result?.is_online || false;

    if (isOnlineNow) {
      // Online → Verificar navegação
      const message = `Excelente! O equipamento voltou **online**! 🎉\n\nAgora me diga: consegue **navegar** na internet normalmente?`;

      // KPI: Cenário B resolvido
      await kpiLog({
        action: "kpi_update",
        conversation_id,
        scenario_completed: "B",
        hybrid_mode: flow_state?.hybrid_mode_active ? "ON" : "OFF",
        resolved: true,
        escalated: false,
      });

      return {
        message,
        should_insert: true,
        flow_updates: {
          waiting_step: "cenario_b_verificar_navegacao",
          clarification_attempts: 0
        }
      };
    } else {
      // Ainda offline → Verificar tentativas
      const rebootAttempts = flow_state?.reboot_attempts || 1;

      if (rebootAttempts >= 2) {
        // Máximo de tentativas → Escalar
        logger.info("Cenário B: Máximo de tentativas de reboot atingido");

        if (ixc_client_id) {
          await executeConfiguredTools(
            supabase,
            logger,
            "cenario_b_max_reboots",
            "reboot",
            {
              ixc_client_id,
              customer_name,
              ticket_subject: "Offline após múltiplos reboots",
              ticket_description: `Cliente ${customer_name} executou ${rebootAttempts} reboots corretos mas continua offline. Sinal bom (RX: ${signal_data?.rx}). Possível problema de autenticação ou ONU travada.`,
              ticket_priority: "urgent"
            }
          );
        }

        // KPI: Cenário B escalado
        await kpiLog({
          action: "kpi_update",
          conversation_id,
          scenario_completed: "B",
          hybrid_mode: flow_state?.hybrid_mode_active ? "ON" : "OFF",
          resolved: false,
          escalated: true,
        });

        return {
          message: `Mesmo após ${rebootAttempts} reboots, você continua offline. 🔧\n\nVou abrir um chamado **urgente** para nossa equipe técnica. Pode ser necessário trocar o equipamento ou verificar a ONU.\n\nNossa equipe vai entrar em contato com você.`,
          should_insert: true,
          escalate: true,
          flow_updates: {
            needs_human_transfer: true,
            transfer_reason: "max_reboots_atingido"
          }
        };
      } else {
        // Tentar mais um reboot
        const message = `Ainda está offline. 🔄\n\nVamos tentar mais um reboot, mas dessa vez:\n\n1️⃣ Deixe **20 segundos** desligado (não apenas 10)\n2️⃣ Aguarde **3 minutos completos** após ligar\n\nMe avise quando fizer!`;

        return {
          message,
          should_insert: true,
          flow_updates: {
            waiting_step: "cenario_b_aguardar_reboot",
            reboot_attempts: rebootAttempts + 1
          }
        };
      }
    }
  }

  // ===== ETAPA 6: Verificar navegação =====
  if (currentStep === "cenario_b_verificar_navegacao") {
    const navInterpretation = await hybridInterpret(current_message, {
      regexDetectors: {
        confirmed: /(sim|s[ií]|consigo|funciona|ok|normal|volta)/i,
        denied: /(n[ãa]o|nao|ainda|continua|lent)/i
      },
      similarityPhrases: {
        confirmed: [
          "sim consigo",
          "está funcionando",
          "voltou normal",
          "navega ok"
        ],
        denied: [
          "não consigo",
          "ainda sem internet",
          "não funciona"
        ]
      }
    });

    if (navInterpretation.result === 'confirmou' && navInterpretation.confidence >= 0.6) {
      // Navega → Sucesso!
      logger.info("Cenário B: Problema resolvido - cliente navega");

      return {
        message: `Perfeito! Problema resolvido! 🎉🎉\n\nSua internet voltou ao normal. Preciso de mais alguma coisa?`,
        should_insert: true,
        resolved: true,
        flow_updates: {
          waiting_step: "cenario_b_resolvido"
        }
      };
    } else if (navInterpretation.result === 'negou' && navInterpretation.confidence >= 0.6) {
      // Não navega → Escalar
      logger.info("Cenário B: Online mas não navega");

      if (ixc_client_id) {
        await executeConfiguredTools(
          supabase,
          logger,
          "cenario_b_online_sem_navegacao",
          "reboot",
          {
            ixc_client_id,
            customer_name,
            ticket_subject: "Online mas sem navegação",
            ticket_description: `Cliente ${customer_name} está online após reboot mas não consegue navegar. Possível problema de DNS, MTU ou configuração.`,
            ticket_priority: "high"
          }
        );
      }

      return {
        message: `Você está online mas não consegue acessar sites. 🔧\n\nVou abrir um chamado técnico para verificar configurações de rede.\n\nEnquanto isso, tente:\n1️⃣ Usar dados móveis para confirmar que o problema é só no Wi-Fi\n2️⃣ Reiniciar o celular/computador\n\nMe avise se resolver!`,
        should_insert: true,
        escalate: true,
        flow_updates: {
          needs_human_transfer: true,
          transfer_reason: "online_sem_navegacao"
        }
      };
    } else {
      // Incerto
      return {
        message: `Desculpe, não entendi. 🤔\n\nVocê consegue **NAVEGAR** (abrir Google, YouTube, etc)?\n\nResponda:\n- **"sim"** se consegue\n- **"não"** se não consegue`,
        should_insert: true
      };
    }
  }

  // Fallback: Estado não reconhecido
  logger.warn("Cenário B: Estado não reconhecido", { currentStep });
  return {
    message: `Desculpe, houve um problema no atendimento. 😔\n\nVou transferir você para nossa equipe técnica.`,
    should_insert: true,
    escalate: true
  };
}
