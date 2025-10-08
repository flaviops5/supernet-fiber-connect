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
  ip?: string;
  upload_atual?: string;
  download_atual?: string;
  tempo_conexao?: string;
  // Campos legados (alguns IXC ainda usam)
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

// Helper para converter tempo de sessão (aceita segundos ou formato HH:MM:SS)
function parseSessionSeconds(user: RadiusUser): number {
  const fromAcct = parseInt(user.acctsessiontime || '0');
  if (!Number.isNaN(fromAcct) && fromAcct > 0) return fromAcct;
  const t = (user.tempo_conexao || '').trim();
  // Alguns IXC retornam "H:MM:SS" ou "HH:MM:SS"
  const match = t.match(/^\s*(\d{1,2}):(\d{2}):(\d{2})\s*$/);
  if (match) {
    const h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const s = parseInt(match[3]);
    return (h * 3600) + (m * 60) + s;
  }
  return 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Verificando clientes com banda baixa...');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // URL do proxy centralizado
    const IXC_PROXY_URL = `${SUPABASE_URL}/functions/v1/ixc-proxy`;

    // 1. Buscar clientes online do IXC via proxy
    console.log('📡 Consultando radusuarios via IXC proxy...');
    
    const bodyRad = {
      qtype: 'radusuarios.id',
      query: '1',
      oper: '>=',
      page: '1',
      rp: '5000',
      sortname: 'radusuarios.id',
      sortorder: 'desc',
    };

    let radiusData;
    try {
      radiusData = await callIxcWithRetry(
        IXC_PROXY_URL,
        'POST',
        '/webservice/v1/radusuarios',
        bodyRad
      );
    } catch (error: any) {
      console.error('❌ Erro detalhado ao consultar radusuarios:', error.message);
      throw new Error(`Falha ao buscar radusuarios via proxy: ${error.message}`);
    }
    
    if (!radiusData?.data?.registros) {
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

    const onlineUsers: RadiusUser[] = Array.isArray(radiusData.data.registros) 
      ? radiusData.data.registros 
      : Object.values(radiusData.data.registros || {});
    
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

      // O IXC não atualiza acctinputoctets/acctoutputoctets em tempo real
      // Esses campos só são atualizados quando a sessão termina
      // Por isso, vamos detectar equipamentos congelados por:
      // 1. Cliente está online (online = S ou SS)
      // 2. Tempo de sessão muito longo (> 24 horas)
      // 3. Bytes transmitidos = 0 ou muito baixo (< 100MB)
      
      const inputBytes = parseInt(user.acctinputoctets || '0');
      const outputBytes = parseInt(user.acctoutputoctets || '0');
      const sessionTime = parseSessionSeconds(user);
      
      // Sessão ativa há mais de 24 horas (86400 segundos)
      if (sessionTime < 86400) continue;
      
      const totalBytes = inputBytes + outputBytes;
      const totalMB = totalBytes / (1024 * 1024);
      
      // Se está online há mais de 24h mas transmitiu menos de 100MB, provavelmente está congelado
      if (totalMB < 100) {
        // Verificar status do cliente via proxy
        let clientData: ClientStatus | null = null;
        let isBlocked = false;

        try {
          const clientResponse = await callIxcWithRetry(
            IXC_PROXY_URL,
            'GET',
            '/webservice/v1/cliente',
            undefined,
            `qtype=cliente.id&query=${user.id_cliente}&oper==&page=1&rp=1`
          );

          if (clientResponse?.data?.registros?.[0]) {
            clientData = clientResponse.data.registros[0];
            isBlocked = clientData.bloqueado === 'S' || clientData.bloqueado_financeiro === 'S';
          }
        } catch (err) {
          console.warn(`⚠️ Erro ao buscar dados do cliente ${user.id_cliente}:`, (err as Error).message);
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
          ip: user.ip || user.framedipaddress || '',
          sessionHours: Math.round((sessionTime / 3600) * 10) / 10,
          totalDataMB: Math.round(totalMB * 10) / 10,
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
