import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Brain, Plus, Search, Edit, Trash2, Folder, File, ChevronRight, Home, FolderPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  content_type: 'text' | 'document' | 'video' | 'training';
  category: string;
  tags: string[];
  agent_types: string[];
  parent_id: string | null;
  is_folder: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const KnowledgeManagement = () => {
  const { toast } = useToast();
  const [allItems, setAllItems] = useState<KnowledgeItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string | null; title: string }>>([{ id: null, title: 'Raiz' }]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  
  const [newItem, setNewItem] = useState({
    title: '',
    content: '',
    content_type: 'document' as 'text' | 'document' | 'video' | 'training',
    category: '',
    tags: [] as string[],
    agent_types: [] as string[],
    is_folder: false
  });

  const agentTypes = [
    { value: 'sales', label: 'Vendas' },
    { value: 'support_financial', label: 'Suporte Financeiro' },
    { value: 'support_tech', label: 'Suporte Técnico' },
    { value: 'routing', label: 'Roteamento' }
  ];

  const categories = [
    'sales', 'support_financial', 'support_tech', 
    'IXC_system', 'company', 'procedimentos', 
    'políticas', 'treinamento', 'FAQ', 'técnico'
  ];

  const loadKnowledgeItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      const formattedItems = (data || []).map(item => ({
        ...item,
        content_type: item.content_type as 'text' | 'document' | 'video' | 'training'
      }));
      setAllItems(formattedItems);
    } catch (error) {
      console.error('Error loading knowledge items:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar base de conhecimento",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledgeItems();
  }, []);

  const getCurrentItems = () => {
    return allItems.filter(item => item.parent_id === currentFolderId);
  };

  const getFilteredItems = () => {
    const items = getCurrentItems();
    if (!searchTerm) return items;
    
    return items.filter(item =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const navigateToFolder = (folderId: string | null, folderTitle: string) => {
    setCurrentFolderId(folderId);
    
    if (folderId === null) {
      setBreadcrumbs([{ id: null, title: 'Raiz' }]);
    } else {
      const existingIndex = breadcrumbs.findIndex(b => b.id === folderId);
      if (existingIndex >= 0) {
        setBreadcrumbs(breadcrumbs.slice(0, existingIndex + 1));
      } else {
        setBreadcrumbs([...breadcrumbs, { id: folderId, title: folderTitle }]);
      }
    }
  };

  const handleItemClick = (item: KnowledgeItem) => {
    if (item.is_folder) {
      navigateToFolder(item.id, item.title);
    }
  };

  const handleSave = async () => {
    if (!newItem.title || (!newItem.is_folder && !newItem.content)) {
      toast({
        title: "Erro",
        description: newItem.is_folder ? "Título é obrigatório" : "Título e conteúdo são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const itemData = {
        ...newItem,
        parent_id: currentFolderId,
        content: newItem.is_folder ? '' : newItem.content,
        agent_types: newItem.agent_types.length === 0 ? [] : newItem.agent_types
      };

      if (editingItem) {
        const { error } = await supabase
          .from('knowledge_base')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: newItem.is_folder ? "Pasta atualizada" : "Item atualizado"
        });
      } else {
        const { error } = await supabase
          .from('knowledge_base')
          .insert(itemData);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: newItem.is_folder ? "Pasta criada" : "Item adicionado"
        });
      }

      closeDialog();
      loadKnowledgeItems();
    } catch (error) {
      console.error('Error saving knowledge item:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setCreatingFolder(false);
    setNewItem({
      title: '',
      content: '',
      content_type: 'document',
      category: '',
      tags: [],
      agent_types: [],
      is_folder: false
    });
  };

  const handleEdit = (item: KnowledgeItem) => {
    setEditingItem(item);
    setNewItem({
      title: item.title,
      content: item.content || '',
      content_type: item.content_type,
      category: item.category,
      tags: item.tags,
      agent_types: item.agent_types || [],
      is_folder: item.is_folder
    });
    setCreatingFolder(item.is_folder);
    setIsDialogOpen(true);
  };

  const handleDelete = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .update({ is_active: false })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Item excluído com sucesso"
      });
      loadKnowledgeItems();
    } catch (error) {
      console.error('Error deleting knowledge item:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir item",
        variant: "destructive"
      });
    }
  };

  const handleToggleActive = async (itemId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .update({ is_active: !currentStatus })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Item ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`
      });
      loadKnowledgeItems();
    } catch (error) {
      console.error('Error toggling knowledge item:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do item",
        variant: "destructive"
      });
    }
  };

  const handleAgentToggle = (agentType: string) => {
    setNewItem(prev => ({
      ...prev,
      agent_types: prev.agent_types.includes(agentType)
        ? prev.agent_types.filter(a => a !== agentType)
        : [...prev.agent_types, agentType]
    }));
  };

  const openNewItemDialog = () => {
    setCreatingFolder(false);
    setNewItem({
      title: '',
      content: '',
      content_type: 'document',
      category: '',
      tags: [],
      agent_types: [],
      is_folder: false
    });
    setIsDialogOpen(true);
  };

  const openNewFolderDialog = () => {
    setCreatingFolder(true);
    setNewItem({
      title: '',
      content: '',
      content_type: 'document',
      category: '',
      tags: [],
      agent_types: [],
      is_folder: true
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Base de Conhecimento</h2>
            <p className="text-sm text-muted-foreground">Organize em pastas e atribua aos agentes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={openNewFolderDialog} variant="outline" size="sm">
            <FolderPlus className="h-4 w-4 mr-2" />
            Nova Pasta
          </Button>
          <Button onClick={openNewItemDialog} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo Item
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <Card className="p-3">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.id || 'root'}>
              <button
                onClick={() => navigateToFolder(crumb.id, crumb.title)}
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                {index === 0 && <Home className="h-4 w-4" />}
                <span>{crumb.title}</span>
              </button>
              {index < breadcrumbs.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Items Grid */}
      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="text-center py-12">Carregando...</div>
          ) : getFilteredItems().length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? 'Nenhum item encontrado' : 'Pasta vazia'}
            </div>
          ) : (
            <div className="grid gap-3">
              {getFilteredItems().map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors group"
                >
                  <button
                    onClick={() => handleItemClick(item)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    {item.is_folder ? (
                      <Folder className="h-5 w-5 text-primary flex-shrink-0" />
                    ) : (
                      <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium truncate">{item.title}</div>
                      {!item.is_folder && (
                        <div className="text-xs text-muted-foreground truncate">
                          {item.category} • {item.agent_types.length === 0 ? 'Todos os agentes' : item.agent_types.join(', ')}
                        </div>
                      )}
                    </div>
                  </button>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={item.is_active ? "default" : "secondary"} className="text-xs">
                      {item.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Deseja realmente excluir "{item.title}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(item.id)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? (creatingFolder ? 'Editar Pasta' : 'Editar Item') : (creatingFolder ? 'Nova Pasta' : 'Novo Item')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={newItem.title}
                onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                placeholder={creatingFolder ? "Nome da pasta" : "Título do conhecimento"}
              />
            </div>

            {!creatingFolder && (
              <>
                <div>
                  <Label>Categoria *</Label>
                  <Input
                    value={newItem.category}
                    onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Ex: sales, support_tech, FAQ"
                    list="categories"
                  />
                  <datalist id="categories">
                    {categories.map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                </div>

                <div>
                  <Label>Agentes com acesso</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="all-agents"
                        checked={newItem.agent_types.length === 0}
                        onCheckedChange={(checked) => {
                          if (checked) setNewItem(prev => ({ ...prev, agent_types: [] }));
                        }}
                      />
                      <label htmlFor="all-agents" className="text-sm">
                        Todos os agentes
                      </label>
                    </div>
                    {agentTypes.map(agent => (
                      <div key={agent.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={agent.value}
                          checked={newItem.agent_types.includes(agent.value)}
                          onCheckedChange={() => handleAgentToggle(agent.value)}
                          disabled={newItem.agent_types.length === 0}
                        />
                        <label htmlFor={agent.value} className="text-sm">
                          {agent.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Conteúdo *</Label>
                  <Textarea
                    value={newItem.content}
                    onChange={(e) => setNewItem(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Conteúdo que a IA deve conhecer..."
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>
              </>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgeManagement;