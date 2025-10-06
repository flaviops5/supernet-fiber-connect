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
    console.log('🌐 Base URL:', baseUrl);

    if (!apiKey || !baseUrl) {
      throw new Error('Missing Evolution API credentials');
    }

    // Test instance status
    const instanceName = phoneNumber?.replace(/\D/g, '') || 'default';
    const response = await fetch(`${baseUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    console.log('✅ Evolution API Response:', JSON.stringify(data, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        status: response.status,
        message: 'Evolution API connection successful',
        data: data,
        config: {
          baseUrl,
          phoneNumber,
          instanceName,
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
