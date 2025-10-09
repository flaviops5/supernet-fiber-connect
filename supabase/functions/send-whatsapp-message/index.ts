import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message, instanceName = 'SDR2' } = await req.json();
    
    console.log('📨 Send WhatsApp Message Request:', { phone, instanceName, messageLength: message?.length });
    
    if (!phone || !message) {
      throw new Error('Phone and message are required');
    }

    const apiKey = Deno.env.get('EVOLUTION_API_KEY');
    const baseUrl = Deno.env.get('EVOLUTION_API_BASE_URL');

    if (!apiKey || !baseUrl) {
      console.error('❌ Missing credentials:', { hasApiKey: !!apiKey, hasBaseUrl: !!baseUrl });
      throw new Error('Evolution API credentials not configured');
    }

    console.log(`📱 Sending WhatsApp message to ${phone} via instance ${instanceName}`);
    console.log(`🔗 API URL: ${baseUrl}/message/sendText/${instanceName}`);

    // Formatar número (remover caracteres especiais e garantir formato correto)
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;

    console.log(`📞 Formatted phone: ${formattedPhone}`);

    // Enviar mensagem via Evolution API
    const response = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
        delay: 1200
      }),
    });

    console.log(`📡 Evolution API Response Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Evolution API Error:', response.status, errorText);
      throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Message sent successfully:', data);

    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'Message sent successfully',
        data: {
          id: data.key?.id || data.messageId,
          status: data.status || 'SENT'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
