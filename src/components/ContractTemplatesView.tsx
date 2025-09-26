import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Info,
  Copy,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  template_content: string;
  plan_types: string[];
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

const ContractTemplatesView: React.FC = () => {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Partial<ContractTemplate>>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchPlans();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data || []).map(template => ({
        ...template,
        plan_types: Array.isArray(template.plan_types) 
          ? (template.plan_types as string[])
          : (template.plan_types as any)?.length 
            ? Array.from(template.plan_types as any)
            : ['all']
      })));
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar templates de contratos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('id, name, speed')
        .eq('active', true);

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTemplate = () => {
    setEditingTemplate({
      name: '',
      description: '',
      template_content: '',
      plan_types: ['all'],
      is_active: true,
      version: 1
    });
    setIsEditing(false);
    setShowTemplateModal(true);
  };

  const handleEditTemplate = (template: ContractTemplate) => {
    setEditingTemplate(template);
    setIsEditing(true);
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate.name || !editingTemplate.template_content) {
      toast({
        title: "Erro",
        description: "Nome e conteúdo do template são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isEditing && editingTemplate.id) {
        const { error } = await supabase
          .from('contract_templates')
          .update({
            name: editingTemplate.name,
            description: editingTemplate.description,
            template_content: editingTemplate.template_content,
            plan_types: editingTemplate.plan_types,
            is_active: editingTemplate.is_active
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contract_templates')
          .insert({
            name: editingTemplate.name,
            description: editingTemplate.description,
            template_content: editingTemplate.template_content,
            plan_types: editingTemplate.plan_types,
            is_active: editingTemplate.is_active,
            version: 1
          });

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: `Template ${isEditing ? 'atualizado' : 'criado'} com sucesso!`,
      });

      fetchTemplates();
      setShowTemplateModal(false);
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar template.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    try {
      const { error } = await supabase
        .from('contract_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Template excluído com sucesso!",
      });

      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir template.",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateTemplate = async (template: ContractTemplate) => {
    try {
      const { error } = await supabase
        .from('contract_templates')
        .insert({
          name: `${template.name} - Cópia`,
          description: template.description,
          template_content: template.template_content,
          plan_types: template.plan_types,
          is_active: false,
          version: 1
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Template duplicado com sucesso!",
      });

      fetchTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast({
        title: "Erro",
        description: "Erro ao duplicar template.",
        variant: "destructive",
      });
    }
  };

  const handlePreviewTemplate = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewModal(true);
  };

  const getPreviewHTML = (template: ContractTemplate) => {
    return template.template_content
      .replace(/\{\{CONTRACT_NUMBER\}\}/g, 'CT2025-000123')
      .replace(/\{\{CURRENT_DATE\}\}/g, format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))
      .replace(/\{\{CUSTOMER_NAME\}\}/g, 'João Silva Santos')
      .replace(/\{\{CUSTOMER_CPF\}\}/g, '123.456.789-00')
      .replace(/\{\{CUSTOMER_EMAIL\}\}/g, 'joao@email.com')
      .replace(/\{\{CUSTOMER_PHONE\}\}/g, '(61) 99999-9999')
      .replace(/\{\{CUSTOMER_ADDRESS\}\}/g, 'Rua das Flores, 123, Asa Norte, Brasília/DF')
      .replace(/\{\{CUSTOMER_CEP\}\}/g, '70000-000')
      .replace(/\{\{PLAN_NAME\}\}/g, 'Internet Fibra 200MB')
      .replace(/\{\{PLAN_SPEED\}\}/g, '200 Mbps')
      .replace(/\{\{PLAN_PRICE\}\}/g, '89,90')
      .replace(/\{\{PLAN_PRICE_WORDS\}\}/g, 'oitenta e nove reais e noventa centavos')
      .replace(/\{\{APPOINTMENT_DATE\}\}/g, '15/12/2024')
      .replace(/\{\{APPOINTMENT_PERIOD\}\}/g, 'Manhã (08h-12h)');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Carregando templates...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Templates de Contratos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleCreateTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Variables Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5" />
            Variáveis Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">Dados do Cliente:</p>
              <ul className="text-gray-600 mt-1 space-y-1">
                <li>{"{{CUSTOMER_NAME}}"}</li>
                <li>{"{{CUSTOMER_CPF}}"}</li>
                <li>{"{{CUSTOMER_EMAIL}}"}</li>
                <li>{"{{CUSTOMER_PHONE}}"}</li>
                <li>{"{{CUSTOMER_ADDRESS}}"}</li>
                <li>{"{{CUSTOMER_CEP}}"}</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">Dados do Plano:</p>
              <ul className="text-gray-600 mt-1 space-y-1">
                <li>{"{{PLAN_NAME}}"}</li>
                <li>{"{{PLAN_SPEED}}"}</li>
                <li>{"{{PLAN_PRICE}}"}</li>
                <li>{"{{PLAN_PRICE_WORDS}}"}</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">Agendamento:</p>
              <ul className="text-gray-600 mt-1 space-y-1">
                <li>{"{{APPOINTMENT_DATE}}"}</li>
                <li>{"{{APPOINTMENT_PERIOD}}"}</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">Sistema:</p>
              <ul className="text-gray-600 mt-1 space-y-1">
                <li>{"{{CONTRACT_NUMBER}}"}</li>
                <li>{"{{CURRENT_DATE}}"}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      <div className="grid gap-4">
        {filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Nenhum template encontrado' : 'Nenhum template criado'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? 'Tente ajustar os filtros de busca.' 
                  : 'Crie templates de contratos para diferentes tipos de planos.'
                }
              </p>
              {!searchTerm && (
                <Button onClick={handleCreateTemplate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Template
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredTemplates.map((template) => (
            <Card key={template.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{template.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        v{template.version}
                      </Badge>
                      {template.is_active ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-600 border-gray-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-600 mb-2">{template.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        Planos: {template.plan_types?.includes('all') ? 'Todos' : template.plan_types?.join(', ')}
                      </span>
                      <span>
                        Criado em {format(new Date(template.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreviewTemplate(template)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicateTemplate(template)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Duplicar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Template Editor Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Template' : 'Novo Template de Contrato'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome do Template *</Label>
                <Input
                  id="name"
                  value={editingTemplate.name || ''}
                  onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                  placeholder="Ex: Contrato Internet Residencial"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={editingTemplate.is_active || false}
                  onCheckedChange={(checked) => setEditingTemplate({...editingTemplate, is_active: checked})}
                />
                <Label htmlFor="is_active">Template Ativo</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={editingTemplate.description || ''}
                onChange={(e) => setEditingTemplate({...editingTemplate, description: e.target.value})}
                placeholder="Descrição do template..."
              />
            </div>

            <div>
              <Label htmlFor="plan_types">Tipos de Plano</Label>
              <Select
                value={editingTemplate.plan_types?.includes('all') ? 'all' : 'specific'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setEditingTemplate({...editingTemplate, plan_types: ['all']});
                  } else {
                    setEditingTemplate({...editingTemplate, plan_types: []});
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Planos</SelectItem>
                  <SelectItem value="specific">Planos Específicos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="template_content">Conteúdo do Template *</Label>
              <Textarea
                id="template_content"
                value={editingTemplate.template_content || ''}
                onChange={(e) => setEditingTemplate({...editingTemplate, template_content: e.target.value})}
                placeholder="HTML do contrato com variáveis {{CUSTOMER_NAME}}, {{PLAN_NAME}}, etc..."
                rows={15}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTemplateModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveTemplate}>
                {isEditing ? 'Atualizar' : 'Criar'} Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview - {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>

          {selectedTemplate && (
            <div 
              className="border rounded-lg p-4 bg-white"
              dangerouslySetInnerHTML={{ __html: getPreviewHTML(selectedTemplate) }}
            />
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractTemplatesView;