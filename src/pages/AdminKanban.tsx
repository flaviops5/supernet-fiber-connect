import { useState, useEffect } from "react";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

const AdminKanban = () => {
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");

  useEffect(() => {
    const loadDefaultBoard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: boards } = await supabase
        .from('kanban_boards' as any)
        .select('id')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (boards && boards.length > 0) {
        setSelectedBoardId((boards as any)[0].id);
      } else {
        // Criar board padrão
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
      }
    };

    loadDefaultBoard();
  }, []);

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
