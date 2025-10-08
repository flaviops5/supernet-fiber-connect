import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Verificando clientes com banda baixa...');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const IXC_USERNAME = Deno.env.get('IXC_API_USERNAME');
    const IXC_PASSWORD = Deno.env.get('IXC_API_PASSWORD');
    const IXC_API_BASE = Deno.env.get('IXC_API_BASE_URL');

    if (!IXC_USERNAME || !IXC_PASSWORD || !IXC_API_BASE) {
      throw new Error('Credenciais IXC não configuradas');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const credentials = btoa(`${IXC_USERNAME}:${IXC_PASSWORD}`);

    // Normalizar IXC_API_BASE: remover protocolo e caminhos
    const normalizeBase = (raw: string) => {
      const trimmed = raw.trim();
      const noProtocol = trimmed.replace(/^https?:\/\//i, '');
      const host = noProtocol.split('/')[0];
      return host;
    };
    const IXC_BASE_HOST = normalizeBase(IXC_API_BASE);

    console.log('IXC_API_BASE normalizado:', IXC_BASE_HOST);

    // 1. Buscar clientes online do IXC
    console.log('📡 Consultando clientes online no IXC...');
    
    const bodyRad = JSON.stringify({
      qtype: 'radusuarios.id',
      query: '1',
      oper: '>=',
      page: '1',
      rp: '5000',
      sortname: 'radusuarios.id',
      sortorder: 'desc',
    });

    const radiusResponse = await fetch(`https://${IXC_BASE_HOST}/webservice/v1/radusuarios`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'ixcsoft': 'listar',
      },
      body: bodyRad,
    });

    if (!radiusResponse.ok) {
      const errorText = await radiusResponse.text();
      console.error('❌ Erro na API IXC:', radiusResponse.status, errorText);
      throw new Error(`Erro ao buscar radusuarios: ${radiusResponse.status}`);
    }

    const radiusData = await radiusResponse.json();
    
    if (!radiusData?.registros) {
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

    const onlineUsers: RadiusUser[] = Array.isArray(radiusData.registros) 
      ? radiusData.registros 
      : Object.values(radiusData.registros || {});
    
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
      const sessionTime = parseInt(user.acctsessiontime || '0');
      
      // Sessão ativa há mais de 24 horas (86400 segundos)
      if (sessionTime < 86400) continue;
      
      const totalBytes = inputBytes + outputBytes;
      const totalMB = totalBytes / (1024 * 1024);
      
      // Se está online há mais de 24h mas transmitiu menos de 100MB, provavelmente está congelado
      if (totalMB < 100) {
        // Verificar status do cliente
        let clientData: ClientStatus | null = null;
        let isBlocked = false;

        try {
          const clientResponse = await fetch(
            `https://${IXC_BASE_HOST}/webservice/v1/cliente?qtype=cliente.id&query=${user.id_cliente}&oper==&page=1&rp=1`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (clientResponse.ok) {
            const clientJson = await clientResponse.json();
            if (clientJson?.registros?.[0]) {
              clientData = clientJson.registros[0];
              isBlocked = clientData.bloqueado === 'S' || clientData.bloqueado_financeiro === 'S';
            }
          }
        } catch (err) {
          // Erro silencioso
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
