import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

// P0 FIX: Convertido para createAuthenticatedHandler
// Notificação de instalações manipula dados sensíveis de clientes
Deno.serve(createAuthenticatedHandler('installation-notify', async (req, { supabase, user }) => {
  const { message, photos } = await req.json();
    
  console.log(`📦 Payload recebido: message=${!!message}, photos=${photos ? photos.length : 0}`);
    
  if (!message) {
    console.error("Mensagem ausente no payload");
    throw new Error("Message is required");
  }

  // Buscar números de notificação da tabela notification_targets
  const { data: targets, error: targetsError } = await supabase
    .from('notification_targets')
    .select('telefone')
    .eq('ativo', true)
    .eq('tipo', 'instalacao');

  if (targetsError || !targets?.length) {
    console.error("Números de notificação não configurados", targetsError);
    throw new Error("Notification targets not configured");
  }

  // Buscar instância WhatsApp (mantido para compatibilidade)
  const { data: settings } = await supabase
    .from('company_settings')
    .select('whatsapp_instance_name')
    .single();

  const instanceName = settings?.whatsapp_instance_name || 'SDR2';
  const phones = targets.map(t => t.telefone);
    
  console.log(`Enviando notificação WhatsApp para ${phones.length} número(s) via instância ${instanceName}`);

  // Buscar credenciais da Evolution API
  const apiKey = Deno.env.get('EVOLUTION_API_KEY');
  const baseUrl = Deno.env.get('EVOLUTION_API_BASE_URL');

  if (!apiKey || !baseUrl) {
    console.error("Credenciais Evolution API não configuradas");
    throw new Error("Evolution API credentials not configured");
  }

  // Normalizar base URL
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');

  // Enviar mensagem para todos os números configurados
  const results = await Promise.all(
    phones.map(async (phone) => {
      try {
        // Enviar mensagem de texto
        const textUrl = `${normalizedBaseUrl}/message/sendText/${instanceName}`;
        console.log(`Enviando mensagem para ${phone}: ${textUrl}`);

        const textResponse = await fetch(textUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": apiKey,
          },
          body: JSON.stringify({
            number: phone,
            text: message,
          }),
        });

        if (!textResponse.ok) {
          const errorText = await textResponse.text();
          console.error(`Falha ao enviar mensagem para ${phone}:`, textResponse.status, errorText);
          return { phone, success: false, error: errorText };
        }

        // Se houver fotos, enviar cada uma
        if (photos && Array.isArray(photos) && photos.length > 0) {
          console.log(`📸 Enviando ${photos.length} foto(s) para ${phone}`);
          
          for (const photoUrl of photos) {
            console.log(`📸 URL da foto: ${photoUrl}`);
            const mediaUrl = `${normalizedBaseUrl}/message/sendMedia/${instanceName}`;
            
            const payload = {
              number: phone,
              mediatype: "image",
              media: photoUrl,
            };
            
            console.log(`📤 Enviando foto para ${mediaUrl}`, JSON.stringify(payload));
            
            const mediaResponse = await fetch(mediaUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": apiKey,
              },
              body: JSON.stringify(payload),
            });

            const responseText = await mediaResponse.text();
            
            if (!mediaResponse.ok) {
              console.error(`❌ Falha ao enviar foto para ${phone}:`, mediaResponse.status, responseText);
            } else {
              console.log(`✅ Foto enviada com sucesso para ${phone}:`, responseText);
            }
          }
        } else {
          console.log(`⚠️ Nenhuma foto para enviar. photos:`, JSON.stringify(photos));
        }

        console.log(`Notificação completa enviada para ${phone}`);
        return { phone, success: true };
      } catch (error) {
        console.error(`Erro ao enviar para ${phone}:`, error);
        return { phone, success: false, error: String(error) };
      }
    })
  );

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  console.log(`Notificações: ${successCount} enviadas, ${failureCount} falhas`);

  return { 
    success: true, 
    results,
    summary: { success: successCount, failure: failureCount }
  };
}));
