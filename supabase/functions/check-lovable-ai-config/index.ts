import { createPublicHandler } from "../_shared/base-handler.ts";

Deno.serve(createPublicHandler(
  'check-lovable-ai-config',
  async (req, { supabase }) => {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    return { 
      configured: !!LOVABLE_API_KEY,
      message: LOVABLE_API_KEY ? 'Lovable AI configurada' : 'Lovable AI não configurada'
    };
  }
));
