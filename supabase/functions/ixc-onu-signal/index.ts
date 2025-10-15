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

/**
 * Interpreta valores de potência RX (Recepção)
 */
function interpretRX(rx: number): { status: string; level: string; message: string; emoji: string } {
  if (rx > -8) {
    return {
      status: 'critical',
      level: '🔴 Saturado',
      message: 'Risco de dano ao equipamento',
      emoji: '🔴'
    };
  }
  if (rx >= -12) {
    return {
      status: 'excellent',
      level: '🟢 Excelente',
      message: 'Sinal ideal',
      emoji: '🟢'
    };
  }
  if (rx >= -20) {
    return {
      status: 'excellent',
      level: '🟢 Excelente',
      message: 'Sinal ideal',
      emoji: '🟢'
    };
  }
  if (rx >= -25) {
    return {
      status: 'acceptable',
      level: '🟡 Aceitável',
      message: 'Funcionando, mas atenção',
      emoji: '🟡'
    };
  }
  if (rx >= -26) {
    return {
      status: 'acceptable',
      level: '🟡 Aceitável',
      message: 'Funcionando, mas atenção',
      emoji: '🟡'
    };
  }
  if (rx >= -28) {
    return {
      status: 'weak',
      level: '🟠 Fraco',
      message: 'Risco de instabilidade',
      emoji: '🟠'
    };
  }
  return {
    status: 'critical',
    level: '🔴 Crítico',
    message: 'Problema grave de sinal',
    emoji: '🔴'
  };
}

/**
 * Interpreta valores de potência TX (Transmissão)
 */
function interpretTX(tx: number): { status: string; level: string; message: string; emoji: string } {
  if (tx > 2) {
    return {
      status: 'critical',
      level: '🔴 Alto demais',
      message: 'Risco de saturação',
      emoji: '🔴'
    };
  }
  if (tx >= 0 && tx <= 1) {
    return {
      status: 'ideal',
      level: '🟢 Ideal',
      message: 'Transmissão perfeita',
      emoji: '🟢'
    };
  }
  if (tx >= -2 && tx < 0) {
    return {
      status: 'acceptable',
      level: '🟡 Aceitável',
      message: 'Funcionando normalmente',
      emoji: '🟡'
    };
  }
  return {
    status: 'low',
    level: '🟠 Baixo',
    message: 'Verificar equipamento',
    emoji: '🟠'
  };
}

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

    // Extrair e interpretar valores de TX/RX
    const rxValue = result.data?.rx ? parseFloat(result.data.rx) : null;
    const txValue = result.data?.tx ? parseFloat(result.data.tx) : null;

    // Verificar se equipamento está offline (TX e RX = 0.00)
    const isOffline = rxValue === 0 && txValue === 0;

    const rxInterpretation = rxValue !== null && !isOffline ? interpretRX(rxValue) : null;
    const txInterpretation = txValue !== null && !isOffline ? interpretTX(txValue) : null;

    // Diagnóstico geral
    let diagnosis = 'Não foi possível obter leitura do sinal';
    let action = 'Verificar conexão com equipamento';
    let equipmentStatus = 'unknown';

    if (isOffline) {
      diagnosis = '🔌 Equipamento OFFLINE detectado (TX: 0.00 / RX: 0.00)';
      action = 'Confirmar problema de ENERGIA - Verificar se equipamento está ligado, fonte de alimentação e cabos de energia';
      equipmentStatus = 'offline';
    } else if (rxInterpretation && txInterpretation) {
      equipmentStatus = 'online';
      if (rxInterpretation.status === 'critical') {
        diagnosis = '⚠️ Problema crítico de sinal detectado';
        action = 'Abrir atendimento URGENTE para inspeção da rede óptica';
      } else if (rxInterpretation.status === 'weak') {
        diagnosis = 'Sinal de recepção fraco detectado';
        action = 'Abrir atendimento para verificar cabo/conector';
      } else if (rxInterpretation.status === 'excellent' && txInterpretation.status === 'ideal') {
        diagnosis = 'Sinal óptico dentro dos padrões ideais';
        action = 'Problema não está relacionado ao sinal - investigar outras causas';
      } else {
        diagnosis = 'Sinal funcionando, mas requer atenção';
        action = 'Monitorar e considerar inspeção preventiva';
      }
    }

    const signalData = {
      clientId,
      timestamp: new Date().toISOString(),
      rawData: result.data,
      equipmentStatus,
      isOffline,
      rx: rxValue !== null ? {
        value: rxValue,
        unit: 'dBm',
        ...rxInterpretation
      } : null,
      tx: txValue !== null ? {
        value: txValue,
        unit: 'dBm',
        ...txInterpretation
      } : null,
      diagnosis,
      recommendedAction: action
    };

    console.log('✅ Dados de sinal obtidos e interpretados:', JSON.stringify(signalData, null, 2));

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
