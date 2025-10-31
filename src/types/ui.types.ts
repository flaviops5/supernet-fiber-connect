/**
 * UI Component Types
 * MISSÃO 1.1: TypeScript Zero-Any (Frontend)
 * Types para componentes de UI genéricos
 */

import type { LucideIcon } from 'lucide-react';

/**
 * Variantes de badge de status
 */
export type StatusBadgeVariant = 
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning';

/**
 * Configuração de badge de status
 */
export interface StatusBadgeConfig {
  variant: StatusBadgeVariant;
  label: string;
  color: string;
  icon?: LucideIcon;
}

/**
 * Mapa de badges por status
 */
export type StatusBadgeMap = Record<string, StatusBadgeConfig>;

/**
 * Mapa de ícones por categoria
 */
export type CategoryIconMap = Record<string, LucideIcon>;

/**
 * Item de navegação
 */
export interface NavigationItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: string | number;
  active?: boolean;
}

/**
 * Opção de select/dropdown (removido - usar de common.types)
 */

/**
 * Dados de gráfico genérico
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Configuração de tabela
 */
export interface TableColumn<T = unknown> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  width?: string;
}

/**
 * Props de paginação
 */
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  totalItems?: number;
}
