import { createPublicHandler } from "../_shared/base-handler.ts";

Deno.serve(createPublicHandler(
  'send-whatsapp-message',
  async (req, { supabase }) => {
    const { phone, message, instanceName = 'SDR2' } = await req.json();
    
    console.log('📨 Send WhatsApp Message Request:', { phone, instanceName, messageLength: message?.length });
    
    if (!phone || !message) {
      throw new Error('Phone and message are required');
    }

    const apiKey = Deno.env.get('EVOLUTION_API_KEY');
    let baseUrl = Deno.env.get('EVOLUTION_API_BASE_URL');

    console.log('🔐 Checking credentials...');
    console.log(`   API Key present: ${!!apiKey} (length: ${apiKey?.length || 0})`);
    console.log(`   Base URL: ${baseUrl || 'NOT SET'}`);

    // Remove trailing slash from baseUrl
    if (baseUrl && baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    if (!apiKey || !baseUrl) {
      throw new Error('Evolution API credentials not configured');
    }

    console.log(`📱 Sending WhatsApp message to ${phone} via instance ${instanceName}`);

    // Format phone number
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;

    console.log(`📞 Formatted phone: ${formattedPhone}`);

    // Prepare headers - Evolution API uses 'apikey' header
    const headers = {
      'apikey': apiKey,
      'Content-Type': 'application/json',
    };

    // Send message via Evolution API
    const response = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
      }),
    });

    const responseText = await response.text();
    console.log(`📡 Evolution API Response (${response.status}):`, responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse Evolution API response:', responseText);
      throw new Error('Invalid response from Evolution API');
    }

    if (!response.ok) {
      console.error(`❌ Evolution API Error (${response.status}):`, responseData);
      throw new Error(responseData?.message || `Evolution API error: ${response.status}`);
    }

    console.log('✅ WhatsApp message sent successfully');

    return {
      success: true,
      data: responseData,
      phone: formattedPhone,
      instanceName,
    };
  }
));
