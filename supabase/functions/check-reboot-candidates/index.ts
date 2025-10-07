import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { callIxcWithRetry } from '../_shared/ixc-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RadiusUser {
  id: string;
  id_cliente: string;
  login: string;
  online: string;
  framedipaddress?: string;
  acctinputoctets?: string;
  acctoutputoctets?: string;
  acctsessiontime?: string;
}

interface ClientStatus {
  id: string;
  razao: string;
  bloqueado: string;
  bloqueado_financeiro: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Verificando clientes com banda baixa...');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const IXC_PROXY_URL = `${SUPABASE_URL}/functions/v1/ixc-proxy`;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Testar conexão com IXC primeiro
    console.log('🔍 Testando conexão com IXC...');
    try {
      const pingResponse = await callIxcWithRetry(
        IXC_PROXY_URL,
        'GET',
        '/webservice/v1/ping',
        undefined,
        undefined
      );
      
      if (!pingResponse.ok) {
        console.error('❌ Falha no teste de conexão IXC:', pingResponse.error);
        throw new Error('IXC não está acessível. Verifique as credenciais e configurações.');
      }
      
      console.log('✅ Conexão IXC OK');
    } catch (error: any) {
      console.error('❌ Erro ao testar conexão:', error.message);
      throw new Error(`IXC não acessível: ${error.message}`);
    }

    // 2. Buscar clientes online do IXC
    console.log('📡 Consultando clientes online no IXC...');
    let radiusResponse;
    
    try {
      radiusResponse = await callIxcWithRetry(
        IXC_PROXY_URL,
        'GET',
        '/webservice/v1/radusuarios',
        undefined,
        'qtype=radusuarios.online&oper==&page=1&rp=999999&sortname=radusuarios.acctstarttime&sortorder=desc'
      );
    } catch (error: any) {
      console.error('❌ Erro detalhado ao consultar radusuarios:', error);
      throw new Error(`Falha ao consultar clientes online: ${error.message}`);
    }

    if (!radiusResponse.ok) {
      console.error('❌ Resposta IXC com erro:', radiusResponse.error);
      throw new Error(radiusResponse.error || 'Falha ao consultar radusuarios');
    }
    
    if (!radiusResponse.data?.registros) {
      console.warn('⚠️ IXC retornou resposta válida mas sem registros');
      return new Response(
        JSON.stringify({
          candidates: [],
          total: 0,
          timestamp: new Date().toISOString(),
          message: 'Nenhum cliente online encontrado no momento'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const onlineUsers: RadiusUser[] = radiusResponse.data.registros;
    console.log(`👥 ${onlineUsers.length} clientes online encontrados`);

    // 2. Buscar blacklist
    const { data: blacklist } = await supabase
      .from('equipment_reboot_blacklist')
      .select('ixc_client_id');
    
    const blacklistedIds = new Set(blacklist?.map(b => b.ixc_client_id) || []);

    // 3. Filtrar clientes com banda baixa
    const candidates = [];

    for (const user of onlineUsers) {
      // Ignorar se não está realmente online
      if (user.online !== 'S' && user.online !== 'SS') continue;

      // Calcular banda instantânea
      const inputBytes = parseInt(user.acctinputoctets || '0');
      const outputBytes = parseInt(user.acctoutputoctets || '0');
      const sessionTime = parseInt(user.acctsessiontime || '1');

      if (sessionTime === 0) continue;

      const totalBytes = inputBytes + outputBytes;
      const bandwidthKbps = (totalBytes * 8) / (sessionTime * 1024);

      // Detectar banda anormalmente baixa
      if (bandwidthKbps < 900 && bandwidthKbps > 0) {
        // Verificar status do cliente
        let clientData: ClientStatus | null = null;
        let isBlocked = false;

        try {
          const clientResponse = await callIxcWithRetry(
            IXC_PROXY_URL,
            'GET',
            '/webservice/v1/cliente',
            undefined,
            `qtype=cliente.id&query=${user.id_cliente}&oper==&page=1&rp=1&sortname=cliente.id&sortorder=asc`
          );

          if (clientResponse.ok && clientResponse.data?.registros?.[0]) {
            clientData = clientResponse.data.registros[0];
            isBlocked = clientData.bloqueado === 'S' || clientData.bloqueado_financeiro === 'S';
          }
        } catch (err) {
          console.error(`Erro ao buscar cliente ${user.id_cliente}:`, err);
        }

        // Verificar cooldown (reboot recente)
        const { data: recentReboots } = await supabase
          .from('equipment_reboots')
          .select('id')
          .eq('ixc_client_id', user.id_cliente)
          .gte('detection_timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        candidates.push({
          clientId: user.id_cliente,
          login: user.login,
          ip: user.framedipaddress || '',
          bandwidthKbps: Math.round(bandwidthKbps * 100) / 100,
          clientName: clientData?.razao,
          isBlocked,
          isBlacklisted: blacklistedIds.has(user.id_cliente),
          recentReboot: (recentReboots && recentReboots.length > 0)
        });
      }
    }

    console.log(`🚨 ${candidates.length} clientes com banda baixa encontrados`);

    return new Response(
      JSON.stringify({
        candidates,
        total: candidates.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro na função:', error.message);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        candidates: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});