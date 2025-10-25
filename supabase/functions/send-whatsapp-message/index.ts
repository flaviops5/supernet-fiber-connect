import { createPublicHandler } from "../_shared/base-handler.ts";
import { createLogger } from '../_shared/logger.ts';

const logger = createLogger('send-whatsapp-message');

Deno.serve(createPublicHandler(
  'send-whatsapp-message',
  async (req, { supabase }) => {
    const { phone, message, instanceName = 'SDR2' } = await req.json();
    
    logger.info('Send WhatsApp Message Request', { phone, instanceName, messageLength: message?.length });
    
    if (!phone || !message) {
      throw new Error('Phone and message are required');
    }

    const apiKey = Deno.env.get('EVOLUTION_API_KEY');
    let baseUrl = Deno.env.get('EVOLUTION_API_BASE_URL');

    logger.debug('Checking credentials', { 
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      baseUrl: baseUrl || 'NOT SET'
    });

    // Remove trailing slash from baseUrl
    if (baseUrl && baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    if (!apiKey || !baseUrl) {
      throw new Error('Evolution API credentials not configured');
    }

    logger.info('Sending WhatsApp message', { phone, instanceName });

    // Format phone number
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;

    logger.debug('Formatted phone', { formattedPhone });

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
    logger.info('Evolution API Response', { status: response.status, responseText });

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      logger.error('Failed to parse Evolution API response', { responseText });
      throw new Error('Invalid response from Evolution API');
    }

    if (!response.ok) {
      logger.error('Evolution API Error', { status: response.status, responseData });
      throw new Error(responseData?.message || `Evolution API error: ${response.status}`);
    }

    logger.info('WhatsApp message sent successfully');

    return {
      success: true,
      data: responseData,
      phone: formattedPhone,
      instanceName,
    };
  }
));
