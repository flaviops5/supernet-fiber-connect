/**
 * Mass Outage Service
 * Camada de serviço para detecção e gerenciamento de panes em massa
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface MassOutageData {
  active: boolean;
  event_id?: string;
  affected_region?: string;
  affected_count?: number;
  estimated_resolution?: string;
}

export class MassOutageService {
  constructor(
    private supabase: SupabaseClient,
    private logger: any
  ) {}

  /**
   * Verificar se há pane em massa ativa para uma região
   */
  async checkMassOutage(region?: string): Promise<MassOutageData> {
    try {
      this.logger.info("MassOutageService: Verificando pane em massa", { region });

      // Buscar panes ativas
      let query = this.supabase
        .from("mass_outage_events")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (region) {
        query = query.eq("affected_region", region);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        this.logger.error("MassOutageService: Erro ao verificar pane", { error, region });
        return { active: false };
      }

      if (!data) {
        this.logger.info("MassOutageService: Nenhuma pane ativa", { region });
        return { active: false };
      }

      this.logger.info("MassOutageService: Pane ativa detectada", { 
        event_id: data.id,
        region: data.affected_region,
        count: data.affected_count 
      });

      return {
        active: true,
        event_id: data.id,
        affected_region: data.affected_region,
        affected_count: data.affected_count,
        estimated_resolution: data.estimated_resolution
      };
    } catch (err) {
      this.logger.error("MassOutageService: Exception ao verificar pane", { 
        error: err instanceof Error ? err.message : String(err),
        region 
      });
      return { active: false };
    }
  }

  /**
   * Buscar todas as panes ativas
   */
  async getActiveOutages(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from("mass_outage_events")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        this.logger.error("MassOutageService: Erro ao buscar panes ativas", { error });
        return [];
      }

      return data || [];
    } catch (err) {
      this.logger.error("MassOutageService: Exception ao buscar panes", { 
        error: err instanceof Error ? err.message : String(err) 
      });
      return [];
    }
  }

  /**
   * Notificar clientes afetados por pane
   */
  async notifyAffectedCustomers(eventId: string, message: string): Promise<number> {
    try {
      this.logger.info("MassOutageService: Notificando clientes afetados", { eventId });

      // Buscar conversas da região afetada
      const { data: event } = await this.supabase
        .from("mass_outage_events")
        .select("affected_region")
        .eq("id", eventId)
        .single();

      if (!event) {
        this.logger.warn("MassOutageService: Evento não encontrado", { eventId });
        return 0;
      }

      // Buscar conversas ativas na região
      const { data: conversations, error } = await this.supabase
        .from("conversations")
        .select("id")
        .eq("status", "active")
        .eq("department", "tecnico");

      if (error || !conversations) {
        this.logger.error("MassOutageService: Erro ao buscar conversas", { error });
        return 0;
      }

      let notified = 0;

      // Enviar notificação para cada conversa
      for (const conv of conversations) {
        try {
          await this.supabase
            .from("conversation_messages")
            .insert({
              conversation_id: conv.id,
              sender_type: "system",
              sender_name: "Sistema",
              content: message,
              ai_suggestion: false
            });

          notified++;
        } catch (msgError) {
          this.logger.error("MassOutageService: Erro ao notificar conversa", { 
            conversation_id: conv.id,
            error: msgError 
          });
        }
      }

      this.logger.info("MassOutageService: Notificações enviadas", { 
        eventId,
        notified,
        total: conversations.length 
      });

      return notified;
    } catch (err) {
      this.logger.error("MassOutageService: Exception ao notificar", { 
        error: err instanceof Error ? err.message : String(err),
        eventId 
      });
      return 0;
    }
  }

  /**
   * Criar novo evento de pane em massa
   */
  async createOutageEvent(
    region: string,
    affectedCount: number,
    description: string,
    estimatedResolution?: string
  ): Promise<{ success: boolean; event_id?: string }> {
    try {
      this.logger.info("MassOutageService: Criando evento de pane", { 
        region,
        affectedCount 
      });

      const { data, error } = await this.supabase
        .from("mass_outage_events")
        .insert({
          affected_region: region,
          affected_count: affectedCount,
          description,
          estimated_resolution: estimatedResolution,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        this.logger.error("MassOutageService: Erro ao criar evento", { error });
        return { success: false };
      }

      this.logger.info("MassOutageService: Evento criado", { event_id: data.id });

      return {
        success: true,
        event_id: data.id
      };
    } catch (err) {
      this.logger.error("MassOutageService: Exception ao criar evento", { 
        error: err instanceof Error ? err.message : String(err) 
      });
      return { success: false };
    }
  }

  /**
   * Resolver evento de pane (marcar como inativo)
   */
  async resolveOutage(eventId: string): Promise<boolean> {
    try {
      this.logger.info("MassOutageService: Resolvendo pane", { eventId });

      const { error } = await this.supabase
        .from("mass_outage_events")
        .update({ 
          is_active: false,
          resolved_at: new Date().toISOString()
        })
        .eq("id", eventId);

      if (error) {
        this.logger.error("MassOutageService: Erro ao resolver pane", { error, eventId });
        return false;
      }

      this.logger.info("MassOutageService: Pane resolvida", { eventId });
      return true;
    } catch (err) {
      this.logger.error("MassOutageService: Exception ao resolver pane", { 
        error: err instanceof Error ? err.message : String(err),
        eventId 
      });
      return false;
    }
  }
}
