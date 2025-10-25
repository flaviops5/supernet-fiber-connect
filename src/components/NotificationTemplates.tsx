import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Edit, Eye, Save, X, AlertCircle, Mail } from "lucide-react";
import { EmailTemplateManagement } from './EmailTemplateManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { parseError } from "@/types/error.types";

interface Template {
  id: string;
  name: string;
  description: string | null;
  days_before_due: number;
  whatsapp_template: string;
  email_subject_template: string;
  email_body_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const NotificationTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('days_before_due', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      const err = parseError(error);
      console.error('Erro ao buscar templates:', err);
      toast({
        title: "Erro ao carregar templates",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSave = async () => {
    if (!editingTemplate) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_templates')
        .update({
          whatsapp_template: editingTemplate.whatsapp_template,
          email_subject_template: editingTemplate.email_subject_template,
          email_body_template: editingTemplate.email_body_template,
          is_active: editingTemplate.is_active,
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;

      toast({
        title: "Template salvo!",
        description: "As alterações foram salvas com sucesso.",
      });

      fetchTemplates();
      setEditingTemplate(null);
    } catch (error) {
      const err = parseError(error);
      console.error('Erro ao salvar template:', err);
      toast({
        title: "Erro ao salvar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const replaceVariables = (template: string, example: boolean = false) => {
    if (!example) return template;
    
    return template
      .replace(/\{\{cliente_nome\}\}/g, 'João Silva')
      .replace(/\{\{valor\}\}/g, 'R$ 99,90')
      .replace(/\{\{data_vencimento\}\}/g, '15/01/2025');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Templates de Notificação
          </h2>
          <p className="text-muted-foreground mt-1">
            Personalize as mensagens e emails enviados aos clientes
          </p>
        </div>
      </div>

      <Tabs defaultValue="whatsapp" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="whatsapp">WhatsApp & Email</TabsTrigger>
          <TabsTrigger value="email">Templates de Email</TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-6">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm">ℹ️ Variáveis disponíveis</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>• <code className="bg-white px-2 py-1 rounded">{'{{cliente_nome}}'}</code> - Nome do cliente (primeiro e segundo nome)</p>
          <p>• <code className="bg-white px-2 py-1 rounded">{'{{valor}}'}</code> - Valor da fatura formatado (ex: R$ 99,90)</p>
          <p>• <code className="bg-white px-2 py-1 rounded">{'{{data_vencimento}}'}</code> - Data de vencimento formatada (ex: 15/01/2025)</p>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Carregando templates...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {template.name}
                      <Badge variant={template.is_active ? "default" : "secondary"}>
                        {template.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Preview - {template.name}</DialogTitle>
                          <DialogDescription>
                            Visualização com dados de exemplo
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                          <div>
                            <h3 className="font-semibold mb-2">📱 WhatsApp</h3>
                            <div className="bg-green-50 border border-green-200 p-4 rounded-lg whitespace-pre-wrap">
                              {replaceVariables(template.whatsapp_template, true)}
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="font-semibold mb-2">✉️ Email - Assunto</h3>
                            <div className="bg-muted p-3 rounded-lg">
                              {replaceVariables(template.email_subject_template, true)}
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="font-semibold mb-2">Email - Corpo (HTML)</h3>
                            <div className="border rounded-lg p-4 bg-white">
                              <div dangerouslySetInnerHTML={{ 
                                __html: replaceVariables(template.email_body_template, true) 
                              }} />
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={editingTemplate?.id === template.id} onOpenChange={(open) => {
                      if (!open) setEditingTemplate(null);
                      else setEditingTemplate(template);
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="default" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Editar Template - {template.name}</DialogTitle>
                          <DialogDescription>
                            Use as variáveis para personalizar: {'{{cliente_nome}}, {{valor}}, {{data_vencimento}}'}
                          </DialogDescription>
                        </DialogHeader>
                        
                        {editingTemplate && (
                          <div className="space-y-6">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="is_active"
                                checked={editingTemplate.is_active}
                                onCheckedChange={(checked) =>
                                  setEditingTemplate({ ...editingTemplate, is_active: checked })
                                }
                              />
                              <Label htmlFor="is_active">Template ativo</Label>
                            </div>

                            <div className="space-y-2">
                              <Label>Mensagem WhatsApp</Label>
                              <Textarea
                                value={editingTemplate.whatsapp_template}
                                onChange={(e) =>
                                  setEditingTemplate({
                                    ...editingTemplate,
                                    whatsapp_template: e.target.value,
                                  })
                                }
                                rows={8}
                                className="font-mono text-sm"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Assunto do Email</Label>
                              <Input
                                value={editingTemplate.email_subject_template}
                                onChange={(e) =>
                                  setEditingTemplate({
                                    ...editingTemplate,
                                    email_subject_template: e.target.value,
                                  })
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Corpo do Email (HTML)</Label>
                              <Textarea
                                value={editingTemplate.email_body_template}
                                onChange={(e) =>
                                  setEditingTemplate({
                                    ...editingTemplate,
                                    email_body_template: e.target.value,
                                  })
                                }
                                rows={15}
                                className="font-mono text-sm"
                              />
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setEditingTemplate(null)}
                                disabled={saving}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancelar
                              </Button>
                              <Button onClick={handleSave} disabled={saving}>
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? "Salvando..." : "Salvar Alterações"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Dias antes do vencimento</p>
                    <p className="font-semibold">{template.days_before_due} dias</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Última atualização</p>
                    <p className="font-semibold">
                      {new Date(template.updated_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-semibold">
                      {template.is_active ? "✅ Ativo" : "⏸️ Inativo"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </TabsContent>

        <TabsContent value="email">
          <EmailTemplateManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};
