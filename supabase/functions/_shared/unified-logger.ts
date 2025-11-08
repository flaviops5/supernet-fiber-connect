/**
 * ✅ UNIFIED LOGGER - EDGE FUNCTIONS VERSION
 * Sistema de logging unificado para Supabase Edge Functions
 * 
 * Mesma API do logger frontend, mas otimizado para Deno
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

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

// Padrões sensíveis
const SENSITIVE_PATTERNS = {
  cpf: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
  cpfRaw: /\b\d{11}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  token: /\b[A-Za-z0-9-_]{20,}\b/g,
  phone: /\b\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b/g,
  password: /"password"\s*:\s*"[^"]+"/g,
};

// Cliente Supabase seguro
function getSupabase() {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!url || !key) {
      console.error("⚠️ SUPABASE credentials not found for logger");
      return null;
    }
    
    return createClient(url, key);
  } catch (err) {
    console.error("❌ Failed to initialize Supabase:", err);
    return null;
  }
}

const supabase = getSupabase();

/**
 * Logger unificado para Edge Functions
 */
export class UnifiedLogger {
  private context: string;
  private correlationId: string;

  constructor(context: string, correlationId?: string) {
    this.context = context;
    this.correlationId = correlationId || crypto.randomUUID();
  }

  // Níveis de log
  debug(message: string, meta?: LogMetadata): void {
    this.log("debug", message, meta);
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

  // Lógica principal
  private log(level: LogLevel, message: string, meta?: LogMetadata): void {
    const entry = this.format(level, message, meta);
    
    // Console
    this.logToConsole(level, entry);

    // Persistir (non-blocking)
    if (supabase) {
      this.persistLog(entry).catch((err) =>
        console.error("[Logger] Persist failed:", err)
      );
    }
  }

  private logToConsole(level: LogLevel, entry: LogEntry): void {
    const emoji = { debug: "🐛", info: "ℹ️", warn: "⚠️", error: "❌" }[level] || "📝";
    const msg = `${emoji} [${entry.context}] ${entry.message}`;
    
    switch (level) {
      case "error":
        console.error(msg, entry.metadata);
        break;
      case "warn":
        console.warn(msg, entry.metadata);
        break;
      default:
        console.log(msg, entry.metadata);
    }
  }

  private format(level: LogLevel, message: string, meta?: LogMetadata): LogEntry {
    return {
      id: crypto.randomUUID(),
      log_timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      correlation_id: this.correlationId,
      environment: "production",
      metadata: this.sanitize(meta || {}),
    };
  }

  // Sanitização
  private sanitize(meta: LogMetadata): LogMetadata {
    try {
      let serialized = JSON.stringify(meta);
      
      serialized = serialized
        .replace(SENSITIVE_PATTERNS.cpf, '"[CPF_REDACTED]"')
        .replace(SENSITIVE_PATTERNS.cpfRaw, '"[CPF_REDACTED]"')
        .replace(SENSITIVE_PATTERNS.email, '"[EMAIL_REDACTED]"')
        .replace(SENSITIVE_PATTERNS.token, '"[TOKEN_REDACTED]"')
        .replace(SENSITIVE_PATTERNS.phone, '"[PHONE_REDACTED]"')
        .replace(SENSITIVE_PATTERNS.password, '"password":"[REDACTED]"');

      return JSON.parse(serialized);
    } catch (err) {
      console.error("Failed to sanitize:", err);
      return { error: "Sanitization failed" };
    }
  }

  // Persistência
  private async persistLog(entry: LogEntry): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
      .from("monitoring_logs")
      .insert([entry]);

    if (error) throw error;
  }

  // Helpers
  child(childContext: string): UnifiedLogger {
    return new UnifiedLogger(
      `${this.context}:${childContext}`,
      this.correlationId
    );
  }

  getCorrelationId(): string {
    return this.correlationId;
  }
}

/**
 * Factory helper
 */
export function createLogger(context: string, correlationId?: string): UnifiedLogger {
  return new UnifiedLogger(context, correlationId);
}

/**
 * Helper para extrair correlationId de Request
 */
export function createLoggerFromRequest(context: string, req: Request): UnifiedLogger {
  const correlationId = req.headers.get("x-correlation-id") || crypto.randomUUID();
  return new UnifiedLogger(context, correlationId);
}
