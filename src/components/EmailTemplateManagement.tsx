import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Eye, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailTestSender } from './EmailTestSender';
import { parseError } from '@/types/error.types';

interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  body_html: string;
  body_plain?: string;
  description?: string;
  variables: string[];
  category: string;
  is_active: boolean;
  created_at: string;
}

export function EmailTemplateManagement() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    subject: '',
    body_html: '',
    body_plain: '',
    description: '',
    variables: [] as string[],
    category: 'geral',
    is_active: true,
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const templatesWithParsedVars = (data || []).map(template => ({
        ...template,
        variables: Array.isArray(template.variables) 
          ? template.variables.filter((v): v is string => typeof v === 'string')
          : []
      }));
      
      setTemplates(templatesWithParsedVars);
    } catch (error) {
      const err = parseError(error);
      toast.error('Erro ao carregar templates: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const templateData = {
        ...formData,
        variables: formData.variables,
      };

      if (selectedTemplate) {
        const { error } = await supabase
          .from('email_templates')
          .update(templateData)
          .eq('id', selectedTemplate.id);

        if (error) throw error;
        toast.success('Template atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert([templateData]);

        if (error) throw error;
        toast.success('Template criado com sucesso!');
      }

      setIsDialogOpen(false);
      resetForm();
      loadTemplates();
    } catch (error) {
      const err = parseError(error);
      toast.error('Erro ao salvar template: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Template excluído com sucesso!');
      loadTemplates();
    } catch (error) {
      const err = parseError(error);
      toast.error('Erro ao excluir template: ' + err.message);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      slug: template.slug,
      subject: template.subject,
      body_html: template.body_html,
      body_plain: template.body_plain || '',
      description: template.description || '',
      variables: template.variables,
      category: template.category,
      is_active: template.is_active,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedTemplate(null);
    setFormData({
      name: '',
      slug: '',
      subject: '',
      body_html: '',
      body_plain: '',
      description: '',
      variables: [],
      category: 'geral',
      is_active: true,
    });
  };

  const handleVariablesChange = (value: string) => {
    const vars = value.split(',').map(v => v.trim()).filter(v => v);
    setFormData({ ...formData, variables: vars });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Templates de Email</h2>
          <p className="text-muted-foreground">Gerencie os templates de email com formatação HTML</p>
        </div>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList>
          <TabsTrigger value="templates">Gerenciar Templates</TabsTrigger>
          <TabsTrigger value="test">Testar Envio</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6 mt-6">
          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Template
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTemplate ? 'Editar' : 'Novo'} Template</DialogTitle>
              <DialogDescription>
                Crie ou edite templates de email com variáveis dinâmicas usando {`{{variavel}}`}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Template</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Contrato de Instalação"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (identificador único)</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder="contrato-instalacao"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Assunto do Email</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Seu Contrato SUPERNET FIBRA"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Geral</SelectItem>
                    <SelectItem value="contratos">Contratos</SelectItem>
                    <SelectItem value="agendamentos">Agendamentos</SelectItem>
                    <SelectItem value="pagamentos">Pagamentos</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Breve descrição do template"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="variables">Variáveis (separadas por vírgula)</Label>
                <Input
                  id="variables"
                  value={formData.variables.join(', ')}
                  onChange={(e) => handleVariablesChange(e.target.value)}
                  placeholder="nome_cliente, plano_nome, valor"
                />
                <p className="text-xs text-muted-foreground">
                  Use {`{{variavel}}`} no HTML para inserir valores dinâmicos
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="body_html">Corpo do Email (HTML)</Label>
                <Textarea
                  id="body_html"
                  value={formData.body_html}
                  onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
                  placeholder="<h1>Olá, {{nome_cliente}}!</h1>"
                  className="font-mono text-sm min-h-[300px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body_plain">Texto Simples (Opcional)</Label>
                <Textarea
                  id="body_plain"
                  value={formData.body_plain}
                  onChange={(e) => setFormData({ ...formData, body_plain: e.target.value })}
                  placeholder="Versão em texto simples do email"
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Template Ativo</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {selectedTemplate ? 'Atualizar' : 'Criar'} Template
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{template.name}</CardTitle>
                      {!template.is_active && (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                      <Badge variant="outline">{template.category}</Badge>
                    </div>
                    <CardDescription>{template.description}</CardDescription>
                    <p className="text-sm text-muted-foreground">
                      <strong>Assunto:</strong> {template.subject}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setIsPreviewOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {template.variables.map((variable) => (
                    <Badge key={variable} variant="secondary" className="text-xs">
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </TabsContent>

        <TabsContent value="test" className="mt-6">
          <EmailTestSender />
        </TabsContent>
      </Tabs>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>Visualização do template de email</DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <Label>Assunto</Label>
                <p className="text-sm font-medium mt-1">{selectedTemplate.subject}</p>
              </div>
              <div>
                <Label>Conteúdo HTML</Label>
                <div 
                  className="border rounded-lg p-4 mt-2"
                  dangerouslySetInnerHTML={{ __html: selectedTemplate.body_html }}
                />
              </div>
              <div>
                <Label>Código HTML</Label>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto mt-2">
                  {selectedTemplate.body_html}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
