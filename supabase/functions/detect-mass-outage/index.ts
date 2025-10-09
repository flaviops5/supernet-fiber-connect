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
    console.log('🔓 detect-mass-outage: chamada pública recebida');
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
      // Buscar apenas clientes offline - SEM LIMITE DE PÁGINAS
      while (true) {
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
    
    // CONTROLE DE CONCORRÊNCIA: Limitar requisições paralelas ao IXC
    const MAX_CONCURRENT_REQUESTS = 10; // Reduzido de 20 para 10
    const INITIAL_BACKOFF_MS = 1000;
    const MAX_BACKOFF_MS = 10000;
    
    // Função auxiliar para delay com jitter
    const delayWithJitter = (ms: number) => {
      const jitter = Math.random() * 0.3 * ms; // 30% jitter
      return new Promise(resolve => setTimeout(resolve, ms + jitter));
    };
    
    // Função auxiliar para retry com backoff exponencial
    const retryWithBackoff = async <T>(
      fn: () => Promise<T>,
      maxRetries = 3,
      baseDelay = INITIAL_BACKOFF_MS
    ): Promise<T> => {
      let lastError: any;
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error;
          if (i < maxRetries - 1) {
            const delay = Math.min(baseDelay * Math.pow(2, i), MAX_BACKOFF_MS);
            console.log(`⚠️ Retry ${i + 1}/${maxRetries} após ${delay}ms...`);
            await delayWithJitter(delay);
          }
        }
      }
      throw lastError;
    };
    
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
    
    // OTIMIZAÇÃO: Processar em chunks com concorrência limitada
    const CHUNK_SIZE = MAX_CONCURRENT_REQUESTS;
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
            // OTIMIZAÇÃO: Executar ambas as chamadas em paralelo com retry e backoff
            const [clientData, equipData] = await retryWithBackoff(() =>
              Promise.all([
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
              ])
            );

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
              // Validação e sanitização robusta dos campos PON
              // Usar campos estruturados do IXC (não regex)
              const rawPonPorta = equip.pon_porta ? String(equip.pon_porta).trim() : '';
              const rawPonSlot = equip.pon_slot ? String(equip.pon_slot).trim() : '';
              const rawPonOlt = equip.pon_olt ? String(equip.pon_olt).trim() : '';
              
              // Validar formato: apenas alfanuméricos, hífens e underscores
              const isValidPonComponent = (val: string) => /^[a-zA-Z0-9_-]+$/.test(val);
              
              // Construir PON Port com validação
              if (rawPonPorta && isValidPonComponent(rawPonPorta)) {
                ponPort = rawPonPorta;
                
                if (rawPonSlot && isValidPonComponent(rawPonSlot)) {
                  ponPort = `${rawPonSlot}/${ponPort}`;
                }
                
                if (rawPonOlt && isValidPonComponent(rawPonOlt)) {
                  ponPort = `${rawPonOlt}/${ponPort}`;
                }
              }
              
              // Extrair CTO com validação
              const rawCto = equip.cto ? String(equip.cto).trim() : '';
              const rawFibraCto = equip.fibra_cto ? String(equip.fibra_cto).trim() : '';
              
              if (rawCto && isValidPonComponent(rawCto)) {
                cto = rawCto;
              } else if (rawFibraCto && isValidPonComponent(rawFibraCto)) {
                cto = rawFibraCto;
              }
              
              // Log de dados inválidos para monitoramento
              if (equip.pon_porta && !isValidPonComponent(rawPonPorta)) {
                console.warn(`⚠️ PON porta com formato inválido: ${equip.pon_porta}`);
              }
              if (equip.cto && !isValidPonComponent(rawCto)) {
                console.warn(`⚠️ CTO com formato inválido: ${equip.cto}`);
              }
              
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
    // IMPORTANTE: Cada cliente pode estar em múltiplos níveis (PON -> CTO -> Região)
    const ponGroups = new Map<string, Array<{ user: RadUser; ponPort?: string; cto?: string; bairro?: string }>>();
    const ctoGroups = new Map<string, Array<{ user: RadUser; ponPort?: string; cto?: string; bairro?: string }>>();
    const regionGroups = new Map<string, Array<{ user: RadUser; ponPort?: string; cto?: string; bairro?: string }>>();
    const bairrosMap = new Map<string, string[]>(); // Mapear grupos para bairros
    
    // Mapear CTOs para suas PONs (hierarquia)
    const ctoToPonMap = new Map<string, string>();
    const regionToPonMap = new Map<string, string>();
    const regionToCtoMap = new Map<string, string>();
    
    for (const clientData of clientsWithPon) {
      const login = String(clientData.user.login || '').toUpperCase().trim();
      if (!login) continue;

      // Extrair todos os níveis de agrupamento
      const ponKey = clientData.ponPort ? `PON:${clientData.ponPort}` : null;
      const ctoKey = clientData.cto ? `CTO:${clientData.cto}` : null;
      
      let regionKey = null;
      const parts = login.split('-');
      if (parts.length >= 2) {
        regionKey = `REGION:${parts[0]}-${parts[1]}`;
      }

      // Adicionar cliente em TODOS os níveis onde ele se aplica
      if (ponKey) {
        if (!ponGroups.has(ponKey)) {
          ponGroups.set(ponKey, []);
          bairrosMap.set(ponKey, []);
        }
        ponGroups.get(ponKey)!.push(clientData);
        
        if (clientData.bairro) {
          const bairros = bairrosMap.get(ponKey)!;
          if (!bairros.includes(clientData.bairro)) {
            bairros.push(clientData.bairro);
          }
        }
      }

      if (ctoKey) {
        if (!ctoGroups.has(ctoKey)) {
          ctoGroups.set(ctoKey, []);
          bairrosMap.set(ctoKey, []);
        }
        ctoGroups.get(ctoKey)!.push(clientData);
        
        if (clientData.bairro) {
          const bairros = bairrosMap.get(ctoKey)!;
          if (!bairros.includes(clientData.bairro)) {
            bairros.push(clientData.bairro);
          }
        }
        
        // Mapear CTO -> PON se ambos existem
        if (ponKey && !ctoToPonMap.has(ctoKey)) {
          ctoToPonMap.set(ctoKey, ponKey);
        }
      }

      if (regionKey) {
        if (!regionGroups.has(regionKey)) {
          regionGroups.set(regionKey, []);
          bairrosMap.set(regionKey, []);
        }
        regionGroups.get(regionKey)!.push(clientData);
        
        if (clientData.bairro) {
          const bairros = bairrosMap.get(regionKey)!;
          if (!bairros.includes(clientData.bairro)) {
            bairros.push(clientData.bairro);
          }
        }
        
        // Mapear Região -> PON/CTO se existem
        if (ponKey && !regionToPonMap.has(regionKey)) {
          regionToPonMap.set(regionKey, ponKey);
        }
        if (ctoKey && !regionToCtoMap.has(regionKey)) {
          regionToCtoMap.set(regionKey, ctoKey);
        }
      }
    }

    // Definir limiar para queda em massa
    const MASS_OUTAGE_THRESHOLDS = {
      PON_PORT: 5,
      CTO: 3,
      REGION: 6
    };
    
    const massOutages: any[] = [];
    const createdEventKeys = new Set<string>(); // Rastrear eventos criados para evitar duplicatas

    // HIERARQUIA DE PRIORIDADE: PON > CTO > Região
    // Se uma PON tem queda, não criar eventos para CTOs/Regiões que fazem parte dela
    const ponEventsDetected = new Set<string>();
    const ctoEventsDetected = new Set<string>();

    // Processar PONs primeiro (maior prioridade)
    for (const [groupKey, clientsData] of ponGroups) {
      const threshold = MASS_OUTAGE_THRESHOLDS.PON_PORT;
      
      // VALIDAÇÃO: Uma porta PON tem capacidade máxima de 128 clientes
      if (clientsData.length > MAX_CLIENTS_PER_PON) {
        console.warn(`⚠️ ALERTA: PON ${groupKey} tem ${clientsData.length} clientes (máx: ${MAX_CLIENTS_PER_PON}). Possível erro no agrupamento!`);
      }
      
      if (clientsData.length >= threshold) {
        ponEventsDetected.add(groupKey);
        await createOrUpdateEvent(
          groupKey, 
          clientsData, 
          'Porta PON', 
          threshold, 
          bairrosMap, 
          dyingGaspEvents, 
          supabase, 
          massOutages, 
          createdEventKeys
        );
      }
    }

    // Processar CTOs (média prioridade) - apenas se não houver evento PON pai
    for (const [ctoKey, clientsData] of ctoGroups) {
      const threshold = MASS_OUTAGE_THRESHOLDS.CTO;
      
      // Verificar se este CTO faz parte de uma PON que já tem evento
      const parentPon = ctoToPonMap.get(ctoKey);
      if (parentPon && ponEventsDetected.has(parentPon)) {
        console.log(`⏩ Ignorando CTO ${ctoKey} - já coberto por PON ${parentPon}`);
        continue;
      }
      
      if (clientsData.length >= threshold) {
        ctoEventsDetected.add(ctoKey);
        await createOrUpdateEvent(
          ctoKey, 
          clientsData, 
          'CTO', 
          threshold, 
          bairrosMap, 
          dyingGaspEvents, 
          supabase, 
          massOutages, 
          createdEventKeys
        );
      }
    }

    // Processar Regiões (menor prioridade) - apenas se não houver evento PON ou CTO pai
    for (const [regionKey, clientsData] of regionGroups) {
      const threshold = MASS_OUTAGE_THRESHOLDS.REGION;
      
      // Verificar se esta Região faz parte de uma PON ou CTO que já tem evento
      const parentPon = regionToPonMap.get(regionKey);
      const parentCto = regionToCtoMap.get(regionKey);
      
      if (parentPon && ponEventsDetected.has(parentPon)) {
        console.log(`⏩ Ignorando Região ${regionKey} - já coberto por PON ${parentPon}`);
        continue;
      }
      
      if (parentCto && ctoEventsDetected.has(parentCto)) {
        console.log(`⏩ Ignorando Região ${regionKey} - já coberto por CTO ${parentCto}`);
        continue;
      }
      
      if (clientsData.length >= threshold) {
        await createOrUpdateEvent(
          regionKey, 
          clientsData, 
          'Região', 
          threshold, 
          bairrosMap, 
          dyingGaspEvents, 
          supabase, 
          massOutages, 
          createdEventKeys
        );
      }
    }

    // Função auxiliar para criar/atualizar eventos
    async function createOrUpdateEvent(
      groupKey: string,
      clientsData: any[],
      groupType: string,
      threshold: number,
      bairrosMap: Map<string, string[]>,
      dyingGaspEvents: Map<string, any>,
      supabase: any,
      massOutages: any[],
      createdEventKeys: Set<string>
    ) {
      const affectedLogins = clientsData.map(c => c.user.login);
      const eventKey = `${groupKey}_${new Date().toISOString().split('T')[0]}`;
      
      if (createdEventKeys.has(eventKey)) return;
      
      const groupIdentifier = groupKey.split(':')[1];
      const bairrosAfetados = bairrosMap.get(groupKey) || [];
      
      // Verificar se há Dying Gasp (perda de energia) para este grupo
      let powerOutageCause = false;
      let dyingGaspCount = 0;
      let affectedOnus: string[] = [];
      
      const gaspData = dyingGaspEvents.get(groupKey);
      if (gaspData && gaspData.count >= 2) {
        powerOutageCause = true;
        dyingGaspCount = gaspData.count;
        affectedOnus = gaspData.onus;
      }
      
      const causeType = powerOutageCause 
        ? `⚡ FALTA DE ENERGIA (${dyingGaspCount} ONUs com Dying Gasp)` 
        : '❓ Causa desconhecida';
      console.log(`🚨 QUEDA EM MASSA detectada (${groupType}): ${groupIdentifier} - ${clientsData.length} clientes afetados - ${causeType}`);

      // Buscar evento existente
      const { data: existingEvent } = await supabase
        .from('mass_outage_events')
        .select('*')
        .eq('event_key', eventKey)
        .maybeSingle();

      const isPonGroup = groupKey.startsWith('PON:');
      const isCtoGroup = groupKey.startsWith('CTO:');

      // UPSERT
      const { data: upsertedEvent, error: upsertError } = await supabase
        .from('mass_outage_events')
        .upsert(
          {
            event_key: eventKey,
            region_pattern: groupKey,
            affected_count: clientsData.length,
            affected_logins: affectedLogins,
            status: 'active',
            metadata: {
              detection_time: existingEvent?.metadata?.detection_time || new Date().toISOString(),
              last_update: new Date().toISOString(),
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
          },
          {
            onConflict: 'event_key',
            ignoreDuplicates: false
          }
        )
        .select()
        .single();

      if (upsertError) {
        console.error('Erro ao upsert evento:', upsertError);
      } else {
        massOutages.push(upsertedEvent);
        createdEventKeys.add(eventKey);
        const action = existingEvent ? 'atualizado' : 'criado';
        console.log(`✅ Evento ${action}: ${eventKey}`);
      }
    }

    // RESOLUÇÃO DE EVENTOS COM HIERARQUIA CRUZADA
    // Se PON é resolvida -> resolver também CTOs e Regiões filhos
    const { data: activeEvents } = await supabase
      .from('mass_outage_events')
      .select('*')
      .eq('status', 'active');

    if (activeEvents) {
      const allGroups = new Map([...ponGroups, ...ctoGroups, ...regionGroups]);
      
      for (const event of activeEvents) {
        const groupKey = event.region_pattern;
        const stillOffline = allGroups.get(groupKey);
        
        const isPonGroup = groupKey.startsWith('PON:');
        const isCtoGroup = groupKey.startsWith('CTO:');
        const threshold = isPonGroup ? MASS_OUTAGE_THRESHOLDS.PON_PORT : 
                         (isCtoGroup ? MASS_OUTAGE_THRESHOLDS.CTO : MASS_OUTAGE_THRESHOLDS.REGION);
        
        // Verificar se evento deve ser resolvido
        const shouldResolve = !stillOffline || stillOffline.length < threshold;
        
        if (shouldResolve) {
          await supabase
            .from('mass_outage_events')
            .update({
              status: 'resolved',
              resolved_at: new Date().toISOString()
            })
            .eq('id', event.id);
          
          console.log(`✅ Evento resolvido: ${groupKey}`);
          
          // RESOLUÇÃO CRUZADA: Se resolveu PON, resolver também CTOs e Regiões filhos
          if (isPonGroup) {
            // Encontrar CTOs que fazem parte desta PON
            const childCtos = Array.from(ctoToPonMap.entries())
              .filter(([_, ponKey]) => ponKey === groupKey)
              .map(([ctoKey, _]) => ctoKey);
            
            // Encontrar Regiões que fazem parte desta PON
            const childRegions = Array.from(regionToPonMap.entries())
              .filter(([_, ponKey]) => ponKey === groupKey)
              .map(([regionKey, _]) => regionKey);
            
            // Resolver eventos filhos
            const childKeys = [...childCtos, ...childRegions];
            if (childKeys.length > 0) {
              const today = new Date().toISOString().split('T')[0];
              const childEventKeys = childKeys.map(key => `${key}_${today}`);
              
              const { data: childEvents } = await supabase
                .from('mass_outage_events')
                .select('*')
                .in('event_key', childEventKeys)
                .eq('status', 'active');
              
              if (childEvents && childEvents.length > 0) {
                for (const childEvent of childEvents) {
                  await supabase
                    .from('mass_outage_events')
                    .update({
                      status: 'resolved',
                      resolved_at: new Date().toISOString(),
                      metadata: {
                        ...childEvent.metadata,
                        resolved_by_parent: groupKey,
                        resolution_note: `Resolvido automaticamente pois PON pai ${groupKey} foi resolvida`
                      }
                    })
                    .eq('id', childEvent.id);
                  
                  console.log(`✅ Evento filho resolvido automaticamente: ${childEvent.event_key} (pai: ${groupKey})`);
                }
              }
            }
          }
          
          // Se resolveu CTO, resolver também Regiões filhas
          if (isCtoGroup) {
            const childRegions = Array.from(regionToCtoMap.entries())
              .filter(([_, ctoKey]) => ctoKey === groupKey)
              .map(([regionKey, _]) => regionKey);
            
            if (childRegions.length > 0) {
              const today = new Date().toISOString().split('T')[0];
              const childEventKeys = childRegions.map(key => `${key}_${today}`);
              
              const { data: childEvents } = await supabase
                .from('mass_outage_events')
                .select('*')
                .in('event_key', childEventKeys)
                .eq('status', 'active');
              
              if (childEvents && childEvents.length > 0) {
                for (const childEvent of childEvents) {
                  await supabase
                    .from('mass_outage_events')
                    .update({
                      status: 'resolved',
                      resolved_at: new Date().toISOString(),
                      metadata: {
                        ...childEvent.metadata,
                        resolved_by_parent: groupKey,
                        resolution_note: `Resolvido automaticamente pois CTO pai ${groupKey} foi resolvido`
                      }
                    })
                    .eq('id', childEvent.id);
                  
                  console.log(`✅ Evento filho resolvido automaticamente: ${childEvent.event_key} (pai: ${groupKey})`);
                }
              }
            }
          }
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
          total: ponGroups.size + ctoGroups.size + regionGroups.size,
          by_pon_port: ponGroups.size,
          by_cto: ctoGroups.size,
          by_region: regionGroups.size,
          hierarchy_applied: true
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