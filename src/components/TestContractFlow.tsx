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
    toast.info('Criando appointment de teste...');

    try {
      // Busca um plano ativo
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .order('display_order')
        .limit(1)
        .single();

      if (planError || !plan) {
        throw new Error('Nenhum plano ativo encontrado');
      }

      // Dados de teste
      const installationDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // Cria o appointment diretamente
      const { data: appointment, error: appointmentError } = await supabase
        .from('installation_appointments')
        .insert({
          customer_name: 'João Silva Teste',
          customer_cpf: '12345678900',
          customer_email: 'joao.teste@email.com',
          customer_phone: '61999887766',
          customer_birth_date: '1990-05-15',
          customer_address: 'QNM 38 Conjunto H Casa 25, Ceilândia Sul',
          customer_cep: '72215080',
          plan_name: plan.name,
          plan_speed: plan.speed,
          plan_price: plan.price,
          payment_day: 10,
          appointment_date: installationDate,
          appointment_period: 'manha',
          status: 'pendente',
          observations: 'Appointment de teste - Simulação do fluxo de contrato'
        })
        .select()
        .single();

      if (appointmentError) {
        console.error('Erro ao criar appointment:', appointmentError);
        throw new Error('Erro ao criar appointment: ' + appointmentError.message);
      }

      toast.success('Appointment criado com sucesso!');

      // Prepara dados para o contrato
      setContractData({
        appointmentId: appointment.id,
        customerData: {
          name: 'João Silva Teste',
          cpf: '12345678900',
          email: 'joao.teste@email.com',
          phone: '61999887766',
          birthDate: '1990-05-15',
          address: 'QNM 38 Conjunto H Casa 25, Ceilândia Sul',
          cep: '72215080',
        },
        planData: {
          id: plan.id,
          name: plan.name,
          speed: plan.speed,
          price: plan.price,
        },
        paymentDay: 10,
        installationDate: installationDate,
        installationPeriod: 'manha',
      });

      toast.success('Abrindo modal de contrato...');
      setShowContractModal(true);

    } catch (error: any) {
      console.error('Erro na simulação:', error);
      toast.error('Erro na simulação: ' + (error.message || 'Erro desconhecido'));
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