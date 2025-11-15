/**
 * Logger Types
 * Interfaces para sistema de logging estruturado
 */

export interface LogMetadata {
  [key: string]: string | number | boolean | null | undefined | LogMetadata;
}

export interface Logger {
  info(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  error(message: string, error?: Error | unknown, metadata?: LogMetadata): void;
  debug(message: string, metadata?: LogMetadata): void;
}

export interface LogContext {
  conversation_id?: string;
  agent_name?: string;
  scenario?: string;
  action?: string;
  [key: string]: string | number | boolean | null | undefined;
}
