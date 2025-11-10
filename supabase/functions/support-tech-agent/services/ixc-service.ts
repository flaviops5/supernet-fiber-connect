/**
 * IXC Service
 * Camada de serviço para todas as interações com IXC
 * Centraliza chamadas, retry logic e error handling
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface TicketParams {
  client_id: string;
  subject: string;
  description: string;
  priority?: "low" | "normal" | "high" | "urgent";
}

export interface ConnectivityResult {
  ok: boolean;
  is_online: boolean;
  latency_ms?: number;
  tx_power?: number;
  rx_power?: number;
}

export interface SignalStatus {
  tx?: number;
  rx?: number;
  ont_serial?: string;
  last_seen?: string;
}

export class IXCService {
  constructor(
    private supabase: SupabaseClient,
    private logger: any
  ) {}

  /**
   * Buscar dados completos do cliente no IXC
   */
  async getClientData(clientId: string): Promise<any> {
    try {
      this.logger.info("IXCService: Buscando dados do cliente", { clientId });
      
      const { data, error } = await this.supabase.functions.invoke("ixc-integration", {
        body: { 
          action: "get_cliente", 
          id_cliente: clientId 
        }
      });

      if (error) {
        this.logger.error("IXCService: Erro ao buscar cliente", { error, clientId });
        throw error;
      }

      return data;
    } catch (err) {
      this.logger.error("IXCService: Exception ao buscar cliente", { 
        error: err instanceof Error ? err.message : String(err),
        clientId 
      });
      throw err;
    }
  }

  /**
   * Testar conectividade do equipamento
   */
  async testConnectivity(clientId: string): Promise<ConnectivityResult> {
    try {
      this.logger.info("IXCService: Testando conectividade", { clientId });
      
      const { data, error } = await this.supabase.functions.invoke("test-equipment-connectivity", {
        body: { 
          ixc_client_id: clientId, 
          timeout: 5000 
        }
      });

      if (error) {
        this.logger.error("IXCService: Erro ao testar conectividade", { error, clientId });
        return {
          ok: false,
          is_online: false
        };
      }

      return {
        ok: data?.ok || false,
        is_online: data?.is_online || false,
        latency_ms: data?.latency_ms,
        tx_power: data?.tx_power,
        rx_power: data?.rx_power
      };
    } catch (err) {
      this.logger.error("IXCService: Exception ao testar conectividade", { 
        error: err instanceof Error ? err.message : String(err),
        clientId 
      });
      return {
        ok: false,
        is_online: false
      };
    }
  }

  /**
   * Criar ticket/atendimento no IXC
   */
  async createTicket(params: TicketParams): Promise<{ ticket_id?: string; success: boolean }> {
    try {
      this.logger.info("IXCService: Criando ticket", { 
        clientId: params.client_id,
        subject: params.subject,
        priority: params.priority
      });
      
      const { data, error } = await this.supabase.functions.invoke("ixc-integration", {
        body: {
          action: "criar_atendimento",
          id_cliente: params.client_id,
          assunto: params.subject,
          descricao: params.description,
          prioridade: params.priority || "normal"
        }
      });

      if (error) {
        this.logger.error("IXCService: Erro ao criar ticket", { error, params });
        return { success: false };
      }

      const ticketId = data?.id_atendimento || data?.ticket_id;
      
      this.logger.info("IXCService: Ticket criado com sucesso", { 
        ticketId,
        clientId: params.client_id 
      });

      return {
        ticket_id: ticketId,
        success: true
      };
    } catch (err) {
      this.logger.error("IXCService: Exception ao criar ticket", { 
        error: err instanceof Error ? err.message : String(err),
        params 
      });
      return { success: false };
    }
  }

  /**
   * Buscar status de sinal do equipamento
   */
  async getSignalStatus(clientId: string): Promise<SignalStatus> {
    try {
      this.logger.info("IXCService: Buscando status de sinal", { clientId });
      
      const { data, error } = await this.supabase.functions.invoke("ixc-onu-signal", {
        body: { ixc_client_id: clientId }
      });

      if (error) {
        this.logger.error("IXCService: Erro ao buscar sinal", { error, clientId });
        return {};
      }

      return {
        tx: data?.tx,
        rx: data?.rx,
        ont_serial: data?.ont_serial,
        last_seen: data?.last_seen
      };
    } catch (err) {
      this.logger.error("IXCService: Exception ao buscar sinal", { 
        error: err instanceof Error ? err.message : String(err),
        clientId 
      });
      return {};
    }
  }

  /**
   * Fallback: testar conectividade por IP
   */
  async testConnectivityByIp(ip: string): Promise<ConnectivityResult> {
    try {
      this.logger.info("IXCService: Testando conectividade por IP", { ip });
      
      const { data, error } = await this.supabase.functions.invoke("test-equipment-connectivity", {
        body: { ip, timeout: 5000 }
      });

      if (error) {
        this.logger.error("IXCService: Erro ao testar por IP", { error, ip });
        return {
          ok: false,
          is_online: false
        };
      }

      return {
        ok: data?.ok || false,
        is_online: data?.is_online || false,
        latency_ms: data?.latency_ms
      };
    } catch (err) {
      this.logger.error("IXCService: Exception ao testar por IP", { 
        error: err instanceof Error ? err.message : String(err),
        ip 
      });
      return {
        ok: false,
        is_online: false
      };
    }
  }
}
