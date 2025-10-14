import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export const TestIXCSubjects = () => {
  return (
    <Card className="p-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Este teste busca e exibe os assuntos disponíveis no sistema IXC para abertura de chamados.
        </AlertDescription>
      </Alert>
      
      <div className="mt-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Componente de teste de assuntos IXC será implementado aqui.
        </p>
      </div>
    </Card>
  );
};
