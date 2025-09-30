import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, DollarSign, Link2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface IXCPlan {
  id: string;
  descricao: string;
  valor?: string;
  download?: string;
  upload?: string;
}

interface LocalPlan {
  id: string;
  name: string;
  speed: string;
  price: number;
  ixc_plan_id?: string;
}

export const IXCPlanSelector = () => {
  const [ixcPlans, setIxcPlans] = useState<IXCPlan[]>([]);
  const [localPlans, setLocalPlans] = useState<LocalPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIXCPlan, setSelectedIXCPlan] = useState<string>("");
  const [selectedLocalPlan, setSelectedLocalPlan] = useState<string>("");
  const { toast } = useToast();

  const loadIXCPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ixc-list-contracts', {
        body: { page: 1, rp: 100, search: searchTerm }
      });

      if (error) throw error;

      if (data.success) {
        setIxcPlans(data.contracts || []);
        toast({
          title: "Planos IXC carregados",
          description: `${data.contracts?.length || 0} planos encontrados.`,
        });
      } else {
        throw new Error(data.error || 'Erro ao carregar planos do IXC');
      }
    } catch (error: any) {
      console.error('Error loading IXC plans:', error);
      toast({
        title: "Erro ao carregar planos do IXC",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLocalPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('id, name, speed, price, ixc_plan_id')
        .order('display_order');

      if (error) throw error;
      setLocalPlans(data || []);
    } catch (error) {
      console.error('Error loading local plans:', error);
      toast({
        title: "Erro ao carregar planos locais",
        description: "Não foi possível carregar os planos do banco de dados.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadLocalPlans();
  }, []);

  const linkPlans = async () => {
    if (!selectedIXCPlan || !selectedLocalPlan) {
      toast({
        title: "Selecione ambos os planos",
        description: "Você precisa selecionar um plano do IXC e um plano local.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('plans')
        .update({ ixc_plan_id: selectedIXCPlan })
        .eq('id', selectedLocalPlan);

      if (error) throw error;

      toast({
        title: "Planos vinculados",
        description: "O plano local foi vinculado ao plano do IXC com sucesso.",
      });

      setSelectedIXCPlan("");
      setSelectedLocalPlan("");
      loadLocalPlans();
    } catch (error: any) {
      console.error('Error linking plans:', error);
      toast({
        title: "Erro ao vincular planos",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createPlanFromIXC = async () => {
    if (!selectedIXCPlan) {
      toast({
        title: "Selecione um plano do IXC",
        description: "Você precisa selecionar um plano do IXC primeiro.",
        variant: "destructive",
      });
      return;
    }

    const ixcPlan = ixcPlans.find(p => p.id === selectedIXCPlan);
    if (!ixcPlan) return;

    try {
      const { error } = await supabase
        .from('plans')
        .insert({
          name: ixcPlan.descricao,
          speed: ixcPlan.download ? `${ixcPlan.download} Mega` : 'N/A',
          price: ixcPlan.valor ? parseFloat(ixcPlan.valor) : 0,
          original_price: ixcPlan.valor ? parseFloat(ixcPlan.valor) * 1.2 : 0,
          description: `Plano ${ixcPlan.descricao} com velocidade de ${ixcPlan.download || 'N/A'}`,
          ixc_plan_id: ixcPlan.id,
          active: true,
          popular: false,
          display_order: 0,
          features: []
        });

      if (error) throw error;

      toast({
        title: "Plano criado",
        description: "Novo plano criado e vinculado ao IXC com sucesso.",
      });

      setSelectedIXCPlan("");
      loadLocalPlans();
    } catch (error: any) {
      console.error('Error creating plan:', error);
      toast({
        title: "Erro ao criar plano",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getLinkedIXCPlanName = (ixcPlanId: string | null | undefined) => {
    if (!ixcPlanId) return null;
    const plan = ixcPlans.find(p => p.id === ixcPlanId);
    return plan ? plan.descricao : `ID: ${ixcPlanId}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Vincular Planos do IXC
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar planos no IXC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button onClick={loadIXCPlans} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                "Buscar Planos IXC"
              )}
            </Button>
          </div>

          {ixcPlans.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-2 block">Plano do IXC</label>
                <Select value={selectedIXCPlan} onValueChange={setSelectedIXCPlan}>
                  <SelectTrigger className="bg-background z-50">
                    <SelectValue placeholder="Selecione um plano do IXC" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {ixcPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{plan.descricao}</span>
                          <span className="text-xs text-muted-foreground">
                            {plan.download ? `↓ ${plan.download}` : ''} 
                            {plan.valor ? ` - R$ ${parseFloat(plan.valor).toFixed(2)}` : ''}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Plano Local (opcional)</label>
                <Select value={selectedLocalPlan} onValueChange={setSelectedLocalPlan}>
                  <SelectTrigger className="bg-background z-50">
                    <SelectValue placeholder="Selecione um plano local existente" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {localPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{plan.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {plan.speed} - R$ {plan.price.toFixed(2)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {ixcPlans.length > 0 && (
            <div className="flex gap-2">
              <Button 
                onClick={linkPlans} 
                disabled={!selectedIXCPlan || !selectedLocalPlan}
                className="flex-1"
              >
                <Link2 className="w-4 h-4 mr-2" />
                Vincular Planos
              </Button>
              <Button 
                onClick={createPlanFromIXC} 
                disabled={!selectedIXCPlan}
                variant="outline"
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Novo Plano
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Planos Locais Vinculados</CardTitle>
        </CardHeader>
        <CardContent>
          {localPlans.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum plano local encontrado. Crie planos na seção "Planos" primeiro.
            </p>
          ) : (
            <div className="space-y-3">
              {localPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{plan.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="w-3 h-3" />
                      <span>{plan.speed} - R$ {plan.price.toFixed(2)}</span>
                    </div>
                  </div>
                  <div>
                    {plan.ixc_plan_id ? (
                      <Badge variant="default" className="flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        IXC: {getLinkedIXCPlanName(plan.ixc_plan_id) || plan.ixc_plan_id}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Não vinculado</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
