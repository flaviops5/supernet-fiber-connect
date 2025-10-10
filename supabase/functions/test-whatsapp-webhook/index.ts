import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 Iniciando teste do webhook WhatsApp');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(mockPayload),
    });

    const webhookResult = await webhookResponse.text();
    console.log('📥 Resposta do webhook:', webhookResult);

    // Verificar se a conversa foi criada
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('channel', 'whatsapp')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('💬 Conversas recentes:', conversations);

    return new Response(
      JSON.stringify({
        success: true,
        webhook_status: webhookResponse.status,
        webhook_response: webhookResult,
        recent_conversations: conversations,
        test_payload: mockPayload,
      }, null, 2),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Erro no teste:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
      }, null, 2),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
