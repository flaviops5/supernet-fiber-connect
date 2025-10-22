import { createPublicHandler } from '../_shared/base-handler.ts';

Deno.serve(createPublicHandler('test-whatsapp-webhook', async (req, { supabase }) => {
  console.log('🧪 Iniciando teste do webhook WhatsApp');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    // Criar payload simulado do Evolution API
    const mockPayload = {
      event: 'messages.upsert',
      instance: 'SDR2',
      data: {
        key: {
          remoteJid: '5561999887766@s.whatsapp.net',
          fromMe: false,
          id: 'TEST_' + Date.now(),
        },
        pushName: 'Cliente Teste',
        message: {
          conversation: 'Olá, gostaria de contratar internet',
        },
        messageType: 'conversation',
        messageTimestamp: Math.floor(Date.now() / 1000),
        instanceId: 'SDR2',
      },
    };

    console.log('📤 Enviando payload de teste:', JSON.stringify(mockPayload, null, 2));

  // Chamar o webhook
  const webhookResponse = await supabase.functions.invoke('whatsapp-webhook', {
    body: mockPayload
  });

  console.log('📥 Resposta do webhook:', webhookResponse);
  
  const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('channel', 'whatsapp')
      .order('created_at', { ascending: false })
      .limit(5);

  console.log('💬 Conversas recentes:', conversations);

  return {
    success: true,
    webhook_response: webhookResponse,
    recent_conversations: conversations,
    test_payload: mockPayload,
  };
}));
