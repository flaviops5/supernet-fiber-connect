import { createAuthenticatedHandler } from '../_shared/base-handler.ts';
import { callIxcWithRetry } from '../_shared/ixc-client.ts';
import { createLogger } from '../_shared/logger.ts';
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

// P0 FIX: Convertido para createAuthenticatedHandler
// Candidatos a reboot manipula dados de equipamentos críticos
Deno.serve(createAuthenticatedHandler('check-reboot-candidates', async (req, { supabase, user }) => {
  const logger = createLogger('check-reboot-candidates', req);
  logger.info('Verificando clientes com banda baixa');

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  
  // URL do proxy centralizado
  const IXC_PROXY_URL = `${SUPABASE_URL}/functions/v1/ixc-proxy`;
  
  // Obter Authorization header para repassar ao ixc-proxy
  const authHeader = req.headers.get('Authorization');
  const additionalHeaders = authHeader ? { 'Authorization': authHeader } : {};

    // 🔥 OTIMIZAÇÃO: Buscar apenas clientes ONLINE direto na query
    logger.info('Buscando clientes ONLINE via IXC proxy (filtro direto)');
    
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
        bodyOnline,
        undefined,
        {},
        additionalHeaders
      );
      logger.info('Clientes online obtidos com sucesso (filtro direto aplicado)');
    } catch (error: unknown) {
      logger.error('Erro ao buscar clientes online', 
        error instanceof Error ? error : new Error(String(error))
      );
      throw new Error(`Falha ao buscar clientes online via proxy: ${error instanceof Error ? error.message : String(error)}`);
    }
    
  if (!radiusData?.data?.registros) {
    logger.warn('IXC retornou resposta válida mas sem registros');
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
    
    logger.info('Clientes ONLINE encontrados (já filtrados pela query)', { 
      count: onlineUsers.length 
    });

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
        logger.warn('Cliente retornado com status inesperado', { 
          login: user.login, 
          status: user.online 
        });
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
            `qtype=cliente.id&query=${user.id_cliente}&oper==&page=1&rp=1`,
            {},
            additionalHeaders
          );

          if (clientResponse?.data?.registros?.[0]) {
            clientData = clientResponse.data.registros[0];
            isBlocked = clientData.bloqueado === 'S' || clientData.bloqueado_financeiro === 'S';
          }
        } catch (err) {
          logger.warn('Erro ao buscar dados do cliente', { 
            clientId: user.id_cliente, 
            error: (err as Error).message 
          });
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

  logger.info('Clientes com banda baixa encontrados', { count: candidates.length });

  return {
    candidates,
    total: candidates.length,
    timestamp: new Date().toISOString()
  };
}));
