import { createPublicHandler } from '../_shared/base-handler.ts';

/**
 * 🚨 SECURITY: Esta função foi DESABILITADA por motivos de segurança crítica
 * 
 * RISCO CRÍTICO:
 * - Expõe código-fonte completo de todas as edge functions
 * - Revela lógica de negócio proprietária e algoritmos
 * - Facilita engenharia reversa e descoberta de vulnerabilidades
 * 
 * Para ativar novamente (apenas em staging/desenvolvimento):
 * 1. Implementar whitelist de funções permitidas
 * 2. Adicionar role-based access control (apenas super_admin)
 * 3. Sanitizar código (remover comentários, secrets)
 * 4. Adicionar audit logging completo
 * 5. Rate limiting agressivo (1 req/min)
 */

Deno.serve(createPublicHandler('get-function-code', async (req) => {
    // 🔒 FUNÇÃO DESABILITADA POR SEGURANÇA
    throw new Error(
      'This function has been disabled for security reasons. ' +
      'Exposing source code is a critical security vulnerability. ' +
      'Contact system administrator if you need access to function code.'
    );
}));
