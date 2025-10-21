import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Clock, FileText, MessageSquare, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface ConversationMessage {
  role: "customer" | "agent";
  content: string;
}

interface Scenario {
  key: string;
  title: string;
  customer_profile: {
    name: string;
    cpf: string;
    contract_status: string;
    has_overdue: boolean;
    overdue_amount: number;
    overdue_count?: number;
    due_date: string;
  };
  conversation: ConversationMessage[];
  metadata: {
    resolution_time: string;
    customer_satisfaction: number;
    tools_used: string[];
    outcome: string;
  };
}

export const SegundaViaScenarios = () => {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  // Buscar cenários
  const { data: scenariosData, isLoading } = useQuery({
    queryKey: ['segunda-via-scenarios'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-segunda-via-scenarios');
      if (error) throw error;
      return data;
    }
  });

  // Aprovar cenário
  const approveMutation = useMutation({
    mutationFn: async (scenario: Scenario) => {
      const { error } = await supabase.from('agent_flow_scenario_approvals').insert({
        agent_type: 'support-financial-agent',
        subject_key: 'segunda_via_boleto',
        scenario_key: scenario.key,
        variation_path: scenario.title,
        status: 'approved',
        notes: `Cenário aprovado automaticamente. Tempo de resolução: ${scenario.metadata.resolution_time}. Satisfação: ${scenario.metadata.customer_satisfaction}/5. Tools: ${scenario.metadata.tools_used.join(', ')}`
      });

      if (error) throw error;
      return scenario;
    },
    onSuccess: (scenario) => {
      toast.success(`Cenário "${scenario.title}" aprovado com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao aprovar cenário: ${error.message}`);
    }
  });

  const scenarios: Scenario[] = scenariosData?.scenarios || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando cenários...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Cenários de Segunda Via de Boleto
          </CardTitle>
          <CardDescription>
            Conversas realistas baseadas na documentação e casos de uso do agente financeiro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>{scenarios.length}</strong> cenários disponíveis
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Baseado em casos reais documentados</span>
            </div>
          </div>

          <Tabs defaultValue={scenarios[0]?.key} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
              {scenarios.map((scenario) => (
                <TabsTrigger
                  key={scenario.key}
                  value={scenario.key}
                  onClick={() => setSelectedScenario(scenario.key)}
                >
                  {scenario.title.split(' ').slice(0, 2).join(' ')}
                </TabsTrigger>
              ))}
            </TabsList>

            {scenarios.map((scenario) => (
              <TabsContent key={scenario.key} value={scenario.key} className="space-y-4">
                {/* Perfil do Cliente */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Perfil do Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Nome:</span>
                        <p className="font-medium">{scenario.customer_profile.name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">CPF:</span>
                        <p className="font-medium">{scenario.customer_profile.cpf}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <p>
                          <Badge variant={scenario.customer_profile.contract_status === 'active' ? 'default' : 'destructive'}>
                            {scenario.customer_profile.contract_status}
                          </Badge>
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Débito:</span>
                        <p className="font-medium text-red-600">
                          R$ {scenario.customer_profile.overdue_amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Conversa */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Conversa Completa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {scenario.conversation.map((message, idx) => (
                        <div
                          key={idx}
                          className={`flex ${message.role === 'customer' ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-4 ${
                              message.role === 'customer'
                                ? 'bg-muted'
                                : 'bg-primary text-primary-foreground'
                            }`}
                          >
                            <div className="text-xs font-semibold mb-1">
                              {message.role === 'customer' ? scenario.customer_profile.name : 'Agente Julia'}
                            </div>
                            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Métricas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Métricas de Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Tempo</p>
                          <p className="font-medium">{scenario.metadata.resolution_time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Satisfação</p>
                          <p className="font-medium">{scenario.metadata.customer_satisfaction}/5</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Resultado</p>
                          <p className="font-medium text-xs">
                            {scenario.metadata.outcome.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Tools Usadas</p>
                        <p className="text-xs font-medium">
                          {scenario.metadata.tools_used.length} ferramentas
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-2">Ferramentas utilizadas:</p>
                      <div className="flex flex-wrap gap-2">
                        {scenario.metadata.tools_used.map((tool) => (
                          <Badge key={tool} variant="outline">
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Botão de Aprovação */}
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => approveMutation.mutate(scenario)}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {approveMutation.isPending ? 'Aprovando...' : 'Aprovar Cenário'}
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Legenda de Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sobre os Cenários</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            ✅ Todos os cenários foram criados baseados na documentação oficial em{' '}
            <code>docs/knowledge-base/data-sources/integracao-ixc/enviar-pix-boleto.md</code>
          </p>
          <p>
            📋 As conversas seguem exatamente os prompts e regras do{' '}
            <code>support-financial-agent</code>
          </p>
          <p>
            🎯 Ao aprovar, o cenário será registrado na tabela{' '}
            <code>agent_flow_scenario_approvals</code> com subject_key = "segunda_via_boleto"
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
