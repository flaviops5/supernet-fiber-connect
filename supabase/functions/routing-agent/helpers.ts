/**
 * Routing Agent - Helper Functions
 * 
 * Funções auxiliares para validação de CPF, busca de cliente no IXC,
 * determinação de status e roteamento para departamento correto.
 * 
 * @module routing-agent/helpers
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { massOutageContext } from "../_shared/mass-outage-helper.ts";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Códigos de erro padronizados para tratamento consistente
 */
export enum ErrorCode {
  NO_CPF = "NO_CPF",
  IXC_UNAVAILABLE = "IXC_UNAVAILABLE",
  CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND",
  INVALID_RESPONSE = "INVALID_RESPONSE",
}

/**
 * Status do cliente para decisão de roteamento
 */
export interface ClientRoutingStatus {
  found: boolean;
  cpf?: string;
  name?: string;
  id?: string;
  status?: string;
  isBlocked: boolean;
  isOffline: boolean;
  error?: ErrorCode;
  errorMessage?: string;
}

/**
 * Metadata sanitizado para LGPD (sem informações sensíveis completas)
 */
export interface SanitizedMetadata {
  protocol: string;
  status: string;
  cpf_redacted?: string; // Apenas últimos 3 dígitos
  source: string;
}

// ============================================================================
// CPF EXTRACTION & VALIDATION
// ============================================================================

/**
 * Extrai e valida CPF de uma mensagem de texto
 * 
 * Aceita formatos:
 * - 123.456.789-10
 * - 12345678910
 * - CPF: 123.456.789-10
 * 
 * @param message - Mensagem do cliente
 * @returns CPF formatado sem pontuação ou null
 */
export function extractCPF(message: string): string | null {
  const patterns = [
    /\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/g,
    /\b(\d{11})\b/g,
  ];

  for (const pattern of patterns) {
    const matches = message.match(pattern);
    if (matches && matches.length > 0) {
      const cpf = matches[0].replace(/\D/g, "");
      if (cpf.length === 11) {
        return cpf;
      }
    }
  }
  return null;
}

/**
 * Reduz CPF para últimos 3 dígitos (LGPD)
 * 
 * @param cpf - CPF completo (11 dígitos)
 * @returns CPF redacted (ex: "***789")
 */
export function redactCPF(cpf: string): string {
  if (!cpf || cpf.length !== 11) return "***";
  return `***${cpf.slice(-3)}`;
}

// ============================================================================
// IXC INTEGRATION
// ============================================================================

/**
 * Busca cliente no IXC usando CPF e determina status de roteamento
 * 
 * Fluxo:
 * 1. Extrai CPF da mensagem
 * 2. Busca cliente via ixc-integration (searchCustomers)
 * 3. Se encontrado, busca status detalhado (getCustomerStatus)
 * 4. Verifica pane em massa (massOutageContext)
 * 5. Fallback: busca histórico local (customer_contact_history)
 * 
 * @param supabase - Cliente Supabase
 * @param message - Mensagem do cliente
 * @returns Status do cliente para roteamento
 */
export async function getClientRoutingStatus(
  supabase: SupabaseClient,
  message: string
): Promise<ClientRoutingStatus> {
  // 1. Extrair CPF
  const cpf = extractCPF(message);
  if (!cpf) {
    return {
      found: false,
      isBlocked: false,
      isOffline: false,
      error: ErrorCode.NO_CPF,
      errorMessage: "CPF não identificado na mensagem",
    };
  }

  // 2. Buscar cliente no IXC
  try {
    const { data: searchResult, error: searchError } = await supabase.functions.invoke(
      "ixc-integration",
      {
        body: {
          action: "searchCustomers",
          params: { query: cpf },
        },
      }
    );

    // Validação explícita de resposta (evita mascaramento de erros)
    if (searchError || !searchResult?.success || !searchResult?.data) {
      console.warn("⚠️ IXC searchCustomers falhou, tentando fallback histórico");
      return await getFallbackFromHistory(supabase, cpf);
    }

    const clientes = searchResult.data.registros || [];
    if (clientes.length === 0) {
      return await getFallbackFromHistory(supabase, cpf);
    }

    const cliente = clientes[0];

    // 3. Buscar status detalhado
    const { data: statusResult, error: statusError } = await supabase.functions.invoke(
      "ixc-integration",
      {
        body: {
          action: "getCustomerStatus",
          params: { id: cliente.id },
        },
      }
    );

    if (statusError || !statusResult?.success || !statusResult?.data) {
      console.warn("⚠️ IXC getCustomerStatus falhou");
      return {
        found: true,
        cpf,
        name: cliente.razao || "Cliente",
        id: cliente.id,
        status: "unknown",
        isBlocked: false,
        isOffline: false,
        error: ErrorCode.IXC_UNAVAILABLE,
      };
    }

    const status = statusResult.data;

    // 4. Verificar pane em massa (evita falso encaminhamento técnico)
    let isOffline = status.conexao === "offline";
    if (massOutageContext.active && isOffline) {
      console.log("🚨 Pane em massa ativa - ajustando status offline");
      isOffline = false; // Cliente não vai para técnico durante pane massiva
    }

    // 5. Retornar status completo
    return {
      found: true,
      cpf,
      name: status.nome || cliente.razao || "Cliente",
      id: cliente.id,
      status: status.status || "ativo",
      isBlocked: ["bloqueado", "cancelado", "inadimplente"].includes(
        status.status?.toLowerCase() || ""
      ),
      isOffline,
    };
  } catch (err: any) {
    console.error("❌ Erro ao buscar cliente IXC:", err.message);
    return await getFallbackFromHistory(supabase, cpf);
  }
}

