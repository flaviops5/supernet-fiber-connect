import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const TestClientFinancialStatus = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkClientStatus = async () => {
    setLoading(true);
    setResult(null);

    try {
      const clientId = "313";
      
      console.log("🔍 Verificando status do cliente IXC:", clientId);

      // 1. Buscar status dos contratos
      const { data: contractsData } = await supabase.functions.invoke('ixc-integration', {
        body: JSON.stringify({
          action: 'getCustomerContracts',
          params: { customerId: clientId }
        })
      });

      console.log("📋 Contratos:", contractsData);

      // 2. Buscar títulos financeiros
      const { data: titlesData } = await supabase.functions.invoke('ixc-integration', {
        body: JSON.stringify({
          action: 'getFinancialTitles',
          params: { customerId: clientId }
        })
      });

      console.log("💰 Títulos financeiros:", titlesData);

      setResult({
        clientId,
        contracts: contractsData?.data || contractsData,
        titles: titlesData?.data || titlesData,
        hasOverdue: (titlesData?.data?.titles || []).length > 0,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error("❌ Erro ao verificar status:", error);
      setResult({
        error: error.message || "Erro desconhecido",
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Teste: Status Financeiro Cliente 313</h3>
        <p className="text-sm text-muted-foreground">
          Cláudio Máximo Chaves - CPF: 619.538.901-30
        </p>
      </div>

      <Button 
        onClick={checkClientStatus} 
        disabled={loading}
        className="w-full"
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Verificar Status Financeiro (Tempo Real)
      </Button>

      {result && (
        <div className="space-y-2">
          <div className="text-sm font-mono bg-muted p-4 rounded-lg overflow-auto max-h-96">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
          
          {result.hasOverdue && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg">
              ⚠️ Cliente possui títulos em atraso
            </div>
          )}
          
          {result.hasOverdue === false && (
            <div className="bg-green-500/10 text-green-600 p-3 rounded-lg">
              ✅ Cliente não possui títulos em atraso
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
