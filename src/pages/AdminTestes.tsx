import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { FlaskConical, Plug, GitBranch, Activity } from "lucide-react";
import { TestOmnichannelComplete } from "@/components/tests/TestOmnichannelComplete";
import { TestSupportTechAgent } from "@/components/tests/TestSupportTechAgent";
import { TestCPFValidation } from "@/components/tests/TestCPFValidation";
import { TestMediaGuidedFlow } from "@/components/tests/TestMediaGuidedFlow";
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <FlaskConical className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Central de Testes</h1>
          <p className="text-muted-foreground">
            Testes e simulações para validação do sistema
          </p>
        </div>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="simulations" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="simulations" className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Simulações Completas
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Plug className="h-4 w-4" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="flows" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Fluxos
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Health Checks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simulations" className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">🖼️ Teste E2E - Mídia Guiada (PR #14)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Teste completo do sistema de mídia guiada: persistência, imagens, logging e feedback
              </p>
              <TestMediaGuidedFlow />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">🧪 Chat Omnichannel - Cloe + Luan</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Teste completo do fluxo: Cloe (routing) + Luan (técnico) com cenários de TX/RX, mass outage e diagnósticos
              </p>
              <TestOmnichannelComplete />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">🔐 Validação de CPF</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Teste a validação real de CPF com mascaramento automático (LGPD compliant)
              </p>
              <TestCPFValidation />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Teste Rápido - Suporte Técnico</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Teste rápido do Luan com mass outage ativo/inativo
              </p>
              <TestSupportTechAgent />
            </div>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <Tabs defaultValue="ixc" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="ixc">IXC Soft</TabsTrigger>
                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
              </TabsList>

              <TabsContent value="ixc" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Testador Unificado de Endpoints</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Teste endpoints principais e GPON do IXC em um único lugar
                  </p>
                  <IXCEndpointTester />
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Teste de Conexão IXC</h3>
                  <IXCConnectionTester />
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Teste de Todas as Funções IXC</h3>
                  <IXCFunctionsTester />
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Teste de Assuntos IXC</h3>
                  <TestIXCSubjects />
                </div>
              </TabsContent>

              <TabsContent value="whatsapp" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Testador de API WhatsApp</h3>
                  <WhatsAppApiTester />
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Teste de Fluxo WhatsApp</h3>
                  <WhatsAppFlowTest />
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Testador de Email</h3>
                  <EmailTestSender />
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="flows" className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Teste de Fluxo de Contrato</h3>
              <TestContractFlow />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Teste de Status Financeiro do Cliente</h3>
              <TestClientFinancialStatus />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Teste de Envio de Pagamento</h3>
              <SendPaymentTest />
            </div>
          </TabsContent>

          <TabsContent value="health" className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Testador Unificado de Endpoints IXC</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Health check dos endpoints principais e GPON
              </p>
              <IXCEndpointTester />
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default AdminTestes;
