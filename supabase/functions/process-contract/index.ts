import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    appointmentDate: string;
    appointmentPeriod: string;
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

    // Criar conexão com Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Salvar agendamento no banco de dados
    const { data: appointment, error: dbError } = await supabase
      .from('installation_appointments')
      .insert({
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_phone: customerData.phone,
        customer_cpf: customerData.cpf,
        customer_address: customerData.address,
        customer_cep: customerData.cep,
        customer_birth_date: customerData.birthDate,
        payment_day: parseInt(customerData.paymentDay),
        plan_name: planData.name,
        plan_speed: planData.speed,
        plan_price: planData.price,
        appointment_date: customerData.appointmentDate,
        appointment_period: customerData.appointmentPeriod,
        observations: customerData.observations || null,
        status: 'pendente'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Erro ao salvar agendamento no banco de dados');
    }

    console.log('Appointment saved:', appointment);

    // Format message for WhatsApp
    const periodText = customerData.appointmentPeriod === 'manha' ? 'Manhã (08h-12h)' : 'Tarde (13h-17h)';
    const appointmentDateFormatted = new Date(customerData.appointmentDate).toLocaleDateString('pt-BR');
    
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

💡 *PLANO ESCOLHIDO:*
🚀 ${planData.name}
⚡ Velocidade: ${planData.speed}
💰 Valor: R$ ${planData.price.toFixed(2).replace('.', ',')}/mês

📅 *AGENDAMENTO DE INSTALAÇÃO:*
🗓️ Data: ${appointmentDateFormatted}
⏰ Período: ${periodText}

${customerData.observations ? `📝 *Observações:* ${customerData.observations}` : ''}

⏰ *Solicitação:* ${new Date(timestamp).toLocaleString('pt-BR')}
🆔 *ID Agendamento:* ${appointment.id}

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
        appointmentId: appointment.id,
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