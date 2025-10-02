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

    console.log('Buscando apenas sessões ativas (online) no radusuarios...');
    console.log('IXC_API_BASE_URL (raw):', IXC_API_BASE);
    console.log('IXC_API_BASE_URL (normalized host):', IXC_BASE_HOST);

    // Buscar apenas radusuarios com sessões ATIVAS (acctstoptime vazio/null = online)
    const apiUrlRadusuarios = `https://${IXC_BASE_HOST}/webservice/v1/radusuarios`;
    console.log(`Buscando sessões ativas no radusuarios: ${apiUrlRadusuarios}`);

    let page = 1;
    let hasMorePages = true;
    const itemsPerPage = 1000;
    const onlineLogins = new Set<string>();
    const allSessions: any[] = [];

    while (hasMorePages) {
      console.log(`Consultando radusuarios: página ${page}, limite ${itemsPerPage}`);

      const formRad = new URLSearchParams({
        qtype: 'radusuarios.acctstoptime',
        query: '',
        oper: 'is_null',
        page: String(page),
        rp: String(itemsPerPage),
        sortname: 'radusuarios.acctstarttime',
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

      if (!radResponse.ok) {
        const errorText = await radResponse.text();
        console.error('Erro na API IXC radusuarios:', radResponse.status, errorText);
        throw new Error(`Erro ao buscar radusuarios no IXC: ${radResponse.status}`);
      }

      const radData = await radResponse.json();
      const radRegistrosRaw = radData?.registros;
      const radRegistros: any[] = Array.isArray(radRegistrosRaw)
        ? radRegistrosRaw
        : (radRegistrosRaw ? Object.values(radRegistrosRaw) : []);

      if (!radRegistros || radRegistros.length === 0) {
        hasMorePages = false;
        break;
      }

      // Adicionar logins únicos ao Set (sessões ativas = online)
      radRegistros.forEach((rad: any) => {
        if (rad.login) {
          const normalizedLogin = String(rad.login).toLowerCase().trim();
          onlineLogins.add(normalizedLogin);
        }
        allSessions.push(rad);
      });

      console.log(`Página ${page}: ${radRegistros.length} sessões ativas encontradas`);

      // Verificar se há mais páginas
      const totalNaResposta = Number(radData?.total ?? 0);
      if (radRegistros.length < itemsPerPage || (totalNaResposta && page * itemsPerPage >= totalNaResposta)) {
        hasMorePages = false;
      } else {
        page++;
      }
    }

    console.log(`Total de sessões ativas: ${allSessions.length}`);
    console.log(`Total de logins únicos online: ${onlineLogins.size}`);
    console.log('Primeiros 10 logins online:', Array.from(onlineLogins).slice(0, 10));

    // Log de exemplo de sessão ativa
    if (allSessions.length > 0) {
      console.log('Exemplo de sessão ativa:', JSON.stringify(allSessions[0], null, 2));
    }

    const clientDetails = {
      online: onlineLogins.size,
      offline: 0, // Não temos como calcular offline sem cliente_contrato
      total: onlineLogins.size,
    };

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
