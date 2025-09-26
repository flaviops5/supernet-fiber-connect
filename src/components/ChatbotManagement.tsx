import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bot, Palette, Settings, Globe, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const chatbotSettingsSchema = z.object({
  chatbot_id: z.string().min(1, 'ID do chatbot é obrigatório'),
  enabled: z.boolean(),
  title: z.string().min(1, 'Título é obrigatório'),
  subtitle: z.string().min(1, 'Subtítulo é obrigatório'),
  cta_text: z.string().min(1, 'Texto do botão é obrigatório'),
  position: z.enum(['bottom-center', 'bottom-right', 'bottom-left']),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato #RRGGBB'),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato #RRGGBB'),
  session_timeout_minutes: z.number().min(1).max(480),
  auto_open: z.boolean(),
  auto_open_delay_seconds: z.number().min(1).max(30),
  show_on_pages: z.array(z.string()),
});

interface ChatbotSettingsWithMeta {
  id?: string;
  chatbot_id: string;
  enabled: boolean;
  title: string;
  subtitle: string;
  cta_text: string;
  position: string;
  primary_color: string;
  secondary_color: string;
  session_timeout_minutes: number;
  auto_open: boolean;
  auto_open_delay_seconds: number;
  show_on_pages: any;
  created_at?: string;
  updated_at?: string;
}

type ChatbotSettings = z.infer<typeof chatbotSettingsSchema>;

const ChatbotManagement = () => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<ChatbotSettingsWithMeta | null>(null);

  const form = useForm<ChatbotSettings>({
    resolver: zodResolver(chatbotSettingsSchema),
    defaultValues: {
      chatbot_id: 'mMFk_B5d94OhD7fQBxvNU',
      enabled: true,
      title: 'Assistente Virtual SUPERNET',
      subtitle: 'Contrate agora sua internet - resposta em segundos',
      cta_text: 'Fale conosco',
      position: 'bottom-center',
      primary_color: '#ef4444',
      secondary_color: '#fb7185',
      session_timeout_minutes: 30,
      auto_open: false,
      auto_open_delay_seconds: 5,
      show_on_pages: ['all'],
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        form.reset({
          chatbot_id: data.chatbot_id,
          enabled: data.enabled,
          title: data.title,
          subtitle: data.subtitle,
          cta_text: data.cta_text,
          position: data.position as 'bottom-center' | 'bottom-right' | 'bottom-left',
          primary_color: data.primary_color,
          secondary_color: data.secondary_color,
          session_timeout_minutes: data.session_timeout_minutes,
          auto_open: data.auto_open,
          auto_open_delay_seconds: data.auto_open_delay_seconds,
          show_on_pages: Array.isArray(data.show_on_pages) 
            ? data.show_on_pages.map(String) 
            : ['all'],
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações do chatbot');
    }
  };

  const onSubmit = async (data: ChatbotSettings) => {
    setLoading(true);
    try {
      if (settings && settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('chatbot_settings')
          .update(data)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from('chatbot_settings')
          .insert([data]);

        if (error) throw error;
      }

      await loadSettings();
      toast.success('Configurações do chatbot salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações do chatbot');
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    form.reset({
      chatbot_id: 'mMFk_B5d94OhD7fQBxvNU',
      enabled: true,
      title: 'Assistente Virtual SUPERNET',
      subtitle: 'Contrate agora sua internet - resposta em segundos',
      cta_text: 'Fale conosco',
      position: 'bottom-center',
      primary_color: '#ef4444',
      secondary_color: '#fb7185',
      session_timeout_minutes: 30,
      auto_open: false,
      auto_open_delay_seconds: 5,
      show_on_pages: ['all'],
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Chatbot</h1>
          <p className="text-muted-foreground">
            Configure a aparência e comportamento do assistente virtual
          </p>
        </div>
        <Badge variant={form.watch('enabled') ? 'default' : 'secondary'}>
          {form.watch('enabled') ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Status e Configurações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações Básicas
              </CardTitle>
              <CardDescription>
                Controle o status e informações básicas do chatbot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Status do Chatbot</FormLabel>
                      <FormDescription>
                        Ativar ou desativar o chatbot no site
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="chatbot_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID do Chatbot (Chatbase)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="mMFk_B5d94OhD7fQBxvNU" />
                    </FormControl>
                    <FormDescription>
                      ID do chatbot configurado no Chatbase
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Textos e Mensagens */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Textos e Mensagens
              </CardTitle>
              <CardDescription>
                Personalize os textos exibidos no widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Assistente Virtual SUPERNET" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtítulo</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Contrate agora sua internet - resposta em segundos"
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cta_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Texto do Botão</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Fale conosco" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Aparência */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Aparência
              </CardTitle>
              <CardDescription>
                Configure as cores e posicionamento do widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posição na Tela</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a posição" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bottom-center">Centro Inferior</SelectItem>
                        <SelectItem value="bottom-right">Canto Inferior Direito</SelectItem>
                        <SelectItem value="bottom-left">Canto Inferior Esquerdo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="primary_color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor Primária</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input {...field} placeholder="#ef4444" />
                          <input
                            type="color"
                            value={field.value}
                            onChange={field.onChange}
                            className="w-12 h-10 rounded border cursor-pointer"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secondary_color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor Secundária</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input {...field} placeholder="#fb7185" />
                          <input
                            type="color"
                            value={field.value}
                            onChange={field.onChange}
                            className="w-12 h-10 rounded border cursor-pointer"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Comportamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Comportamento
              </CardTitle>
              <CardDescription>
                Configure como o chatbot se comporta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="session_timeout_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timeout da Sessão (minutos)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        min={1}
                        max={480}
                      />
                    </FormControl>
                    <FormDescription>
                      Tempo para resetar a conversa após inatividade (1-480 minutos)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="auto_open"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Abertura Automática</FormLabel>
                      <FormDescription>
                        Abrir automaticamente após um tempo
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch('auto_open') && (
                <FormField
                  control={form.control}
                  name="auto_open_delay_seconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delay para Abertura (segundos)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          min={1}
                          max={30}
                        />
                      </FormControl>
                      <FormDescription>
                        Tempo para abrir automaticamente (1-30 segundos)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <Separator />

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={resetToDefaults}>
              Restaurar Padrões
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ChatbotManagement;