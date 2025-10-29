// PR #21 - Edge Function para envio de mensagens WhatsApp via Evolution API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessagePayload {
  phone: string;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: SendMessagePayload = await req.json();
    const { phone, message } = payload;

    // Validação de entrada
    if (!phone || !message) {
      console.error('❌ Payload inválido:', { phone: !!phone, message: !!message });
      return new Response(
        JSON.stringify({ error: 'Phone and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter credenciais da Evolution API (nomes corretos conforme documentação)
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_BASE_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
    const evolutionInstance = 'SDR2'; // Hardcoded conforme padrão do sistema

    if (!evolutionApiUrl || !evolutionApiKey) {
      console.error('❌ Evolution API não configurada');
      return new Response(
        JSON.stringify({ error: 'Evolution API not configured (missing EVOLUTION_API_BASE_URL or EVOLUTION_API_KEY)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatar número de telefone (remover caracteres não numéricos)
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;

    console.log('📤 Enviando mensagem WhatsApp:', {
      phone: formattedPhone,
      messageLength: message.length,
      instance: evolutionInstance
    });

    // Enviar mensagem via Evolution API
    const evolutionResponse = await fetch(`${evolutionApiUrl}/message/sendText/${evolutionInstance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message
      })
    });

    if (!evolutionResponse.ok) {
      const errorText = await evolutionResponse.text();
      console.error('❌ Evolution API error:', {
        status: evolutionResponse.status,
        error: errorText
      });
      throw new Error(`Evolution API error: ${evolutionResponse.status} - ${errorText}`);
    }

    const evolutionData = await evolutionResponse.json();
    console.log('✅ Mensagem enviada com sucesso:', {
      phone: formattedPhone,
      messageId: evolutionData.key?.id
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        phone: formattedPhone,
        messageId: evolutionData.key?.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
