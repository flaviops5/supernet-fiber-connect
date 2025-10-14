import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export const TestSimulacaoCompleta = () => {
  return (
    <Card className="p-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Este teste simula um atendimento completo do cliente, desde a identificação até a resolução do problema.
          Inclui busca no IXC, verificação de status financeiro, e criação de tickets.
        </AlertDescription>
      </Alert>
      
      <div className="mt-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Componente de simulação completa será implementado aqui.
        </p>
      </div>
    </Card>
  );
};
