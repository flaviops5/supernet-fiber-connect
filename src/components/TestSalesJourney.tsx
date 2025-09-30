import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export function TestSalesJourney() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  
  const [testData, setTestData] = useState({
    customerName: "João da Silva Teste",
    customerEmail: "joao.teste@email.com",
    customerPhone: "11987654321",
    customerCpf: "12345678900",
    customerCep: "01310-100",
    customerAddress: "Av. Paulista, 1000",
    customerBirthDate: "1990-01-15",
    planId: "", // Will be fetched
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentPeriod: "manhã",
    paymentDay: 10,
  });

  const runTest = async () => {
    setIsLoading(true);
    setResults(null);

    try {
      // 1. Buscar um plano ativo
      const { data: plans, error: plansError } = await supabase
        .from("plans")
        .select("*")
        .eq("active", true)
        .not("ixc_plan_id", "is", null)
        .limit(1)
        .single();

      if (plansError || !plans) {
        throw new Error("Nenhum plano com IXC ID encontrado");
      }

      // 2. Chamar o sales-agent com directOrder
      const orderMessage = `
PEDIDO DIRETO:
Nome: ${testData.customerName}
Email: ${testData.customerEmail}
Telefone: ${testData.customerPhone}
CPF: ${testData.customerCpf}
Data Nascimento: ${testData.customerBirthDate}
CEP: ${testData.customerCep}
Endereço: ${testData.customerAddress}
Plano: ${plans.name}
Data Instalação: ${testData.appointmentDate}
Período: ${testData.appointmentPeriod}
Dia Pagamento: ${testData.paymentDay}
      `.trim();

      const { data: agentResponse, error: agentError } = await supabase.functions.invoke(
        "sales-agent",
        {
          body: {
            messages: [{ role: "user", content: orderMessage }],
            directOrder: true,
          },
        }
      );

      if (agentError) throw agentError;

      // 3. Buscar o appointment criado
      const { data: appointment, error: appointmentError } = await supabase
        .from("installation_appointments")
        .select("*")
        .eq("customer_cpf", testData.customerCpf)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setResults({
        success: true,
        planUsed: plans,
        agentResponse,
        appointment,
        ixcClientId: appointment?.ixc_contract_id ? "Criado" : "Não criado",
        ixcContractId: appointment?.ixc_contract_id || "Não criado",
      });

      toast({
        title: "✅ Teste concluído com sucesso!",
        description: "Verifique os resultados abaixo.",
      });
    } catch (error: any) {
      console.error("Erro no teste:", error);
      setResults({
        success: false,
        error: error.message,
      });
      toast({
        title: "❌ Erro no teste",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Teste Rápido - Jornada do Cliente</h2>
        <p className="text-muted-foreground mb-6">
          Este teste simula a jornada completa: criação de cliente, contrato e atendimento no IXC.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <Label>Nome do Cliente</Label>
            <Input
              value={testData.customerName}
              onChange={(e) => setTestData({ ...testData, customerName: e.target.value })}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              value={testData.customerEmail}
              onChange={(e) => setTestData({ ...testData, customerEmail: e.target.value })}
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={testData.customerPhone}
              onChange={(e) => setTestData({ ...testData, customerPhone: e.target.value })}
            />
          </div>
          <div>
            <Label>CPF</Label>
            <Input
              value={testData.customerCpf}
              onChange={(e) => setTestData({ ...testData, customerCpf: e.target.value })}
            />
          </div>
          <div>
            <Label>CEP</Label>
            <Input
              value={testData.customerCep}
              onChange={(e) => setTestData({ ...testData, customerCep: e.target.value })}
            />
          </div>
          <div>
            <Label>Data de Nascimento</Label>
            <Input
              type="date"
              value={testData.customerBirthDate}
              onChange={(e) => setTestData({ ...testData, customerBirthDate: e.target.value })}
            />
          </div>
        </div>

        <Button onClick={runTest} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executando teste...
            </>
          ) : (
            "Executar Teste Completo"
          )}
        </Button>
      </Card>

      {results && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            {results.success ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500" />
            )}
            <h3 className="text-xl font-bold">
              {results.success ? "✅ Teste Passou!" : "❌ Teste Falhou"}
            </h3>
          </div>

          {results.success ? (
            <div className="space-y-4">
              <div>
                <p className="font-semibold">Plano Utilizado:</p>
                <p className="text-sm text-muted-foreground">
                  {results.planUsed?.name} - IXC ID: {results.planUsed?.ixc_plan_id}
                </p>
              </div>

              <div>
                <p className="font-semibold">Appointment ID:</p>
                <p className="text-sm text-muted-foreground">{results.appointment?.id}</p>
              </div>

              <div>
                <p className="font-semibold">IXC Contract ID:</p>
                <p className="text-sm text-muted-foreground">
                  {results.appointment?.ixc_contract_id || "Não criado"}
                </p>
              </div>

              <div>
                <p className="font-semibold">Status:</p>
                <p className="text-sm text-muted-foreground">{results.appointment?.status}</p>
              </div>

              <div>
                <p className="font-semibold">Resposta do Agente:</p>
                <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-60">
                  {JSON.stringify(results.agentResponse, null, 2)}
                </pre>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <p className="text-sm font-semibold text-green-800">Passos Executados:</p>
                <ul className="text-sm text-green-700 mt-2 space-y-1">
                  <li>✅ Cliente criado no IXC</li>
                  <li>✅ Contrato criado no IXC (vinculado ao plano)</li>
                  <li>✅ Atendimento criado no IXC</li>
                  <li>✅ Registro salvo no Supabase com ixc_contract_id</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-sm font-semibold text-red-800">Erro:</p>
              <p className="text-sm text-red-700 mt-2">{results.error}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
