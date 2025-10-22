import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createPublicHandler } from "../_shared/base-handler.ts";

Deno.serve(createPublicHandler(
  'ixc-radio-status',
  async (req, { supabase }) => {
    const IXC_API_USERNAME = Deno.env.get('IXC_API_USERNAME');
    const IXC_API_PASSWORD = Deno.env.get('IXC_API_PASSWORD');
    const IXC_API_BASE_URL = Deno.env.get('IXC_API_BASE_URL');

    if (!IXC_API_USERNAME || !IXC_API_PASSWORD || !IXC_API_BASE_URL) {
      throw new Error('Credenciais do IXC não configuradas');
    }

    // ✅ Normalizar URL removendo /adm.php
    const cleanBaseUrl = IXC_API_BASE_URL.replace(/\/adm\.php$/, '');
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
      const radioUrl = `${cleanBaseUrl}/webservice/v1/radpop_radio`;
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

    // Fallback desativado: cliente_equipamento inexistente
    if (radioMap.size === 0) {
      console.log('⚠️ Nenhum equipamento via radpop_radio e fallback desativado (cliente_equipamento não existe).');
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

    return {
      success: true,
      total_towers: towersArray.length,
      total_radios: towersArray.reduce((sum, t) => sum + t.total, 0),
      towers: towersArray,
    };
  }
));
