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
    const IXC_API_BASE = Deno.env.get('IXC_API_BASE_URL'); // ex: central.supernetfibra.com.br

    if (!IXC_USERNAME || !IXC_PASSWORD) {
      throw new Error('Credenciais IXC não configuradas');
    }

    if (!IXC_API_BASE) {
      throw new Error('IXC_API_BASE_URL não configurado');
    }

    // Normalize IXC base: strip protocol and any path (we only need the host)
    const normalizeBase = (raw: string) => {
      const trimmed = raw.trim();
      const noProtocol = trimmed.replace(/^https?:\/\//i, '');
      const host = noProtocol.split('/')[0];
      return host;
    };
    const IXC_BASE_HOST = normalizeBase(IXC_API_BASE);

    const credentials = btoa(`${IXC_USERNAME}:${IXC_PASSWORD}`);

    console.log('Buscando clientes no IXC...');
    console.log('IXC_API_BASE_URL (raw):', IXC_API_BASE);
    console.log('IXC_API_BASE_URL (normalized host):', IXC_BASE_HOST);

    let page = 1;
    let totalClients = 0;
    let hasMorePages = true;
    const clientsPerPage = 1000; // Máximo permitido pela API

    const clientDetails = {
      ativos: 0,
      inativos: 0,
      bloqueados: 0,
      total: 0,
    };

    while (hasMorePages) {
      const apiUrl = `https://${IXC_BASE_HOST}/webservice/v1/cliente`;
      console.log(`Consultando: ${apiUrl} (page=${page}, rp=${clientsPerPage})`);

      // Muitas instalações IXC exigem POST com header "ixcsoft: listar"
      const form = new URLSearchParams({
        page: String(page),
        rp: String(clientsPerPage),
        sortname: 'cliente.id',
        sortorder: 'asc',
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'ixcsoft': 'listar',
        },
        body: form,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na API IXC:', response.status, errorText);
        throw new Error(`Erro ao buscar clientes no IXC: ${response.status}`);
      }

      const data = await response.json();

      // Normaliza registros: pode vir como array ou objeto com índices
      const registrosRaw = data?.registros;
      const registros: any[] = Array.isArray(registrosRaw)
        ? registrosRaw
        : (registrosRaw ? Object.values(registrosRaw) : []);

      if (!registros || registros.length === 0) {
        hasMorePages = false;
        break;
      }

      totalClients += registros.length;

      // Analisar status dos clientes
      registros.forEach((cliente: any) => {
        const ativoFlag = String(cliente.ativo ?? '').toUpperCase();
        if (ativoFlag === 'S' || ativoFlag === 'SIM' || ativoFlag === '1') {
          clientDetails.ativos++;
        } else {
          clientDetails.inativos++;
        }

        const statusInternet = String(cliente.status_internet ?? '').toUpperCase();
        if (statusInternet && ['CA', 'CM', 'CB', 'FA'].includes(statusInternet)) {
          clientDetails.bloqueados++;
        }
      });

      console.log(`Página ${page}: ${registros.length} clientes encontrados`);

      // Verificar se há mais páginas (quando a página volta com menos que o limite)
      const totalNaResposta = Number(data?.total ?? 0);
      if (registros.length < clientsPerPage || (totalNaResposta && page * clientsPerPage >= totalNaResposta)) {
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
        paginas_consultadas: page,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erro ao contar clientes IXC:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
