/**
 * Common Types
 * Tipos compartilhados para evitar uso de any
 */

export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonArray = JsonValue[];

export interface ErrorWithMessage {
  message: string;
  code?: string;
  details?: JsonObject;
}

export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export interface ApiResponse<T = JsonValue> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface DatabaseRow {
  id: string;
  created_at: string;
  updated_at?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface QueryResult<T> {
  data: T[];
  count: number;
  page: number;
  total_pages: number;
}
