import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowRight, Save, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FlowStep {
  id: string;
  step_key: string;
  step_order: number;
  question: string;
  instruction: string | null;
  awaits_response: boolean;
  response_options: string[];
  response_variations: Record<string, string[]>;
  tool_calls: any[];
  next_step_map: Record<string, string>;
  metadata: any;
  is_active: boolean;
}

export default function AdminFluxoLuan() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Partial<FlowStep>>({});

  const { data: steps, isLoading } = useQuery({
    queryKey: ["tech-flow-steps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tech_flow_steps")
        .select("*")
        .order("step_order");
      
      if (error) throw error;
      return data as FlowStep[];
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FlowStep> }) => {
      const { error } = await supabase
        .from("tech_flow_steps")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-flow-steps"] });
      toast.success("Passo atualizado com sucesso!");
      setEditingStep(null);
      setEditedData({});
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const handleEdit = (step: FlowStep) => {
    setEditingStep(step.id);
    setEditedData({
      question: step.question,
      instruction: step.instruction,
      response_variations: step.response_variations,
    });
  };

  const handleSave = (id: string) => {
    updateStepMutation.mutate({ id, updates: editedData });
  };

  const handleCancel = () => {
    setEditingStep(null);
    setEditedData({});
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <p>Carregando fluxo...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Administração do Fluxo Luan</h1>
          <p className="text-muted-foreground">
            Configure perguntas, respostas e ferramentas do agente técnico
          </p>
        </div>
        <Button onClick={() => navigate("/fluxo-luan")} variant="outline">
          <Eye className="mr-2 h-4 w-4" />
          Visualizar Fluxo
        </Button>
      </div>

      <div className="space-y-4">
        {steps?.map((step, index) => (
          <Card key={step.id} className="p-6 scroll-mt-20" id={step.step_key}>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {step.step_order}
                  </Badge>
                  <div>
                    <p className="text-sm text-muted-foreground font-mono">
                      {step.step_key}
                    </p>
                    {step.metadata?.icon && (
                      <span className="text-2xl">{step.metadata.icon}</span>
                    )}
                  </div>
                </div>
                {editingStep !== step.id && (
                  <Button onClick={() => handleEdit(step)} size="sm">
                    Editar
                  </Button>
                )}
              </div>

              {editingStep === step.id ? (
                <div className="space-y-4">
                  <div>
                    <Label>Pergunta</Label>
                    <Textarea
                      value={editedData.question || ""}
                      onChange={(e) =>
                        setEditedData({ ...editedData, question: e.target.value })
                      }
                      rows={2}
                    />
                  </div>
                  {step.instruction && (
                    <div>
                      <Label>Instrução</Label>
                      <Textarea
                        value={editedData.instruction || ""}
                        onChange={(e) =>
                          setEditedData({ ...editedData, instruction: e.target.value })
                        }
                        rows={6}
                      />
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <Label>Variações de Resposta (uma por linha)</Label>
                    {step.response_options.map((option) => (
                      <div key={option} className="space-y-1">
                        <Label className="text-sm text-muted-foreground">{option}</Label>
                        <Textarea
                          value={(editedData.response_variations?.[option] || []).join('\n')}
                          onChange={(e) => {
                            const lines = e.target.value.split('\n').filter(l => l.trim());
                            setEditedData({
                              ...editedData,
                              response_variations: {
                                ...editedData.response_variations,
                                [option]: lines
                              }
                            });
                          }}
                          placeholder={`Digite as variações para "${option}", uma por linha`}
                          rows={3}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSave(step.id)} size="sm">
                      <Save className="mr-2 h-4 w-4" />
                      Salvar
                    </Button>
                    <Button onClick={handleCancel} variant="outline" size="sm">
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-muted-foreground">Pergunta</Label>
                    <p className="text-lg font-medium">{step.question}</p>
                  </div>

                  {step.instruction && (
                    <div>
                      <Label className="text-muted-foreground">Instrução</Label>
                      <p className="whitespace-pre-wrap text-sm">{step.instruction}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Label className="text-muted-foreground w-full">Opções de Resposta</Label>
                    {step.response_options.map((option) => (
                      <Badge key={option} variant="secondary">
                        {option}
                      </Badge>
                    ))}
                  </div>

                  {step.response_variations && Object.keys(step.response_variations).length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Variações de Resposta</Label>
                      {Object.entries(step.response_variations).map(([key, variations]) => (
                        <div key={key} className="space-y-1">
                          <p className="text-sm font-medium">{key}:</p>
                          <div className="flex flex-wrap gap-1">
                            {variations.map((variation, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {variation}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {step.tool_calls.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground">Ferramentas</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {step.tool_calls.map((tool: any, i: number) => (
                          <Badge key={i} variant="outline" className="font-mono">
                            🔧 {tool.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(step.next_step_map).length > 0 && (
                    <div>
                      <Label className="text-muted-foreground">Próximos Passos</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(step.next_step_map).map(([response, nextKey]) => (
                          <div key={response} className="flex items-center gap-2 text-sm">
                            <Badge variant="secondary">{response}</Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <a
                              href={`#${nextKey}`}
                              className="font-mono text-xs text-primary hover:underline cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                document.getElementById(nextKey as string)?.scrollIntoView({
                                  behavior: 'smooth',
                                  block: 'center'
                                });
                              }}
                            >
                              {nextKey}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
