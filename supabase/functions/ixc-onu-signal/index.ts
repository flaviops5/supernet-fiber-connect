/**
 * IXC ONU Signal Status - TX/RX Power Levels
 * 
 * Busca dados de potência óptica (TX/RX) da ONU do cliente via IXC.
 * Usado pelo agente Luan para diagnóstico técnico de problemas de conexão.
 * 
 * Endpoint IXC: botao_rel_22991 (Relatório de Potência/Resumo ONU)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getOnuSignalStatus } from '../_shared/ixc-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📡 IXC ONU Signal Status - Iniciando consulta...');

    const { clientId } = await req.json();

    if (!clientId) {
      console.error('❌ clientId não fornecido');
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'clientId é obrigatório' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Configuração do IXC Proxy
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const ixcProxyUrl = `${supabaseUrl}/functions/v1/ixc-proxy`;

    console.log(`🔍 Buscando sinal para cliente ID: ${clientId}`);

    const result = await getOnuSignalStatus(ixcProxyUrl, clientId);

    // Extrair dados relevantes
    const signalData = {
      clientId,
      timestamp: new Date().toISOString(),
      rawData: result.data,
      // Dados típicos retornados pelo endpoint:
      // - TX (potência de transmissão)
      // - RX (potência de recepção)
      // - Status da ONU
      // - Temperatura (se disponível)
    };

    console.log('✅ Dados de sinal obtidos:', JSON.stringify(signalData, null, 2));

    return new Response(
      JSON.stringify({
        ok: true,
        data: signalData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro ao buscar sinal ONU:', error);
    
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || 'Erro ao buscar dados de sinal',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
