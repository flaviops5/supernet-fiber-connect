import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowRight, Settings, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

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

export default function FluxoLuan() {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const isAdmin = role === "admin";

  const { data: steps, isLoading } = useQuery({
    queryKey: ["tech-flow-steps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tech_flow_steps")
        .select("*")
        .eq("is_active", true)
        .order("step_order");
      
      if (error) throw error;
      return data as FlowStep[];
    },
  });

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
          <h1 className="text-3xl font-bold">Fluxo do Luan (Suporte Técnico)</h1>
          <p className="text-muted-foreground">
            Visualização completa do fluxo de atendimento técnico
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate("/admin/fluxo-luan")}>
            <Settings className="mr-2 h-4 w-4" />
            Administrar
          </Button>
        )}
      </div>

      <Card className="p-6 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-3">
          <div className="text-4xl">🎯</div>
          <div>
            <h3 className="font-semibold text-lg">Cenário A - TX/RX 0.00/0.00</h3>
            <p className="text-sm text-muted-foreground">
              Cliente sem sinal após tentativa de reboot
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-8">
        {steps?.map((step, index) => (
          <div key={step.id} className="space-y-4" id={step.step_key}>
            <Card className="p-6 border-l-4 border-l-primary scroll-mt-20">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Badge variant="outline" className="text-lg px-3 py-1 shrink-0">
                    {step.step_order}
                  </Badge>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-2">
                      {step.metadata?.icon && (
                        <span className="text-2xl">{step.metadata.icon}</span>
                      )}
                      <div className="flex-1">
                        <p className="text-lg font-medium">{step.question}</p>
                        {step.instruction && (
                          <div className="mt-3 p-4 bg-muted/50 rounded-md">
                            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                              {step.instruction}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {step.awaits_response && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ArrowDown className="h-4 w-4" />
                        <span className="font-medium">AGUARDA RESPOSTA DO CLIENTE</span>
                      </div>
                    )}

                    <div className="space-y-3">
                      {step.response_options.map((option) => (
                        <div key={option} className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="uppercase">
                              Se {option}
                            </Badge>
                            {step.next_step_map[option] && (
                              <>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                <a
                                  href={`#${step.next_step_map[option]}`}
                                  className="text-sm font-mono text-primary hover:underline cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    document.getElementById(step.next_step_map[option])?.scrollIntoView({
                                      behavior: 'smooth',
                                      block: 'center'
                                    });
                                  }}
                                >
                                  {step.next_step_map[option]}
                                </a>
                              </>
                            )}
                          </div>

                          {step.response_variations?.[option] && step.response_variations[option].length > 0 && (
                            <div className="ml-6 flex flex-wrap gap-1">
                              <span className="text-xs text-muted-foreground">Variações:</span>
                              {step.response_variations[option].map((variation, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {variation}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {step.tool_calls
                            .filter((tool: any) => tool.condition === option)
                            .map((tool: any, i: number) => (
                              <div
                                key={i}
                                className="ml-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md"
                              >
                                <div className="flex items-center gap-2 text-sm">
                                  <Wrench className="h-4 w-4 text-blue-500" />
                                  <span className="font-medium">Ferramenta:</span>
                                  <code className="text-xs bg-blue-500/20 px-2 py-1 rounded">
                                    {tool.name}
                                  </code>
                                </div>
                                {tool.params && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    Parâmetros: {JSON.stringify(tool.params)}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {index < (steps?.length || 0) - 1 && (
              <div className="flex justify-center">
                <ArrowDown className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>

      <Card className="p-6 bg-green-500/10 border-green-500/20">
        <div className="flex items-center gap-3">
          <div className="text-4xl">✅</div>
          <div>
            <h3 className="font-semibold text-lg text-green-600">Fluxo Concluído</h3>
            <p className="text-sm text-muted-foreground">
              Cliente com internet funcionando ou transferido para atendimento humano
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
