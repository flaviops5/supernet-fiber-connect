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

    // Get CPF from request body
    const body = await req.json().catch(() => ({}));
    const cpf = body.cpf;

    console.log('Fetching contracts from IXC...', cpf ? `for CPF: ${cpf}` : 'all contracts');

    // Build request body based on whether CPF is provided
    const requestBody: any = {
      page: '1',
      rp: '100',
      sortname: 'contratos.id',
      sortorder: 'desc'
    };

    // If CPF is provided, add search filter
    if (cpf) {
      requestBody.qtype = 'cliente.cnpj_cpf';
      requestBody.query = cpf;
      requestBody.oper = '=';
    }

    const response = await fetch('https://central.supernetfibra.com.br/webservice/v1/contratos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${ixcUsername}:${ixcPassword}`),
        'ixcsoft': 'listar',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('IXC API error:', errorText);
      throw new Error(`IXC API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`IXC API Response:`, JSON.stringify(data, null, 2));
    console.log(`Found ${data.total || 0} contracts`);

    return new Response(
      JSON.stringify({
        success: true,
        contracts: data.registros || [],
        total: data.total || 0,
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
