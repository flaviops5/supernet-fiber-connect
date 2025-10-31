import { useState, useEffect } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';
import { toast } from 'sonner';

interface Board {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  profiles?: {
    name: string;
    email: string;
  };
}

interface AdminBoardSelectorProps {
  currentBoardId: string;
  onBoardChange: (boardId: string) => void;
}

export function AdminBoardSelector({ currentBoardId, onBoardChange }: AdminBoardSelectorProps) {
  const { role } = useUserRole();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Só renderizar se for admin
  if (role !== 'admin') return null;

  useEffect(() => {
    if (open) {
      loadAllBoards();
    }
  }, [open]);

  const loadAllBoards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('kanban_boards' as any)
        .select(`
          id,
          name,
          created_by,
          created_at,
          profiles:created_by (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBoards((data as any) || []);
    } catch (error: any) {
      toast.error('Erro ao carregar boards: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBoardSelect = (boardId: string) => {
    onBoardChange(boardId);
    setOpen(false);
    toast.success('Board alterado com sucesso');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Users className="h-3.5 w-3.5 mr-1" />
          Gerenciar Todos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar Board de Usuário</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-muted-foreground">Carregando...</p>
          ) : (
            <div className="space-y-2">
              {boards.map((board) => (
                <div
                  key={board.id}
                  className={`p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                    board.id === currentBoardId ? 'bg-accent border-primary' : ''
                  }`}
                  onClick={() => handleBoardSelect(board.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{board.name || 'Sem nome'}</h4>
                      <p className="text-sm text-muted-foreground">
                        Usuário: {(board as any).profiles?.name || 'Desconhecido'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(board as any).profiles?.email}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(board.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
              
              {boards.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum board encontrado
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
