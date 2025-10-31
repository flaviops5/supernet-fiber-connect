import { useState, useEffect } from "react";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { KanbanDashboard } from "@/components/kanban/KanbanDashboard";
import { KanbanAutomations } from "@/components/kanban/KanbanAutomations";
import { KanbanTemplates } from "@/components/kanban/KanbanTemplates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/admin/PageHeader";
import { useKanban } from "@/hooks/useKanban";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminKanban = () => {
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const { columns, cards } = useKanban(selectedBoardId);

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

  const handleTemplateSelect = async (template: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (template) {
      const { data: newBoard } = await supabase
        .from('kanban_boards' as any)
        .insert({
          title: template.name,
          created_by: user.id,
        })
        .select()
        .single();

      if (newBoard && template.structure) {
        // Criar colunas do template
        const columns = template.structure as any;
        for (const col of columns) {
          await supabase.from('kanban_columns' as any).insert({
            board_id: (newBoard as any).id,
            title: col.title,
            position: col.position,
          });
        }
        
        setSelectedBoardId((newBoard as any).id);
        toast.success("Quadro criado a partir do template!");
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kanban"
        description="Gerencie projetos e tarefas com quadros Kanban"
      />

      <Tabs defaultValue="board" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="board">Quadro</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="automations">Automações</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-6">
          {selectedBoardId && <KanbanBoard boardId={selectedBoardId} />}
        </TabsContent>

        <TabsContent value="dashboard" className="mt-6">
          <KanbanDashboard columns={columns} cards={cards} />
        </TabsContent>

        <TabsContent value="automations" className="mt-6">
          {selectedBoardId && <KanbanAutomations boardId={selectedBoardId} />}
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <KanbanTemplates onSelectTemplate={handleTemplateSelect} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminKanban;
