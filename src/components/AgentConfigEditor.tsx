import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, X } from 'lucide-react';
import { parseError } from '@/types/error.types';
import { logger } from '@/lib/logger';

interface AgentConfig {
  id: string;
  agent_type: string;
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  capabilities: string[];
  is_active: boolean;
}

interface AgentConfigEditorProps {
  config: AgentConfig;
  onClose: () => void;
  onSave: () => void;
}

const AgentConfigEditor: React.FC<AgentConfigEditorProps> = ({ config, onClose, onSave }) => {
  const [formData, setFormData] = useState(config);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('agent_configurations')
        .update({
          name: formData.name,
          description: formData.description,
          system_prompt: formData.system_prompt,
          model: formData.model,
          temperature: formData.temperature,
          max_tokens: formData.max_tokens,
          capabilities: formData.capabilities,
          is_active: formData.is_active,
        })
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: 'Configuração salva',
        description: 'As alterações foram salvas com sucesso.',
      });
      
      onSave();
      onClose();
    } catch (error) {
      const err = parseError(error);
      logger.error('Error saving config', err);
      toast({
        title: 'Erro ao salvar',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Configurar Agente</CardTitle>
            <CardDescription>
              Edite o comportamento e características do agente
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Agente</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sanitize
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              sanitize
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Agente Ativo</Label>
          </div>
        </div>

        {/* System Prompt */}
        <div className="space-y-2">
          <Label htmlFor="system_prompt">System Prompt</Label>
          <Textarea
            id="system_prompt"
            value={formData.system_prompt}
            onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
            rows={15}
            className="font-mono text-sm"
            sanitize
          />
          <p className="text-xs text-muted-foreground">
            Este é o prompt que define o comportamento e personalidade do agente
          </p>
        </div>

        {/* Model Configuration */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="model">Modelo IA</Label>
            <Select
              value={formData.model}
              onValueChange={(value) => setFormData({ ...formData, model: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                <SelectItem value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature</Label>
            <Input
              id="temperature"
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">0 = determinístico, 2 = criativo</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_tokens">Max Tokens</Label>
            <Input
              id="max_tokens"
              type="number"
              min="100"
              max="8000"
              step="100"
              value={formData.max_tokens}
              onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
            />
          </div>
        </div>

        {/* Capabilities */}
        <div className="space-y-2">
          <Label>Capacidades</Label>
          <div className="flex flex-wrap gap-2">
            {formData.capabilities.map((capability, index) => (
              <Badge key={index} variant="secondary">
                {capability}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Capacidades são definidas no código e refletem as funções do agente
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentConfigEditor;
