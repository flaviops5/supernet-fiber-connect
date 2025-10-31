/**
 * Test Utilities Types
 * MISSÃO 1.1: TypeScript Zero-Any (Frontend)
 * Types para componentes de teste
 */

/**
 * Conversation insert type (genérico)
 */
export interface ConversationInsert {
  customer_id?: string;
  agent_name?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Message insert type (genérico)
 */
export interface MessageInsert {
  conversation_id: string;
  content: string;
  sender: 'user' | 'agent' | 'system';
  metadata?: Record<string, unknown>;
}

/**
 * Resultado de diagnóstico paralelo (teste)
 */
export interface DiagnosticResult {
  type: 'signal' | 'connectivity' | 'speed';
  success: boolean;
  duration_ms: number;
  data?: {
    rx?: number;
    tx?: number;
    ping_ms?: number;
    download_mbps?: number;
    upload_mbps?: number;
  };
  error?: string;
}

/**
 * Resultado de teste settled (Promise.allSettled)
 */
export type SettledResult<T> = PromiseSettledResult<T>;

/**
 * Config para testes de integração
 */
export interface TestConfig {
  supabase_url: string;
  supabase_anon_key: string;
  test_user_id?: string;
  timeout_ms?: number;
}

/**
 * Mock de cliente IXC para testes
 */
export interface MockIXCClient {
  id: string;
  nome: string;
  status: 'ativo' | 'bloqueado' | 'cancelado';
  sinal_rx?: number;
  sinal_tx?: number;
}

/**
 * Feature flag config
 */
export interface FeatureFlagConfig {
  enabled: boolean;
  rollout_percentage?: number;
  allowed_users?: string[];
  metadata?: Record<string, unknown>;
}
