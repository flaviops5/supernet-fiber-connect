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
    const ixcUsername = Deno.env.get('IXC_API_USERNAME');
    const ixcPassword = Deno.env.get('IXC_API_PASSWORD');

    if (!ixcUsername || !ixcPassword) {
      throw new Error('IXC API credentials not configured');
    }

    // Get search parameters from request body
    const body = await req.json().catch(() => ({}));
    
    console.log('Fetching plans from IXC...');

    // Buscar planos comerciais disponíveis no IXC
    const response = await fetch('https://central.supernetfibra.com.br/webservice/v1/cliente_tipo', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${ixcUsername}:${ixcPassword}`),
        'ixcsoft': 'listar',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('IXC API error:', errorText);
      throw new Error(`IXC API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`IXC API Response:`, JSON.stringify(data, null, 2));
    console.log(`Found ${data.total || data.registros?.length || 0} plans`);

    return new Response(
      JSON.stringify({
        success: true,
        contracts: data.registros || data || [],
        total: data.total || data.registros?.length || 0,
        rawResponse: data // Debug info
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error fetching contracts:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
