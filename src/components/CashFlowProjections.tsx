import { Card, CardContent } from "@/components/ui/card";
import { Activity } from "lucide-react";

export const CashFlowProjections = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Projeções de Fluxo de Caixa</h3>
        <p className="text-sm text-muted-foreground">
          Análise em 3 cenários
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Activity className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Funcionalidade Desabilitada</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Esta funcionalidade requer tabelas de banco de dados que ainda não foram criadas.
            Contate o administrador para configurar as tabelas necessárias.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
