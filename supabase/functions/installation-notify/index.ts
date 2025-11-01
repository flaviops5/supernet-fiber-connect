import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
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

    const webhook = Deno.env.get("EVOLUTION_WEBHOOK_URL");
    
    if (!webhook) {
      console.error("EVOLUTION_WEBHOOK_URL não configurado");
      return new Response(
        JSON.stringify({ error: "EVOLUTION_WEBHOOK_URL not configured" }), 
        { status: 500, headers }
      );
    }

    console.log("Enviando notificação para webhook:", webhook);
    
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
