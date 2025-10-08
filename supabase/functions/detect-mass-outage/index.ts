import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { callIxcWithRetry } from '../_shared/ixc-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RadUser {
  login: string;
  online: string;
  id_cliente?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const IXC_PROXY_URL = Deno.env.get('IXC_PROXY_URL') || `${SUPABASE_URL}/functions/v1/ixc-proxy`;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Credenciais Supabase não configuradas');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('🔍 Iniciando detecção de quedas em massa via proxy...');

    // Buscar clientes offline do IXC via proxy
    let page = 1;
    const itemsPerPage = 1000;
    const allRadUsers: RadUser[] = [];

    try {
      // Buscar apenas clientes offline
      while (page <= 10) { // Limitar a 10 páginas
        const bodyRad = {
          qtype: 'radusuarios.online',
          query: 'N',
          oper: '=',
          page: String(page),
          rp: String(itemsPerPage),
          sortname: 'radusuarios.id',
          sortorder: 'desc',
        };

        console.log(`📄 Buscando página ${page} de clientes offline...`);

        const radData = await callIxcWithRetry(
          IXC_PROXY_URL,
          'POST',
          '/webservice/v1/radusuarios',
          bodyRad
        );

        const radRegistros = Array.isArray(radData?.data?.registros)
          ? radData.data.registros
          : (radData?.data?.registros ? Object.values(radData.data.registros) : []);

        if (!radRegistros || radRegistros.length === 0) {
          console.log(`✅ Sem mais registros na página ${page}`);
          break;
        }

        allRadUsers.push(...radRegistros);
        console.log(`📊 Página ${page}: ${radRegistros.length} clientes offline (total: ${allRadUsers.length})`);

        if (radRegistros.length < itemsPerPage) {
          break;
        }
        page++;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar clientes offline do IXC:', error);
      
      // Se falhou completamente, retornar erro informativo
      if (allRadUsers.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Não foi possível buscar dados do IXC',
            details: error.message,
            suggestion: 'Verifique as credenciais IXC e conexão com API',
            total_offline: 0,
            mass_outages_detected: 0
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Se temos dados parciais, continuar
      console.log(`⚠️ Continuando com ${allRadUsers.length} registros obtidos antes do erro`);
    }

    console.log(`📊 Total de clientes offline: ${allRadUsers.length}`);

    // OTIMIZAÇÃO: Limitar a 500 clientes mais críticos para evitar timeout
    const MAX_CLIENTS_TO_ENRICH = 500;
    const MAX_CLIENTS_PER_PON = 128; // Capacidade máxima de uma porta PON
    
    // Ordenar por prioridade: clientes com id_cliente primeiro (mais chance de ter PON)
    const sortedUsers = allRadUsers.sort((a, b) => {
      if (a.id_cliente && !b.id_cliente) return -1;
      if (!a.id_cliente && b.id_cliente) return 1;
      return 0;
    });
    
    const usersToEnrich = sortedUsers.slice(0, MAX_CLIENTS_TO_ENRICH);
    const skippedCount = allRadUsers.length - usersToEnrich.length;
    
    if (skippedCount > 0) {
      console.log(`⚠️ Limitando análise a ${MAX_CLIENTS_TO_ENRICH} clientes prioritários (${skippedCount} ignorados)`);
    }

    // Buscar informações de porta PON e bairro para cada cliente offline
    console.log('🔍 Buscando informações de porta PON e localização...');
    const clientsWithPon: Array<{ user: RadUser; ponPort?: string; cto?: string; bairro?: string }> = [];
    
    // OTIMIZAÇÃO: Processar em chunks paralelos (20 clientes por vez)
    const CHUNK_SIZE = 20;
    const chunks: RadUser[][] = [];
    for (let i = 0; i < usersToEnrich.length; i += CHUNK_SIZE) {
      chunks.push(usersToEnrich.slice(i, i + CHUNK_SIZE));
    }
    
    console.log(`📦 Processando ${chunks.length} chunks de ${CHUNK_SIZE} clientes em paralelo...`);
    
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      console.log(`📦 Chunk ${chunkIndex + 1}/${chunks.length}: ${chunk.length} clientes`);
      
      // Processar todos os clientes do chunk em paralelo
      const chunkResults = await Promise.all(
        chunk.map(async (user) => {
          const clientId = user.id_cliente;
          if (!clientId) {
            return { user };
          }

          try {
            // OTIMIZAÇÃO: Executar ambas as chamadas em paralelo
            const [clientData, equipData] = await Promise.all([
              // Buscar dados do cliente (incluindo bairro)
              callIxcWithRetry(
                IXC_PROXY_URL,
                'POST',
                '/webservice/v1/cliente',
                {
                  qtype: 'cliente.id',
                  query: clientId,
                  oper: '=',
                  page: '1',
                  rp: '1',
                  sortname: 'cliente.id',
                  sortorder: 'desc',
                }
              ),
              // Buscar equipamento/ONU do cliente
              callIxcWithRetry(
                IXC_PROXY_URL,
                'POST',
                '/webservice/v1/cliente_equipamento',
                {
                  qtype: 'cliente_equipamento.id_cliente',
                  query: clientId,
                  oper: '=',
                  page: '1',
                  rp: '50',
                  sortname: 'cliente_equipamento.id',
                  sortorder: 'desc',
                }
              )
            ]);

            // Processar dados do cliente (bairro)
            let bairro = '';
            const clientes = Array.isArray(clientData?.data?.registros)
              ? clientData.data.registros
              : (clientData?.data?.registros ? Object.values(clientData.data.registros) : []);
            
            if (clientes.length > 0) {
              const cliente = clientes[0];
              bairro = cliente.bairro || cliente.endereco_bairro || '';
            }

            // Processar dados de equipamento (PON/CTO)
            const equipamentos = Array.isArray(equipData?.data?.registros)
              ? equipData.data.registros
              : (equipData?.data?.registros ? Object.values(equipData.data.registros) : []);

            let ponPort = '';
            let cto = '';
            
            for (const equip of equipamentos) {
              // Tentar extrair informações de porta PON
              if (equip.pon_porta) ponPort = String(equip.pon_porta);
              if (equip.pon_slot) ponPort = `${equip.pon_slot}/${ponPort}`;
              if (equip.pon_olt) ponPort = `${equip.pon_olt}/${ponPort}`;
              
              // Extrair CTO
              if (equip.cto) cto = String(equip.cto);
              if (equip.fibra_cto) cto = String(equip.fibra_cto);
              
              if (ponPort) break;
            }

            return { 
              user, 
              ponPort: ponPort || undefined,
              cto: cto || undefined,
              bairro: bairro || undefined
            };
          } catch (error) {
            console.error(`❌ Erro ao buscar dados do cliente ${clientId}:`, error);
            return { user };
          }
        })
      );
      
      clientsWithPon.push(...chunkResults);
    }

    console.log(`📊 Clientes com dados PON: ${clientsWithPon.filter(c => c.ponPort).length}/${clientsWithPon.length}`);

    // Verificar Dying Gasp (sinal de perda de energia da ONU) no IXC
    console.log('🔍 Verificando eventos Dying Gasp (perda de energia)...');
    const dyingGaspEvents = new Map<string, { count: number; onus: string[]; lastEvent?: string }>();
    
    try {
      // Buscar eventos PON recentes - Dying Gasp indica perda de energia na ONU via proxy
      const ponEventBody = {
        qtype: 'pon_onu.ultimo_evento',
        query: 'Dying',
        oper: 'LIKE',
        page: '1',
        rp: '500',
        sortname: 'pon_onu.data_ultimo_evento',
        sortorder: 'desc',
      };

      const ponEventData = await callIxcWithRetry(
        IXC_PROXY_URL,
        'POST',
        '/webservice/v1/pon_onu',
        ponEventBody
      );

      const ponEvents = Array.isArray(ponEventData?.data?.registros)
        ? ponEventData.data.registros
        : (ponEventData?.data?.registros ? Object.values(ponEventData.data.registros) : []);

        console.log(`📊 Total de eventos PON encontrados: ${ponEvents.length}`);

        // Processar eventos Dying Gasp nas últimas 2 horas (indicam perda de energia recente)
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        
        for (const event of ponEvents) {
          const lastEvent = String(event.ultimo_evento || '').toUpperCase();
          const dataEvento = event.data_ultimo_evento ? new Date(event.data_ultimo_evento) : null;
          
          // Verificar se é Dying Gasp recente
          if (lastEvent.includes('DYING') && (!dataEvento || dataEvento > twoHoursAgo)) {
            // Extrair informações da ONU/porta PON
            const ponPort = event.pon_porta ? String(event.pon_porta) : '';
            const ponSlot = event.pon_slot ? String(event.pon_slot) : '';
            const ponOlt = event.pon_olt ? String(event.pon_olt) : '';
            const onuSerial = event.serial ? String(event.serial) : '';
            
            let ponKey = '';
            if (ponOlt && ponSlot && ponPort) {
              ponKey = `PON:${ponOlt}/${ponSlot}/${ponPort}`;
            } else if (ponOlt && ponPort) {
              ponKey = `PON:${ponOlt}/${ponPort}`;
            }
            
            // Também tentar identificar por localização/CTO
            const cto = event.cto || event.fibra_cto || '';
            const location = event.localidade || event.bairro || '';
            
            const groupKey = ponKey || (cto ? `CTO:${cto}` : (location ? `REGION:${location}` : ''));
            
            if (groupKey) {
              if (!dyingGaspEvents.has(groupKey)) {
                dyingGaspEvents.set(groupKey, { count: 0, onus: [], lastEvent: event.data_ultimo_evento });
              }
              const gasps = dyingGaspEvents.get(groupKey)!;
              gasps.count++;
              if (onuSerial) gasps.onus.push(onuSerial);
              
              console.log(`⚡ Dying Gasp detectado: ${groupKey} - ONU: ${onuSerial || 'N/A'}`);
            }
          }
        }
        
      console.log(`⚡ Total de grupos com Dying Gasp: ${dyingGaspEvents.size}`);
      for (const [key, data] of dyingGaspEvents) {
        console.log(`   ${key}: ${data.count} ONUs com perda de energia`);
      }
    } catch (error) {
      console.error('Erro ao verificar Dying Gasp:', error);
    }

    // Agrupar por porta PON (quando disponível) ou por CTO/padrão de login
    const ponGroups = new Map<string, Array<{ user: RadUser; ponPort?: string; cto?: string; bairro?: string }>>();
    const bairrosMap = new Map<string, string[]>(); // Mapear grupos para bairros
    
    for (const clientData of clientsWithPon) {
      const login = String(clientData.user.login || '').toUpperCase().trim();
      if (!login) continue;

      let groupKey = '';
      
      // Prioridade 1: Agrupar por porta PON completa (mais preciso)
      if (clientData.ponPort) {
        groupKey = `PON:${clientData.ponPort}`;
      }
      // Prioridade 2: Agrupar por CTO
      else if (clientData.cto) {
        groupKey = `CTO:${clientData.cto}`;
      }
      // Prioridade 3: Agrupar por padrão de login (local-bloco)
      else {
        const parts = login.split('-');
        if (parts.length >= 2) {
          groupKey = `REGION:${parts[0]}-${parts[1]}`;
        }
      }

      if (groupKey) {
        if (!ponGroups.has(groupKey)) {
          ponGroups.set(groupKey, []);
          bairrosMap.set(groupKey, []);
        }
        ponGroups.get(groupKey)!.push(clientData);
        
        // Adicionar bairro ao mapa se disponível
        if (clientData.bairro) {
          const bairros = bairrosMap.get(groupKey)!;
          if (!bairros.includes(clientData.bairro)) {
            bairros.push(clientData.bairro);
          }
        }
      }
    }

    // Definir limiar para queda em massa
    // - Porta PON: 5+ clientes (mais preciso, indica problema na OLT/Splitter)
    // - CTO: 3+ clientes (problema em caixa de terminação)
    // - Região: 6+ clientes (menos preciso, pode ser problema maior)
    const MASS_OUTAGE_THRESHOLDS = {
      PON_PORT: 5,
      CTO: 3,
      REGION: 6
    };
    
    const massOutages: any[] = [];

    for (const [groupKey, clientsData] of ponGroups) {
      const isPonGroup = groupKey.startsWith('PON:');
      const isCtoGroup = groupKey.startsWith('CTO:');
      const threshold = isPonGroup ? MASS_OUTAGE_THRESHOLDS.PON_PORT : 
                       (isCtoGroup ? MASS_OUTAGE_THRESHOLDS.CTO : MASS_OUTAGE_THRESHOLDS.REGION);
      
      // VALIDAÇÃO: Uma porta PON tem capacidade máxima de 128 clientes
      if (isPonGroup && clientsData.length > MAX_CLIENTS_PER_PON) {
        console.warn(`⚠️ ALERTA: PON ${groupKey} tem ${clientsData.length} clientes (máx: ${MAX_CLIENTS_PER_PON}). Possível erro no agrupamento!`);
      }
      
      if (clientsData.length >= threshold) {
        const affectedLogins = clientsData.map(c => c.user.login);
        const eventKey = `${groupKey}_${new Date().toISOString().split('T')[0]}`;
        
        const groupType = isPonGroup ? 'Porta PON' : (isCtoGroup ? 'CTO' : 'Região');
        const groupIdentifier = groupKey.split(':')[1];
        const bairrosAfetados = bairrosMap.get(groupKey) || [];
        
        // Verificar se há Dying Gasp (perda de energia) para este grupo
        let powerOutageCause = false;
        let dyingGaspCount = 0;
        let affectedOnus: string[] = [];
        
        const gaspData = dyingGaspEvents.get(groupKey);
        if (gaspData && gaspData.count >= 2) {
          // Se temos 2+ ONUs com Dying Gasp no mesmo grupo, é falta de energia
          powerOutageCause = true;
          dyingGaspCount = gaspData.count;
          affectedOnus = gaspData.onus;
        }
        
        const causeType = powerOutageCause 
          ? `⚡ FALTA DE ENERGIA (${dyingGaspCount} ONUs com Dying Gasp)` 
          : '❓ Causa desconhecida';
        console.log(`🚨 QUEDA EM MASSA detectada (${groupType}): ${groupIdentifier} - ${clientsData.length} clientes afetados - ${causeType}`);

        // Verificar se já existe evento ativo para este grupo hoje
        const { data: existingEvent } = await supabase
          .from('mass_outage_events')
          .select('*')
          .eq('event_key', eventKey)
          .eq('status', 'active')
          .maybeSingle();

        if (!existingEvent) {
          // Criar novo evento
          const { data: newEvent, error: insertError } = await supabase
            .from('mass_outage_events')
            .insert({
              event_key: eventKey,
              region_pattern: groupKey,
              affected_count: clientsData.length,
              affected_logins: affectedLogins,
              status: 'active',
              metadata: {
                detection_time: new Date().toISOString(),
                threshold,
                group_type: groupType,
                group_identifier: groupIdentifier,
                pon_port: isPonGroup ? groupIdentifier : undefined,
                cto: isCtoGroup ? groupIdentifier : undefined,
                bairros: bairrosAfetados.length > 0 ? bairrosAfetados : undefined,
                power_outage: powerOutageCause,
                dying_gasp_count: dyingGaspCount,
                affected_onus: affectedOnus.length > 0 ? affectedOnus : undefined,
                outage_cause: powerOutageCause ? 'power_outage_dying_gasp' : 'unknown',
                power_outage_description: powerOutageCause 
                  ? `Dying Gasp detectado em ${dyingGaspCount} ONUs - Perda de energia confirmada` 
                  : undefined
              }
            })
            .select()
            .single();

          if (insertError) {
            console.error('Erro ao criar evento:', insertError);
          } else {
            massOutages.push(newEvent);
            console.log(`✅ Evento criado: ${eventKey}`);
          }
        } else {
          // Atualizar evento existente
          const { error: updateError } = await supabase
            .from('mass_outage_events')
            .update({
              affected_count: clientsData.length,
              affected_logins: affectedLogins,
              updated_at: new Date().toISOString(),
              metadata: {
                ...existingEvent.metadata,
                last_update: new Date().toISOString(),
                threshold,
                group_type: groupType,
                group_identifier: groupIdentifier,
                bairros: bairrosAfetados.length > 0 ? bairrosAfetados : undefined,
                power_outage: powerOutageCause,
                dying_gasp_count: dyingGaspCount,
                affected_onus: affectedOnus.length > 0 ? affectedOnus : undefined,
                outage_cause: powerOutageCause ? 'power_outage_dying_gasp' : 'unknown',
                power_outage_description: powerOutageCause 
                  ? `Dying Gasp detectado em ${dyingGaspCount} ONUs - Perda de energia confirmada` 
                  : undefined
              }
            })
            .eq('id', existingEvent.id);

          if (updateError) {
            console.error('Erro ao atualizar evento:', updateError);
          } else {
            console.log(`📝 Evento atualizado: ${eventKey}`);
          }
        }
      }
    }

    // Marcar eventos como resolvidos se não há mais clientes offline no grupo
    const { data: activeEvents } = await supabase
      .from('mass_outage_events')
      .select('*')
      .eq('status', 'active');

    if (activeEvents) {
      for (const event of activeEvents) {
        const groupKey = event.region_pattern;
        const stillOffline = ponGroups.get(groupKey);
        
        const isPonGroup = groupKey.startsWith('PON:');
        const isCtoGroup = groupKey.startsWith('CTO:');
        const threshold = isPonGroup ? MASS_OUTAGE_THRESHOLDS.PON_PORT : 
                         (isCtoGroup ? MASS_OUTAGE_THRESHOLDS.CTO : MASS_OUTAGE_THRESHOLDS.REGION);
        
        if (!stillOffline || stillOffline.length < threshold) {
          await supabase
            .from('mass_outage_events')
            .update({
              status: 'resolved',
              resolved_at: new Date().toISOString()
            })
            .eq('id', event.id);
          
          console.log(`✅ Evento resolvido: ${groupKey}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_offline: allRadUsers.length,
        clients_with_pon_data: clientsWithPon.filter(c => c.ponPort).length,
        mass_outages_detected: massOutages.length,
        mass_outages: massOutages,
        groups_analyzed: {
          total: ponGroups.size,
          by_pon_port: Array.from(ponGroups.keys()).filter(k => k.startsWith('PON:')).length,
          by_cto: Array.from(ponGroups.keys()).filter(k => k.startsWith('CTO:')).length,
          by_region: Array.from(ponGroups.keys()).filter(k => k.startsWith('REGION:')).length
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro ao detectar quedas em massa:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});