import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, PlayCircle } from 'lucide-react';
import ContractSigning from './ContractSigning';

export const TestContractFlow = () => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractData, setContractData] = useState<any>(null);

  const simulateConversation = async () => {
    setIsSimulating(true);
    toast.info('Iniciando simulação do fluxo de vendas...');

    try {
      // Dados de teste
      const testData = {
        customer_name: 'João Silva Teste',
        customer_cpf: '12345678900',
        customer_email: 'joao.teste@email.com',
        customer_phone: '61999887766',
        customer_birth_date: '1990-05-15',
        customer_address: 'QNM 38 Conjunto H Casa 25, Ceilândia Sul',
        customer_cep: '72215080',
        plan_id: '04d598a9-f89e-45db-a5fc-d5e7426c7bf1', // Plano Piloto
        payment_day: 10,
        installation_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        installation_period: 'manha'
      };

      toast.info('Criando appointment de teste...');

      // Simula a criação do appointment através da tool do agente
      const messages = [
        {
          role: 'assistant',
          content: 'Simulação iniciada'
        },
        {
          role: 'user',
          content: '70630902' // CEP
        },
        {
          role: 'assistant',
          content: 'CEP verificado, escolha um plano'
        },
        {
          role: 'user',
          content: 'Plano Piloto'
        }
      ];

      // Chama o sales-agent com a tool create_installation_order
      const { data: agentResponse, error: agentError } = await supabase.functions.invoke('sales-agent', {
        body: {
          messages: [
            ...messages,
            {
              role: 'assistant',
              content: 'Coletando dados',
              tool_calls: [{
                id: 'test_call',
                type: 'function',
                function: {
                  name: 'create_installation_order',
                  arguments: JSON.stringify(testData)
                }
              }]
            }
          ],
          userContext: {
            timestamp: new Date().toISOString(),
            test: true
          }
        }
      });

      if (agentError) {
        console.error('Erro ao chamar sales-agent:', agentError);
        
        // Tenta criar o appointment diretamente
        toast.info('Criando appointment diretamente...');
        
        const { data: plan } = await supabase
          .from('plans')
          .select('*')
          .eq('id', testData.plan_id)
          .single();

        if (!plan) {
          throw new Error('Plano não encontrado');
        }

        const { data: appointment, error: appointmentError } = await supabase
          .from('installation_appointments')
          .insert({
            customer_name: testData.customer_name,
            customer_cpf: testData.customer_cpf,
            customer_email: testData.customer_email,
            customer_phone: testData.customer_phone,
            customer_birth_date: testData.customer_birth_date,
            customer_address: testData.customer_address,
            customer_cep: testData.customer_cep,
            plan_name: plan.name,
            plan_speed: plan.speed,
            plan_price: plan.price,
            payment_day: testData.payment_day,
            appointment_date: testData.installation_date,
            appointment_period: testData.installation_period,
            status: 'pendente',
            observations: 'Appointment de teste - Simulação'
          })
          .select()
          .single();

        if (appointmentError) throw appointmentError;

        // Prepara dados para o contrato
        setContractData({
          appointmentId: appointment.id,
          customerData: {
            name: testData.customer_name,
            cpf: testData.customer_cpf,
            email: testData.customer_email,
            phone: testData.customer_phone,
            birthDate: testData.customer_birth_date,
            address: testData.customer_address,
            cep: testData.customer_cep,
          },
          planData: {
            id: plan.id,
            name: plan.name,
            speed: plan.speed,
            price: plan.price,
          },
          paymentDay: testData.payment_day,
          installationDate: testData.installation_date,
          installationPeriod: testData.installation_period,
        });

        toast.success('Appointment criado! Abrindo modal de contrato...');
        setShowContractModal(true);
        return;
      }

      // Se o agente respondeu, busca o appointment criado
      if (agentResponse?.tool_results) {
        const orderResult = agentResponse.tool_results.find(
          (result: any) => result.name === 'create_installation_order'
        );

        if (orderResult) {
          const resultContent = JSON.parse(orderResult.content);
          
          if (resultContent.success && resultContent.appointment_id) {
            toast.info('Buscando dados do appointment...');

            const { data: appointment } = await supabase
              .from('installation_appointments')
              .select('*')
              .eq('id', resultContent.appointment_id)
              .single();

            if (appointment) {
              const { data: plan } = await supabase
                .from('plans')
                .select('*')
                .eq('name', appointment.plan_name)
                .single();

              if (plan) {
                setContractData({
                  appointmentId: appointment.id,
                  customerData: {
                    name: appointment.customer_name,
                    cpf: appointment.customer_cpf,
                    email: appointment.customer_email,
                    phone: appointment.customer_phone,
                    birthDate: appointment.customer_birth_date,
                    address: appointment.customer_address,
                    cep: appointment.customer_cep,
                  },
                  planData: {
                    id: plan.id,
                    name: plan.name,
                    speed: plan.speed,
                    price: plan.price,
                  },
                  paymentDay: appointment.payment_day,
                  installationDate: appointment.appointment_date,
                  installationPeriod: appointment.appointment_period,
                });

                toast.success('Simulação concluída! Abrindo modal de contrato...');
                setShowContractModal(true);
              }
            }
          }
        }
      }

    } catch (error: any) {
      console.error('Erro na simulação:', error);
      toast.error('Erro na simulação: ' + error.message);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <>
      {contractData && (
        <ContractSigning
          isOpen={showContractModal}
          onClose={() => {
            setShowContractModal(false);
            setContractData(null);
          }}
          appointmentId={contractData.appointmentId}
          customerData={contractData.customerData}
          planData={contractData.planData}
          appointmentDate={contractData.installationDate}
          appointmentPeriod={contractData.installationPeriod}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Testar Fluxo de Contrato</CardTitle>
          <CardDescription>
            Simula uma conversa completa com o agente de vendas e abre o modal de assinatura de contrato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={simulateConversation}
            disabled={isSimulating}
            size="lg"
            className="w-full"
          >
            {isSimulating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Simulando conversa...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Simular Conversa e Abrir Contrato
              </>
            )}
          </Button>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">O que será testado:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Criação de appointment de teste</li>
              <li>Geração de contrato com dados simulados</li>
              <li>Abertura do modal de assinatura</li>
              <li>Fluxo completo de validação e assinatura</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </>
  );
};