import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

/**
 * P2 Security Fix: RBAC + Sanitized Response
 * - Requires authentication + admin role
 * - Sanitizes response to not expose configuration details
 */
Deno.serve(createAuthenticatedHandler(
  'check-lovable-ai-config',
  async (req, { supabase, user }) => {
    // RBAC: Admin-only access
    const { data: hasAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasAdmin) {
      console.warn(`⚠️ Unauthorized access attempt by user ${user.id}`);
      throw new Error('Acesso negado: apenas administradores');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    // Sanitized response - no details about configuration
    return { 
      configured: !!LOVABLE_API_KEY,
      message: 'Status verificado'
    };
  }
));
