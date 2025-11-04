import { createPublicHandler } from '../_shared/base-handler.ts';

Deno.serve(createPublicHandler('test-evolution-api', async (req) => {
  const apiKey = Deno.env.get('EVOLUTION_API_KEY');
  const baseUrl = Deno.env.get('EVOLUTION_API_BASE_URL');
  const phoneNumber = Deno.env.get('EVOLUTION_PHONE_NUMBER');

  console.log('🔍 Testing Evolution API...');

  if (!apiKey || !baseUrl) {
    throw new Error('Missing Evolution API credentials (EVOLUTION_API_KEY or EVOLUTION_API_BASE_URL)');
  }

  // Normalize base URL
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');

  // Parse request body to get action
  let action = 'test-instance';
  let instanceName = 'SDR2';
  let body: any = {};
  
  try {
    body = await req.json();
    action = body.action || 'test-instance';
    instanceName = body.instance || 'SDR2';
    console.log('📋 Action:', action, 'Instance:', instanceName);
  } catch (e) {
    console.log('⚠️ No body provided, using defaults');
  }

  // Execute action based on request
  switch (action) {
    case 'list-instances': {
      console.log('📋 Listing all instances...');
      const listUrl = `${normalizedBaseUrl}/instance/fetchInstances`;
      console.log('🔗 URL:', listUrl);

      const response = await fetch(listUrl, {
        method: 'GET',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json().catch(() => ({ error: 'Invalid JSON response' }));
      console.log('📥 Instances:', JSON.stringify(data, null, 2));

      return {
        success: response.ok,
        status: response.status,
        message: response.ok ? 'Instances listed successfully' : 'Failed to list instances',
        instances: data,
        config: {
          baseUrl: normalizedBaseUrl,
          testedUrl: listUrl,
        }
      };
    }

    case 'test-instance': {
      console.log(`🔍 Testing instance: ${instanceName}`);
      const testUrl = `${normalizedBaseUrl}/instance/connectionState/${instanceName}`;
      console.log('🔗 URL:', testUrl);

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json().catch(() => ({ error: 'Invalid JSON response' }));
      console.log('📥 Connection State:', JSON.stringify(data, null, 2));

      return {
        success: response.ok,
        status: response.status,
        message: response.ok ? `Instance ${instanceName} connection OK` : `Instance ${instanceName} not found or not connected`,
        data,
        config: {
          baseUrl: normalizedBaseUrl,
          phoneNumber,
          instanceName,
          testedUrl: testUrl,
        }
      };
    }

    case 'send-message': {
      const { phone, message } = body;
      
      if (!phone || !message) {
        throw new Error('Phone and message are required for send-message action');
      }

      console.log(`📤 Sending message to ${phone} via ${instanceName}`);
      const sendUrl = `${normalizedBaseUrl}/message/sendText/${instanceName}`;
      console.log('🔗 URL:', sendUrl);

      const response = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: phone,
          text: message,
        }),
      });

      const data = await response.json().catch(() => ({ error: 'Invalid JSON response' }));
      console.log('📥 Send Response:', JSON.stringify(data, null, 2));

      return {
        success: response.ok,
        status: response.status,
        message: response.ok ? `Message sent to ${phone}` : 'Failed to send message',
        data,
        config: {
          baseUrl: normalizedBaseUrl,
          instanceName,
          phone,
          testedUrl: sendUrl,
        }
      };
    }

    default: {
      throw new Error(`Unknown action: ${action}. Valid actions: list-instances, test-instance, send-message`);
    }
  }
}));
