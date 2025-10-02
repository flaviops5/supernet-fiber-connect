import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  variables: string[];
}

export const EmailTestSender = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [toEmail, setToEmail] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('id, name, slug, subject, variables')
        .eq('is_active', true);

      if (error) throw error;
      setTemplates((data || []).map(t => ({
        ...t,
        variables: Array.isArray(t.variables) ? t.variables as string[] : []
      })));
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (templateSlug: string) => {
    setSelectedTemplate(templateSlug);
    const template = templates.find(t => t.slug === templateSlug);
    
    if (template) {
      // Initialize variables object with empty strings
      const initialVars: Record<string, string> = {};
      (template.variables || []).forEach(varName => {
        initialVars[varName] = '';
      });
      setVariables(initialVars);
    }
  };

  const handleSendTest = async () => {
    if (!toEmail || !selectedTemplate) {
      toast.error('Preencha o email de destino e selecione um template');
      return;
    }

    // Validate variables
    const template = templates.find(t => t.slug === selectedTemplate);
    if (template) {
      const emptyVars = (template.variables || []).filter(v => !variables[v]);
      if (emptyVars.length > 0) {
        toast.error(`Preencha as variáveis: ${emptyVars.join(', ')}`);
        return;
      }
    }

    try {
      setSending(true);

      const { data, error } = await supabase.functions.invoke('send-locaweb-email', {
        body: {
          to: toEmail,
          template_slug: selectedTemplate,
          template_variables: variables
        }
      });

      if (error) throw error;

      toast.success('Email de teste enviado com sucesso!');
      console.log('Email sent:', data);
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Erro ao enviar email de teste');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Carregando templates...</p>
        </CardContent>
      </Card>
    );
  }

  const selectedTemplateData = templates.find(t => t.slug === selectedTemplate);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Testar Envio de Email
        </CardTitle>
        <CardDescription>
          Envie um email de teste usando os templates criados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="test_email">Email de Destino</Label>
            <Input
              id="test_email"
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
            />
            <p className="text-xs text-muted-foreground">
              Email onde o teste será enviado
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.slug}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Template que será usado no envio
            </p>
          </div>
        </div>

        {selectedTemplateData && (
          <>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-semibold mb-1">Assunto do Email:</p>
              <p className="text-sm text-muted-foreground">{selectedTemplateData.subject}</p>
            </div>

            {selectedTemplateData.variables && selectedTemplateData.variables.length > 0 && (
              <div className="space-y-4">
                <Label className="text-base">Variáveis do Template</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  {selectedTemplateData.variables.map((varName) => (
                    <div key={varName} className="space-y-2">
                      <Label htmlFor={varName} className="text-sm">
                        {varName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </Label>
                      <Input
                        id={varName}
                        value={variables[varName] || ''}
                        onChange={(e) => setVariables({ ...variables, [varName]: e.target.value })}
                        placeholder={`Valor para ${varName}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleSendTest} 
            disabled={sending || !toEmail || !selectedTemplate}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Email de Teste
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