/**
 * Fallback: busca histórico de contatos anteriores no banco local
 * 
 * Útil quando IXC está indisponível ou cliente não encontrado
 * 
 * @param supabase - Cliente Supabase
 * @param cpf - CPF do cliente
 * @returns Status baseado em histórico ou "não encontrado"
 */
async function getFallbackFromHistory(
  supabase: SupabaseClient,
  cpf: string
): Promise<ClientRoutingStatus> {
  try {
    const { data: history, error } = await supabase
      .from("customer_contact_history")
      .select("*")
      .eq("cpf", cpf)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && history) {
      console.log("📋 Cliente encontrado no histórico local");
      return {
        found: true,
        cpf,
        name: history.customer_name || "Cliente",
        id: history.ixc_client_id || undefined,
        status: "historico",
        isBlocked: false,
        isOffline: false,
      };
    }
  } catch (err: any) {
    console.warn("⚠️ Erro ao buscar histórico:", err.message);
  }

  return {
    found: false,
    cpf,
    isBlocked: false,
    isOffline: false,
    error: ErrorCode.CUSTOMER_NOT_FOUND,
    errorMessage: "Cliente não encontrado no IXC nem no histórico",
  };
}

// ============================================================================
// ROUTING LOGIC
// ============================================================================

/**
 * Determina departamento de destino baseado em status e conteúdo da mensagem
 * 
 * Lógica de roteamento:
 * - Cliente bloqueado → financeiro (Julia)
 * - Cliente offline → tecnico (Luan)
 * - Cliente online + keywords técnicas → tecnico
 * - Cliente online + keywords financeiras → financeiro
 * - Cliente não encontrado + keywords técnicas → tecnico (suporte a ex-clientes)
 * - Cliente não encontrado → comercial (Vicente - prospects)
 * - Padrão → cloe (continua atendimento)
 * 
 * @param clientStatus - Status do cliente
 * @param messageContent - Conteúdo da mensagem para análise de intenção
 * @returns Departamento de destino
 */
export function determineTargetDepartment(
  clientStatus: ClientRoutingStatus,
  messageContent: string
): "comercial" | "financeiro" | "tecnico" | "cloe" {
  const msgLower = messageContent.toLowerCase();

  // Cliente bloqueado → financeiro (Julia)
  if (clientStatus.isBlocked) {
    return "financeiro";
  }

  // Cliente offline → técnico (Luan)
  if (clientStatus.isOffline) {
    return "tecnico";
  }

  // Análise de intenção por palavras-chave (mesmo para clientes não encontrados)
  
  // Keywords técnicas (problema de conexão/internet)
  if (
    /\b(internet|lenta|conexão|sem sinal|travando|wifi|caiu|fora do ar|não funciona|problema técnico)\b/i.test(
      msgLower
    ) &&
    !/\b(novo|ótimo|funcionando bem)\b/i.test(msgLower)
  ) {
    return "tecnico";
  }

  // Keywords financeiras (evita falso positivo com "plano" em contexto técnico)
  if (
    /\b(boleto|fatura|pagamento|débito|mensalidade|pagar|pix)\b/i.test(msgLower) &&
    !/\b(novo|ótimo|funcionando)\b/i.test(msgLower)
  ) {
    return "financeiro";
  }

  // Cliente não encontrado SEM keywords específicas → prospects (Vicente)
  if (!clientStatus.found) {
    return "comercial";
  }

  // Padrão: Cloé continua atendimento
  return "cloe";
}

// ============================================================================
// METADATA SANITIZATION (LGPD)
// ============================================================================

/**
 * Cria metadata sanitizado para persistência (LGPD compliant)
 * 
 * Remove informações sensíveis como CPF completo, endereço, CNPJ, etc.
 * 
 * @param protocol - Protocolo de atendimento
 * @param clientStatus - Status do cliente
 * @returns Metadata sanitizado
 */
export function createSanitizedMetadata(
  protocol: string,
  clientStatus: ClientRoutingStatus
): SanitizedMetadata {
  return {
    protocol,
    status: clientStatus.status || "unknown",
    cpf_redacted: clientStatus.cpf ? redactCPF(clientStatus.cpf) : undefined,
    source: clientStatus.found ? "ixc" : "historico",
  };
}
