import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle } from 'lucide-react';

interface OpenTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (assuntoId: string, observacoes: string) => void;
  loading: boolean;
}

// Assuntos comuns do IXC - você pode ajustar conforme seus assuntos cadastrados
const ASSUNTOS_IXC = [
  { id: '25', nome: 'Instalação' },
  { id: '1', nome: 'Suporte Técnico' },
  { id: '2', nome: 'Financeiro' },
  { id: '3', nome: 'Cancelamento' },
  { id: '4', nome: 'Mudança de Endereço' },
  { id: '5', nome: 'Upgrade de Plano' },
  { id: '6', nome: 'Downgrade de Plano' },
  { id: '7', nome: 'Reinstalação' },
  { id: '8', nome: 'Manutenção Preventiva' },
  { id: '9', nome: 'Reclamação' },
  { id: '10', nome: 'Elogio/Sugestão' },
];

export default function OpenTicketDialog({ open, onOpenChange, onSubmit, loading }: OpenTicketDialogProps) {
  const [assuntoId, setAssuntoId] = useState('25');
  const [observacoes, setObservacoes] = useState('');

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
            <Select value={assuntoId} onValueChange={setAssuntoId}>
              <SelectTrigger id="assunto">
                <SelectValue placeholder="Selecione o assunto" />
              </SelectTrigger>
              <SelectContent>
                {ASSUNTOS_IXC.map((assunto) => (
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
            disabled={loading}
          >
            {loading ? 'Criando...' : 'Criar Atendimento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
