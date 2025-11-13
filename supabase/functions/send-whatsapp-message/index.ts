// PR #21 - Edge Function para envio de mensagens WhatsApp via Evolution API

import { createAuthenticatedHandler } from '../_shared/base-handler.ts';

interface SendMessagePayload {
  phone: string;
  message: string;
}

Deno.serve(createAuthenticatedHandler('send-whatsapp-message', async (req, { supabase, user }) => {
  const payload: SendMessagePayload = await req.json();
  const { phone, message } = payload;

  // Validação de entrada
  if (!phone || !message) {
    console.error('❌ Payload inválido:', { phone: !!phone, message: !!message });
    throw new Error('Phone and message are required');
  }

  // Obter credenciais da Evolution API (nomes corretos conforme documentação)
  const evolutionApiBaseUrl = Deno.env.get('EVOLUTION_API_BASE_URL');
  const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
  const evolutionInstance = 'SDR2'; // Hardcoded conforme padrão do sistema

  console.log('🔧 Evolution API Config:', {
    baseUrl: evolutionApiBaseUrl,
    hasApiKey: !!evolutionApiKey,
    instance: evolutionInstance
  });

  if (!evolutionApiBaseUrl || !evolutionApiKey) {
    console.error('❌ Evolution API não configurada');
    throw new Error('Evolution API not configured (missing EVOLUTION_API_BASE_URL or EVOLUTION_API_KEY)');
  }

  // Normalizar URL: remover barras finais e garantir formato correto
  const evolutionApiUrl = evolutionApiBaseUrl.replace(/\/+$/, '').trim();

  // Formatar número de telefone para Evolution API (somente dígitos, E.164 sem "+")
  const number = phone.replace(/\D/g, '');

  // Construir URL completa
  const fullUrl = `${evolutionApiUrl}/message/sendText/${evolutionInstance}`;
  
  console.log('📤 Enviando mensagem WhatsApp:', {
    number,
    messageLength: message.length,
    instance: evolutionInstance,
    url: fullUrl
  });

  // Enviar mensagem via Evolution API
  const evolutionResponse = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': evolutionApiKey
    },
    body: JSON.stringify({
      number,
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
    number,
    messageId: evolutionData.key?.id
  });

  return { 
    success: true, 
    number,
    messageId: evolutionData.key?.id
  };
}));
