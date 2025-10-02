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
      online: 0,
      offline: 0,
      bloqueados: 0,
      pendencia_financeira: 0,
      total: 0,
    };

    // Buscar contratos ao invés de clientes diretamente
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

      // Analisar status dos contratos usando campos reais do IXC
      registros.forEach((contrato: any) => {
        clientDetails.total++;

        // Campo status_internet é o principal indicador
        const statusInternet = String(contrato.status_internet ?? '').toUpperCase();
        
        // Verificar bloqueio: CA, CM, CB, FA indicam bloqueio
        if (['CA', 'CM', 'CB'].includes(statusInternet)) {
          clientDetails.bloqueados++;
        }
        // FA = Financeiro em Atraso (pendência financeira)
        else if (statusInternet === 'FA') {
          clientDetails.pendencia_financeira++;
        }
        // A = Ativo (pode estar online ou offline)
        else if (statusInternet === 'A') {
          // Verificar se tem data de último bloqueio recente ou se tem conexão ativa
          const ultimoBloqueio = contrato.dt_ult_bloq_auto || contrato.dt_ult_bloq_manual;
          const ultimoDesbloqueio = contrato.dt_ult_des_bloq_conf;
          
          // Se tem desbloqueio mais recente que bloqueio, considera online
          if (ultimoDesbloqueio && (!ultimoBloqueio || ultimoDesbloqueio > ultimoBloqueio)) {
            clientDetails.online++;
          } else if (ultimoBloqueio && (!ultimoDesbloqueio || ultimoBloqueio > ultimoDesbloqueio)) {
            // Tem bloqueio mais recente, mas status é A, então está offline
            clientDetails.offline++;
          } else {
            // Sem informação de bloqueio/desbloqueio, assume online se ativo
            clientDetails.online++;
          }
        }
        // Outros status consideram offline
        else {
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
