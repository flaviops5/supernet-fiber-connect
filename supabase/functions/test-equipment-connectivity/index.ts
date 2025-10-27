import { createPublicHandler } from '../_shared/base-handler.ts';
import { callIxcWithRetry } from '../_shared/ixc-client.ts';

/**
 * Busca IP do equipamento via IXC (radusuarios)
 */
async function getEquipmentIpFromIXC(ixcClientId: string): Promise<{ ip: string; port?: number } | null> {
  const proxyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ixc-proxy`;
  
  try {
    console.log(`🔍 Buscando IP para ixc_client_id: ${ixcClientId}`);
    
    const result = await callIxcWithRetry(
      proxyUrl,
      'GET',
      '/webservice/v1/radusuarios',
      undefined,
      `qtype=radusuarios.id_cliente&query=${ixcClientId}&oper==&page=1&rp=1&sortname=radusuarios.id&sortorder=asc`
    );
    
    if (result?.data?.registros && result.data.registros.length > 0) {
      const radusuario = result.data.registros[0];
      const ip = radusuario.framedipaddress || radusuario.ip || null;
      
      if (ip) {
        console.log(`✅ IP encontrado para cliente ${ixcClientId}: ${ip}`);
        return { ip, port: 80 };
      }
    }
    
    console.log(`⚠️ Nenhum IP encontrado para cliente ${ixcClientId}`);
    return null;
  } catch (error) {
    console.error(`❌ Erro ao buscar IP do IXC:`, error);
    return null;
  }
}

Deno.serve(createPublicHandler('test-equipment-connectivity', async (req) => {
  let { ip, port = 80, timeout = 5000, ixc_client_id } = await req.json();

  // Se vier ixc_client_id, buscar IP via IXC
  if (!ip && ixc_client_id) {
    console.log(`🔄 Buscando IP via IXC para client_id: ${ixc_client_id}`);
    const deviceInfo = await getEquipmentIpFromIXC(ixc_client_id);
    
    if (deviceInfo) {
      ip = deviceInfo.ip;
      port = deviceInfo.port || port;
    } else {
      return {
        ok: false,
        reachable: false,
        error: 'NO_IP_FOUND',
        message: 'Não foi possível obter IP do equipamento via IXC'
      };
    }
  }

  if (!ip) {
    throw new Error('IP ou ixc_client_id é obrigatório');
  }

  console.log(`🔍 Testando conectividade com ${ip}:${port}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const startTime = Date.now();
    const response = await fetch(`http://${ip}:${port}`, {
      method: 'HEAD',
      signal: controller.signal,
    });
    const responseTime = Date.now() - startTime;

    clearTimeout(timeoutId);

    console.log(`✅ Conectado em ${responseTime}ms - Status: ${response.status}`);

    return {
      ok: true,
      reachable: true,
      responseTime,
      status: response.status,
      latency_ms: responseTime,
      target: `${ip}:${port}`,
      message: `Equipamento respondeu em ${responseTime}ms`,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.log(`⏱️ Timeout ao conectar com ${ip}:${port}`);
      return {
        ok: false,
        reachable: false,
        target: `${ip}:${port}`,
        message: 'Timeout - equipamento não respondeu',
        error: 'timeout',
      };
    }

    console.log(`❌ Erro ao conectar: ${error.message}`);
    return {
      ok: false,
      reachable: false,
      target: `${ip}:${port}`,
      message: 'Equipamento não alcançável',
      error: error.message,
    };
  }
}));
