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
    const IXC_USERNAME = Deno.env.get('IXC_API_USERNAME');
    const IXC_PASSWORD = Deno.env.get('IXC_API_PASSWORD');
    const IXC_API_BASE = Deno.env.get('IXC_API_BASE_URL');
    
    if (!IXC_USERNAME || !IXC_PASSWORD) {
      throw new Error('Credenciais IXC não configuradas');
    }

    if (!IXC_API_BASE) {
      throw new Error('IXC_API_BASE_URL não configurado');
    }

    // Criar token de autenticação Base64
    const credentials = btoa(`${IXC_USERNAME}:${IXC_PASSWORD}`);
    
    console.log('Buscando clientes no IXC...');
    
    // Usando paginação para buscar todos os clientes
    let page = 1;
    let totalClients = 0;
    let hasMorePages = true;
    const clientsPerPage = 1000; // Máximo permitido pela API
    
    const clientDetails = {
      ativos: 0,
      inativos: 0,
      bloqueados: 0,
      total: 0
    };

    while (hasMorePages) {
      const apiUrl = `https://${IXC_API_BASE}/webservice/v1/cliente?page=${page}&rp=${clientsPerPage}`;
      console.log(`Consultando: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na API IXC:', response.status, errorText);
        throw new Error(`Erro ao buscar clientes no IXC: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.registros || data.registros.length === 0) {
        hasMorePages = false;
        break;
      }

      // Contar clientes desta página
      totalClients += data.registros.length;
      
      // Analisar status dos clientes
      data.registros.forEach((cliente: any) => {
        if (cliente.ativo === 'S') {
          clientDetails.ativos++;
        } else {
          clientDetails.inativos++;
        }
        
        // Verificar se tem algum contrato bloqueado
        if (cliente.status_internet && ['CA', 'CM', 'CB', 'FA'].includes(cliente.status_internet)) {
          clientDetails.bloqueados++;
        }
      });

      console.log(`Página ${page}: ${data.registros.length} clientes encontrados`);
      
      // Verificar se há mais páginas
      if (data.registros.length < clientsPerPage) {
        hasMorePages = false;
      } else {
        page++;
      }
    }

    clientDetails.total = totalClients;

    console.log(`Total de clientes encontrados: ${totalClients}`);

    return new Response(
      JSON.stringify({
        success: true,
        total_clientes: totalClients,
        detalhes: clientDetails,
        paginas_consultadas: page
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Erro ao contar clientes IXC:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
