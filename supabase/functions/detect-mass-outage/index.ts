import { callIxcWithRetry } from '../_shared/ixc-client.ts';
import { setMassOutageStatus } from '../_shared/mass-outage-helper.ts';
import { getErrorMessage } from '../_shared/error-types.ts';
import { createLogger } from "../_shared/structured-logger.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { RadiusUser } from '../_shared/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-key, x-hmac-signature, x-hmac-timestamp',
};

// v3.1 Hybrid: CRON-compatible public function
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const traceId = crypto.randomUUID();
  const logger = createLogger('detect-mass-outage', req, { traceId });

  try {

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    logger.info('Iniciando detecção de quedas em massa via proxy');
    const IXC_PROXY_URL = Deno.env.get('IXC_PROXY_URL') || `${supabaseUrl}/functions/v1/ixc-proxy`;

    // 🔐 Preparar headers base (HMAC será gerado internamente por callIxcWithRetry)
    const internalToken = Deno.env.get('IXC_INTERNAL_SYSTEM_TOKEN');
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(internalToken ? { Authorization: `Bearer ${internalToken}` } : {})
    };

  // Buscar clientes offline do IXC via proxy
    let page = 1;
    const itemsPerPage = 1000;
    const allRadUsers: RadUser[] = [];

    const MAX_PAGES = 3; // LIMITE: máx 3 páginas = 3000 clientes offline
    
    try {
      // Buscar clientes offline com LIMITE de páginas para evitar timeout
      while (page <= MAX_PAGES) {
        const bodyRad = {
          qtype: 'radusuarios.online',
          query: 'N',
          oper: '=',
          page: String(page),
          rp: String(itemsPerPage),
          sortname: 'radusuarios.id',
          sortorder: 'desc',
        };

        logger.info('Buscando página de clientes offline', { 
          page,
          maxPages: MAX_PAGES 
        });

        const radData = await logger.measure('ixc-fetch-offline-clients', async () => {
          return await callIxcWithRetry(
            IXC_PROXY_URL,
            'POST',
            '/webservice/v1/radusuarios',
            bodyRad,
            undefined,
            {},
            baseHeaders
          );
        });

        const radRegistros = Array.isArray(radData?.data?.registros)
          ? radData.data.registros
          : (radData?.data?.registros ? Object.values(radData.data.registros) : []);

        if (!radRegistros || radRegistros.length === 0) {
          logger.info('Sem mais registros', { page });
          break;
        }

        allRadUsers.push(...radRegistros);
        logger.info('Página processada', { 
          page,
          pageCount: radRegistros.length,
          totalCount: allRadUsers.length 
        });

        if (radRegistros.length < itemsPerPage) {
          break;
        }
        page++;
      }
      
      if (page > MAX_PAGES) {
        logger.warn('Limite de páginas atingido', { 
          maxPages: MAX_PAGES,
          totalClients: allRadUsers.length 
        });
      }
    } catch (error) {
      logger.error('Erro ao buscar clientes offline do IXC', { 
        error: getErrorMessage(error) 
      });
      
      // Se falhou completamente, retornar erro informativo
      if (allRadUsers.length === 0) {
        throw new Error('Não foi possível buscar dados do IXC');
      }
      
      // Se temos dados parciais, continuar
      logger.warn('Continuando com dados parciais', { 
        recordsObtained: allRadUsers.length 
      });
    }

    logger.info('Total de clientes offline', { count: allRadUsers.length });

    // OTIMIZAÇÃO: Limitar a 200 clientes mais críticos para evitar sobrecarga no IXC
    const MAX_CLIENTS_TO_ENRICH = 200; // Reduzido de 500 para 200
    const MAX_CLIENTS_PER_PON = 128; // Capacidade máxima de uma porta PON
    
    // CONTROLE DE CONCORRÊNCIA: Limitar requisições paralelas ao IXC
    const MAX_CONCURRENT_REQUESTS = 3; // CRÍTICO: Reduzido para 3 para evitar sobrecarga do IXC
    const INITIAL_BACKOFF_MS = 2000; // Aumentado de 1s para 2s
    const MAX_BACKOFF_MS = 15000; // Aumentado de 10s para 15s
    const CHUNK_DELAY_MS = 3000; // 3 segundos de delay entre chunks
    
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
      let lastError: Error | null = null;
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error;
          if (i < maxRetries - 1) {
            const delay = Math.min(baseDelay * Math.pow(2, i), MAX_BACKOFF_MS);
            logger.warn(`Retry ${i + 1}/${maxRetries} após ${delay}ms`);
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
      logger.warn('Limitando análise para evitar sobrecarga', { 
        maxClients: MAX_CLIENTS_TO_ENRICH,
        skippedCount 
      });
    }

    // Buscar informações de porta PON e bairro para cada cliente offline
    logger.info('Buscando informações de porta PON e localização');
    const clientsWithPon: Array<{ user: RadUser; ponPort?: string; cto?: string; bairro?: string }> = [];
    
    // OTIMIZAÇÃO: Processar em chunks com concorrência limitada
    const CHUNK_SIZE = MAX_CONCURRENT_REQUESTS;
    const chunks: RadUser[][] = [];
    for (let i = 0; i < usersToEnrich.length; i += CHUNK_SIZE) {
      chunks.push(usersToEnrich.slice(i, i + CHUNK_SIZE));
    }
    
    logger.info('Processando chunks em paralelo', { 
      totalChunks: chunks.length,
      chunkSize: CHUNK_SIZE 
    });
    
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      logger.info('Processando chunk', { 
        chunk: `${chunkIndex + 1}/${chunks.length}`,
        clientsCount: chunk.length 
      });
      
      // ⏱️ DELAY entre chunks para não sobrecarregar IXC
      if (chunkIndex > 0) {
        logger.info('Aguardando antes do próximo chunk', { delayMs: CHUNK_DELAY_MS });
        await delayWithJitter(CHUNK_DELAY_MS);
      }
      
      // Processar todos os clientes do chunk em paralelo
      const chunkResults = await Promise.all(
        chunk.map(async (user) => {
          const clientId = user.id_cliente;
          if (!clientId) {
            return { user };
          }

          try {
            // FALLBACK ROBUSTO: Tentar buscar dados do cliente
            let clientData;
            
            try {
              // Buscar dados do cliente (inclui bairro)
              const clientBody = {
                qtype: 'cliente.id',
                query: clientId,
                oper: '=',
                page: '1',
                rp: '1',
                sortname: 'cliente.id',
                sortorder: 'asc',
              };

              clientData = await retryWithBackoff(() =>
                callIxcWithRetry(
                  IXC_PROXY_URL,
                  'POST',
                  '/webservice/v1/cliente',
                  clientBody,
                  undefined,
                  {},
                  baseHeaders
                )
              );
            } catch (error) {
              // Se falhou completamente, tentar pelo menos buscar o cliente sem retry
              logger.warn(`Erro ao buscar dados do cliente ${clientId} com retry, tentando uma vez`);
              try {
                const fallbackBody = {
                  qtype: 'cliente.id',
                  query: clientId,
                  oper: '=',
                  page: '1',
                  rp: '1',
                  sortname: 'cliente.id',
                  sortorder: 'asc',
                };

                clientData = await callIxcWithRetry(
                  IXC_PROXY_URL,
                  'POST',
                  '/webservice/v1/cliente',
                  fallbackBody,
                  undefined,
                  {},
                  baseHeaders
                );
              } catch (fallbackError) {
                logger.warn(`Cliente ${clientId}: Erro ao buscar dados mesmo com fallback`, {
                  error: getErrorMessage(fallbackError)
                });
                return { user }; // Retorna sem dados PON
              }
            }

            // Processar dados do cliente (bairro)
            let bairro = '';
            const clientes = Array.isArray(clientData?.data?.registros)
              ? clientData.data.registros
              : (clientData?.data?.registros ? Object.values(clientData.data.registros) : []);
            
            if (clientes.length > 0) {
              const cliente = clientes[0];
              bairro = cliente.bairro || cliente.endereco_bairro || '';
            }

            // Sem dados de PON disponíveis
            return { user, ponPort: '', cto: '', bairro };

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
                logger.warn(`PON porta com formato inválido: ${equip.pon_porta}`);
              }
              if (equip.cto && !isValidPonComponent(rawCto)) {
                logger.warn(`CTO com formato inválido: ${equip.cto}`);
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
            logger.error(`Erro ao buscar dados do cliente ${clientId}`, { error });
            return { user };
          }
        })
      );
      
      clientsWithPon.push(...chunkResults);
    }

    logger.info(`Clientes com dados PON: ${clientsWithPon.filter(c => c.ponPort).length}/${clientsWithPon.length}`);

    // Verificar Dying Gasp (sinal de perda de energia da ONU) no IXC
    logger.info('Verificando eventos Dying Gasp (perda de energia)...');
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

        logger.info(`Total de eventos PON encontrados: ${ponEvents.length}`);

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
              logger.info('Dying Gasp detectado', { groupKey, onuSerial: onuSerial || 'N/A' });
            }
          }
        }
      logger.info(`Total de grupos com Dying Gasp: ${dyingGaspEvents.size}`);
      for (const [key, data] of dyingGaspEvents) {
        logger.info(`Dying Gasp group: ${key} - ${data.count} ONUs`);
      }
    } catch (error) {
      logger.error('Erro ao verificar Dying Gasp', { error });
    }

    // ... keep existing code (PON grouping logic)

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
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    logger.error('Erro na detecção de quedas em massa', { 
      error: error instanceof Error ? error.message : String(error) 
    });

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});