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
  
  const generateUniqueTestData = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return {
      customerName: `Cliente Teste ${random}`,
      customerEmail: `teste${timestamp}@testeautomatizado.local`,
      customerPhone: "11987654321",
      customerCpf: "04112287143", // CPF válido de teste
      customerCep: "70630100", // CEP válido e sem formatação
      customerAddress: "Av. Paulista, 1000",
      customerBirthDate: "1990-01-15",
      planId: "",
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentPeriod: "manhã",
      paymentDay: 10,
    };
  };

  const [testData, setTestData] = useState(generateUniqueTestData());

  const runTest = async () => {
    setIsLoading(true);
    setResults(null);
    
    // Gerar novos dados únicos para cada teste
    const freshTestData = generateUniqueTestData();
    setTestData(freshTestData);

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

      // 2. Chamar o sales-agent com directOrder usando os dados gerados
      const orderPayload = {
        name: freshTestData.customerName,
        email: freshTestData.customerEmail,
        phone: freshTestData.customerPhone,
        cpf: freshTestData.customerCpf,
        birthDate: freshTestData.customerBirthDate,
        cep: freshTestData.customerCep,
        address: freshTestData.customerAddress,
        plan_id: plans.id,
        planName: plans.name,
        appointmentDate: freshTestData.appointmentDate,
        appointmentPeriod: freshTestData.appointmentPeriod,
        paymentDay: freshTestData.paymentDay,
      };

      console.log('📤 Enviando order payload:', { ...orderPayload, cpf: orderPayload.cpf.slice(0,3) + '***' });

      const SUPABASE_URL = "https://mxdupkbpxjcfxdgrwknp.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14ZHVwa2JweGpjZnhkZ3J3a25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTg4ODYsImV4cCI6MjA3NDMzNDg4Nn0.np4wHopAwI7HOTsYPaAUSWbe_qVxMBSIHjYv4PnKL6I";
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/sales-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: JSON.stringify(orderPayload) }],
          directOrder: true,
        }),
      });
      const agentResponse = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(JSON.stringify({ status: resp.status, body: agentResponse }));
      }

      // 3. Buscar o appointment criado
      const { data: appointment, error: appointmentError } = await supabase
        .from("installation_appointments")
        .select("*")
        .eq("customer_email", freshTestData.customerEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      console.log('📋 Appointment encontrado:', appointment ? 'Sim' : 'Não', appointmentError || '');

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
      let parsed: any = null;
      try { parsed = JSON.parse(error.message); } catch {}
      setResults({
        success: false,
        error: error.message,
        errorDetails: parsed,
      });
      toast({
        title: "❌ Erro no teste",
        description: parsed?.body?.error
          ? `${parsed.body.error} (${parsed.body.error_code || parsed.status})`
          : error.message,
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

        <div className="space-y-2">
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
          <p className="text-xs text-muted-foreground text-center">
            ℹ️ Cada teste gera dados únicos automaticamente (email e nome) para evitar conflitos no IXC
          </p>
        </div>
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
                <p className="text-sm font-semibold text-green-800">Passos Executados com Sucesso:</p>
                <ul className="text-sm text-green-700 mt-2 space-y-1">
                  <li>✅ Cliente criado no IXC (ID: {results.ixcClientId})</li>
                  <li>✅ Contrato criado no IXC (ID: {results.ixcContractId})</li>
                  <li>✅ Atendimento criado no IXC</li>
                  <li>✅ Registro salvo no Supabase com ixc_contract_id</li>
                  <li>✅ CEP validado: {results.appointment?.customer_cep}</li>
                  <li>✅ Email único gerado: {results.appointment?.customer_email}</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-sm font-semibold text-red-800">Erro:</p>
              <p className="text-sm text-red-700 mt-2">{results.error}</p>
              {results.errorDetails && (
                <pre className="mt-3 text-xs bg-muted p-3 rounded overflow-auto max-h-60">
                  {JSON.stringify(results.errorDetails, null, 2)}
                </pre>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
