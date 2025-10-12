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

    console.log('🔍 Testing Evolution API connection...');
    console.log('📞 Phone Number:', phoneNumber);
    console.log('🌐 Base URL (raw):', baseUrl);

    if (!apiKey || !baseUrl) {
      throw new Error('Missing Evolution API credentials');
    }

    // Normalize base URL to avoid double slashes
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');

    // Test instance status with SDR2
    const instanceName = 'SDR2';
    const testUrl = `${normalizedBaseUrl}/instance/connectionState/${instanceName}`;

    console.log('🔗 Testing URL:', testUrl);

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json().catch(() => ({ noJson: true }));
    
    console.log('📥 Evolution API Raw Status:', response.status);
    console.log('✅ Evolution API Response Body:', JSON.stringify(data, null, 2));

    const success = response.ok;

    return new Response(
      JSON.stringify({
        success,
        status: response.status,
        message: success ? 'Evolution API connection successful' : 'Evolution API returned a non-200 status',
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
  } catch (error) {
    console.error('❌ Evolution API test failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Failed to connect to Evolution API. Check your credentials and base URL.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
