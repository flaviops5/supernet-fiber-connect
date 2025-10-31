import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BackButton } from '@/components/BackButton';
import { 
  FlaskConical, 
  MessageSquare, 
  FileCheck,
  Zap,
  GitBranch,
  AlertTriangle
} from "lucide-react";

// Import test components
import { TestOmnichannelComplete } from "@/components/tests/TestOmnichannelComplete";
import { TestSupportTechAgent } from "@/components/tests/TestSupportTechAgent";
import { TestCPFValidation } from "@/components/tests/TestCPFValidation";
import { TestMediaGuidedFlow } from "@/components/tests/TestMediaGuidedFlow";
import { TestTextReplyContext } from "@/components/tests/TestTextReplyContext";
import { TestContractFlow } from "@/components/TestContractFlow";
import { TestClientFinancialStatus } from "@/components/TestClientFinancialStatus";
import { SendPaymentTest } from "@/components/SendPaymentTest";
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

      <Accordion type="multiple" className="space-y-4">
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
