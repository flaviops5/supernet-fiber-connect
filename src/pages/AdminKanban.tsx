import { useState, useEffect } from "react";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

const AdminKanban = () => {
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");

  useEffect(() => {
    const loadDefaultBoard = async () => {
      // Priorizar último board usado, se existir
      const saved = localStorage.getItem('lastKanbanBoardId');
      if (saved) {
        setSelectedBoardId(saved);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar boards onde o usuário é owner ou membro
      const { data, error } = await supabase
        .from('kanban_boards' as any)
        .select('id, created_at, kanban_board_members!left(user_id)')
        .or(`created_by.eq.${user.id},kanban_board_members.user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        setSelectedBoardId((data as any)[0].id);
        return;
      }

      // Se não houver, criar board padrão
      const { data: newBoard } = await supabase
        .from('kanban_boards' as any)
        .insert({
          title: 'Meu Quadro',
          created_by: user.id,
        })
        .select()
        .single();

      if (newBoard) {
        setSelectedBoardId((newBoard as any).id);
      }
    };

    loadDefaultBoard();
  }, []);

  useEffect(() => {
    if (selectedBoardId) {
      localStorage.setItem('lastKanbanBoardId', selectedBoardId);
    }
  }, [selectedBoardId]);

  return (
    <div className="space-y-6">
      <button 
        onClick={() => window.location.href = '/admin'}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Voltar ao Menu</span>
      </button>

      {selectedBoardId && (
        <KanbanBoard 
          key={selectedBoardId}
          boardId={selectedBoardId} 
          onBoardChange={setSelectedBoardId}
        />
      )}
    </div>
  );
};

export default AdminKanban;
