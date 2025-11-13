import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";
import { callIxcWithRetry } from '../_shared/ixc-client.ts';

// P0 FIX: Convertido para createAuthenticatedHandler
// Contagem de clientes expõe dados de negócio sensíveis
Deno.serve(createAuthenticatedHandler(
  'ixc-count-clients',
  async (req, { supabase, user }) => {
    const IXC_PROXY_URL = Deno.env.get('IXC_PROXY_URL') || `${Deno.env.get('SUPABASE_URL')}/functions/v1/ixc-proxy`;

    console.log('🔍 Buscando clientes IXC via proxy com retry/circuit breaker...');

    let page = 1;
    const itemsPerPage = 1000;
    const allOnlineUsers: Array<Record<string, unknown>> = [];
    const allOfflineUsers: Array<Record<string, unknown>> = [];

    // 🔥 OTIMIZAÇÃO: Buscar apenas clientes ONLINE direto na query
    try {
      console.log('📡 Buscando clientes ONLINE (filtro direto na query IXC)...');
      
      while (page <= 5) { // Limitar a 5 páginas para online
        const bodyOnline = {
          qtype: 'radusuarios.online',
          query: 'S',
          oper: '=',
          page: String(page),
          rp: String(itemsPerPage),
          sortname: 'radusuarios.id',
          sortorder: 'desc',
        };

        const onlineData = await callIxcWithRetry(
          IXC_PROXY_URL,
          'POST',
          '/webservice/v1/radusuarios',
          bodyOnline
        );

        const onlineRegistros: Array<Record<string, unknown>> = Array.isArray(onlineData?.data?.registros)
          ? onlineData.data.registros
          : (onlineData?.data?.registros ? Object.values(onlineData.data.registros) : []);

        if (!onlineRegistros || onlineRegistros.length === 0) {
          console.log(`✅ Sem mais clientes online na página ${page}`);
          break;
        }

        allOnlineUsers.push(...onlineRegistros);
        console.log(`📊 Página ${page}: ${onlineRegistros.length} online (total: ${allOnlineUsers.length})`);

        if (onlineRegistros.length < itemsPerPage) break;
        page++;
      }
    } catch (error) {
      // ✅ CORREÇÃO: Não interromper prematuramente - buscar offline e retornar resultado parcial
      console.error('❌ Erro ao buscar clientes online:', error);
      console.log(`⚠️ Continuando com ${allOnlineUsers.length} clientes online obtidos`);
      // Remover o return early - continuar para buscar offline
    }

    // 🔥 OTIMIZAÇÃO: Buscar apenas clientes OFFLINE direto na query
    page = 1;
    try {
      console.log('📡 Buscando clientes OFFLINE (filtro direto na query IXC)...');
      
      while (page <= 5) { // Limitar a 5 páginas para offline
        const bodyOffline = {
          qtype: 'radusuarios.online',
          query: 'N',
          oper: '=',
          page: String(page),
          rp: String(itemsPerPage),
          sortname: 'radusuarios.id',
          sortorder: 'desc',
        };

        const offlineData = await callIxcWithRetry(
          IXC_PROXY_URL,
          'POST',
          '/webservice/v1/radusuarios',
          bodyOffline
        );

        const offlineRegistros: Array<Record<string, unknown>> = Array.isArray(offlineData?.data?.registros)
          ? offlineData.data.registros
          : (offlineData?.data?.registros ? Object.values(offlineData.data.registros) : []);

        if (!offlineRegistros || offlineRegistros.length === 0) {
          console.log(`✅ Sem mais clientes offline na página ${page}`);
          break;
        }

        allOfflineUsers.push(...offlineRegistros);
        console.log(`📊 Página ${page}: ${offlineRegistros.length} offline (total: ${allOfflineUsers.length})`);

        if (offlineRegistros.length < itemsPerPage) break;
        page++;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar clientes offline:', error);
      console.log(`⚠️ Continuando com ${allOfflineUsers.length} clientes offline obtidos`);
    }

    // Agrupar por login (deduplicar)
    const uniqueOnline = new Map<string, any>();
    const uniqueOffline = new Map<string, any>();
    
    for (const user of allOnlineUsers) {
      const login = String(user.login ?? '').toLowerCase().trim();
      if (login && !uniqueOnline.has(login)) {
        uniqueOnline.set(login, user);
      }
    }
    
    for (const user of allOfflineUsers) {
      const login = String(user.login ?? '').toLowerCase().trim();
      if (login && !uniqueOffline.has(login) && !uniqueOnline.has(login)) {
        uniqueOffline.set(login, user);
      }
    }

    const clientDetails = {
      online: uniqueOnline.size,
      offline: uniqueOffline.size,
      total: uniqueOnline.size + uniqueOffline.size,
    };

    console.log('📊 Resumo otimizado (filtros diretos):');
    console.log(`   Online: ${clientDetails.online}`);
    console.log(`   Offline: ${clientDetails.offline}`);
    console.log(`   Total: ${clientDetails.total}`);

    return {
      success: true,
      total_clientes: clientDetails.total,
      detalhes: clientDetails,
      optimization: 'Filtros aplicados direto na query IXC',
    };
  }
));
