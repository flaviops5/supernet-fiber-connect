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

      return new Response(
        JSON.stringify({
          success: true,
          reachable: true,
          responseTime,
          status: response.status,
          message: `Equipamento respondeu em ${responseTime}ms`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        console.log(`⏱️ Timeout ao conectar com ${ip}:${port}`);
        return new Response(
          JSON.stringify({
            success: true,
            reachable: false,
            message: 'Timeout - equipamento não respondeu',
            error: 'timeout',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`❌ Erro ao conectar: ${error.message}`);
      return new Response(
        JSON.stringify({
          success: true,
          reachable: false,
          message: 'Equipamento não alcançável',
          error: error.message,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
