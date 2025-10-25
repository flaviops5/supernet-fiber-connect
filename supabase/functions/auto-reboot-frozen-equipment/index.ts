// ============================================
// AUTO REBOOT FROZEN EQUIPMENT
// ============================================
// Detecta e reinicia automaticamente equipamentos travados
// Critérios:
// - Cliente online com banda < 900 Kbps
// - Não bloqueado financeiramente
// - 3 verificações consecutivas (1 minuto entre cada)
// - Cooldown: 1x por dia por equipamento
// - Exclui horário 1h-6h

import { createPublicHandler } from '../_shared/base-handler.ts';
import { callIxcWithRetry } from '../_shared/ixc-client.ts';
import { createLogger } from '../_shared/logger.ts';
import type { RadiusUser, ClientStatus } from '../_shared/types.ts';

Deno.serve(createPublicHandler('auto-reboot-frozen-equipment', async (req, { supabase }) => {
  const logger = createLogger('auto-reboot-frozen-equipment');
  logger.info('Iniciando verificação de equipamentos travados');

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const IXC_PROXY_URL = `${SUPABASE_URL}/functions/v1/ixc-proxy`;

  // Verificar horário (não executar entre 1h-6h)
  const now = new Date();
  const hour = now.getHours();
  if (hour >= 1 && hour < 6) {
    logger.info('Horário de madrugada - ignorando verificação', { hour });
    return { 
      skipped: true, 
      reason: 'Horário de madrugada (1h-6h)' 
    };
  }

    // 1. Buscar clientes online do IXC
    const endTimer = logger.time('fetch-online-clients');
    logger.info('Consultando clientes online no IXC');
    const radiusResponse = await callIxcWithRetry(
      IXC_PROXY_URL,
      'GET',
      '/webservice/v1/radusuarios',
      undefined,
      'qtype=radusuarios.online&oper==&page=1&rp=999999&sortname=radusuarios.acctstarttime&sortorder=desc'
    );

    if (!radiusResponse.ok || !radiusResponse.data?.registros) {
      throw new Error('Falha ao consultar radusuarios');
    }

    const onlineUsers: RadiusUser[] = radiusResponse.data.registros;
    endTimer();
    logger.info('Clientes online encontrados', { count: onlineUsers.length });

    // 2. Buscar blacklist
    const { data: blacklist } = await supabase
      .from('equipment_reboot_blacklist')
      .select('ixc_client_id');
    
    const blacklistedIds = new Set(blacklist?.map(b => b.ixc_client_id) || []);

    // 3. Filtrar clientes com banda baixa
    const suspectClients: Array<{
      clientId: string;
      login: string;
      ip: string;
      bandwidthKbps: number;
    }> = [];

    for (const user of onlineUsers) {
      // Ignorar se não está realmente online
      if (user.online !== 'S' && user.online !== 'SS') continue;

      // Ignorar se está na blacklist
      if (blacklistedIds.has(user.id_cliente)) continue;

      // Calcular banda instantânea
      const inputBytes = parseInt(user.acctinputoctets || '0');
      const outputBytes = parseInt(user.acctoutputoctets || '0');
      const sessionTime = parseInt(user.acctsessiontime || '1');

      if (sessionTime === 0) continue; // Evitar divisão por zero

      // Banda em Kbps = (bytes totais * 8) / (tempo em segundos * 1024)
      const totalBytes = inputBytes + outputBytes;
      const bandwidthKbps = (totalBytes * 8) / (sessionTime * 1024);

      logger.debug('Cliente verificado', { 
        login: user.login, 
        bandwidthKbps: bandwidthKbps.toFixed(2),
        clientId: user.id_cliente 
      });

      // Detectar banda anormalmente baixa
      if (bandwidthKbps < 900 && bandwidthKbps > 0) {
        suspectClients.push({
          clientId: user.id_cliente,
          login: user.login,
          ip: user.framedipaddress || '',
          bandwidthKbps: Math.round(bandwidthKbps * 100) / 100
        });
      }
    }

  logger.info('Clientes com banda suspeita detectados', { 
    count: suspectClients.length,
    threshold: '900 Kbps' 
  });

  if (suspectClients.length === 0) {
    return { 
      message: 'Nenhum equipamento com problema detectado',
      checked: onlineUsers.length,
      suspects: 0
    };
  }

    const results = [];

    // 4. Processar cada cliente suspeito
    for (const suspect of suspectClients) {
      try {
        const clientLogger = logger.child({ clientId: suspect.clientId, login: suspect.login });
        clientLogger.info('Analisando cliente suspeito', { 
          bandwidthKbps: suspect.bandwidthKbps,
          ip: suspect.ip 
        });

        // 4.1. Verificar se está bloqueado financeiramente
        const clientResponse = await callIxcWithRetry(
          IXC_PROXY_URL,
          'GET',
          '/webservice/v1/cliente',
          undefined,
          `qtype=cliente.id&query=${suspect.clientId}&oper==&page=1&rp=1&sortname=cliente.id&sortorder=asc`
        );

        if (!clientResponse.ok || !clientResponse.data?.registros?.[0]) {
          clientLogger.warn('Cliente não encontrado no IXC');
          continue;
        }

        const clientData: ClientStatus = clientResponse.data.registros[0];

        if (clientData.bloqueado === 'S' || clientData.bloqueado_financeiro === 'S') {
          clientLogger.info('Cliente bloqueado - ignorando', { 
            bloqueado: clientData.bloqueado,
            bloqueado_financeiro: clientData.bloqueado_financeiro 
          });
          results.push({
            clientId: suspect.clientId,
            login: suspect.login,
            status: 'skipped',
            reason: 'Cliente bloqueado/inadimplente'
          });
          continue;
        }

        // 4.2. Verificar cooldown (1 reboot por dia)
        const { data: recentReboots } = await supabase
          .from('equipment_reboots')
          .select('id')
          .eq('ixc_client_id', suspect.clientId)
          .gte('detection_timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (recentReboots && recentReboots.length > 0) {
          clientLogger.info('Cooldown ativo - ignorando', { cooldownHours: 24 });
          results.push({
            clientId: suspect.clientId,
            login: suspect.login,
            status: 'skipped',
            reason: 'Cooldown ativo (24h)'
          });
          continue;
        }

        // 4.3. Criar registro inicial
        const { data: rebootRecord, error: insertError } = await supabase
          .from('equipment_reboots')
          .insert({
            ixc_client_id: suspect.clientId,
            client_login: suspect.login,
            client_name: clientData.razao,
            client_ip: suspect.ip,
            detection_timestamp: new Date().toISOString(),
            bandwidth_before_kbps: suspect.bandwidthKbps,
            status: 'pending',
            verification_count: 0,
            metadata: {
              initial_detection: suspect.bandwidthKbps,
              detection_time: new Date().toISOString()
            }
          })
          .select()
          .single();

        if (insertError || !rebootRecord) {
          clientLogger.error('Erro ao criar registro de reboot', { error: insertError });
          continue;
        }

        clientLogger.info('Registro de reboot criado', { rebootId: rebootRecord.id });

        // 4.4. Fazer 3 verificações consecutivas (aguardar 1 minuto entre cada)
        let verificationsLow = 0;
        const verificationResults = [];

        for (let i = 0; i < 3; i++) {
          if (i > 0) {
            clientLogger.info('Aguardando próxima verificação', { 
              verification: `${i + 1}/3`,
              delaySeconds: 60 
            });
            await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minuto
          }

          // Re-consultar radusuarios
          const recheckResponse = await callIxcWithRetry(
            IXC_PROXY_URL,
            'GET',
            '/webservice/v1/radusuarios',
            undefined,
            `qtype=radusuarios.id_cliente&query=${suspect.clientId}&oper==&page=1&rp=1&sortname=radusuarios.acctstarttime&sortorder=desc`
          );

          if (recheckResponse.ok && recheckResponse.data?.registros?.[0]) {
            const currentUser = recheckResponse.data.registros[0];
            const inputBytes = parseInt(currentUser.acctinputoctets || '0');
            const outputBytes = parseInt(currentUser.acctoutputoctets || '0');
            const sessionTime = parseInt(currentUser.acctsessiontime || '1');
            const totalBytes = inputBytes + outputBytes;
            const currentBandwidth = sessionTime > 0 ? (totalBytes * 8) / (sessionTime * 1024) : 0;

            verificationResults.push(currentBandwidth);

            clientLogger.info('Verificação realizada', { 
              verification: `${i + 1}/3`,
              bandwidthKbps: currentBandwidth.toFixed(2) 
            });

            if (currentBandwidth < 900) {
              verificationsLow++;
            }
          } else {
            clientLogger.warn('Cliente offline ou não encontrado na verificação', { 
              verification: `${i + 1}/3` 
            });
          }
        }

        // Atualizar registro com verificações
        await supabase
          .from('equipment_reboots')
          .update({
            verification_count: 3,
            metadata: {
              ...rebootRecord.metadata,
              verifications: verificationResults
            }
          })
          .eq('id', rebootRecord.id);

        // 4.5. Se 2 ou mais verificações confirmaram banda baixa, reiniciar
        if (verificationsLow >= 2) {
          clientLogger.info('Banda baixa confirmada - iniciando reboot', { 
            verificationsLow,
            total: 3 
          });

          // Tentar enviar comando de reboot via IXC
          try {
            // Primeiro, tentar obter ID do equipamento/ONU
            const equipmentResponse = await callIxcWithRetry(
              IXC_PROXY_URL,
              'GET',
              '/webservice/v1/su_cliente_equipamento',
              undefined,
              `qtype=su_cliente_equipamento.id_cliente&query=${suspect.clientId}&oper==&page=1&rp=1&sortname=su_cliente_equipamento.id&sortorder=desc`
            );

            if (equipmentResponse.ok && equipmentResponse.data?.registros?.[0]) {
              const equipmentId = equipmentResponse.data.registros[0].id;

              // Enviar comando de reboot (ONU)
              const rebootResponse = await callIxcWithRetry(
                IXC_PROXY_URL,
                'POST',
                '/webservice/v1/su_onu_comando',
                {
                  id_equipamento: equipmentId,
                  comando: 'reboot'
                }
              );

              if (rebootResponse.ok) {
                clientLogger.info('Comando de reboot enviado', { 
                  equipmentId 
                });

                // Aguardar 2 minutos e verificar se banda melhorou
                clientLogger.info('Aguardando verificação pós-reboot', { delaySeconds: 120 });
                await new Promise(resolve => setTimeout(resolve, 120000));

                // Verificar banda após reboot
                const postRebootResponse = await callIxcWithRetry(
                  IXC_PROXY_URL,
                  'GET',
                  '/webservice/v1/radusuarios',
                  undefined,
                  `qtype=radusuarios.id_cliente&query=${suspect.clientId}&oper==&page=1&rp=1&sortname=radusuarios.acctstarttime&sortorder=desc`
                );

                let bandwidthAfter = 0;
                if (postRebootResponse.ok && postRebootResponse.data?.registros?.[0]) {
                  const postUser = postRebootResponse.data.registros[0];
                  const inputBytes = parseInt(postUser.acctinputoctets || '0');
                  const outputBytes = parseInt(postUser.acctoutputoctets || '0');
                  const sessionTime = parseInt(postUser.acctsessiontime || '1');
                  const totalBytes = inputBytes + outputBytes;
                  bandwidthAfter = sessionTime > 0 ? (totalBytes * 8) / (sessionTime * 1024) : 0;
                }

                const success = bandwidthAfter > 1000; // > 1 Mbps

                await supabase
                  .from('equipment_reboots')
                  .update({
                    reboot_timestamp: new Date().toISOString(),
                    reboot_completed_at: new Date().toISOString(),
                    bandwidth_after_kbps: Math.round(bandwidthAfter * 100) / 100,
                    status: success ? 'success' : 'failed',
                    error_message: success ? null : 'Banda não melhorou após reboot',
                    metadata: {
                      ...rebootRecord.metadata,
                      post_reboot_bandwidth: bandwidthAfter,
                      equipment_id: equipmentId
                    }
                  })
                  .eq('id', rebootRecord.id);

                results.push({
                  clientId: suspect.clientId,
                  login: suspect.login,
                  status: success ? 'success' : 'failed',
                  bandwidthBefore: suspect.bandwidthKbps,
                  bandwidthAfter: bandwidthAfter,
                  message: success ? 'Reboot bem-sucedido, banda normalizada' : 'Reboot realizado mas banda não melhorou'
                });

                if (success) {
                  clientLogger.info('Reboot bem-sucedido', { 
                    bandwidthAfter: bandwidthAfter.toFixed(2) 
                  });
                } else {
                  clientLogger.warn('Banda não melhorou após reboot', { 
                    bandwidthAfter: bandwidthAfter.toFixed(2) 
                  });
                }
              } else {
                throw new Error(`Falha ao enviar comando de reboot: ${rebootResponse.error}`);
              }
            } else {
              throw new Error('Equipamento não encontrado no IXC');
            }
          } catch (rebootError: unknown) {
            clientLogger.error('Erro ao executar reboot', { 
              error: rebootError instanceof Error ? rebootError.message : 'Unknown error' 
            });

            await supabase
              .from('equipment_reboots')
              .update({
                status: 'failed',
                error_message: rebootError.message
              })
              .eq('id', rebootRecord.id);

            results.push({
              clientId: suspect.clientId,
              login: suspect.login,
              status: 'failed',
              error: rebootError.message
            });
          }
        } else {
          console.log(`✅ Apenas ${verificationsLow}/3 verificações confirmaram banda baixa - falso positivo`);

          await supabase
            .from('equipment_reboots')
            .update({
              status: 'skipped',
              skip_reason: `Apenas ${verificationsLow}/3 verificações confirmaram banda baixa`
            })
            .eq('id', rebootRecord.id);

          results.push({
            clientId: suspect.clientId,
            login: suspect.login,
            status: 'skipped',
            reason: 'Falso positivo - banda normalizou durante verificações'
          });
        }

      } catch (error: unknown) {
        logger.error('Erro ao processar cliente suspeito', { 
          clientId: suspect.clientId,
          login: suspect.login,
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        results.push({
          clientId: suspect.clientId,
          login: suspect.login,
          status: 'error',
          error: error.message
        });
      }
    }

  logger.info('Verificação concluída', { 
    totalChecked: onlineUsers.length,
    suspects: suspectClients.length,
    resultsCount: results.length 
  });

  return {
    message: 'Verificação concluída',
    checked: onlineUsers.length,
    suspects: suspectClients.length,
    results
  };
}));
