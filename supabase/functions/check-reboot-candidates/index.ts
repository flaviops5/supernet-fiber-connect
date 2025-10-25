import { createPublicHandler } from '../_shared/base-handler.ts';
import { callIxcWithRetry } from '../_shared/ixc-client.ts';
import type { RadiusUser, ClientStatus } from '../_shared/types.ts';

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

Deno.serve(createPublicHandler('check-reboot-candidates', async (req, { supabase }) => {
  console.log('🔍 Verificando clientes com banda baixa...');

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  
  // URL do proxy centralizado
  const IXC_PROXY_URL = `${SUPABASE_URL}/functions/v1/ixc-proxy`;

    // 🔥 OTIMIZAÇÃO: Buscar apenas clientes ONLINE direto na query
    console.log('📡 Buscando clientes ONLINE via IXC proxy (filtro direto)...');
    
    const bodyOnline = {
      qtype: 'radusuarios.online',
      query: 'S',
      oper: '=',
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
        bodyOnline
      );
      console.log('✅ Clientes online obtidos com sucesso (filtro direto aplicado)');
    } catch (error: any) {
      console.error('❌ Erro ao buscar clientes online:', error.message);
      throw new Error(`Falha ao buscar clientes online via proxy: ${error.message}`);
    }
    
  if (!radiusData?.data?.registros) {
    console.warn('⚠️ IXC retornou resposta válida mas sem registros');
    return {
      candidates: [],
      total: 0,
      timestamp: new Date().toISOString(),
      message: 'Nenhum cliente online encontrado no momento'
    };
  }

    const onlineUsers: RadiusUser[] = Array.isArray(radiusData.data.registros) 
      ? radiusData.data.registros 
      : Object.values(radiusData.data.registros || {});
    
    console.log(`👥 ${onlineUsers.length} clientes ONLINE encontrados (já filtrados pela query)`);

    // 2. Buscar blacklist
    const { data: blacklist } = await supabase
      .from('equipment_reboot_blacklist')
      .select('ixc_client_id');
    
    const blacklistedIds = new Set(blacklist?.map(b => b.ixc_client_id) || []);

    // 3. Filtrar clientes com banda baixa
    const candidates = [];

    for (const user of onlineUsers) {
      // Query já filtra apenas online='S', mas validar por segurança
      if (user.online !== 'S' && user.online !== 'SS') {
        console.warn(`⚠️ Cliente ${user.login} retornado com status ${user.online} (esperado S/SS)`);
        continue;
      }

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

  return {
    candidates,
    total: candidates.length,
    timestamp: new Date().toISOString()
  };
}));
