import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit, Save, X, Trash2, Plus, Copy } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';

interface FlowStep {
  id: string;
  agent_type: string;
  step_key: string;
  step_order: number;
  question: string;
  instruction: string;
  response_options: any;
  response_variations: any;
  tool_calls: any;
  next_step_map: any;
  awaits_response: boolean;
  is_active: boolean;
  media_id: string | null;
}

interface MediaItem {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
}

const AGENT_TYPES = [
  { value: 'routing-agent', label: 'Cloé (Roteamento)' },
  { value: 'support-tech-agent', label: 'Luan (Suporte Técnico)' },
  { value: 'support-financial-agent', label: 'Suporte Financeiro' },
  { value: 'sales-agent', label: 'Vendas' },
  { value: 'telemedicina-agent', label: 'Telemedicina' },
  { value: 'automacao-agent', label: 'Automação' },
  { value: 'logistics-agent', label: 'Logística' },
];

export default function AdminFluxoAgentes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Partial<FlowStep>>({});
  const [selectedAgent, setSelectedAgent] = useState<string>('support-tech-agent');
  const [customCategory, setCustomCategory] = useState('');
  const [customVariations, setCustomVariations] = useState<string[]>(['', '', '']);

  const { data: steps, isLoading } = useQuery({
    queryKey: ['agent_flow_steps', selectedAgent],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_flow_steps')
        .select('*')
        .eq('agent_type', selectedAgent as any)
        .eq('is_active', true)
        .order('step_order');
      
      if (error) throw error;
      return data as FlowStep[];
    },
  });

  const { data: mediaItems } = useQuery({
    queryKey: ['media_repository'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_repository')
        .select('id, title, file_url, file_type')
        .eq('is_active', true)
        .order('title');
      
      if (error) throw error;
      return data as MediaItem[];
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('agent_flow_steps')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_flow_steps'] });
      toast({ title: 'Step atualizado com sucesso!' });
      setEditingStep(null);
      setEditedData({});
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar step', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const handleEdit = (step: FlowStep) => {
    setEditingStep(step.id);
    setEditedData({
      question: step.question,
      instruction: step.instruction,
      response_options: step.response_options,
      response_variations: step.response_variations,
      media_id: step.media_id,
      tool_calls: step.tool_calls,
      next_step_map: step.next_step_map,
      awaits_response: step.awaits_response
    });
  };

  const handleSave = (id: string) => {
    updateStepMutation.mutate({ id, data: editedData });
  };

  const handleCancel = () => {
    setEditingStep(null);
    setEditedData({});
    setCustomCategory('');
    setCustomVariations(['', '', '']);
  };

  const EXAMPLE_VARIATIONS = {
    greeting: [
      "Olá! 👋 Como posso ajudar?",
      "Oi! 😊 Em que posso ser útil?",
      "Boa tarde! Como posso auxiliar?"
    ],
    confirmation: [
      "Perfeito! ✅",
      "Entendido! 👍",
      "Ok, vamos lá! 🚀"
    ],
    error: [
      "Desculpe, tive um problema 😕",
      "Ops! Algo deu errado 🔧",
      "Aguarde, vou verificar isso ⏳"
    ],
    waiting: [
      "Um momento, por favor... ⏳",
      "Já estou verificando isso para você 🔍",
      "Aguarde enquanto busco essas informações 📋"
    ],
    thanks: [
      "Obrigado por aguardar! 🙏",
      "Agradeço pela paciência! ✨",
      "Muito obrigado! 💙"
    ],
    success: [
      "Tudo certo! ✅ Consegui realizar a operação",
      "Pronto! 🎉 Tarefa concluída com sucesso",
      "Feito! ✨ Operação realizada"
    ]
  };

  const applyExampleVariation = (key: string) => {
    const currentVariations = editedData.response_variations || {};
    setEditedData({
      ...editedData,
      response_variations: {
        ...currentVariations,
        [key]: EXAMPLE_VARIATIONS[key as keyof typeof EXAMPLE_VARIATIONS]
      }
    });
    toast({ title: `Exemplo "${key}" aplicado!` });
  };

  const addCustomVariation = () => {
    if (!customCategory.trim()) {
      toast({ title: 'Digite uma categoria', variant: 'destructive' });
      return;
    }

    const filteredVariations = customVariations.filter(v => v.trim() !== '');
    if (filteredVariations.length === 0) {
      toast({ title: 'Adicione pelo menos uma variação', variant: 'destructive' });
      return;
    }

    const currentVariations = editedData.response_variations || {};
    setEditedData({
      ...editedData,
      response_variations: {
        ...currentVariations,
        [customCategory]: filteredVariations
      }
    });

    toast({ title: `Categoria "${customCategory}" adicionada!` });
    setCustomCategory('');
    setCustomVariations(['', '', '']);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const selectedAgentLabel = AGENT_TYPES.find(a => a.value === selectedAgent)?.label || selectedAgent;

  return (
    <AuthGuard requiredRoles={['admin']}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center gap-4 px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/agents')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Administrar Fluxos de Agentes
            </h1>
          </div>
        </header>

        <main className="container mx-auto p-6 max-w-6xl">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Selecionar Agente</label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENT_TYPES.map(agent => (
                  <SelectItem key={agent.value} value={agent.value}>
                    {agent.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold">Fluxo: {selectedAgentLabel}</h2>
            <p className="text-muted-foreground">
              {steps?.length || 0} steps configurados
            </p>
          </div>

          <div className="space-y-4">
            {steps?.map((step) => (
              <Card key={step.id} id={`step-${step.id}`} className="p-6 scroll-mt-20">
                {editingStep === step.id ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold">
                        Editando Step: {step.step_key}
                      </h3>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSave(step.id)}>
                          <Save className="h-4 w-4 mr-1" />
                          Salvar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancel}>
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Questão:</label>
                      <Textarea
                        value={editedData.question || ''}
                        onChange={(e) => setEditedData({ ...editedData, question: e.target.value })}
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Instrução:</label>
                      <Textarea
                        value={editedData.instruction || ''}
                        onChange={(e) => setEditedData({ ...editedData, instruction: e.target.value })}
                        className="mt-1"
                        rows={4}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Mídia da Biblioteca:</label>
                      <div className="flex gap-2 items-center mt-1">
                        <Select 
                          value={editedData.media_id || undefined} 
                          onValueChange={(value) => setEditedData({ ...editedData, media_id: value || null })}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione uma mídia (opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {mediaItems?.map(media => (
                              <SelectItem key={media.id} value={media.id}>
                                {media.title} ({media.file_type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {editedData.media_id && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setEditedData({ ...editedData, media_id: null })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {editedData.media_id && mediaItems && (
                        <div className="mt-2 p-2 border rounded">
                          {(() => {
                            const media = mediaItems.find(m => m.id === editedData.media_id);
                            if (!media) return null;
                            
                            if (media.file_type.startsWith('image/')) {
                              return <img src={media.file_url} alt={media.title} className="max-h-32 rounded" />;
                            } else if (media.file_type.startsWith('video/')) {
                              return <video src={media.file_url} controls className="max-h-32 rounded" />;
                            }
                            return <p className="text-sm text-muted-foreground">Preview: {media.title}</p>;
                          })()}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium">Response Options (JSON):</label>
                      <Textarea
                        value={JSON.stringify(editedData.response_options, null, 2)}
                        onChange={(e) => {
                          try {
                            setEditedData({ ...editedData, response_options: JSON.parse(e.target.value) });
                          } catch {}
                        }}
                        className="mt-1 font-mono text-xs"
                        rows={6}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">Response Variations (JSON):</label>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Plus className="h-4 w-4 mr-1" />
                              Adicionar Sugestão
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Gerenciar Response Variations</DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-6">
                              {/* Exemplos Pré-definidos */}
                              <div>
                                <h4 className="font-medium mb-3">📚 Exemplos Pré-definidos:</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  {Object.keys(EXAMPLE_VARIATIONS).map((key) => (
                                    <Button
                                      key={key}
                                      variant="outline"
                                      size="sm"
                                      onClick={() => applyExampleVariation(key)}
                                      className="justify-start"
                                    >
                                      <Copy className="h-3 w-3 mr-2" />
                                      {key}
                                    </Button>
                                  ))}
                                </div>
                                <div className="mt-3 p-3 bg-muted rounded-md text-xs">
                                  <p className="font-medium mb-2">Preview dos exemplos:</p>
                                  <pre className="whitespace-pre-wrap">
                                    {JSON.stringify(EXAMPLE_VARIATIONS, null, 2)}
                                  </pre>
                                </div>
                              </div>

                              {/* Criar Sugestão Customizada */}
                              <div className="border-t pt-4">
                                <h4 className="font-medium mb-3">✍️ Criar Sugestão Customizada:</h4>
                                <div className="space-y-3">
                                  <div>
                                    <Label htmlFor="custom-category">Nome da Categoria</Label>
                                    <Input
                                      id="custom-category"
                                      placeholder="Ex: despedida, negociacoes, etc"
                                      value={customCategory}
                                      onChange={(e) => setCustomCategory(e.target.value)}
                                      className="mt-1"
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label>Variações (mínimo 1)</Label>
                                    {customVariations.map((variation, index) => (
                                      <Input
                                        key={index}
                                        placeholder={`Variação ${index + 1}`}
                                        value={variation}
                                        onChange={(e) => {
                                          const newVariations = [...customVariations];
                                          newVariations[index] = e.target.value;
                                          setCustomVariations(newVariations);
                                        }}
                                        className="mt-2"
                                      />
                                    ))}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setCustomVariations([...customVariations, ''])}
                                      className="mt-2"
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Adicionar mais uma variação
                                    </Button>
                                  </div>

                                  <Button onClick={addCustomVariation} className="w-full">
                                    Adicionar Categoria Customizada
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      
                      <Textarea
                        value={JSON.stringify(editedData.response_variations, null, 2)}
                        onChange={(e) => {
                          try {
                            setEditedData({ ...editedData, response_variations: JSON.parse(e.target.value) });
                          } catch {}
                        }}
                        className="mt-1 font-mono text-xs"
                        rows={6}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {step.step_order}. {step.step_key}
                        </h3>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(step)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-sm">Questão:</span>
                        <p className="text-sm text-muted-foreground">{step.question}</p>
                      </div>

                      <div>
                        <span className="font-medium text-sm">Instrução:</span>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{step.instruction}</p>
                      </div>

                      {step.media_id && mediaItems && (
                        <div>
                          <span className="font-medium text-sm">Mídia anexada:</span>
                          {(() => {
                            const media = mediaItems.find(m => m.id === step.media_id);
                            if (!media) return null;
                            return (
                              <div className="mt-2 p-2 border rounded">
                                <p className="text-sm mb-2">{media.title}</p>
                                {media.file_type.startsWith('image/') && (
                                  <img src={media.file_url} alt={media.title} className="max-h-48 rounded" />
                                )}
                                {media.file_type.startsWith('video/') && (
                                  <video src={media.file_url} controls className="max-h-48 rounded" />
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {step.response_options && Object.keys(step.response_options).length > 0 && (
                        <div>
                          <span className="font-medium text-sm">Opções de Resposta:</span>
                          <ul className="list-disc list-inside text-sm text-muted-foreground">
                            {Object.entries(step.response_options).map(([key, value]) => (
                              <li key={key}>
                                <strong>{key}:</strong> {String(value)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {step.next_step_map && Object.keys(step.next_step_map).length > 0 && (
                        <div>
                          <span className="font-medium text-sm">Next Step Map:</span>
                          <div className="bg-muted p-3 rounded mt-1">
                            {Object.entries(step.next_step_map).map(([key, value]) => {
                              const stepKey = String(value);
                              const targetStep = steps?.find(s => s.step_key === stepKey);
                              return (
                                <div key={key} className="flex items-center gap-2 py-1">
                                  <span className="text-xs font-medium">{key}:</span>
                                  {targetStep ? (
                                    <button
                                      onClick={() => {
                                        const element = document.getElementById(`step-${targetStep.id}`);
                                        if (element) {
                                          const headerOffset = 80;
                                          const elementPosition = element.getBoundingClientRect().top;
                                          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                                          
                                          window.scrollTo({
                                            top: offsetPosition,
                                            behavior: 'smooth'
                                          });
                                        }
                                      }}
                                      className="text-xs text-primary hover:underline cursor-pointer"
                                    >
                                      "{stepKey}"
                                    </button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">"{stepKey}"</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {step.tool_calls && step.tool_calls.length > 0 && (
                        <div>
                          <span className="font-medium text-sm">Tool Calls:</span>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(step.tool_calls, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
