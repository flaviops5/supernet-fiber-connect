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
    const allOnus: any[] = [];

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
          console.log('⚠️ Endpoint pon_onu não disponível. Tentando endpoint cliente_equipamento...');
          
          // Buscar equipamentos dos clientes (inclui ONUs)
          const equipUrl = `https://${IXC_BASE_HOST}/webservice/v1/cliente_equipamento`;
          const equipBody = JSON.stringify({
            qtype: 'cliente_equipamento.id',
            query: '1',
            oper: '>=',
            page: '1',
            rp: '1000',
            sortname: 'cliente_equipamento.id',
            sortorder: 'desc',
          });

          const equipResponse = await fetch(equipUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/json',
              'ixcsoft': 'listar',
            },
            body: equipBody,
          });

          if (equipResponse.ok) {
            const equipData = await equipResponse.json();
            const equipRegistros = Array.isArray(equipData?.registros)
              ? equipData.registros
              : (equipData?.registros ? Object.values(equipData.registros) : []);
            
            console.log(`📦 ${equipRegistros.length} equipamentos encontrados`);
            
            // Filtrar apenas ONUs (que têm informação de porta PON)
            const onusFromEquip = equipRegistros.filter((equip: any) => 
              equip.pon_porta || equip.pon_slot || equip.pon_olt
            );
            
            console.log(`🔌 ${onusFromEquip.length} ONUs encontradas nos equipamentos`);
            
            if (onusFromEquip.length > 0) {
              console.log('✅ Usando dados de cliente_equipamento');
              allOnus.push(...onusFromEquip);
              break;
            }
          }
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

    return new Response(
      JSON.stringify({
        success: true,
        total_ports: portsArray.length,
        total_onus: allOnus.length,
        ports: portsArray
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro ao buscar status PON:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
