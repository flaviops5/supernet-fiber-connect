import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Plus, Edit, Trash2, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlanForm } from "@/components/PlanForm";
import { IXCPlanSelector } from "@/components/IXCPlanSelector";
import { PromptGenerator } from "@/components/PromptGenerator";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

// Importar tipo do PlanForm para compatibilidade
interface PlanFeatureDB {
  text: string;
  icon: string;
  isLink: boolean;
  href?: string;
  order?: number;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  speed: string;
  price: number;
  original_price: number;
  cta_text: string;
  image_url: string;
  ixc_plan_id: string;
  popular: boolean;
  active: boolean;
  display_order: number;
  features: unknown;
  created_at: string;
  updated_at: string;
}

export default function PlanManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      logger.error('Error loading plans', error as Error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const togglePlanActive = async (planId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('plans')
        .update({ active: !currentActive })
        .eq('id', planId);

      if (error) throw error;
      
      setPlans(plans.map(plan => 
        plan.id === planId 
          ? { ...plan, active: !currentActive }
          : plan
      ));
      
      toast.success(`Plano ${!currentActive ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      logger.error('Error updating plan', error as Error);
      toast.error('Erro ao atualizar plano');
    }
  };

  const deletePlan = async (planId: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;
    
    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      
      setPlans(plans.filter(plan => plan.id !== planId));
      toast.success('Plano excluído com sucesso!');
    } catch (error) {
      logger.error('Error deleting plan', error as Error);
      toast.error('Erro ao excluir plano');
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPlan(null);
  };

  const handleSave = () => {
    loadPlans();
    handleCloseForm();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Planos</h1>
          <p className="text-muted-foreground">Configure planos de internet e preços</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Carregando planos...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Planos</h1>
          <p className="text-muted-foreground">Configure planos de internet e preços</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="ixc-plans">Vincular IXC</TabsTrigger>
          <TabsTrigger value="prompt">
            <MessageSquare className="w-4 h-4 mr-2" />
            Prompt do Chatbot
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="plans" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Planos Disponíveis</CardTitle>
              <CardDescription>
                Total de {plans.length} plano{plans.length !== 1 ? 's' : ''} cadastrado{plans.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Nenhum plano cadastrado</p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Plano
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {plans.map((plan) => (
                    <Card key={plan.id} className={`relative ${!plan.active ? 'opacity-50' : ''}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                              <div className="flex gap-4 flex-1">
                              {plan.image_url && (
                                <div className="flex-shrink-0">
                                  <img 
                                    src={plan.image_url} 
                                    alt={plan.name} 
                                    className="w-24 h-24 object-cover rounded-lg border"
                                  />
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                                  {plan.popular && (
                                    <span className="bg-gradient-primary text-primary-foreground px-2 py-1 rounded text-xs font-bold">
                                      POPULAR
                                    </span>
                                  )}
                                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                    plan.active 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {plan.active ? 'Ativo' : 'Inativo'}
                                  </span>
                                </div>
                                <CardDescription className="mb-3">{plan.description}</CardDescription>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium">Velocidade:</span> {plan.speed}
                                  </div>
                                  <div>
                                    <span className="font-medium">Preço:</span> R$ {plan.price?.toFixed(2).replace('.', ',')}
                                    {plan.original_price && (
                                      <span className="text-muted-foreground ml-2 line-through">
                                        R$ {plan.original_price.toFixed(2).replace('.', ',')}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <span className="font-medium">CTA:</span> {plan.cta_text}
                                  </div>
                                </div>
                                {Array.isArray(plan.features) && plan.features.length > 0 && (
                                <div className="mt-3">
                                  <span className="font-medium text-sm">Características:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {(plan.features as PlanFeatureDB[]).slice(0, 3).map((feature, idx: number) => (
                                      <span key={idx} className="bg-muted px-2 py-1 rounded text-xs">
                                        {feature.text}
                                      </span>
                                    ))}
                                    {(plan.features as PlanFeatureDB[]).length > 3 && (
                                      <span className="text-muted-foreground text-xs px-2 py-1">
                                        +{(plan.features as PlanFeatureDB[]).length - 3} mais
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(plan)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant={plan.active ? "outline" : "default"}
                              size="sm"
                              onClick={() => togglePlanActive(plan.id, plan.active)}
                            >
                              {plan.active ? 'Desativar' : 'Ativar'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deletePlan(plan.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="ixc-plans" className="space-y-6">
          <IXCPlanSelector />
        </TabsContent>
        
        <TabsContent value="prompt" className="space-y-6">
          <PromptGenerator />
        </TabsContent>
      </Tabs>

      <PlanForm
        isOpen={showForm}
        onClose={handleCloseForm}
        plan={editingPlan ? {
          ...editingPlan,
          features: Array.isArray(editingPlan.features) ? editingPlan.features as PlanFeatureDB[] : []
        } : undefined}
        onSave={handleSave}
      />
    </div>
  );
}
