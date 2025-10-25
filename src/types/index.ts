/**
 * Centralized Type Exports
 * Import from here: import { IXCCustomer, AgentRole } from '@/types'
 */

export * from './ixc.types';
export * from './agent.types';
export * from './conversation.types';
export * from './diagnostico.types';

// Error types for edge functions (re-exported for convenience)
export interface EdgeFunctionError extends Error {
  code?: string;
  statusCode?: number;
  details?: unknown;
}
