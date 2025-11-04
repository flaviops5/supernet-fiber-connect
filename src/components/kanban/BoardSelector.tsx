import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, LayoutGrid } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Board {
  id: string;
  title: string;
  created_at: string;
}

interface BoardSelectorProps {
  currentBoardId: string;
  onBoardChange: (boardId: string) => void;
  onCreateBoard: () => void;
}

export function BoardSelector({ currentBoardId, onBoardChange, onCreateBoard }: BoardSelectorProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Query 1: Buscar boards criados pelo usuário
      const { data: created, error: err1 } = await supabase
        .from('kanban_boards' as any)
        .select('id, title, created_at')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (err1) throw err1;

      // Query 2: Buscar boards onde usuário é membro (JOIN manual)
      const { data: memberships, error: err2 } = await supabase
        .from('kanban_board_members' as any)
        .select('board_id')
        .eq('user_id', user.id);

      // Buscar detalhes dos boards das memberships
      const memberBoardIds = (memberships as any)?.map((m: any) => m.board_id) || [];
      let memberBoards: any[] = [];
      
      if (memberBoardIds.length > 0) {
        const { data: memberBoardData } = await supabase
          .from('kanban_boards' as any)
          .select('id, title, created_at')
          .in('id', memberBoardIds);
        
        memberBoards = memberBoardData || [];
      }

      // Combinar e remover duplicatas
      const allBoards = [...((created as any) || []), ...memberBoards];
      const unique = new Map<string, Board>();
      allBoards.forEach((b: any) => {
        if (b?.id) unique.set(b.id, { id: b.id, title: b.title, created_at: b.created_at });
      });
      
      const sorted = Array.from(unique.values()).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setBoards(sorted);
    } catch (error: any) {
      console.error('Error loading boards:', error);
      toast({
        title: 'Erro ao carregar boards',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBoardChange = async (newBoardId: string) => {
    if (switching || newBoardId === currentBoardId) return;
    
    setSwitching(true);
    try {
      // Add delay to ensure complete cleanup of previous board
      await new Promise(resolve => setTimeout(resolve, 300));
      onBoardChange(newBoardId);
      // Wait for new board to mount
      await new Promise(resolve => setTimeout(resolve, 800));
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <LayoutGrid className="h-4 w-4 text-muted-foreground" />
      <Select 
        value={currentBoardId} 
        onValueChange={handleBoardChange} 
        disabled={loading || switching}
      >
        <SelectTrigger className="w-64">
          <SelectValue placeholder={switching ? "Carregando..." : "Selecione um board"} />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          {boards.map((board) => (
            <SelectItem key={board.id} value={board.id}>
              {board.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button 
        variant="outline" 
        size="icon"
        onClick={onCreateBoard}
        title="Criar novo board"
        disabled={switching}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
