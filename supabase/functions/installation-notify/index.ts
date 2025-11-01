import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    const { message } = await req.json();
    
    if (!message) {
      console.error("Mensagem ausente no payload");
      return new Response(
        JSON.stringify({ error: "Message is required" }), 
        { status: 400, headers }
      );
    }

    // Buscar webhook URL do company_settings
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: settings, error: settingsError } = await supabase
      .from('company_settings')
      .select('webhook_url, webhook_secret')
      .single();

    if (settingsError || !settings?.webhook_url) {
      console.error("Webhook URL não configurado em company_settings", settingsError);
      return new Response(
        JSON.stringify({ error: "Webhook URL not configured in company settings" }), 
        { status: 500, headers }
      );
    }

    console.log("Enviando notificação para webhook:", settings.webhook_url);
    
    const webhookHeaders: Record<string, string> = { 
      "Content-Type": "application/json" 
    };
    
    if (settings.webhook_secret) {
      webhookHeaders['X-Webhook-Secret'] = settings.webhook_secret;
    }
    
    const response = await fetch(settings.webhook_url, {
      method: "POST",
      headers: webhookHeaders,
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Falha ao enviar notificação:", response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: "Webhook failed", 
          status: response.status, 
          details: errorText 
        }), 
        { status: 502, headers }
      );
    }

    console.log("Notificação enviada com sucesso");
    return new Response(
      JSON.stringify({ success: true }), 
      { headers }
    );
  } catch (err) {
    console.error("Erro ao processar notificação:", err);
    return new Response(
      JSON.stringify({ error: String(err) }), 
      { status: 500, headers }
    );
  }
});
