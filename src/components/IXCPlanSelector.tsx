import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { parseError } from "@/types/error.types";

interface IXCPlan {
  id: string;
  name: string;
  download?: string;
  upload?: string;
  price?: number;
  type?: string;
}

export const IXCPlanSelector = () => {
  const [ixcPlans, setIxcPlans] = useState<IXCPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const { toast } = useToast();

  const loadIXCPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ixc-list-plans');

      if (error) throw error;

      if (data.success && data.plans) {
        setIxcPlans(data.plans);
        toast({
          title: "Planos IXC carregados",
          description: `${data.plans.length} planos encontrados no IXC.`,
        });
      } else {
        throw new Error(data.error || 'Erro ao carregar planos do IXC');
      }
    } catch (error) {
      const err = parseError(error);
      console.error('Error loading IXC plans:', err);
      toast({
        title: "Erro ao carregar planos do IXC",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncSelectedPlans = async () => {
    if (selectedPlanIds.length === 0) {
      toast({
        title: "Selecione ao menos um plano",
        description: "Você precisa selecionar ao menos um plano do IXC para sincronizar.",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ixc-sync-plans', {
        body: { planIds: selectedPlanIds }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Planos sincronizados com sucesso",
          description: `${data.synced} plano(s) sincronizado(s). ${data.errors > 0 ? `${data.errors} erro(s).` : ''}`,
        });
        setSelectedPlanIds([]);
      } else {
        throw new Error(data.error || 'Erro ao sincronizar planos');
      }
    } catch (error) {
      const err = parseError(error);
      console.error('Error syncing plans:', err);
      toast({
        title: "Erro ao sincronizar planos",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const togglePlanSelection = (planId: string) => {
    setSelectedPlanIds(prev => 
      prev.includes(planId) 
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
  };

  const selectAllPlans = () => {
    if (selectedPlanIds.length === ixcPlans.length) {
      setSelectedPlanIds([]);
    } else {
      setSelectedPlanIds(ixcPlans.map(p => p.id));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Sincronizar Planos do IXC
        </CardTitle>
        <CardDescription>
          Busque e sincronize planos do IXC com o sistema. Os planos sincronizados ficarão disponíveis na aba "Planos" para configuração.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Button onClick={loadIXCPlans} disabled={loading} variant="outline" className="flex-1">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Buscar Planos do IXC
              </>
            )}
          </Button>
          {ixcPlans.length > 0 && (
            <Button 
              onClick={syncSelectedPlans} 
              disabled={syncing || selectedPlanIds.length === 0}
              className="flex-1"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Sincronizar Selecionados ({selectedPlanIds.length})
                </>
              )}
            </Button>
          )}
        </div>

        {ixcPlans.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {ixcPlans.length} plano(s) encontrado(s)
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={selectAllPlans}
              >
                {selectedPlanIds.length === ixcPlans.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {ixcPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => togglePlanSelection(plan.id)}
                >
                  <Checkbox
                    checked={selectedPlanIds.includes(plan.id)}
                    onCheckedChange={() => togglePlanSelection(plan.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{plan.name}</h4>
                      {plan.type && (
                        <Badge variant="outline" className="text-xs">
                          {plan.type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      {plan.download && plan.upload && (
                        <span>
                          ⬇️ {plan.download} / ⬆️ {plan.upload}
                        </span>
                      )}
                      {plan.price && (
                        <span>
                          R$ {plan.price.toFixed(2)}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ID: {plan.id}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {ixcPlans.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Clique em "Buscar Planos do IXC" para carregar os planos disponíveis</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
