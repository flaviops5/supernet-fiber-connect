import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OpenTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (assuntoId: string, observacoes: string) => void;
  loading: boolean;
}

interface IXCSubject {
  id: string;
  nome: string;
}

export default function OpenTicketDialog({ open, onOpenChange, onSubmit, loading }: OpenTicketDialogProps) {
  const [assuntoId, setAssuntoId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [subjects, setSubjects] = useState<IXCSubject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadSubjects();
    }
  }, [open]);

  const loadSubjects = async () => {
    setLoadingSubjects(true);
    try {
      const { data, error } = await supabase.functions.invoke('ixc-list-subjects');
      
      if (error) throw error;
      
      if (data?.success && data.data) {
        setSubjects(data.data);
        // Selecionar o primeiro assunto por padrão
        if (data.data.length > 0 && !assuntoId) {
          setAssuntoId(data.data[0].id);
        }
      } else {
        throw new Error(data?.error || 'Erro ao carregar assuntos');
      }
    } catch (error) {
      console.error('Erro ao carregar assuntos:', error);
      toast({
        title: "Erro ao carregar assuntos",
        description: "Não foi possível carregar a lista de assuntos do IXC.",
        variant: "destructive",
      });
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleSubmit = () => {
    onSubmit(assuntoId, observacoes);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-[hsl(var(--orange))]" />
            Abrir Atendimento no IXC
          </DialogTitle>
          <DialogDescription>
            Selecione o assunto do atendimento. Este assunto disparará o fluxo correspondente no IXC.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="assunto">Assunto do Atendimento *</Label>
            <Select value={assuntoId} onValueChange={setAssuntoId} disabled={loadingSubjects}>
              <SelectTrigger id="assunto">
                {loadingSubjects ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando assuntos...
                  </span>
                ) : (
                  <SelectValue placeholder="Selecione o assunto" />
                )}
              </SelectTrigger>
              <SelectContent>
                {subjects.map((assunto) => (
                  <SelectItem key={assunto.id} value={assunto.id}>
                    {assunto.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Descreva os detalhes do atendimento..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || loadingSubjects || !assuntoId}
          >
            {loading ? 'Criando...' : 'Criar Atendimento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
