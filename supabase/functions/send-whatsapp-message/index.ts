import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📨 Received request to send-whatsapp-message');
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('❌ Failed to parse request body:', e);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { phone, message, instanceName = 'SDR2' } = body;
    
    console.log('📨 Send WhatsApp Message Request:', { phone, instanceName, messageLength: message?.length });
    
    if (!phone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone and message are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const apiKey = Deno.env.get('EVOLUTION_API_KEY');
    let baseUrl = Deno.env.get('EVOLUTION_API_BASE_URL');

    // Remove trailing slash from baseUrl to avoid double slashes
    if (baseUrl && baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    if (!apiKey || !baseUrl) {
      console.error('❌ Missing credentials:', { hasApiKey: !!apiKey, hasBaseUrl: !!baseUrl });
      return new Response(
        JSON.stringify({ success: false, error: 'Evolution API credentials not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`📱 Sending WhatsApp message to ${phone} via instance ${instanceName}`);
    console.log(`🔗 API URL: ${baseUrl}/message/sendText/${instanceName}`);
    console.log(`🔑 Using API Key: ${apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET'}`);

    // Format phone number
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;

    console.log(`📞 Formatted phone: ${formattedPhone}`);

    // Send message via Evolution API
    // Evolution API uses 'apikey' header, not 'Bearer'
    const response = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Evolution API error: ${response.status}`,
          details: errorText 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
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
    console.error('❌ Unexpected error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
