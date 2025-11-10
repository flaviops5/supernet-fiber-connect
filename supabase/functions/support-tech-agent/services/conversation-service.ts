/**
 * Conversation Service
 * Camada de serviço para gerenciamento de conversas
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface Message {
  sender_type: "user" | "agent" | "system";
  sender_name: string;
  content: string;
  ai_suggestion?: boolean;
}

export interface FlowState {
  [key: string]: any;
}

export class ConversationService {
  constructor(
    private supabase: SupabaseClient,
    private logger: any
  ) {}

  /**
   * Buscar conversa por ID
   */
  async getConversation(conversationId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      if (error) {
        this.logger.error("ConversationService: Erro ao buscar conversa", { 
          error, 
          conversationId 
        });
        throw error;
      }

      return data;
    } catch (err) {
      this.logger.error("ConversationService: Exception ao buscar conversa", { 
        error: err instanceof Error ? err.message : String(err),
        conversationId 
      });
      throw err;
    }
  }

  /**
   * Atualizar flow_state da conversa
   */
  async updateFlowState(
    conversationId: string, 
    updates: FlowState
  ): Promise<void> {
    try {
      // Buscar metadata atual
      const { data: current } = await this.supabase
        .from("conversations")
        .select("metadata")
        .eq("id", conversationId)
        .single();

      const currentMeta = (current?.metadata as any) || {};
      const currentFlow = currentMeta.flow_state || {};

      // Merge updates
      const newFlowState = {
        ...currentFlow,
        ...updates
      };

      const { error } = await this.supabase
        .from("conversations")
        .update({
          metadata: {
            ...currentMeta,
            flow_state: newFlowState
          }
        })
        .eq("id", conversationId);

      if (error) {
        this.logger.error("ConversationService: Erro ao atualizar flow_state", { 
          error, 
          conversationId,
          updates 
        });
        throw error;
      }

      this.logger.info("ConversationService: Flow_state atualizado", { 
        conversationId,
        updates 
      });
    } catch (err) {
      this.logger.error("ConversationService: Exception ao atualizar flow_state", { 
        error: err instanceof Error ? err.message : String(err),
        conversationId 
      });
      throw err;
    }
  }

  /**
   * Inserir mensagem (com proteção contra duplicatas)
   */
  async insertMessage(
    conversationId: string, 
    message: Message
  ): Promise<{ skipped: boolean }> {
    try {
      if (!message.content || !conversationId) {
        return { skipped: true };
      }

      // Verificar última mensagem do agente
      const { data: last } = await this.supabase
        .from("conversation_messages")
        .select("id, content, created_at, sender_name, sender_type")
        .eq("conversation_id", conversationId)
        .eq("sender_type", "agent")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Proteção anti-duplicata (5 segundos)
      const now = Date.now();
      if (last && last.sender_name === message.sender_name && last.content === message.content) {
        const diff = now - new Date(last.created_at).getTime();
        if (diff < 5000) {
          this.logger.warn("ConversationService: Mensagem duplicada detectada", { 
            conversationId 
          });
          return { skipped: true };
        }
      }

      const { error } = await this.supabase
        .from("conversation_messages")
        .insert({
          conversation_id: conversationId,
          ...message
        });

      if (error) {
        this.logger.error("ConversationService: Erro ao inserir mensagem", { 
          error, 
          conversationId 
        });
        throw error;
      }

      this.logger.info("ConversationService: Mensagem inserida", { 
        conversationId,
        sender: message.sender_name 
      });

      return { skipped: false };
    } catch (err) {
      this.logger.error("ConversationService: Exception ao inserir mensagem", { 
        error: err instanceof Error ? err.message : String(err),
        conversationId 
      });
      throw err;
    }
  }

  /**
   * Buscar histórico de mensagens
   */
  async getMessageHistory(conversationId: string, limit = 50): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from("conversation_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error) {
        this.logger.error("ConversationService: Erro ao buscar histórico", { 
          error, 
          conversationId 
        });
        return [];
      }

      return data || [];
    } catch (err) {
      this.logger.error("ConversationService: Exception ao buscar histórico", { 
        error: err instanceof Error ? err.message : String(err),
        conversationId 
      });
      return [];
    }
  }

  /**
   * Atualizar status e departamento da conversa
   */
  async transferConversation(
    conversationId: string,
    department: string,
    reason: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const { data: current } = await this.supabase
        .from("conversations")
        .select("metadata")
        .eq("id", conversationId)
        .single();

      const { error } = await this.supabase
        .from("conversations")
        .update({
          status: "active",
          department,
          metadata: {
            ...(current?.metadata as any || {}),
            ...metadata,
            needs_human_transfer: true,
            transfer_reason: reason
          }
        })
        .eq("id", conversationId);

      if (error) {
        this.logger.error("ConversationService: Erro ao transferir conversa", { 
          error, 
          conversationId,
          department,
          reason 
        });
        throw error;
      }

      this.logger.info("ConversationService: Conversa transferida", { 
        conversationId,
        department,
        reason 
      });
    } catch (err) {
      this.logger.error("ConversationService: Exception ao transferir", { 
        error: err instanceof Error ? err.message : String(err),
        conversationId 
      });
      throw err;
    }
  }
}
