import { createPublicHandler } from "../_shared/base-handler.ts";
import { createLogger } from '../_shared/logger.ts';

const logger = createLogger('process-contract');

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

Deno.serve(createPublicHandler(
  'process-contract',
  async (req, { supabase }) => {
    const { customerData, planData, timestamp }: ContractRequest = await req.json();

    logger.info('Processing contract request', { 
      customerName: customerData.name,
      planName: planData.name 
    });

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
    const { data: appointmentId, error: dbError } = await supabase.rpc('create_installation_appointment', {
      p_customer_name: customerData.name,
      p_customer_cpf: customerData.cpf,
      p_customer_email: customerData.email,
      p_customer_phone: customerData.phone,
      p_customer_birth_date: customerData.birthDate,
      p_customer_address: customerData.address,
      p_customer_cep: customerData.cep,
      p_plan_name: planData.name,
      p_plan_speed: planData.speed,
      p_plan_price: planData.price,
      p_payment_day: parseInt(customerData.paymentDay),
      p_appointment_date: customerData.appointmentDate,
      p_appointment_period: customerData.appointmentPeriod,
      p_observations: customerData.observations || null,
    });

    if (dbError) {
      logger.error('Database error', { error: dbError });
      throw new Error(`Erro ao salvar agendamento: ${dbError.message}`);
    }

    logger.info('Contract processed successfully', { appointmentId });

    // Enviar email de confirmação
    try {
      const emailPayload = {
        to: customerData.email,
        subject: 'Confirmação de Agendamento - SUPERNET FIBRA',
        html: `
          <h2>Agendamento Confirmado!</h2>
          <p>Olá ${customerData.name},</p>
          <p>Seu agendamento foi realizado com sucesso!</p>
          <h3>Detalhes do Plano:</h3>
          <ul>
            <li><strong>Plano:</strong> ${planData.name}</li>
            <li><strong>Velocidade:</strong> ${planData.speed}</li>
            <li><strong>Valor:</strong> R$ ${planData.price.toFixed(2)}</li>
          </ul>
          <h3>Dados da Instalação:</h3>
          <ul>
            <li><strong>Data:</strong> ${customerData.appointmentDate}</li>
            <li><strong>Período:</strong> ${customerData.appointmentPeriod}</li>
            <li><strong>Endereço:</strong> ${customerData.address}</li>
            <li><strong>CEP:</strong> ${customerData.cep}</li>
          </ul>
          <p>Nossa equipe entrará em contato em breve para confirmar os detalhes.</p>
          <p>Atenciosamente,<br>Equipe SUPERNET FIBRA</p>
        `
      };

      await supabase.functions.invoke('send-locaweb-email', {
        body: emailPayload
      });

      logger.info('Confirmation email sent successfully');
    } catch (emailError) {
      logger.error('Error sending confirmation email', { error: emailError });
      // Não falha o processo se o email falhar
    }

    return {
      success: true,
      appointmentId,
      message: 'Agendamento realizado com sucesso! Você receberá um email de confirmação.',
      customerData: {
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone
      },
      planData: {
        name: planData.name,
        price: planData.price
      },
      appointmentDetails: {
        date: customerData.appointmentDate,
        period: customerData.appointmentPeriod
      }
    };
  }
));
