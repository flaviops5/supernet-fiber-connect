import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface CompanySettings {
  id: string;
  company_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  auth_title: string;
  auth_subtitle: string;
  auth_background_color: string;
  auth_gradient_from: string;
  auth_gradient_to: string;
  signup_enabled: boolean;
  whatsapp_notification_phones: string[] | null;
  whatsapp_instance_name: string;
}

export const CompanySettingsForm = () => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use PNG, JPG, SVG ou WEBP');
      return;
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo: 2MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setSettings(prev => prev ? { ...prev, logo_url: publicUrl } : null);
      toast.success('Logo enviado com sucesso!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erro ao enviar logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_settings')
        .update({
          company_name: settings.company_name,
          logo_url: settings.logo_url,
          primary_color: settings.primary_color,
          secondary_color: settings.secondary_color,
          phone: settings.phone,
          email: settings.email,
          address: settings.address,
          auth_title: settings.auth_title,
          auth_subtitle: settings.auth_subtitle,
          auth_background_color: settings.auth_background_color,
          auth_gradient_from: settings.auth_gradient_from,
          auth_gradient_to: settings.auth_gradient_to,
          signup_enabled: settings.signup_enabled,
          whatsapp_notification_phones: settings.whatsapp_notification_phones,
          whatsapp_instance_name: settings.whatsapp_instance_name,
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast.success('Configurações salvas com sucesso!');
      
      // Recarregar para atualizar sidebar
      window.location.reload();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8">Carregando...</div>;
  }

  if (!settings) {
    return <div className="text-center p-8">Erro ao carregar configurações</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identidade Visual</CardTitle>
          <CardDescription>Configure a logomarca e cores da empresa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Logomarca</Label>
            <div className="flex items-start gap-4">
              {settings.logo_url && (
                <div className="flex-shrink-0">
                  <img 
                    src={settings.logo_url} 
                    alt="Logo da empresa" 
                    className="h-24 w-auto max-w-[200px] object-contain border rounded-lg p-3 bg-white"
                  />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <label htmlFor="logo-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      {uploading ? (
                        <>
                          <Upload className="h-8 w-8 animate-bounce text-primary" />
                          <span className="text-sm text-muted-foreground">Enviando...</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm font-medium">Clique para fazer upload</span>
                          <span className="text-xs text-muted-foreground">
                            PNG, JPG, SVG, WEBP (máx. 2MB)
                          </span>
                        </>
                      )}
                    </div>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tamanho recomendado: 200x60px (formato horizontal)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Cor Primária</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  placeholder="#ef4444"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary-color">Cor Secundária</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={settings.secondary_color}
                  onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={settings.secondary_color}
                  onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                  placeholder="#fb7185"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Empresa</CardTitle>
          <CardDescription>Dados de contato e identificação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nome da Empresa</Label>
            <Input
              id="company-name"
              value={settings.company_name}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              placeholder="SUPERNET FIBRA"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={settings.email || ''}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="contato@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                value={settings.phone || ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={settings.address || ''}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              placeholder="Rua Exemplo, 123 - Cidade, UF"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações WhatsApp</CardTitle>
          <CardDescription>Configure números para receber notificações de instalações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp-phones">Números WhatsApp</Label>
            <Input
              id="whatsapp-phones"
              value={settings.whatsapp_notification_phones?.join(', ') || ''}
              onChange={(e) => {
                const phones = e.target.value
                  .split(',')
                  .map(p => p.trim())
                  .filter(p => p.length > 0);
                setSettings({ ...settings, whatsapp_notification_phones: phones });
              }}
              placeholder="5561999999999, 5561988888888"
            />
            <p className="text-xs text-muted-foreground">
              Números que receberão notificações quando instalações forem concluídas (formato: DDI + DDD + número, separados por vírgula)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp-instance">Instância Evolution API</Label>
            <Input
              id="whatsapp-instance"
              value={settings.whatsapp_instance_name}
              onChange={(e) => setSettings({ ...settings, whatsapp_instance_name: e.target.value })}
              placeholder="SDR2"
            />
            <p className="text-xs text-muted-foreground">
              Nome da instância configurada na Evolution API
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tela de Autenticação</CardTitle>
          <CardDescription>Personalize a página de login/cadastro</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auth-title">Título</Label>
            <Input
              id="auth-title"
              value={settings.auth_title}
              onChange={(e) => setSettings({ ...settings, auth_title: e.target.value })}
              placeholder="ÁREA ADMIN"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-subtitle">Subtítulo</Label>
            <Input
              id="auth-subtitle"
              value={settings.auth_subtitle}
              onChange={(e) => setSettings({ ...settings, auth_subtitle: e.target.value })}
              placeholder="Informe seus dados de acesso."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="auth-bg">Cor de Fundo</Label>
              <div className="flex gap-2">
                <Input
                  id="auth-bg"
                  type="color"
                  value={settings.auth_background_color}
                  onChange={(e) => setSettings({ ...settings, auth_background_color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={settings.auth_background_color}
                  onChange={(e) => setSettings({ ...settings, auth_background_color: e.target.value })}
                  placeholder="#ef4444"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-gradient-from">Gradiente (Início)</Label>
              <div className="flex gap-2">
                <Input
                  id="auth-gradient-from"
                  type="color"
                  value={settings.auth_gradient_from}
                  onChange={(e) => setSettings({ ...settings, auth_gradient_from: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={settings.auth_gradient_from}
                  onChange={(e) => setSettings({ ...settings, auth_gradient_from: e.target.value })}
                  placeholder="#ef4444"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-gradient-to">Gradiente (Fim)</Label>
              <div className="flex gap-2">
                <Input
                  id="auth-gradient-to"
                  type="color"
                  value={settings.auth_gradient_to}
                  onChange={(e) => setSettings({ ...settings, auth_gradient_to: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={settings.auth_gradient_to}
                  onChange={(e) => setSettings({ ...settings, auth_gradient_to: e.target.value })}
                  placeholder="#fb7185"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-t">
            <div className="space-y-0.5">
              <Label htmlFor="signup-enabled">Permitir Cadastro</Label>
              <p className="text-sm text-muted-foreground">
                Permitir que novos usuários se cadastrem
              </p>
            </div>
            <Switch
              id="signup-enabled"
              checked={settings.signup_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, signup_enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button onClick={loadSettings} variant="outline" disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="min-w-32">
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
};