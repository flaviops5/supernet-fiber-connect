import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";
import { createLogger } from '../_shared/logger.ts';

const logger = createLogger('ixc-radio-status');

// P0 FIX: Convertido para createAuthenticatedHandler
// Status de rádios expõe infraestrutura de rede
Deno.serve(createAuthenticatedHandler(
  'ixc-radio-status',
  async (req, { supabase, user }) => {
    const IXC_API_USERNAME = Deno.env.get('IXC_API_USERNAME');
    const IXC_API_PASSWORD = Deno.env.get('IXC_API_PASSWORD');
    const IXC_API_BASE_URL = Deno.env.get('IXC_API_BASE_URL');

    if (!IXC_API_USERNAME || !IXC_API_PASSWORD || !IXC_API_BASE_URL) {
      throw new Error('Credenciais do IXC não configuradas');
    }

    // ✅ Normalizar URL removendo /adm.php
    const cleanBaseUrl = IXC_API_BASE_URL.replace(/\/adm\.php$/, '');
    const credentials = btoa(`${IXC_API_USERNAME}:${IXC_API_PASSWORD}`);

    logger.info('Buscando status dos equipamentos rádio');

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

      logger.debug('Consultando página radpop_radio', { page });

      const radioResponse = await fetch(radioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'ixcsoft': 'listar',
        },
        body: radioBody,
      });

      logger.debug('Status da resposta', { status: radioResponse.status });

      if (!radioResponse.ok) {
        const errorText = await radioResponse.text();
        logger.error('Erro ao buscar equipamentos rádio', { status: radioResponse.status, errorText });
        break;
      }

      const radioData = await radioResponse.json();
      logger.debug('Estrutura da resposta', { keys: Object.keys(radioData || {}) });

      const radioRegistros = Array.isArray(radioData?.registros) 
        ? radioData.registros 
        : (radioData?.registros ? Object.values(radioData.registros) : []);

      logger.debug('Registros encontrados', { count: radioRegistros.length });

      if (radioRegistros.length > 0) {
        logger.debug('Estrutura do primeiro registro', { keys: Object.keys(radioRegistros[0] || {}) });
      }

      if (!radioRegistros || radioRegistros.length === 0) {
        logger.info('Nenhum registro encontrado nesta página');
        break;
      }

      for (const radio of radioRegistros) {
        // Log detalhado do id_pop e outros campos relacionados
        logger.debug('Dados do equipamento', {
          id_pop: radio.id_pop,
          su_pop: radio.su_pop,
          ip: radio.ip,
          temperatura: radio.temperatura,
          ativo: radio.ativo,
          online: radio.online
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

      logger.info('Equipamentos rádio encontrados', { count: radioRegistros.length });

      if (radioRegistros.length < itemsPerPage) {
        break;
      }
      page++;
    }

    // Fallback desativado: cliente_equipamento inexistente
    if (radioMap.size === 0) {
      logger.warn('Nenhum equipamento encontrado e fallback desativado');
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

    logger.info('Torres/POPs encontradas', { count: towersArray.length });

    return {
      success: true,
      total_towers: towersArray.length,
      total_radios: towersArray.reduce((sum, t) => sum + t.total, 0),
      towers: towersArray,
    };
  }
));
