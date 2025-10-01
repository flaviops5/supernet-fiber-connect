import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, Image, Video, FileAudio } from 'lucide-react';

interface CampaignFormProps {
  onSuccess: () => void;
}

export function CampaignForm({ onSuccess }: CampaignFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'marketing',
    channels: ['whatsapp'],
    contentText: '',
    mediaType: '',
    mediaUrl: '',
    ctaType: 'none',
    ctaConfig: {},
    targetFilters: {},
  });

  const [mediaFile, setMediaFile] = useState<File | null>(null);

  const handleMediaUpload = async (file: File) => {
    try {
      setUploadingMedia(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('campaign-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('campaign-media')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, mediaUrl: publicUrl }));
      
      toast({
        title: 'Upload concluído',
        description: 'Mídia enviada com sucesso',
      });
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível enviar a mídia',
        variant: 'destructive',
      });
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Criar campanha
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert([{
          name: formData.name,
          description: formData.description,
          type: formData.type as any,
          channels: formData.channels as any,
          target_filters: formData.targetFilters,
          status: 'draft' as any,
        }])
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Criar conteúdo
      const { error: contentError } = await supabase
        .from('campaign_content')
        .insert([{
          campaign_id: campaign.id,
          content_text: formData.contentText,
          media_type: formData.mediaType || null,
          media_url: formData.mediaUrl || null,
          cta_type: formData.ctaType as any,
          cta_config: formData.ctaConfig,
        }]);

      if (contentError) throw contentError;

      // Criar registro de stats
      const { error: statsError } = await supabase
        .from('campaign_stats')
        .insert({
          campaign_id: campaign.id,
          total_recipients: 0,
          total_sent: 0,
          total_delivered: 0,
          total_failed: 0,
        });

      if (statsError) throw statsError;

      toast({
        title: 'Campanha criada',
        description: 'Campanha criada com sucesso como rascunho',
      });

      onSuccess();
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a campanha',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const channelOptions = [
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'sms', label: 'SMS' },
    { value: 'email', label: 'Email' },
    { value: 'call', label: 'Ligação' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
          <CardDescription>Defina o nome e tipo da campanha</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Campanha *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Promoção Black Friday 2024"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o objetivo da campanha"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="type">Tipo de Campanha *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="alert">Alerta</SelectItem>
                <SelectItem value="commemorative">Comemorativa</SelectItem>
                <SelectItem value="network_outage">Queda de Rede</SelectItem>
                <SelectItem value="nps">Pesquisa NPS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Canais de Envio */}
      <Card>
        <CardHeader>
          <CardTitle>Canais de Envio</CardTitle>
          <CardDescription>Selecione por quais canais enviar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {channelOptions.map((channel) => (
              <div key={channel.value} className="flex items-center space-x-2">
                <Checkbox
                  id={channel.value}
                  checked={formData.channels.includes(channel.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData({
                        ...formData,
                        channels: [...formData.channels, channel.value],
                      });
                    } else {
                      setFormData({
                        ...formData,
                        channels: formData.channels.filter((c) => c !== channel.value),
                      });
                    }
                  }}
                />
                <Label htmlFor={channel.value} className="cursor-pointer">
                  {channel.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo */}
      <Card>
        <CardHeader>
          <CardTitle>Conteúdo da Mensagem</CardTitle>
          <CardDescription>Adicione texto e mídias</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="contentText">Texto da Mensagem *</Label>
            <Textarea
              id="contentText"
              value={formData.contentText}
              onChange={(e) => setFormData({ ...formData, contentText: e.target.value })}
              placeholder="Use variáveis: {{nome}}, {{plano}}, {{valor}}"
              rows={5}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Variáveis disponíveis: {`{{nome}}, {{plano}}, {{valor}}, {{data_vencimento}}`}
            </p>
          </div>

          <div>
            <Label>Mídia (opcional)</Label>
            <div className="mt-2">
              {formData.mediaUrl ? (
                <div className="relative">
                  {formData.mediaType === 'image' && (
                    <img
                      src={formData.mediaUrl}
                      alt="Preview"
                      className="max-w-full h-48 object-cover rounded-md"
                    />
                  )}
                  {formData.mediaType === 'video' && (
                    <video
                      src={formData.mediaUrl}
                      controls
                      className="max-w-full h-48 rounded-md"
                    />
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setFormData({ ...formData, mediaUrl: '', mediaType: '' })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('media-upload')?.click()}
                    disabled={uploadingMedia}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadingMedia ? 'Enviando...' : 'Upload Mídia'}
                  </Button>
                  <input
                    id="media-upload"
                    type="file"
                    accept="image/*,video/*,audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setMediaFile(file);
                        const type = file.type.split('/')[0];
                        setFormData({ ...formData, mediaType: type });
                        handleMediaUpload(file);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="ctaType">Ação (CTA)</Label>
            <Select
              value={formData.ctaType}
              onValueChange={(value) => setFormData({ ...formData, ctaType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                <SelectItem value="reply">Responder</SelectItem>
                <SelectItem value="contact_support">Falar com Suporte</SelectItem>
                <SelectItem value="contact_agent">Falar com Agente Específico</SelectItem>
                <SelectItem value="link">Link Externo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Criando...' : 'Criar Campanha'}
        </Button>
      </div>
    </form>
  );
}
