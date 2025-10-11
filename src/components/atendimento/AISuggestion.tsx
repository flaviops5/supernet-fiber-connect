import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, RefreshCw, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  conversationId: string;
  onAccept: (suggestion: string) => void;
}

export default function AISuggestion({ conversationId, onAccept }: Props) {
  const { toast } = useToast();
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  const generateSuggestion = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-suggest-reply', {
        body: { conversation_id: conversationId }
      });

      if (error) throw error;

      if (data?.suggestion) {
        setSuggestion(data.suggestion);
        setVisible(true);
      }
    } catch (error) {
      console.error('Error generating suggestion:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar sugestão.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (suggestion) {
      onAccept(suggestion);
      setSuggestion(null);
      setVisible(false);
      toast({
        title: 'Sugestão aceita',
        description: 'Você pode editar antes de enviar.',
      });
    }
  };

  const handleDismiss = () => {
    setSuggestion(null);
    setVisible(false);
  };

  if (visible && suggestion) {
    return (
      <Card className="p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20 mb-2">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-xs font-medium text-purple-700 dark:text-purple-300">
              Sugestão de IA
            </p>
            <p className="text-sm">{suggestion}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAccept}
                className="bg-purple-500 hover:bg-purple-600 h-7 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Usar sugestão
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={generateSuggestion}
                disabled={loading}
                className="h-7 text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Gerar nova
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="h-7 text-xs"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generateSuggestion}
      disabled={loading}
      className="gap-2"
    >
      <Sparkles className={`h-4 w-4 text-purple-500 ${loading ? 'animate-pulse' : ''}`} />
      {loading ? 'Gerando...' : 'Sugerir resposta'}
    </Button>
  );
}
