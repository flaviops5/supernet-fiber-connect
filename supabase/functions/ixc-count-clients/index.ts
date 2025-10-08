import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callIxcWithRetry } from '../_shared/ixc-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const IXC_PROXY_URL = Deno.env.get('IXC_PROXY_URL') || `${Deno.env.get('SUPABASE_URL')}/functions/v1/ixc-proxy`;

    console.log('🔍 Buscando clientes IXC via proxy com retry/circuit breaker...');

    let page = 1;
    let hasMorePages = true;
    const itemsPerPage = 1000;
    const allRadUsers: any[] = [];

    while (hasMorePages) {
      console.log(`📄 Consultando radusuarios: página ${page}, limite ${itemsPerPage}`);

      const bodyRad = {
        qtype: 'radusuarios.id',
        query: '1',
        oper: '>=',
        page: String(page),
        rp: String(itemsPerPage),
        sortname: 'radusuarios.id',
        sortorder: 'desc',
      };

      // Usar o proxy centralizado com retry/circuit breaker
      const radData = await callIxcWithRetry(
        IXC_PROXY_URL,
        'POST',
        '/webservice/v1/radusuarios',
        bodyRad
      );

      const radRegistrosRaw = radData?.data?.registros;
      const radRegistros: any[] = Array.isArray(radRegistrosRaw)
        ? radRegistrosRaw
        : (radRegistrosRaw ? Object.values(radRegistrosRaw) : []);

      if (!radRegistros || radRegistros.length === 0) {
        hasMorePages = false;
        break;
      }

      allRadUsers.push(...radRegistros);
      console.log(`✅ Página ${page}: ${radRegistros.length} registros encontrados`);

      const totalNaResposta = Number(radData?.data?.total ?? 0);
      if (radRegistros.length < itemsPerPage || (totalNaResposta && page * itemsPerPage >= totalNaResposta)) {
        hasMorePages = false;
      } else {
        page++;
      }
    }

    console.log(`Total de registros radusuarios carregados: ${allRadUsers.length}`);

    // Primeiro, vamos ver quais campos realmente existem
    if (allRadUsers.length > 0) {
      console.log('Campos disponíveis no primeiro registro:', Object.keys(allRadUsers[0]));
      console.log('Exemplo de registro completo:', JSON.stringify(allRadUsers[0], null, 2));
    }

    // Agrupar por login e pegar apenas o registro mais recente de cada login
    const latestByLogin = new Map<string, any>();
    
    for (const rad of allRadUsers) {
      const login = String(rad.login ?? '').toLowerCase().trim();
      if (!login) continue;
      
      const current = latestByLogin.get(login);
      if (!current) {
        latestByLogin.set(login, rad);
      }
    }

    // Classificar por online/offline usando o campo 'online' do IXC
    let online = 0;
    let offline = 0;
    
    for (const [login, rad] of latestByLogin) {
      // O IXC usa o campo 'online' com valores 'S', 'SS', 'N', etc.
      const onlineStatus = String(rad.online || '').toUpperCase();
      
      if (onlineStatus === 'S' || onlineStatus === 'SS') {
        online++;
      } else {
        offline++;
      }
    }

    const clientDetails = {
      online,
      offline,
      total: latestByLogin.size,
    };

    console.log('Amostra de status (até 5):', Array.from(latestByLogin.entries()).slice(0,5).map(([l, r]) => ({ 
      login: l, 
      online: r.online,
      ultima_atualizacao: r.ultima_atualizacao 
    })));
    console.log('Resumo final:', clientDetails);

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
