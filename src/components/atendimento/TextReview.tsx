import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, RefreshCw, X, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  originalText: string;
  onAccept: (reviewedText: string) => void;
  onClose: () => void;
}

export default function TextReview({ originalText, onAccept, onClose }: Props) {
  const { toast } = useToast();
  const [reviewedText, setReviewedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reviewText = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-text-review', {
        body: { text: originalText }
      });

      if (error) throw error;

      if (data?.reviewedText) {
        setReviewedText(data.reviewedText);
      }
    } catch (error) {
      console.error('Error reviewing text:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível revisar o texto.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (reviewedText) {
      onAccept(reviewedText);
      toast({
        title: 'Texto revisado aceito',
        description: 'O texto foi atualizado com a revisão.',
      });
    }
  };

  if (!reviewedText && !loading) {
    reviewText();
  }

  return (
    <Card className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20 mb-2">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              Revisão de Texto por IA
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Revisando texto...</span>
          </div>
        ) : reviewedText ? (
          <>
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Texto Original:</div>
              <div className="p-2 bg-background/50 rounded text-sm border">
                {originalText}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-green-700 dark:text-green-300">
                Texto Revisado:
              </div>
              <div className="p-2 bg-green-500/10 rounded text-sm border border-green-500/20">
                {reviewedText}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleAccept}
                className="bg-blue-500 hover:bg-blue-600 h-8 text-xs flex-1"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Usar texto revisado
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={reviewText}
                disabled={loading}
                className="h-8 text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Revisar novamente
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}
