/**
 * ✅ UNIFIED LOGGER - SUPERNET FIBRA / LOVABLE STANDARD
 * Logging system híbrido: Frontend (React) + Backend (Edge Functions)
 * 
 * Features:
 * - Universal (funciona em browser e Deno)
 * - Sanitização automática de PII (CPF, email, telefone, tokens)
 * - Correlation ID para distributed tracing
 * - Non-blocking DB persistence
 * - Suporte a metadata estruturado
 */

import { createClient } from "@supabase/supabase-js";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogMetadata {
  [key: string]: unknown;
}

interface LogEntry {
  id: string;
  log_timestamp: string;
  level: LogLevel;
  message: string;
  context: string;
  correlation_id: string;
  environment: string;
  metadata: LogMetadata;
}

// Padrões sensíveis para sanitização
const SENSITIVE_PATTERNS = {
  cpf: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
  cpfRaw: /\b\d{11}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  token: /\b[A-Za-z0-9-_]{20,}\b/g,
  phone: /\b\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b/g,
  password: /"password"\s*:\s*"[^"]+"/g,
};

// Detectar ambiente (type-safe)
const isEdgeRuntime = typeof globalThis !== 'undefined' && 'Deno' in globalThis;
const isDev = !isEdgeRuntime && import.meta.env.DEV;

// Inicializar Supabase (apenas em produção)
let supabase: ReturnType<typeof createClient> | null = null;

if (!isDev) {
  try {
    const url = "https://mxdupkbpxjcfxdgrwknp.supabase.co";
    const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14ZHVwa2JweGpjZnhkZ3J3a25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTg4ODYsImV4cCI6MjA3NDMzNDg4Nn0.np4wHopAwI7HOTsYPaAUSWbe_qVxMBSIHjYv4PnKL6I";

    if (url && key) {
      supabase = createClient(url, key);
    }
  } catch (err) {
    console.error("Failed to initialize Supabase client for logger:", err);
  }
}

/**
 * Classe principal do logger unificado
 */
export class UnifiedLogger {
  private context: string;
  private correlationId: string;

  constructor(context: string, correlationId?: string) {
    this.context = context;
    this.correlationId = correlationId || this.generateId();
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback para ambientes sem crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // ===========================
  // NÍVEIS DE LOG
  // ===========================

  debug(message: string, meta?: LogMetadata): void {
    if (isDev) {
      this.log("debug", message, meta);
    }
  }

  info(message: string, meta?: LogMetadata): void {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: LogMetadata): void {
    this.log("warn", message, meta);
  }

  error(message: string, meta?: LogMetadata): void {
    this.log("error", message, meta);
  }

  // ===========================
  // LÓGICA PRINCIPAL
  // ===========================

  private log(level: LogLevel, message: string, meta?: LogMetadata): void {
    const entry = this.format(level, message, meta);
    
    // Sempre logar no console
    this.logToConsole(level, entry);

    // Persistir no DB (non-blocking)
    if (supabase && !isDev) {
      this.persistLog(entry).catch((err) => {
        console.error("[Logger] Failed to persist log:", err);
      });
    }
  }

  private logToConsole(level: LogLevel, entry: LogEntry): void {
    const pretty = this.prettyFormat(entry);
    const consoleFn = console[level] || console.log;
    consoleFn(pretty, entry.metadata);
  }

  private format(level: LogLevel, message: string, meta?: LogMetadata): LogEntry {
    return {
      id: this.generateId(),
      log_timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      correlation_id: this.correlationId,
      environment: isDev ? "dev" : "production",
      metadata: this.sanitize(meta || {}),
    };
  }

  private prettyFormat(entry: LogEntry): string {
    const emoji = {
      debug: "🐛",
      info: "ℹ️",
      warn: "⚠️",
      error: "❌",
    }[entry.level] || "📝";

    return `${emoji} [${entry.context}] [${entry.level.toUpperCase()}] ${entry.message}`;
  }

  // ===========================
  // SANITIZAÇÃO ROBUSTA
  // ===========================

  private sanitize(meta: LogMetadata): LogMetadata {
    try {
      const serialized = JSON.stringify(meta);
      let sanitized = serialized;

      // Aplicar todos os padrões de sanitização
      sanitized = sanitized
        .replace(SENSITIVE_PATTERNS.cpf, '"[CPF_REDACTED]"')
        .replace(SENSITIVE_PATTERNS.cpfRaw, '"[CPF_REDACTED]"')
        .replace(SENSITIVE_PATTERNS.email, '"[EMAIL_REDACTED]"')
        .replace(SENSITIVE_PATTERNS.token, '"[TOKEN_REDACTED]"')
        .replace(SENSITIVE_PATTERNS.phone, '"[PHONE_REDACTED]"')
        .replace(SENSITIVE_PATTERNS.password, '"password":"[REDACTED]"');

      return JSON.parse(sanitized);
    } catch (err) {
      console.error("[Logger] Failed to sanitize metadata:", err);
      return { error: "Failed to sanitize metadata" };
    }
  }

  // ===========================
  // PERSISTÊNCIA (NON-BLOCKING)
  // ===========================

  private async persistLog(entry: LogEntry): Promise<void> {
    if (!supabase) return;

    await (supabase as any)
      .from("monitoring_logs")
      .insert([entry]);
  }

  // ===========================
  // HELPERS
  // ===========================

  /**
   * Criar child logger com mesmo correlationId
   */
  child(childContext: string): UnifiedLogger {
    return new UnifiedLogger(
      `${this.context}:${childContext}`,
      this.correlationId
    );
  }

  /**
   * Obter correlationId atual
   */
  getCorrelationId(): string {
    return this.correlationId;
  }
}

// ===========================
// FACTORY HELPERS
// ===========================

/**
 * Criar logger com contexto específico
 * 
 * @example
 * const logger = createLogger('support-tech-agent');
 * logger.info('Processing request', { userId: 123 });
 */
export function createLogger(context: string, correlationId?: string): UnifiedLogger {
  return new UnifiedLogger(context, correlationId);
}

/**
 * Logger global (use com moderação)
 */
export const logger = createLogger("app");
