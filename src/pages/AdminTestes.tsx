import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BackButton } from '@/components/BackButton';
import { 
  FlaskConical, 
  MessageSquare, 
  FileCheck,
  Zap,
  GitBranch,
  AlertTriangle,
  TrendingUp
} from "lucide-react";

// Import test components
import TestSuiteRunner from "@/components/tests/TestSuiteRunner";
import { QAOrchestratorRunner } from "@/components/tests/QAOrchestratorRunner";
import { TestOmnichannelComplete } from "@/components/tests/TestOmnichannelComplete";
import { TestSupportTechAgent } from "@/components/tests/TestSupportTechAgent";
import { TestCPFValidation } from "@/components/tests/TestCPFValidation";
import { TestMediaGuidedFlow } from "@/components/tests/TestMediaGuidedFlow";
import { TestTextReplyContext } from "@/components/tests/TestTextReplyContext";
import { TestContractFlow } from "@/components/TestContractFlow";
import { TestClientFinancialStatus } from "@/components/TestClientFinancialStatus";
import { SendPaymentTest } from "@/components/SendPaymentTest";
import { DiagnosticoClienteCompleto } from "@/components/DiagnosticoClienteCompleto";
import { AutoSendOverdueInvoices } from "@/components/AutoSendOverdueInvoices";
import { MassOutageAlertCard } from "@/components/MassOutageAlertCard";
import { IXCConnectionTester } from "@/components/IXCConnectionTester";
import { IXCFunctionsTester } from "@/components/IXCFunctionsTester";
import { IXCEndpointTester } from "@/components/IXCEndpointTester";
import { TestIXCSubjects } from "@/components/tests/TestIXCSubjects";
import { WhatsAppApiTester } from "@/components/WhatsAppApiTester";
import WhatsAppFlowTest from "@/components/WhatsAppFlowTest";
import { EmailTestSender } from "@/components/EmailTestSender";

