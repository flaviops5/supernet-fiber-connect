/**
 * Admin Types
 * Tipos para administração e configuração
 */

export interface SidebarMenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  badge?: number;
}

export interface AgentConfig {
  id: string;
  name: string;
  model: string;
  temperature: number;
  maxTokens: number;
  tools: string[];
  allowedDepartments?: string[];
  priority?: number;
  enabled: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  category: string;
  tags?: string[];
  featured_image?: string;
  published: boolean;
  author_id?: string;
  published_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  variables: string[];
  category?: string;
  created_at: string;
  updated_at?: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  description?: string;
  category?: string;
  uploaded_by?: string;
  uploaded_at: string;
}

export interface MediaFile {
  id: string;
  name: string;
  url: string;
  thumbnail_url?: string;
  type: 'image' | 'video' | 'document' | 'audio';
  mime_type: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  channel: 'email' | 'whatsapp' | 'sms' | 'push';
  content: string;
  subject?: string;
  variables: string[];
  trigger_type?: string;
  enabled: boolean;
  created_at: string;
  updated_at?: string;
}

export interface FlowSubject {
  id: string;
  name: string;
  description?: string;
  category: string;
  department?: string;
  steps: FlowStep[];
  priority?: number;
  enabled: boolean;
  created_at: string;
  updated_at?: string;
}

export interface FlowStep {
  id: string;
  flow_subject_id: string;
  order: number;
  title: string;
  description: string;
  agent_type?: string;
  required_tools?: string[];
  expected_duration_seconds?: number;
  next_step_conditions?: Record<string, unknown>;
}

export interface CompanySettings {
  id: string;
  name: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  support_email?: string;
  support_phone?: string;
  address?: string;
  website?: string;
  social_links?: Record<string, string>;
  business_hours?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface NPSResponse {
  id: string;
  score: number;
  comment?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  conversation_id?: string;
  created_at: string;
}

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  agent_types?: string[];
  vector_id?: string;
  published: boolean;
  views: number;
  helpful_votes: number;
  unhelpful_votes: number;
  created_at: string;
  updated_at?: string;
}

export interface CEPImportRow {
  cep: string;
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  coverage: boolean;
  available_plans?: string[];
}

export interface VectorMigrationStatus {
  total_documents: number;
  migrated_documents: number;
  failed_documents: number;
  status: 'idle' | 'running' | 'completed' | 'error';
  current_batch?: number;
  total_batches?: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}
