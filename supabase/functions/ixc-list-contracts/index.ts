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

    console.log('Fetching active contracts from IXC...');

    // Buscar contratos ativos do IXC
    const response = await fetch('https://central.supernetfibra.com.br/webservice/v1/contratos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${ixcUsername}:${ixcPassword}`),
        'ixcsoft': 'listar',
      },
      body: JSON.stringify({
        qtype: 'contratos.id_situacao_contrato',
        query: 'A', // A = Ativo
        oper: '=',
        page: '1',
        rp: '100',
        sortname: 'contratos.id',
        sortorder: 'desc'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('IXC API error:', errorText);
      throw new Error(`IXC API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`Found ${data.total || 0} active contracts`);

    return new Response(
      JSON.stringify({
        success: true,
        contracts: data.registros || [],
        total: data.total || 0
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