const AdminTestes = () => {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <BackButton />
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <FlaskConical className="h-8 w-8 text-primary" />
          Central de Testes
        </h1>
        <p className="text-muted-foreground">
          Execute testes funcionais, de integração e validações do sistema
        </p>
      </div>

      <Accordion type="multiple" className="space-y-4" defaultValue={["qa-orchestrator"]}>
        {/* QA Orchestrator - PR#53 */}
        <AccordionItem value="qa-orchestrator" className="border rounded-lg bg-gradient-to-r from-primary/5 to-primary/10">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold flex items-center gap-2">
                  QA Orchestrator - Suite Expandida
                  <span className="text-xs px-2 py-0.5 bg-primary/20 rounded-full">PR#55 Híbrido</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  61 casos: Wave 1 (edge+linguistic) + Wave 2 (segurança crítica) - Gemini-2.5-pro
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <QAOrchestratorRunner />
          </AccordionContent>
        </AccordionItem>

        {/* LLM QA System - PR#50 (legado) */}
        <AccordionItem value="llm-qa" className="border rounded-lg">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <div className="font-semibold flex items-center gap-2">
                  QA Conversacional LLM (Legado)
                  <span className="text-xs px-2 py-0.5 bg-muted rounded-full">PR#50</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Validação com seleção aleatória de cenários (substituído por PR#53)
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <TestSuiteRunner />
          </AccordionContent>
        </AccordionItem>

        {/* Testes E2E */}
        <AccordionItem value="e2e" className="border rounded-lg">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex items-center gap-3">
              <FlaskConical className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Testes E2E</div>
                <div className="text-sm text-muted-foreground">Testes de ponta a ponta completos</div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  💬 Text Reply With Context (PR #15)
                </CardTitle>
                <CardDescription>
                  Teste do sistema de salvamento automático de perguntas e contexto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TestTextReplyContext />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  🖼️ Mídia Guiada (PR #14)
                </CardTitle>
                <CardDescription>
                  Teste completo do sistema de mídia guiada: persistência, imagens, logging e feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TestMediaGuidedFlow />
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Chat Omnichannel - Cloe + Luan */}
        <AccordionItem value="omnichannel" className="border rounded-lg">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Chat Omnichannel - Cloe + Luan</div>
                <div className="text-sm text-muted-foreground">Simulações de atendimento multicanal</div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  🧪 Chat Completo
                </CardTitle>
                <CardDescription>
                  Teste completo do fluxo: Cloe (routing) + Luan (técnico) com cenários de TX/RX, mass outage e diagnósticos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TestOmnichannelComplete />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Teste Rápido - Suporte Técnico (Luan)</CardTitle>
                <CardDescription>
                  Teste rápido do Luan com mass outage ativo/inativo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TestSupportTechAgent />
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Validação de CPF */}
        <AccordionItem value="cpf" className="border rounded-lg">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex items-center gap-3">
              <FileCheck className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Validação de CPF</div>
                <div className="text-sm text-muted-foreground">Testes de validação e busca de CPF</div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  🔐 Validação Real
                </CardTitle>
                <CardDescription>
                  Teste a validação real de CPF com mascaramento automático (LGPD compliant)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TestCPFValidation />
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Alertas e Diagnósticos */}
        <AccordionItem value="alerts" className="border rounded-lg">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Alertas e Diagnósticos</div>
                <div className="text-sm text-muted-foreground">Alertas massivos e diagnósticos de clientes</div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alerta de Queda Massiva</CardTitle>
                <CardDescription>
                  Gerenciamento de alertas de queda massiva
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MassOutageAlertCard />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Diagnóstico Completo do Cliente</CardTitle>
                <CardDescription>
                  Diagnóstico técnico e financeiro completo de clientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DiagnosticoClienteCompleto />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Envio Automático de Faturas Vencidas</CardTitle>
                <CardDescription>
                  Automação de envio de faturas vencidas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AutoSendOverdueInvoices />
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Fluxos */}
        <AccordionItem value="flows" className="border rounded-lg">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex items-center gap-3">
              <GitBranch className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Fluxos de Negócio</div>
                <div className="text-sm text-muted-foreground">Testes de fluxos operacionais</div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fluxo de Contrato</CardTitle>
                <CardDescription>
                  Teste completo do fluxo de contratos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TestContractFlow />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status Financeiro do Cliente</CardTitle>
                <CardDescription>
                  Valida consulta e exibição de status financeiro
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TestClientFinancialStatus />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Envio de Pagamento</CardTitle>
                <CardDescription>
                  Testa fluxo de envio de links e informações de pagamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SendPaymentTest />
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Integrações */}
        <AccordionItem value="integrations" className="border rounded-lg">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Integrações</div>
                <div className="text-sm text-muted-foreground">Testes de APIs e webhooks externos</div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-4">
            {/* IXC Soft */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-5 w-5" />
                IXC Soft
              </h3>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Testador Unificado de Endpoints</CardTitle>
                    <CardDescription>
                      Teste endpoints principais e GPON do IXC em um único lugar
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <IXCEndpointTester />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Teste de Conexão</CardTitle>
                    <CardDescription>
                      Valida conectividade com a API IXC
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <IXCConnectionTester />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Teste de Todas as Funções</CardTitle>
                    <CardDescription>
                      Executa testes em todas as funções disponíveis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <IXCFunctionsTester />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Teste de Assuntos</CardTitle>
                    <CardDescription>
                      Valida categorização de assuntos do IXC
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TestIXCSubjects />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                WhatsApp
              </h3>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Testador de API</CardTitle>
                    <CardDescription>
                      Valida chamadas à API do WhatsApp (Evolution)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WhatsAppApiTester />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Teste de Fluxo</CardTitle>
                    <CardDescription>
                      Simula fluxos completos de mensagens WhatsApp
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WhatsAppFlowTest />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Email */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Email
              </h3>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Testador de Email</CardTitle>
                  <CardDescription>
                    Testa envio de emails pelo sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EmailTestSender />
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default AdminTestes;
