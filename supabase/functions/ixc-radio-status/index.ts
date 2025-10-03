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
    const IXC_API_USERNAME = Deno.env.get('IXC_API_USERNAME');
    const IXC_API_PASSWORD = Deno.env.get('IXC_API_PASSWORD');
    const IXC_API_BASE_URL = Deno.env.get('IXC_API_BASE_URL');

    if (!IXC_API_USERNAME || !IXC_API_PASSWORD || !IXC_API_BASE_URL) {
      throw new Error('Credenciais do IXC não configuradas');
    }

    const IXC_BASE_HOST = IXC_API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const credentials = btoa(`${IXC_API_USERNAME}:${IXC_API_PASSWORD}`);

    console.log('📻 Buscando status dos equipamentos rádio...');

    // Buscar equipamentos wireless/rádio
    const radioMap = new Map<string, {
      online: number;
      offline: number;
      total: number;
      radios: Array<{
        serial: string;
        status: string;
        cliente: string;
        signal?: string;
        frequency?: string;
        fabricante?: string;
        modelo?: string;
        ip?: string;
        temperatura?: string;
        cpu_load?: string;
        memoria_livre?: number;
        memoria_total?: number;
        uptime?: string;
        voltagem?: string;
        firmware?: string;
      }>;
    }>();

    let page = 1;
    const itemsPerPage = 1000;
    const maxPages = 10;

    while (page <= maxPages) {
      const radioUrl = `https://${IXC_BASE_HOST}/webservice/v1/radpop_radio`;
      const radioBody = JSON.stringify({
        qtype: 'radpop_radio.id',
        query: '1',
        oper: '>=',
        page: String(page),
        rp: String(itemsPerPage),
        sortname: 'radpop_radio.id',
        sortorder: 'desc',
      });

      console.log(`📡 Consultando página ${page} do endpoint radpop_radio...`);

      const radioResponse = await fetch(radioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'ixcsoft': 'listar',
        },
        body: radioBody,
      });

      console.log(`📊 Status da resposta: ${radioResponse.status}`);

      if (!radioResponse.ok) {
        const errorText = await radioResponse.text();
        console.error(`❌ Erro ao buscar equipamentos rádio (${radioResponse.status}):`, errorText);
        break;
      }

      const radioData = await radioResponse.json();
      console.log('📦 Estrutura da resposta:', JSON.stringify(Object.keys(radioData || {})));

      const radioRegistros = Array.isArray(radioData?.registros) 
        ? radioData.registros 
        : (radioData?.registros ? Object.values(radioData.registros) : []);

      console.log(`📋 Registros encontrados: ${radioRegistros.length}`);

      if (radioRegistros.length > 0) {
        console.log('🔍 Estrutura do primeiro registro:', JSON.stringify(Object.keys(radioRegistros[0] || {})));
      }

      if (!radioRegistros || radioRegistros.length === 0) {
        console.log('⚠️ Nenhum registro encontrado nesta página');
        break;
      }

      for (const radio of radioRegistros) {
        // Log detalhado do id_pop e outros campos relacionados
        console.log('🔍 Dados do equipamento:', {
          id_pop: radio.id_pop,
          tipo_id_pop: typeof radio.id_pop,
          su_pop: radio.su_pop,
          pop: radio.pop,
          torre: radio.torre,
          setor: radio.setor,
          descricao: radio.descricao,
          ip: radio.ip,
          fabricante_modelo: radio.fabricante_modelo,
          temperatura: radio.temperatura,
          cpu_load: radio.cpu_load,
          free_memory: radio.free_memory,
          total_memory: radio.total_memory,
          uptime: radio.uptime,
          voltagem: radio.voltagem,
          firmware: radio.fwversion || radio.current_firmware,
          ativo: radio.ativo,
          online: radio.online,
          status: radio.status,
          su_status: radio.su_status,
        });
        
        // Identificar a torre/POP/setor
        const popName = radio.su_pop || radio.pop || radio.torre || radio.setor || radio.descricao || 'TORRE-DESCONHECIDA';
        const popId = String(popName).trim();

        if (!radioMap.has(popId)) {
          radioMap.set(popId, { online: 0, offline: 0, total: 0, radios: [] });
        }

        const popData = radioMap.get(popId)!;
        
        // Determinar status (online/offline)
        // Se tem dados de monitoramento (uptime, cpu_load, temperatura), está online
        const hasMonitoringData = radio.uptime || radio.cpu_load || radio.temperatura || radio.time;
        const statusField = radio.su_status || radio.status || radio.online || radio.ativo;
        const isOnline = hasMonitoringData || 
                         statusField === 'online' || 
                         statusField === 'S' || 
                         statusField === true;

        if (isOnline) {
          popData.online++;
        } else {
          popData.offline++;
        }
        popData.total++;

        // Adicionar informações do rádio
        popData.radios.push({
          serial: String(radio.su_mac || radio.mac || radio.serial || 'N/A'),
          status: isOnline ? 'online' : 'offline',
          cliente: String(radio.cliente_razao || radio.cliente || 'N/A'),
          signal: radio.su_signal ? `${radio.su_signal} dBm` : undefined,
          frequency: radio.su_frequency || radio.frequency || undefined,
          fabricante: radio.fabricante_modelo || undefined,
          modelo: radio.modelo || undefined,
          ip: radio.ip || undefined,
          temperatura: radio.temperatura || undefined,
          cpu_load: radio.cpu_load || undefined,
          memoria_livre: radio.free_memory ? parseInt(radio.free_memory) : undefined,
          memoria_total: radio.total_memory ? parseInt(radio.total_memory) : undefined,
          uptime: radio.uptime || undefined,
          voltagem: radio.voltagem || undefined,
          firmware: radio.fwversion || radio.current_firmware || undefined,
        });
      }

      console.log(`📊 Total de equipamentos rádio: ${radioRegistros.length}`);

      if (radioRegistros.length < itemsPerPage) {
        break;
      }
      page++;
    }

    // Fallback: se radpop_radio não retornar dados, tentar cliente_equipamento
    if (radioMap.size === 0) {
      console.log('⚠️ Nenhum equipamento via radpop_radio. Tentando fallback com cliente_equipamento...');

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

        console.log(`📡 cliente_equipamento retornou ${equipRegistros.length} registros`);

        // Buscar status online/offline via radusuarios
        const radUrl = `https://${IXC_BASE_HOST}/webservice/v1/radusuarios`;
        const radBody = JSON.stringify({
          qtype: 'radusuarios.id',
          query: '1',
          oper: '>=',
          page: '1',
          rp: '1000',
          sortname: 'radusuarios.id',
          sortorder: 'desc',
        });

        const radResponse = await fetch(radUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
            'ixcsoft': 'listar',
          },
          body: radBody,
        });

        const statusByClient = new Map<string, boolean>();
        if (radResponse.ok) {
          const radData = await radResponse.json();
          const radRegistros = Array.isArray(radData?.registros)
            ? radData.registros
            : (radData?.registros ? Object.values(radData.registros) : []);

          for (const ru of radRegistros) {
            const clientId = String(ru.id_cliente || '').trim();
            const isOnline = String(ru.online || '').toUpperCase() === 'S';
            if (clientId) statusByClient.set(clientId, isOnline);
          }
        }

        // Processar equipamentos wireless (filtrar por tipo)
        for (const equip of equipRegistros) {
          // Identificar equipamentos wireless/rádio
          const tipo = String(equip.tipo || equip.tipo_equipamento || '').toLowerCase();
          if (!tipo.includes('radio') && !tipo.includes('wireless') && 
              !tipo.includes('antena') && !equip.torre && !equip.setor) {
            continue;
          }

          const popName = equip.torre || equip.setor || equip.pop || 'TORRE-DESCONHECIDA';
          const popId = String(popName).trim();

          if (!radioMap.has(popId)) {
            radioMap.set(popId, { online: 0, offline: 0, total: 0, radios: [] });
          }

          const popData = radioMap.get(popId)!;
          const clientId = String(equip.id_cliente || '').trim();
          const isOnline = statusByClient.get(clientId) || false;

          if (isOnline) popData.online++;
          else popData.offline++;
          popData.total++;

          popData.radios.push({
            serial: String(equip.serial || equip.mac || 'N/A'),
            status: isOnline ? 'online' : 'offline',
            cliente: String(equip.cliente_razao || clientId || 'N/A'),
            fabricante: equip.fabricante_modelo || undefined,
            modelo: equip.modelo || undefined,
            ip: equip.ip || undefined,
            temperatura: equip.temperatura || undefined,
            cpu_load: equip.cpu_load || undefined,
            memoria_livre: equip.free_memory ? parseInt(equip.free_memory) : undefined,
            memoria_total: equip.total_memory ? parseInt(equip.total_memory) : undefined,
            uptime: equip.uptime || undefined,
            voltagem: equip.voltagem || undefined,
            firmware: equip.fwversion || equip.current_firmware || undefined,
          });
        }

        console.log(`🔁 Fallback montou ${radioMap.size} torres/POPs`);
      }
    }

    // Converter para array e calcular saúde
    const towersArray = Array.from(radioMap.entries()).map(([tower, data]) => {
      const health = data.total > 0 ? Math.round((data.online / data.total) * 100) : 0;
      
      return {
        tower,
        online: data.online,
        offline: data.offline,
        total: data.total,
        health,
        radios: data.radios,
      };
    }).sort((a, b) => b.total - a.total);

    console.log(`✅ ${towersArray.length} torres/POPs encontradas`);

    return new Response(
      JSON.stringify({
        success: true,
        total_towers: towersArray.length,
        total_radios: towersArray.reduce((sum, t) => sum + t.total, 0),
        towers: towersArray,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao buscar status dos equipamentos rádio:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        total_towers: 0,
        total_radios: 0,
        towers: [],
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
