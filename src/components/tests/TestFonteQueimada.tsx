import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export const TestFonteQueimada = () => {
  return (
    <Card className="p-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Este teste simula o diagnóstico e tratamento de equipamentos com fonte queimada,
          incluindo verificação de conectividade e recomendações de ação.
        </AlertDescription>
      </Alert>
      
      <div className="mt-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Componente de teste de fonte queimada será implementado aqui.
        </p>
      </div>
    </Card>
  );
};
