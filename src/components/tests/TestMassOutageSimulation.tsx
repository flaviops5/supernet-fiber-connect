import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

export function TestMassOutageSimulation() {
  const [loading, setLoading] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const activateMassOutage = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("simulate-mass-outage", {
        body: { action: "activate" }
      });

      if (error) throw error;

      setIsActive(true);
      toast.success("🚨 Modo de pane massiva ATIVADO", {
        description: "Região: Taguatinga e Samambaia - 1542 clientes afetados"
      });
    } catch (error: any) {
      toast.error("Erro ao ativar simulação", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const deactivateMassOutage = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("simulate-mass-outage", {
        body: { action: "deactivate" }
      });

      if (error) throw error;

      setIsActive(false);
      toast.success("✅ Modo de pane massiva DESATIVADO", {
        description: "Sistema voltou ao normal"
      });
    } catch (error: any) {
      toast.error("Erro ao desativar simulação", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Simulação de Pane Massiva
        </CardTitle>
        <CardDescription>
          Ative/desative o modo de pane massiva para testar o comportamento do routing-agent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="font-medium">Status Atual</p>
            <p className="text-sm text-muted-foreground">
              {isActive ? "🚨 Pane ativa" : "✅ Sistema normal"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={isActive ? "outline" : "destructive"}
              disabled={loading || isActive}
              onClick={activateMassOutage}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4 mr-2" />
              )}
              Ativar Pane
            </Button>
            <Button
              variant={!isActive ? "outline" : "default"}
              disabled={loading || !isActive}
              onClick={deactivateMassOutage}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Desativar
            </Button>
          </div>
        </div>

        <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
          <p className="font-medium">ℹ️ Como testar:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Clique em "Ativar Pane" para simular uma queda em massa</li>
            <li>Inicie uma conversa no WhatsApp ou sistema</li>
            <li>A Cloé deve detectar a pane e informar automaticamente</li>
            <li>Clique em "Desativar" para voltar ao comportamento normal</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
