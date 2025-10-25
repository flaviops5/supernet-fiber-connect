import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

import type { Database } from '@/integrations/supabase/types';

interface FlowStep {
  id: string;
  agent_type: string;
  step_key: string;
  step_order: number;
  question: string;
  instruction: string;
  response_options: Record<string, unknown> | null;
  response_variations: Record<string, unknown> | null;
  tool_calls: Array<Record<string, unknown>>;
  next_step_map: Record<string, unknown> | null;
  awaits_response: boolean;
  media_id: string | null;
  media?: {
    file_url: string;
    file_type: string;
    title: string;
  };
}

const AGENT_LABELS: Record<string, string> = {
  'routing-agent': 'Cloé (Roteamento)',
  'support-tech-agent': 'Luan (Suporte Técnico)',
  'support-financial-agent': 'Suporte Financeiro',
  'sales-agent': 'Vendas',
  'telemedicina-agent': 'Telemedicina',
  'automacao-agent': 'Automação',
  'logistics-agent': 'Logística',
};

export default function FluxoAgente() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const agentType = searchParams.get('agent') || 'support-tech-agent';

  const { data: steps, isLoading } = useQuery({
    queryKey: ['agent_flow_steps', agentType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_flow_steps')
        .select(`
          *,
          media:media_repository(file_url, file_type, title)
        `)
        .eq('agent_type', agentType as Database['public']['Enums']['agent_type'])
        .eq('is_active', true)
        .order('step_order');
      
      if (error) throw error;
      return data as FlowStep[];
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando fluxo...</p>
      </div>
    );
  }

  const agentLabel = AGENT_LABELS[agentType] || agentType;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center gap-4 px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Fluxo: {agentLabel}
          </h1>
        </div>
      </header>

      <main className="container mx-auto p-6 max-w-4xl space-y-6">
        <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5">
          <h2 className="text-2xl font-bold mb-2">Início do Fluxo</h2>
          <p className="text-muted-foreground">
            Este é o fluxo conversacional do agente <strong>{agentLabel}</strong>
          </p>
        </Card>

        {steps?.map((step) => (
          <Card key={step.id} className="p-6" id={step.step_key}>
            <div className="flex items-start gap-4 mb-4">
              <Badge variant="outline" className="text-lg px-3 py-1">
                {step.step_order}
              </Badge>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">{step.step_key}</h3>
                
                <div className="mb-4">
                  <span className="font-medium text-sm text-primary">Questão:</span>
                  <p className="text-muted-foreground mt-1">{step.question}</p>
                </div>

                <div className="mb-4">
                  <span className="font-medium text-sm text-primary">Instrução:</span>
                  <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
                    {step.instruction}
                  </p>
                </div>

                {step.media && (
                  <div className="mb-4">
                    <span className="font-medium text-sm text-primary">Material de Apoio:</span>
                    <div className="mt-2 border rounded-lg overflow-hidden">
                      {step.media.file_type.startsWith('image/') && (
                        <img 
                          src={step.media.file_url} 
                          alt={step.media.title}
                          className="w-full max-h-96 object-contain"
                        />
                      )}
                      {step.media.file_type.startsWith('video/') && (
                        <video 
                          src={step.media.file_url} 
                          controls 
                          className="w-full max-h-96"
                        >
                          Seu navegador não suporta vídeos.
                        </video>
                      )}
                      {step.media.file_type === 'image/gif' && (
                        <img 
                          src={step.media.file_url} 
                          alt={step.media.title}
                          className="w-full max-h-96 object-contain"
                        />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{step.media.title}</p>
                  </div>
                )}

                {step.awaits_response && (
                  <Badge variant="secondary" className="mb-4">
                    AGUARDA RESPOSTA DO CLIENTE
                  </Badge>
                )}

                {step.response_options && Object.keys(step.response_options).length > 0 && (
                  <div className="mb-4">
                    <span className="font-medium text-sm text-primary">Opções de Resposta:</span>
                    <div className="mt-2 space-y-2">
                      {Object.entries(step.response_options).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                          <Badge variant="outline">{key}</Badge>
                          <span className="text-sm text-muted-foreground flex-1">
                            {String(value)}
                            {step.next_step_map?.[key] && (
                              <span className="ml-2 text-primary">
                                → <a href={`#${step.next_step_map[key]}`} className="underline">
                                  {step.next_step_map[key]}
                                </a>
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step.response_variations && Object.keys(step.response_variations).length > 0 && (
                  <div className="mb-4">
                    <span className="font-medium text-sm text-primary">Variações de Resposta:</span>
                    <div className="mt-2 space-y-1">
                      {Object.entries(step.response_variations).map(([key, variations]) => (
                        <div key={key}>
                          <Badge variant="secondary" className="mb-1">{key}</Badge>
                          <ul className="list-disc list-inside text-sm text-muted-foreground ml-4">
                            {(variations as string[]).map((variation, idx) => (
                              <li key={idx}>{variation}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step.tool_calls && step.tool_calls.length > 0 && (
                  <div>
                    <span className="font-medium text-sm text-primary">Chamadas de Ferramentas:</span>
                    <div className="mt-2 space-y-1">
                      {step.tool_calls.map((tool, idx) => (
                        <Badge key={idx} variant="outline" className="mr-2">
                          {tool.tool_name || JSON.stringify(tool)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}

        <Card className="p-6 bg-gradient-to-r from-green-500/10 to-green-500/5">
          <h2 className="text-2xl font-bold mb-2">Fluxo Concluído</h2>
          <p className="text-muted-foreground">
            O agente concluiu o atendimento seguindo este fluxo.
          </p>
        </Card>
      </main>
    </div>
  );
}
