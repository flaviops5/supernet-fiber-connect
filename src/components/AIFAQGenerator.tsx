import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Sparkles, Copy, Check, X, Edit, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation } from '@tanstack/react-query';
import { parseError } from '@/types/error.types';

interface GeneratedFAQ {
  question: string;
  answer: string;
  suggestedIcon: string;
  category: string;
  qualityScore: number;
  suggestions?: string[];
}

export const AIFAQGenerator = () => {
  const [theme, setTheme] = useState('');
  const [generatedFAQs, setGeneratedFAQs] = useState<GeneratedFAQ[]>([]);
  const [approvedFAQs, setApprovedFAQs] = useState<Set<number>>(new Set());

  const generateMutation = useMutation({
    mutationFn: async (inputTheme: string) => {
      const { data, error } = await supabase.functions.invoke('generate-ai-faq', {
        body: { theme: inputTheme }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.faqs && Array.isArray(data.faqs)) {
        setGeneratedFAQs(data.faqs);
        toast.success(`${data.faqs.length} FAQs geradas com sucesso!`);
      } else {
        toast.error('Formato de resposta inválido');
      }
    },
    onError: (error) => {
      const err = parseError(error);
      console.error('Error generating FAQs:', err.message);
      toast.error('Erro ao gerar FAQs. Tente novamente.');
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (faq: GeneratedFAQ) => {
      const { error } = await supabase.from('faqs').insert({
        question: faq.question,
        answer: faq.answer,
        icon: faq.suggestedIcon,
        display_order: 999, // Último por padrão
        active: true
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('FAQ salva com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error saving FAQ:', error);
      toast.error('Erro ao salvar FAQ');
    }
  });

  const handleGenerate = () => {
    if (!theme.trim()) {
      toast.error('Por favor, descreva um tema ou contexto');
      return;
    }

    generateMutation.mutate(theme);
  };

  const handleApprove = (index: number) => {
    const newApproved = new Set(approvedFAQs);
    if (newApproved.has(index)) {
      newApproved.delete(index);
    } else {
      newApproved.add(index);
    }
    setApprovedFAQs(newApproved);
  };

  const handleSave = async (faq: GeneratedFAQ) => {
    await saveMutation.mutateAsync(faq);
  };

  const handleCopyToClipboard = (faq: GeneratedFAQ) => {
    const text = `Pergunta: ${faq.question}\n\nResposta: ${faq.answer}\n\nÍcone: ${faq.suggestedIcon}\nCategoria: ${faq.category}`;
    navigator.clipboard.writeText(text);
    toast.success('FAQ copiada para área de transferência!');
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Gerador de FAQ por IA</CardTitle>
        </div>
        <CardDescription>
          Descreva um tema ou contexto e a IA gerará FAQs completas automaticamente usando Lovable AI (Gemini Flash)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Descreva o Tema ou Contexto
            </label>
            <Textarea
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex: Dúvidas sobre instalação de fibra óptica, cobertura de sinal, planos e preços..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              💡 Seja específico! Quanto mais detalhes, melhores as FAQs geradas.
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !theme.trim()}
            className="w-full"
            size="lg"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando FAQs...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar FAQs com IA
              </>
            )}
          </Button>
        </div>

        {/* Results Section */}
        {generatedFAQs.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                📊 FAQs Geradas ({generatedFAQs.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setGeneratedFAQs([]);
                  setApprovedFAQs(new Set());
                  setTheme('');
                }}
              >
                Limpar Tudo
              </Button>
            </div>

            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {generatedFAQs.map((faq, index) => (
                  <Card 
                    key={index} 
                    className={`${
                      approvedFAQs.has(index) 
                        ? 'border-green-500 bg-green-50/50' 
                        : 'border-border'
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {faq.suggestedIcon}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {faq.category}
                            </Badge>
                            <Badge 
                              className={`text-xs border ${getQualityColor(faq.qualityScore)}`}
                            >
                              Score: {faq.qualityScore}/100
                            </Badge>
                          </div>
                          
                          <CardTitle className="text-base leading-tight">
                            {faq.question}
                          </CardTitle>
                          
                          <CardDescription className="text-sm leading-relaxed whitespace-pre-line">
                            {faq.answer}
                          </CardDescription>

                          {faq.suggestions && faq.suggestions.length > 0 && (
                            <details className="mt-4">
                              <summary className="cursor-pointer text-xs text-primary hover:underline flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Ver Sugestões de Melhoria
                              </summary>
                              <ul className="mt-2 space-y-1 text-xs text-muted-foreground pl-4">
                                {faq.suggestions.map((suggestion, i) => (
                                  <li key={i}>• {suggestion}</li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            variant={approvedFAQs.has(index) ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleApprove(index)}
                          >
                            {approvedFAQs.has(index) ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Check className="h-4 w-4 opacity-0" />
                            )}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSave(faq)}
                            disabled={saveMutation.isPending}
                          >
                            {saveMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Edit className="h-4 w-4" />
                            )}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyToClipboard(faq)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setGeneratedFAQs(generatedFAQs.filter((_, i) => i !== index));
                              const newApproved = new Set(approvedFAQs);
                              newApproved.delete(index);
                              setApprovedFAQs(newApproved);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {!generateMutation.isPending && generatedFAQs.length === 0 && theme && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma FAQ gerada ainda. Clique no botão acima para começar!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
