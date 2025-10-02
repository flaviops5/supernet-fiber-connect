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

    // Primeiro, buscar usuários online no radusuarios
    const apiUrlRadusuarios = `https://${IXC_BASE_HOST}/webservice/v1/radusuarios`;
    console.log(`Buscando usuários online em: ${apiUrlRadusuarios}`);

    const onlineLogins = new Set<string>();

    try {
      const formRad = new URLSearchParams({
        qtype: 'radusuarios.id',
        query: '1',
        oper: '>=',
        page: '1',
        rp: '10000',
        sortname: 'radusuarios.id',
        sortorder: 'desc',
      });

      const radResponse = await fetch(apiUrlRadusuarios, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'ixcsoft': 'listar',
        },
        body: formRad,
      });

      if (radResponse.ok) {
        const radData = await radResponse.json();
        const radRegistrosRaw = radData?.registros;
        const radRegistros: any[] = Array.isArray(radRegistrosRaw)
          ? radRegistrosRaw
          : (radRegistrosRaw ? Object.values(radRegistrosRaw) : []);

        // Adicionar logins online ao Set
        radRegistros.forEach((rad: any) => {
          if (rad.login) {
            onlineLogins.add(String(rad.login).toLowerCase().trim());
          }
        });

        console.log(`Encontrados ${onlineLogins.size} logins online no radusuarios`);
      }
    } catch (error) {
      console.warn('Erro ao buscar radusuarios, continuando sem dados de login online:', error);
    }

    let page = 1;
    let totalClients = 0;
    let hasMorePages = true;
    const clientsPerPage = 1000;

    const clientDetails = {
      online: 0,
      offline: 0,
      total: 0,
    };

    // Buscar contratos
    const apiUrlContratos = `https://${IXC_BASE_HOST}/webservice/v1/cliente_contrato`;
    console.log(`Buscando contratos em: ${apiUrlContratos}`);

    while (hasMorePages) {
      console.log(`Consultando contratos: página ${page}, limite ${clientsPerPage}`);

      const form = new URLSearchParams({
        qtype: 'cliente_contrato.id',
        query: '1',
        oper: '>=',
        page: String(page),
        rp: String(clientsPerPage),
        sortname: 'cliente_contrato.id',
        sortorder: 'desc',
      });

      const response = await fetch(apiUrlContratos, {
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
        throw new Error(`Erro ao buscar contratos no IXC: ${response.status}`);
      }

      const data = await response.json();

      // Normaliza registros
      const registrosRaw = data?.registros;
      const registros: any[] = Array.isArray(registrosRaw)
        ? registrosRaw
        : (registrosRaw ? Object.values(registrosRaw) : []);

      if (!registros || registros.length === 0) {
        hasMorePages = false;
        break;
      }

      totalClients += registros.length;

      // Analisar contratos - classificar apenas por online/offline
      registros.forEach((contrato: any) => {
        clientDetails.total++;

        const login = String(contrato.login ?? '').toLowerCase().trim();
        
        // Se o login está no radusuarios, está online, senão offline
        if (login && onlineLogins.has(login)) {
          clientDetails.online++;
        } else {
          clientDetails.offline++;
        }
      });

      console.log(`Página ${page}: ${registros.length} contratos encontrados`);
      console.log(`Status até agora:`, clientDetails);

      // Verificar se há mais páginas
      const totalNaResposta = Number(data?.total ?? 0);
      if (registros.length < clientsPerPage || (totalNaResposta && page * clientsPerPage >= totalNaResposta)) {
        hasMorePages = false;
      } else {
        page++;
      }
    }

    console.log(`Total de contratos encontrados: ${totalClients}`);
    console.log(`Resumo final:`, clientDetails);

    return new Response(
      JSON.stringify({
        success: true,
        total_clientes: clientDetails.total,
        detalhes: clientDetails,
        paginas_consultadas: page - 1,
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
