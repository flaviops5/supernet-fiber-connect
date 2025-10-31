import { useState, useEffect } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Plus } from 'lucide-react';
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

interface Profile {
  id: string;
  name: string;
  email: string;
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
  const [createOpen, setCreateOpen] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [boardName, setBoardName] = useState('');

  // Só renderizar se for admin
  if (role !== 'admin') return null;

  useEffect(() => {
    if (open) {
      loadAllBoards();
    }
  }, [open]);

  useEffect(() => {
    if (createOpen) {
      loadUsers();
    }
  }, [createOpen]);

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

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar usuários: ' + error.message);
    }
  };

  const handleCreateBoard = async () => {
    if (!selectedUserId || !boardName.trim()) {
      toast.error('Selecione um usuário e informe o nome do board');
      return;
    }

    try {
      const { data: newBoard, error } = await supabase
        .from('kanban_boards' as any)
        .insert({
          name: boardName,
          created_by: selectedUserId,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Board criado com sucesso');
      setCreateOpen(false);
      setBoardName('');
      setSelectedUserId('');
      
      // Recarregar lista de boards e selecionar o novo
      await loadAllBoards();
      if (newBoard) {
        onBoardChange((newBoard as any).id);
      }
    } catch (error: any) {
      toast.error('Erro ao criar board: ' + error.message);
    }
  };

  const handleBoardSelect = (boardId: string) => {
    onBoardChange(boardId);
    setOpen(false);
    toast.success('Board alterado com sucesso');
  };

  return (
    <>
      <div className="flex gap-2">
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
              <Button 
                onClick={() => {
                  setOpen(false);
                  setCreateOpen(true);
                }}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Novo Board
              </Button>

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
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Board</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-select">Usuário</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="board-name">Nome do Board</Label>
              <Input
                id="board-name"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                placeholder="Ex: Projetos da Escola X"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateBoard}>
                Criar Board
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
