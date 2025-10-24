import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createPublicHandler } from "../_shared/base-handler.ts";

Deno.serve(createPublicHandler(
  'ixc-pon-status',
  async (req, { supabase }) => {
    const IXC_USERNAME = Deno.env.get('IXC_API_USERNAME');
    const IXC_PASSWORD = Deno.env.get('IXC_API_PASSWORD');
    const IXC_API_BASE = Deno.env.get('IXC_API_BASE_URL');

    if (!IXC_USERNAME || !IXC_PASSWORD || !IXC_API_BASE) {
      throw new Error('Credenciais IXC não configuradas');
    }

    const normalizeBase = (raw: string) => {
      const trimmed = raw.trim();
      const noProtocol = trimmed.replace(/^https?:\/\//i, '');
      const host = noProtocol.split('/')[0];
      return host;
    };
    
    const IXC_BASE_HOST = normalizeBase(IXC_API_BASE);
    const credentials = btoa(`${IXC_USERNAME}:${IXC_PASSWORD}`);

    console.log('🔍 Buscando status das portas PON...');
    console.log(`URL: https://${IXC_BASE_HOST}/webservice/v1/pon_onu`);

    // Buscar ONUs do IXC
    const onuUrl = `https://${IXC_BASE_HOST}/webservice/v1/pon_onu`;
    let page = 1;
    const itemsPerPage = 500;
    const allOnus: Array<Record<string, unknown>> = [];

    while (page <= 3) { // Limitar a 3 páginas para não sobrecarregar
      const bodyOnu = JSON.stringify({
        qtype: 'pon_onu.id',
        query: '1',
        oper: '>=',
        page: String(page),
        rp: String(itemsPerPage),
        sortname: 'pon_onu.id',
        sortorder: 'desc',
      });

      console.log(`📡 Consultando página ${page} do endpoint pon_onu...`);

      const onuResponse = await fetch(onuUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'ixcsoft': 'listar',
        },
        body: bodyOnu,
      });

      console.log(`📊 Status da resposta: ${onuResponse.status}`);

      if (!onuResponse.ok) {
        const errorText = await onuResponse.text();
        console.error(`❌ Erro ao buscar ONUs (${onuResponse.status}):`, errorText);
        
        // Se o endpoint não existe, tentar endpoint alternativo
        if (onuResponse.status === 404 || onuResponse.status === 500) {
          console.log('⚠️ Endpoint pon_onu não disponível. Fallback via cliente_equipamento desativado (endpoint inexistente).');
        }
        
        break;
      }

      const onuData = await onuResponse.json();
      console.log('📦 Estrutura da resposta:', JSON.stringify(Object.keys(onuData || {})));
      
      const onuRegistros = Array.isArray(onuData?.registros)
        ? onuData.registros
        : (onuData?.registros ? Object.values(onuData.registros) : []);

      console.log(`📋 Registros encontrados: ${onuRegistros.length}`);
      
      if (onuRegistros.length > 0) {
        console.log('🔍 Estrutura do primeiro registro:', JSON.stringify(Object.keys(onuRegistros[0] || {})));
      }

      if (!onuRegistros || onuRegistros.length === 0) {
        console.log('⚠️ Nenhum registro encontrado nesta página');
        break;
      }

      allOnus.push(...onuRegistros);
      console.log(`✅ Página ${page}: ${onuRegistros.length} ONUs adicionadas (Total: ${allOnus.length})`);

      if (onuRegistros.length < itemsPerPage) {
        console.log('📄 Última página alcançada');
        break;
      }
      page++;
    }

    console.log(`📊 Total de ONUs: ${allOnus.length}`);

    // Agrupar por porta PON
    const ponPorts = new Map<string, {
      online: number;
      offline: number;
      total: number;
      onus: Array<{
        serial: string;
        status: string;
        cliente: string;
        rx_power?: string;
        ultimo_evento?: string;
      }>;
    }>();

    for (const onu of allOnus) {
      const ponOlt = String(onu.pon_olt || '');
      const ponSlot = String(onu.pon_slot || '');
      const ponPort = String(onu.pon_porta || '');
      
      if (!ponOlt || !ponPort) continue;

      const portKey = ponSlot ? `${ponOlt}/${ponSlot}/${ponPort}` : `${ponOlt}/${ponPort}`;
      
      if (!ponPorts.has(portKey)) {
        ponPorts.set(portKey, {
          online: 0,
          offline: 0,
          total: 0,
          onus: []
        });
      }

      const portData = ponPorts.get(portKey)!;
      
      // Determinar status (baseado em último evento e rx_power)
      const lastEvent = String(onu.ultimo_evento || '').toUpperCase();
      const rxPower = onu.rx_power;
      const isOnline = !lastEvent.includes('DYING') && 
                       !lastEvent.includes('LOS') && 
                       !lastEvent.includes('OFFLINE');
      
      if (isOnline) {
        portData.online++;
      } else {
        portData.offline++;
      }
      
      portData.total++;
      portData.onus.push({
        serial: onu.serial || 'N/A',
        status: isOnline ? 'online' : 'offline',
        cliente: onu.cliente_razao || onu.id_cliente || 'N/A',
        rx_power: rxPower ? String(rxPower) : undefined,
        ultimo_evento: onu.ultimo_evento || undefined
      });
    }
    
    // Fallback desativado: cliente_equipamento inexistente. Não há dados PON quando pon_onu não retorna.
    if (allOnus.length === 0) {
      console.log('⚠️ Nenhuma ONU via pon_onu e fallback desativado.');
    }

    // Converter para array e ordenar
    const portsArray = Array.from(ponPorts.entries()).map(([port, data]) => ({
      port,
      ...data,
      health: data.total > 0 ? (data.online / data.total) * 100 : 0
    })).sort((a, b) => {
      // Ordenar por OLT, depois slot, depois porta
      const [aOlt, aRest] = a.port.split('/');
      const [bOlt, bRest] = b.port.split('/');
      
      if (aOlt !== bOlt) return aOlt.localeCompare(bOlt);
      
      const aParts = aRest.split('/');
      const bParts = bRest.split('/');
      
      if (aParts.length === 2 && bParts.length === 2) {
        if (aParts[0] !== bParts[0]) return parseInt(aParts[0]) - parseInt(bParts[0]);
        return parseInt(aParts[1]) - parseInt(bParts[1]);
      }
      
      return parseInt(aParts[0]) - parseInt(bParts[0]);
    });

    console.log(`✅ ${portsArray.length} portas PON encontradas`);

    return {
      success: true,
      total_ports: portsArray.length,
      total_onus: allOnus.length,
      ports: portsArray
    };
  }
));
