import { createPublicHandler } from '../_shared/base-handler.ts';

Deno.serve(createPublicHandler('test-equipment-connectivity', async (req) => {
  const { ip, port = 80, timeout = 5000 } = await req.json();

  if (!ip) {
    throw new Error('IP é obrigatório');
  }

  console.log(`🔍 Testando conectividade com ${ip}:${port}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Tenta conexão HTTP
    const startTime = Date.now();
    const response = await fetch(`http://${ip}:${port}`, {
      method: 'HEAD',
      signal: controller.signal,
    });
    const responseTime = Date.now() - startTime;

    clearTimeout(timeoutId);

    console.log(`✅ Conectado em ${responseTime}ms - Status: ${response.status}`);

    return {
      success: true,
      reachable: true,
      responseTime,
      status: response.status,
      message: `Equipamento respondeu em ${responseTime}ms`,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.log(`⏱️ Timeout ao conectar com ${ip}:${port}`);
      return {
        success: true,
        reachable: false,
        message: 'Timeout - equipamento não respondeu',
        error: 'timeout',
      };
    }

    console.log(`❌ Erro ao conectar: ${error.message}`);
    return {
      success: true,
      reachable: false,
      message: 'Equipamento não alcançável',
      error: error.message,
    };
  }
}));
