/**
 * Cenário A: TX/RX = 0.00 (Equipamento desligado ou desconectado)
 * 
 * Fluxo:
 * 1. Detectar TX/RX zero
 * 2. Perguntar sobre energia
 * 3. Verificar luz vermelha (LOS)
 * 4. Instruir manipulação do cabo de fibra
 * 5. Verificar resultado
 * 6. Testar navegação ou escalar
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
import { sanitizeRedLightQuestion } from "../utils/message-helpers.ts";
import { executeConfiguredTools } from "../tools/tool-executor.ts";

export interface ScenarioAContext {
  conversation_id: string;
  ixc_client_id?: string;
  customer_name: string;
  current_message: string;
  flow_state: FlowState;
  conversation_metadata: ConversationMetadata;
  clarification_attempts: number;
}

export interface ScenarioAResult {
  message: string;
  should_insert: boolean;
  flow_updates?: JsonObject;
  escalate?: boolean;
  resolved?: boolean;
}

/**
 * Handler principal do Cenário A
 */
export async function handleScenarioA(
  supabase: SupabaseClient,
  logger: Logger,
  context: ScenarioAContext
): Promise<ScenarioAResult> {
  const {
    conversation_id,
    ixc_client_id,
    customer_name,
    current_message,
    flow_state,
    conversation_metadata,
    clarification_attempts
  } = context;

  const convService = new ConversationService(supabase, logger);
  const ixcService = new IXCService(supabase, logger);

  // Determinar step atual
  const currentStep = flow_state?.waiting_step || flow_state?.continue || "";
  
  logger.info("🔴 Cenário A: Processando", {
    conversation_id,
    currentStep,
    hasMessage: !!current_message
  });

  // Buscar mensagens aprovadas
  const approvedMessages = await getApprovedSimulations(supabase, 'energia');

  // ===== ETAPA 1: Iniciar fluxo de energia =====
  if (!currentStep || currentStep === "cenario_a_inicio") {
    const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_a_verificar_energia');
    const message = approvedQuestion || 
      `${customer_name.split(' ')[0]}, vi que seu equipamento está sem sinal. 🔴\n\nVamos verificar: o equipamento está **ligado na energia**?`;

    logger.info("🎯 Cenário A: Iniciando verificação de energia", { conversation_id });

    return {
      message,
      should_insert: true,
      flow_updates: {
        waiting_step: "cenario_a_verificar_energia",
        scenario_started: "A",
        clarification_attempts: 0
      }
    };
  }

  // ===== ETAPA 2: Verificar resposta sobre energia =====
  if (currentStep === "cenario_a_verificar_energia") {
    const energyInterpretation = await hybridInterpret(current_message, {
      regexDetectors: {
        confirmed: /(sim|s[ií]|ligad[oa]|connect|energia|funciona)/i,
        denied: /(n[ãa]o|nao|desligad|sem energia)/i
      },
      similarityPhrases: {
        confirmed: [
          "sim está ligado",
          "está na energia",
          "está conectado",
          "está ligado sim",
          "tá ligado"
        ],
        denied: [
          "não está ligado",
          "desligado",
          "sem energia",
          "não tá ligado"
        ]
      },
      aiContext: {
        expectedAction: "verificar se o equipamento está ligado na energia",
        previousAgentMessage: "O equipamento está ligado na energia?"
      }
    });

    logger.info("Interpretação híbrida - Energia", {
      result: energyInterpretation.result,
      confidence: energyInterpretation.confidence,
      method: energyInterpretation.method
    });

    if (energyInterpretation.result === 'confirmou' && energyInterpretation.confidence >= 0.6) {
      // Equipamento ligado → Perguntar sobre luz vermelha
      const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_a_verificar_luz_vermelha');
      let questionText = approvedQuestion || 
        `Ok! Equipamento ligado. ✅\n\nAgora me diga: você está vendo alguma **luz VERMELHA piscando**? 🔴\n\n(Pode ser chamada de LOS ou ALARM)`;

      // SEMPRE sanitizar a pergunta sobre luz vermelha
      questionText = sanitizeRedLightQuestion(questionText);

      const message = await textReplyWithContext(
        supabase,
        { conversation_id, flowState: flow_state },
        questionText
      ).then(r => r.json()).then(j => j.reply);

      logger.info("🎯 Cenário A: Usando texto aprovado para verificar_luz_vermelha", {
        conversation_id,
        usando_aprovado: !!approvedQuestion
      });

      return {
        message,
        should_insert: true,
        flow_updates: {
          waiting_step: "cenario_a_verificar_luz_vermelha",
          clarification_attempts: 0
        }
      };
    } else if (energyInterpretation.result === 'negou' && energyInterpretation.confidence >= 0.6) {
      // Equipamento desligado → Pedir para ligar
      const message = `Entendi! Por favor, **ligue o equipamento na energia** e aguarde **2 minutos** para ele inicializar completamente. ⏳\n\nMe avise quando ligar!`;

      return {
        message,
        should_insert: true,
        flow_updates: {
          waiting_step: "cenario_a_aguardar_ligar"
        }
      };
    } else {
      // Incerto → Pedir clarificação
      const newAttempts = clarification_attempts + 1;
      const message = `Desculpe, não entendi. 🤔\n\nO equipamento está **LIGADO na energia**?\n\nPor favor, responda:\n- **"sim"** se está ligado\n- **"não"** se está desligado`;

      return {
        message,
        should_insert: true,
        flow_updates: {
          clarification_attempts: newAttempts,
          last_clarification_step: currentStep
        }
      };
    }
  }

  // ===== ETAPA 3: Aguardar ligamento do equipamento =====
  if (currentStep === "cenario_a_aguardar_ligar") {
    const turnOnInterpretation = await hybridInterpret(current_message, {
      regexDetectors: {
        confirmed: /(liguei|conectei|ja liguei|pronto|feito|ok)/i
      },
      similarityPhrases: {
        confirmed: [
          "já liguei",
          "liguei agora",
          "conectei",
          "pronto",
          "feito"
        ]
      },
      aiContext: {
        expectedAction: "ligar o equipamento na energia",
        previousAgentMessage: "Me avise quando ligar o equipamento"
      }
    });

    if (turnOnInterpretation.result === 'confirmou' && turnOnInterpretation.confidence >= 0.6) {
      const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_a_verificar_luz_vermelha');
      let questionText = approvedQuestion || 
        `Perfeito! Agora aguarde **2 minutos** para o equipamento sincronizar. ⏳\n\nDepois me diga: você vê alguma **luz VERMELHA piscando**? 🔴`;

      questionText = sanitizeRedLightQuestion(questionText);

      return {
        message: questionText,
        should_insert: true,
        flow_updates: {
          waiting_step: "cenario_a_verificar_luz_vermelha",
          clarification_attempts: 0
        }
      };
    } else {
      return {
        message: `Ok! Me avise quando você ligar o equipamento na energia. 😊`,
        should_insert: true
      };
    }
  }

  // ===== ETAPA 4: Verificar luz vermelha (LOS) =====
  if (currentStep === "cenario_a_verificar_luz_vermelha") {
    const redLightInterpretation = await hybridInterpret(current_message, {
      regexDetectors: {
        confirmed: /(sim|s[ií]|vermelh[oa]|pisca|los|alarm)/i,
        denied: /(n[ãa]o|nao|nem|verde|apagad)/i
      },
      similarityPhrases: {
        confirmed: [
          "sim tem luz vermelha",
          "está piscando vermelho",
          "tem luz vermelha piscando",
          "LOS piscando",
          "luz de alarme"
        ],
        denied: [
          "não tem luz vermelha",
          "não está piscando",
          "tudo verde",
          "sem luz vermelha"
        ]
      },
      aiContext: {
        expectedAction: "verificar se há luz vermelha (LOS) piscando no equipamento",
        previousAgentMessage: "Você está vendo alguma luz VERMELHA piscando?"
      }
    });

    logger.info("Interpretação híbrida - Luz Vermelha", {
      result: redLightInterpretation.result,
      confidence: redLightInterpretation.confidence
    });

    if (redLightInterpretation.result === 'confirmou' && redLightInterpretation.confidence >= 0.6) {
      // Luz vermelha piscando → Instruir manipulação do cabo
      const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_a_manipular_cabo');
      const message = approvedQuestion || 
        `Entendi! A luz vermelha indica problema no cabo de fibra. 🔴\n\nVamos fazer o seguinte:\n\n1️⃣ Localize o **cabo fino (fibra)** na parte de trás do equipamento\n2️⃣ **RETIRE** o conector verde com cuidado\n3️⃣ **RECONECTE** com firmeza (até encaixar)\n4️⃣ Aguarde **1 minuto**\n\nMe avise quando terminar! 🔧`;

      logger.info("🎯 Cenário A: Instruindo manipulação de cabo", {
        conversation_id,
        usando_aprovado: !!approvedQuestion
      });

      return {
        message,
        should_insert: true,
        flow_updates: {
          waiting_step: "cenario_a_aguardar_manipulacao",
          clarification_attempts: 0
        }
      };
    } else if (redLightInterpretation.result === 'negou' && redLightInterpretation.confidence >= 0.6) {
      // Sem luz vermelha → Problema diferente, pedir mais detalhes
      const message = `Entendi. Sem luz vermelha piscando.\n\nMe conta: quais **luzes** você está vendo no equipamento? 💡\n\n(Exemplo: verde fixa, verde piscando, etc)`;

      return {
        message,
        should_insert: true,
        flow_updates: {
          waiting_step: "cenario_a_coletar_mais_info"
        }
      };
    } else {
      // Incerto → Clarificar
      const newAttempts = clarification_attempts + 1;
      let message = `Desculpe, não entendi. 🤔\n\nVocê vê alguma **luz VERMELHA piscando** no equipamento?\n\nPor favor responda:\n- **"sim"** se tem luz vermelha\n- **"não"** se não tem`;

      message = sanitizeRedLightQuestion(message);

      return {
        message,
        should_insert: true,
        flow_updates: {
          clarification_attempts: newAttempts
        }
      };
    }
  }

  // ===== ETAPA 5: Aguardar manipulação do cabo =====
  if (currentStep === "cenario_a_aguardar_manipulacao") {
    const manipulationInterpretation = await hybridInterpret(current_message, {
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
      confidence: manipulationInterpretation.confidence
    });

    if (manipulationInterpretation.result === 'confirmou' && manipulationInterpretation.confidence >= 0.6) {
      // Cliente manipulou → Verificar resultado
      const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_a_verificar_resultado_manipulacao');
      const message = approvedQuestion || 
        `Perfeito! Aguarde mais **1 minuto** para sincronização completa. ⏳\n\nAgora me diga: a luz **LOS** parou de **PISCAR** e ficou **VERDE FIXA**?`;

      logger.info("🎯 Cenário A: Verificando resultado da manipulação", {
        conversation_id,
        usando_aprovado: !!approvedQuestion
      });

      return {
        message,
        should_insert: true,
        flow_updates: {
          waiting_step: "cenario_a_verificar_resultado_manipulacao",
          clarification_attempts: 0
        }
      };
    } else if (manipulationInterpretation.result === 'negou' && manipulationInterpretation.confidence >= 0.6) {
      // Ainda não fez
      return {
        message: `Ok! Sem pressa. 😊\n\nQuando você retirar e reconectar o cabo de fibra, me avise para continuar o diagnóstico! 🔧`,
        should_insert: true
      };
    } else {
      // Incerto
      const newAttempts = clarification_attempts + 1;
      return {
        message: `Desculpe, não entendi se você já fez o procedimento. 🤔\n\nVocê já **RETIROU e RECONECTOU** o cabo de fibra do equipamento?\n\nMe responda:\n- **"sim"** ou **"feito"** se já fez\n- **"não"** se ainda não fez`,
        should_insert: true,
        flow_updates: {
          clarification_attempts: newAttempts
        }
      };
    }
  }

  // ===== ETAPA 6: Verificar resultado após manipulação =====
  if (currentStep === "cenario_a_verificar_resultado_manipulacao") {
    const resultInterpretation = await hybridInterpret(current_message, {
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
          "resolveu"
        ],
        denied: [
          "continua vermelha",
          "ainda piscando",
          "não resolveu"
        ]
      },
      aiContext: {
        expectedAction: "verificar se a luz LOS parou de piscar e ficou verde fixa após manipular o cabo",
        previousAgentMessage: "A luz LOS parou de PISCAR e ficou VERDE FIXA?"
      }
    });

    logger.info("Interpretação híbrida - Resultado", {
      result: resultInterpretation.result,
      confidence: resultInterpretation.confidence
    });

    if (resultInterpretation.result === 'confirmou' && resultInterpretation.confidence >= 0.6) {
      // Luz ficou verde → Consultar IXC
      logger.info("Cenário A: Luz ficou verde - consultando IXC");

      const toolResults = await executeConfiguredTools(
        supabase,
        logger,
        "cenario_a_verificar_resultado",
        "energia",
        { ixc_client_id, customer_name }
      );

      const isOnlineNow = toolResults.test_connectivity_result?.is_online || false;
      logger.info("Resultado consulta IXC", { isOnlineNow });

      if (isOnlineNow) {
        // Online → Perguntar sobre navegação
        const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_a_verificar_navegacao');
        const questionText = approvedQuestion || 
          `Ótimo! Você já está **online** novamente! 🎉\n\nConsegue navegar na internet normalmente?`;

        const message = await textReplyWithContext(
          supabase,
          { conversation_id, flowState: flow_state },
          questionText
        ).then(r => r.json()).then(j => j.reply);

        return {
          message,
          should_insert: true,
          flow_updates: {
            waiting_step: "cenario_a_verificar_navegacao",
            clarification_attempts: 0
          }
        };
      } else {
        // Continua offline → Abrir ticket
        logger.info("Cenário A: Luz verde mas continua offline - abrindo ticket");

        if (ixc_client_id) {
          await executeConfiguredTools(
            supabase,
            logger,
            "cenario_a_luz_verde_offline",
            "energia",
            {
              ixc_client_id,
              customer_name,
              ticket_subject: "Equipamento com sinal mas offline",
              ticket_description: `Cliente ${customer_name} manipulou conector de fibra, luz ficou verde mas equipamento continua offline. Necessário verificação técnica.`,
              ticket_priority: "high"
            }
          );
        }

        return {
          message: `Entendi. A luz ficou verde mas você ainda está sem conexão. 🔧\n\nVou abrir uma chamada técnica prioritária. Nossa equipe vai verificar o problema na rede e entrar em contato com você.\n\nEnquanto isso, preciso de mais alguma coisa?`,
          should_insert: true,
          escalate: true,
          flow_updates: {
            needs_human_transfer: true,
            transfer_reason: "luz_verde_mas_offline"
          }
        };
      }
    } else if (resultInterpretation.result === 'negou' && resultInterpretation.confidence >= 0.6) {
      // Luz continua vermelha → Ticket + humano
      logger.info("Cenário A: Luz continua vermelha - solicitando foto");

      if (ixc_client_id) {
        await executeConfiguredTools(
          supabase,
          logger,
          "cenario_a_luz_vermelha_persistente",
          "energia",
          {
            ixc_client_id,
            customer_name,
            ticket_subject: "Luz vermelha persistente após manipulação",
            ticket_description: `Cliente ${customer_name} manipulou conector mas luz LOS continua vermelha. Possível problema na fibra ou equipamento. Necessário visita técnica.`,
            ticket_priority: "urgent"
          }
        );
      }

      const message = await textReplyWithContext(
        supabase,
        { conversation_id, flowState: flow_state },
        `Tudo bem. Se a luz continua vermelha, pode ser um problema mais complexo. 🔴\n\nVocê consegue tirar uma **foto da parte de trás do equipamento** mostrando onde o cabo fino (fibra) está conectado e me enviar?\n\nEnquanto isso, já vou abrir um chamado técnico prioritário. Pode ser necessário o deslocamento de um técnico.`
      ).then(r => r.json()).then(j => j.reply);

      return {
        message,
        should_insert: true,
        escalate: true,
        flow_updates: {
          needs_human_transfer: true,
          transfer_reason: "luz_vermelha_persistente",
          awaiting_photo: true
        }
      };
    } else {
      return {
        message: await textReplyWithContext(
          supabase,
          { conversation_id, flowState: flow_state },
          `Desculpe, não entendi. 🤔\n\nA luz **parou de piscar** e ficou **VERDE FIXA**?\n\nOu continua **VERMELHA**?`
        ).then(r => r.json()).then(j => j.reply),
        should_insert: true
      };
    }
  }

  // ===== ETAPA 7: Verificar navegação =====
  if (currentStep === "cenario_a_verificar_navegacao") {
    const navInterpretation = await hybridInterpret(current_message, {
      regexDetectors: {
        confirmed: /(sim|s[ií]|consigo|funciona|ok|normal|t[aá]|volta)/i,
        denied: /(n[ãa]o|nao|ainda|continua).*?(consigo|funciona|lent|trava)/i
      },
      similarityPhrases: {
        confirmed: [
          "sim consigo",
          "está funcionando",
          "voltou normal",
          "tá tudo ok"
        ],
        denied: [
          "não consigo",
          "ainda não funciona",
          "continua sem internet"
        ]
      }
    });

    if (navInterpretation.result === 'confirmou' && navInterpretation.confidence >= 0.6) {
      // Consegue navegar → Sucesso!
      return {
        message: `Perfeito! Problema resolvido! 🎉\n\nPreciso de mais alguma coisa?`,
        should_insert: true,
        resolved: true,
        flow_updates: {
          waiting_step: "cenario_a_resolvido"
        }
      };
    } else if (navInterpretation.result === 'negou' && navInterpretation.confidence >= 0.6) {
      // Não consegue navegar → Ticket
      logger.info("Cenário A: Online mas não navega - abrindo ticket");

      if (ixc_client_id) {
        await executeConfiguredTools(
          supabase,
          logger,
          "cenario_a_online_sem_navegacao",
          "energia",
          {
            ixc_client_id,
            customer_name,
            ticket_subject: "Cliente online mas sem navegação",
            ticket_description: `Cliente ${customer_name} está online no sistema mas não consegue navegar. Possível problema de configuração ou DNS.`,
            ticket_priority: "high"
          }
        );
      }

      return {
        message: `Entendi. Você está online mas não consegue acessar sites. 🔧\n\nVou abrir um chamado técnico para verificar isso. Nossa equipe vai entrar em contato.\n\nEnquanto isso, tente:\n1️⃣ Fechar e abrir o navegador\n2️⃣ Desligar e ligar o Wi-Fi do celular/computador\n\nMe avise se resolver!`,
        should_insert: true,
        escalate: true,
        flow_updates: {
          needs_human_transfer: true,
          transfer_reason: "online_mas_nao_navega"
        }
      };
    } else {
      // Incerto
      const newAttempts = clarification_attempts + 1;
      return {
        message: await textReplyWithContext(
          supabase,
          { conversation_id, flowState: flow_state },
          `Desculpe, não entendi se a internet está funcionando. 🤔\n\nPor favor, tente abrir um site (como Google ou YouTube) e me diga:\n- **"sim"** se você CONSEGUE navegar e abrir sites\n- **"não"** se NÃO CONSEGUE acessar a internet`
        ).then(r => r.json()).then(j => j.reply),
        should_insert: true,
        flow_updates: {
          clarification_attempts: newAttempts
        }
      };
    }
  }

  // ===== ETAPA 8: Coletar mais informações (fallback) =====
  if (currentStep === "cenario_a_coletar_mais_info") {
    logger.info("Cenário A: Coletando mais informações do cliente");

    // Criar ticket com informações coletadas
    if (ixc_client_id) {
      await executeConfiguredTools(
        supabase,
        logger,
        null,
        "energia",
        {
          ixc_client_id,
          customer_name,
          ticket_subject: "Problema de conexão - TX/RX zero",
          ticket_description: `Cliente ${customer_name} reporta: ${current_message}. Equipamento com TX/RX zero mas sem padrão conhecido. Necessário análise técnica.`,
          ticket_priority: "high"
        }
      );
    }

    return {
      message: `Obrigado pelas informações! 📝\n\nVou abrir um chamado técnico para nossa equipe analisar melhor. Você receberá retorno em breve.\n\nEnquanto isso, precisa de algo mais?`,
      should_insert: true,
      escalate: true,
      flow_updates: {
        needs_human_transfer: true,
        transfer_reason: "padrao_nao_identificado"
      }
    };
  }

  // Fallback: Estado não reconhecido
  logger.warn("Cenário A: Estado não reconhecido", { currentStep });
  return {
    message: `Desculpe, houve um problema no atendimento. 😔\n\nVou transferir você para nossa equipe técnica.`,
    should_insert: true,
    escalate: true
  };
}
