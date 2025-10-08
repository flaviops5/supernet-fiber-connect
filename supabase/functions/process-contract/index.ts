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

    // Buscar plano pelo nome para obter o ID
    const { data: plan } = await supabase
      .from('plans')
      .select('id')
      .eq('name', planData.name)
      .maybeSingle();

    if (!plan) {
      throw new Error('Plano não encontrado');
    }

    // Salvar agendamento usando RPC seguro
    const addressParts = customerData.address.split(',').map((s: string) => s.trim());
    const { data: appointmentId, error: dbError } = await supabase.rpc('create_installation_appointment', {
      p_customer_name: customerData.name,
      p_customer_cpf: customerData.cpf,
      p_customer_email: customerData.email,
      p_customer_phone: customerData.phone,
      p_customer_birthdate: customerData.birthDate,
      p_address_street: addressParts[0] || customerData.address,
      p_address_number: addressParts[1] || '',
      p_address_complement: addressParts[2] || '',
      p_address_neighborhood: addressParts[3] || '',
      p_address_city: addressParts[4] || '',
      p_address_state: addressParts[5] || '',
      p_address_zipcode: customerData.cep,
      p_plan_id: plan.id,
      p_plan_name: planData.name,
      p_plan_speed: planData.speed,
      p_plan_price: planData.price,
      p_installation_date: customerData.appointmentDate,
      p_installation_period: customerData.appointmentPeriod,
      p_ixc_contract_id: null,
      p_contract_number: null
    });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Erro ao salvar agendamento no banco de dados');
    }

    console.log('Appointment saved with ID:', appointmentId);

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
🆔 *ID Agendamento:* ${appointmentId}

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
        appointmentId: appointmentId,
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