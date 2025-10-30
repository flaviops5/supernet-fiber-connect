import { ChatWidget } from '@/components/e2e/ChatWidget';
import { CustomerAuthStatus } from '@/components/e2e/CustomerAuthStatus';
import { DiagnosticStatus } from '@/components/e2e/DiagnosticStatus';
import { TicketCreated } from '@/components/e2e/TicketCreated';
import { PaymentOptions } from '@/components/e2e/PaymentOptions';
import { ClientStatus } from '@/components/e2e/ClientStatus';
import { PlansList } from '@/components/e2e/PlansList';
import { SignupForm } from '@/components/e2e/SignupForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

/**
 * Página de teste E2E
 * Esta página contém todos os componentes necessários para os testes E2E
 */
const E2ETest = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Componentes E2E</h1>
          <p className="text-muted-foreground">
            Esta página contém todos os componentes com data-testid para testes automatizados
          </p>
        </div>

        {/* Fluxo 1: Login → Diagnóstico → Ticket */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Fluxo 1: Login → Diagnóstico → Ticket</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <CustomerAuthStatus cpf="12345678900" />
            <DiagnosticStatus />
          </div>

          <TicketCreated ticketNumber="123456" />

          <Alert data-testid="error-message" variant="destructive" className="hidden">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao processar solicitação
            </AlertDescription>
          </Alert>
        </section>

        {/* Fluxo 2: Cliente Bloqueado → Pagamento */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Fluxo 2: Cliente Bloqueado → Pagamento</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <ClientStatus status="bloqueado" blockReason="Cliente com inadimplência" />
            <PaymentOptions />
          </div>

          <div data-testid="whatsapp-notification-sent" className="hidden">
            Notificação WhatsApp enviada
          </div>

          <Alert data-testid="payment-error" variant="destructive" className="hidden">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao processar pagamento
            </AlertDescription>
          </Alert>
        </section>

        {/* Fluxo 3: Contrato Novo → Ativação */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Fluxo 3: Contrato Novo → Ativação</h2>
          
          <PlansList />
          <SignupForm />

          <div data-testid="installation-scheduler" className="hidden">
            Agendamento de instalação
          </div>
          
          <div data-testid="contract-number" className="hidden">123456</div>
          <div data-testid="contract-status" className="hidden">Aguardando Instalação</div>
          <div data-testid="service-active" className="hidden">Serviço ativo</div>
          <div data-testid="welcome-message-sent" className="hidden">
            <div data-testid="welcome-message-content">
              Bem-vindo, João da Silva! Seu plano 300 Mega está ativo.
            </div>
          </div>
        </section>

        {/* Chat Widget Flutuante */}
        <ChatWidget />
      </div>
    </div>
  );
};

export default E2ETest;
