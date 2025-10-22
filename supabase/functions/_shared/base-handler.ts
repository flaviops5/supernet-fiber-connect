// ============================================
// BASE HANDLER - Template padrão para Edge Functions
// ============================================
// Inclui: CORS, Error Handling, Rate Limiting, Metrics, Logging
// 
// USO:
// import { createProtectedHandler } from "../_shared/base-handler.ts";
// 
// Deno.serve(createProtectedHandler({
//   functionName: 'my-function',
//   requireAuth: true,
//   enableRateLimit: true,
//   handler: async (req, context) => {
//     // Sua lógica aqui
//     return { success: true, data: {...} };
//   }
// }));

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { handleEdgeFunctionError } from "./error-handler.ts";
import { checkRateLimit, formatBlockedTime } from "./rate-limiter.ts";
import { recordMetric } from "./metrics-helper.ts";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hmac-signature, x-timestamp',
};

export interface HandlerContext {
  supabase: ReturnType<typeof createClient>;
  user?: any;
  cpf?: string;
  req: Request;
}

export interface HandlerConfig<T = any> {
  functionName: string;
  requireAuth?: boolean;
  enableRateLimit?: boolean;
  extractCpf?: (req: Request, user?: any) => Promise<string | undefined>;
  handler: (req: Request, context: HandlerContext) => Promise<T>;
}

/**
 * Cria um handler protegido com todas as camadas de segurança
 */
export function createProtectedHandler<T = any>(config: HandlerConfig<T>) {
  return async (req: Request): Promise<Response> => {
    const startTime = Date.now();
    let success = false;
    let errorMessage: string | undefined;

    try {
      // 1. CORS Preflight
      if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      // 2. Inicializar Supabase
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials');
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // 3. Autenticação (se necessário)
      let user: any = undefined;
      if (config.requireAuth) {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: 'Authorization header required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !authUser) {
          return new Response(
            JSON.stringify({ error: 'Invalid or expired token' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        user = authUser;
      }

      // 4. Rate Limiting (se habilitado)
      let cpf: string | undefined;
      if (config.enableRateLimit) {
        cpf = config.extractCpf ? await config.extractCpf(req, user) : undefined;
        
        if (cpf) {
          const rateLimit = await checkRateLimit(cpf);
          if (!rateLimit.allowed) {
            const blockedTime = rateLimit.blockedUntil 
              ? formatBlockedTime(rateLimit.blockedUntil)
              : '5 minutos';
            
            return new Response(
              JSON.stringify({ 
                error: 'Rate limit exceeded',
                message: `Você fez muitas requisições. Tente novamente em ${blockedTime}.`,
                blockedUntil: rateLimit.blockedUntil
              }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      // 5. Executar handler principal
      const context: HandlerContext = {
        supabase,
        user,
        cpf,
        req
      };

      const result = await config.handler(req, context);
      success = true;

      // 6. Retornar resposta
      return new Response(
        JSON.stringify(result),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (error: any) {
      errorMessage = error.message;
      console.error(`❌ [${config.functionName}] Error:`, error);
      return handleEdgeFunctionError(error, config.functionName);
      
    } finally {
      // 7. Registrar métricas (não-bloqueante)
      const duration = Date.now() - startTime;
      recordMetric({
        agent_name: config.functionName,
        action_type: 'request',
        success,
        duration_ms: duration,
        error_message: errorMessage
      }).catch(console.error);
    }
  };
}

/**
 * Extrator padrão de CPF do body
 */
export async function extractCpfFromBody(req: Request): Promise<string | undefined> {
  try {
    const body = await req.clone().json();
    return body.cpf || body.client_cpf || body.customer_cpf;
  } catch {
    return undefined;
  }
}

/**
 * Template para funções públicas (sem auth, sem rate limit)
 */
export function createPublicHandler<T = any>(
  functionName: string,
  handler: (req: Request, context: HandlerContext) => Promise<T>
) {
  return createProtectedHandler({
    functionName,
    requireAuth: false,
    enableRateLimit: false,
    handler
  });
}

/**
 * Template para funções autenticadas com rate limit
 */
export function createAuthenticatedHandler<T = any>(
  functionName: string,
  handler: (req: Request, context: HandlerContext) => Promise<T>,
  extractCpf?: (req: Request, user?: any) => Promise<string | undefined>
) {
  return createProtectedHandler({
    functionName,
    requireAuth: true,
    enableRateLimit: true,
    extractCpf: extractCpf || extractCpfFromBody,
    handler
  });
}
