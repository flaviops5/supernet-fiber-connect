/**
 * Centralized Error Handler
 * Sprint 8: Elimina duplicação de error handling
 */

import { toast } from "@/components/ui/use-toast";

export interface ErrorOptions {
  title?: string;
  showToast?: boolean;
  logToConsole?: boolean;
  context?: string;
  variant?: "default" | "destructive";
}

/**
 * Handler centralizado para erros
 * Substituir todos os try/catch repetidos
 */
export function handleError(
  error: unknown,
  options: ErrorOptions = {}
): void {
  const {
    title = "Erro",
    showToast = true,
    logToConsole = true,
    context = "",
    variant = "destructive"
  } = options;

  const message = error instanceof Error 
    ? error.message 
    : "Ocorreu um erro inesperado";

  if (logToConsole) {
    const prefix = context ? `[${context}]` : '[Error]';
    console.error(prefix, error);
  }

  if (showToast) {
    toast({
      title,
      description: message,
      variant
    });
  }
}

/**
 * Wrapper para executar funções com error handling automático
 * 
 * @example
 * const data = await withErrorHandling(
 *   () => fetchData(),
 *   { context: 'fetchData', title: 'Erro ao buscar dados' }
 * );
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options?: ErrorOptions
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    handleError(error, options);
    return null;
  }
}

/**
 * Handler para erros de validação
 */
export function handleValidationError(
  fieldErrors: Record<string, string[]>,
  options?: Omit<ErrorOptions, 'title'>
): void {
  const firstError = Object.values(fieldErrors)[0]?.[0];
  
  handleError(
    new Error(firstError || "Erro de validação"),
    {
      ...options,
      title: "Erro de Validação"
    }
  );
}

/**
 * Handler para erros de rede
 */
export function handleNetworkError(
  error: unknown,
  options?: Omit<ErrorOptions, 'title'>
): void {
  handleError(error, {
    ...options,
    title: "Erro de Conexão",
  });
}

/**
 * Handler para erros de autenticação
 */
export function handleAuthError(
  error: unknown,
  options?: Omit<ErrorOptions, 'title' | 'variant'>
): void {
  handleError(error, {
    ...options,
    title: "Erro de Autenticação",
    variant: "destructive"
  });
}

/**
 * Handler para sucesso (toasts de sucesso)
 */
export function handleSuccess(
  message: string,
  options?: Omit<ErrorOptions, 'variant' | 'title'>
): void {
  toast({
    title: "Sucesso",
    description: message,
    variant: "default"
  });
  
  if (options?.logToConsole) {
    const prefix = options.context ? `[${options.context}]` : '[Success]';
    console.log(prefix, message);
  }
}
