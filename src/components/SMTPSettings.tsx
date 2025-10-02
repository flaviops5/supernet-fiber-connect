import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Info, Save } from "lucide-react";

interface EmailSettings {
  id?: string;
  default_from_email: string;
  default_from_name: string;
}

export const SMTPSettings = () => {
  const [settings, setSettings] = useState<EmailSettings>({
    default_from_email: "contato@supernet.com.br",
    default_from_name: "SUPERNET FIBRA"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('email_settings')
        .select('*')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
      toast.error('Erro ao carregar configurações de email');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (settings.id) {
        // Update existing
        const { error } = await supabase
          .from('email_settings')
          .update({
            default_from_email: settings.default_from_email,
            default_from_name: settings.default_from_name,
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('email_settings')
          .insert({
            default_from_email: settings.default_from_email,
            default_from_name: settings.default_from_name,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setSettings(data);
      }

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Carregando configurações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Servidor SMTP:</strong> O sistema usa a API Locaweb para envio de emails. 
          O token de autenticação está configurado de forma segura nos secrets do sistema.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Configurações de Email</CardTitle>
          <CardDescription>
            Configure o remetente padrão para os emails enviados pelo sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="from_email">Email do Remetente</Label>
              <Input
                id="from_email"
                type="email"
                value={settings.default_from_email}
                onChange={(e) => setSettings({ ...settings, default_from_email: e.target.value })}
                placeholder="contato@supernet.com.br"
              />
              <p className="text-xs text-muted-foreground">
                Email que aparecerá como remetente nas mensagens
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="from_name">Nome do Remetente</Label>
              <Input
                id="from_name"
                type="text"
                value={settings.default_from_name}
                onChange={(e) => setSettings({ ...settings, default_from_name: e.target.value })}
                placeholder="SUPERNET FIBRA"
              />
              <p className="text-xs text-muted-foreground">
                Nome que aparecerá como remetente nas mensagens
              </p>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Info className="h-4 w-4" />
              Informações da API Locaweb
            </h4>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p>• <strong>Provedor:</strong> Locaweb Email API</p>
              <p>• <strong>Endpoint:</strong> https://api.locaweb.com.br/v3/</p>
              <p>• <strong>Autenticação:</strong> Token configurado em secrets</p>
              <p>• <strong>Limite de envios:</strong> Conforme plano contratado</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
