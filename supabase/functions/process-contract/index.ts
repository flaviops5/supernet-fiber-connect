import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContractRequest {
  customerData: {
    name: string;
    email: string;
    phone: string;
    address: string;
    cep: string;
    cpf: string;
    birthDate: string;
    paymentDay: string;
    observations?: string;
  };
  planData: {
    name: string;
    price: number;
    speed: string;
  };
  timestamp: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerData, planData, timestamp }: ContractRequest = await req.json();

    console.log('Processing contract request:', { customerData, planData });

    // Format message for WhatsApp
    const message = `🔥 *NOVA SOLICITAÇÃO DE CONTRATAÇÃO* 🔥

📋 *DADOS DO CLIENTE:*
👤 Nome: ${customerData.name}
📧 Email: ${customerData.email}
📱 Telefone: ${customerData.phone}
🆔 CPF: ${customerData.cpf}
🎂 Nascimento: ${customerData.birthDate}
📍 CEP: ${customerData.cep}
🏠 Endereço: ${customerData.address}
💳 Melhor dia pagamento: Dia ${customerData.paymentDay}
${customerData.observations ? `📝 Observações: ${customerData.observations}` : ''}

💡 *PLANO ESCOLHIDO:*
🚀 ${planData.name}
⚡ Velocidade: ${planData.speed}
💰 Valor: R$ ${planData.price.toFixed(2).replace('.', ',')}/mês

⏰ *Data/Hora:* ${new Date(timestamp).toLocaleString('pt-BR')}

Entre em contato com o cliente o mais breve possível! 📞`;

    // Send to WhatsApp (you can replace this with your preferred WhatsApp API service)
    // For now, we'll use a direct WhatsApp link that can be opened manually
    const whatsappNumber = "5561992757062"; // WhatsApp number configured
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    
    console.log('WhatsApp URL generated:', whatsappUrl);
    console.log('Message content:', message);

    // Here you could integrate with a WhatsApp Business API service like:
    // - Twilio WhatsApp API
    // - WhatsApp Business Cloud API
    // - Other WhatsApp service providers
    
    // For demonstration, we'll just log the message
    // In production, you would send this via your WhatsApp API service

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Contract request processed successfully',
        whatsappUrl: whatsappUrl
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error processing contract:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process contract request',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);