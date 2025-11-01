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

    // Buscar configurações de WhatsApp do company_settings
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: settings, error: settingsError } = await supabase
      .from('company_settings')
      .select('whatsapp_notification_phones, whatsapp_instance_name')
      .single();

    if (settingsError || !settings?.whatsapp_notification_phones?.length) {
      console.error("Números WhatsApp não configurados em company_settings", settingsError);
      return new Response(
        JSON.stringify({ error: "WhatsApp notification phones not configured" }), 
        { status: 500, headers }
      );
    }

    const instanceName = settings.whatsapp_instance_name || 'SDR2';
    const phones = settings.whatsapp_notification_phones;
    
    console.log(`Enviando notificação WhatsApp para ${phones.length} número(s) via instância ${instanceName}`);

    // Buscar credenciais da Evolution API
    const apiKey = Deno.env.get('EVOLUTION_API_KEY');
    const baseUrl = Deno.env.get('EVOLUTION_API_BASE_URL');

    if (!apiKey || !baseUrl) {
      console.error("Credenciais Evolution API não configuradas");
      return new Response(
        JSON.stringify({ error: "Evolution API credentials not configured" }), 
        { status: 500, headers }
      );
    }

    // Enviar mensagem para todos os números configurados
    const results = await Promise.all(
      phones.map(async (phone) => {
        try {
          const url = `${baseUrl}/message/sendText/${instanceName}`;
          console.log(`Enviando para ${phone}: ${url}`);

          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": apiKey,
            },
            body: JSON.stringify({
              number: phone,
              text: message,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Falha ao enviar para ${phone}:`, response.status, errorText);
            return { phone, success: false, error: errorText };
          }

          console.log(`Mensagem enviada com sucesso para ${phone}`);
          return { phone, success: true };
        } catch (error) {
          console.error(`Erro ao enviar para ${phone}:`, error);
          return { phone, success: false, error: String(error) };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Notificações: ${successCount} enviadas, ${failureCount} falhas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: { success: successCount, failure: failureCount }
      }), 
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
