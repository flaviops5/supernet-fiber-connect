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
    
    try {
      const body = await req.json();
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

        return new Response(
          JSON.stringify({
            success: response.ok,
            status: response.status,
            message: response.ok ? 'Instances listed successfully' : 'Failed to list instances',
            instances: data,
            config: {
              baseUrl: normalizedBaseUrl,
              testedUrl: listUrl,
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
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

        return new Response(
          JSON.stringify({
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
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      default: {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Unknown action: ${action}`,
            validActions: ['list-instances', 'test-instance']
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
    }
  } catch (error) {
    console.error('❌ Evolution API test failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Failed to connect to Evolution API. Check credentials and base URL.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
