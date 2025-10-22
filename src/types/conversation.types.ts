/**
 * Conversation & Messaging Types
 */

export type ConversationStatus = 
  | 'waiting'
  | 'active'
  | 'resolved'
  | 'closed';

export type MessageSender = 
  | 'customer'
  | 'agent'
  | 'system'
  | 'bot';

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender: MessageSender;
  content: string;
  timestamp: string;
  metadata?: {
    agent_name?: string;
    tool_used?: string;
    attachments?: string[];
    [key: string]: any;
  };
}

export interface Conversation {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_cpf?: string;
  status: ConversationStatus;
  assigned_agent_id?: string;
  department?: string;
  protocol?: string;
  tags?: string[];
  created_at: string;
  last_message_at?: string;
  resolved_at?: string;
  metadata?: Record<string, any>;
}

export interface AttachmentFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnail?: string;
}
