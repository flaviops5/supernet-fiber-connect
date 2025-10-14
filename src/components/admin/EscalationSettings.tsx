import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowRight, Plus, Trash2, Edit2, Save, X } from 'lucide-react';

interface EscalationSettings {
  id: string;
  mode: 'explicit' | 'silent';
  enabled: boolean;
}

type Department = 'administrativo' | 'comercial' | 'financeiro' | 'logistica' | 'routing' | 'tecnico';

interface EscalationRule {
  id: string;
  from_department: Department;
  to_department: Department;
  priority: number;
  description: string;
  conditions: any;
  enabled: boolean;
  auto_escalate_after_minutes?: number;
}

const departmentLabels = {
  comercial: 'Comercial',
  tecnico: 'Técnico',
  financeiro: 'Financeiro',
  logistica: 'Logística',
  routing: 'Roteamento (Cloé)'
};

export default function EscalationSettings() {
  const [settings, setSettings] = useState<EscalationSettings | null>(null);
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<EscalationRule>>({});

  useEffect(() => {
    loadSettings();
    loadRules();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('escalation_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      setSettings(data as EscalationSettings);
    } catch (error: any) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from('escalation_rules')
        .select('*')
        .order('priority', { ascending: true });
      
      if (error) throw error;
      setRules(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar regras');
    }
  };

  const updateSettings = async (updates: Partial<EscalationSettings>) => {
    if (!settings) return;
    
    try {
      const { error } = await supabase
        .from('escalation_settings')
        .update(updates)
        .eq('id', settings.id);
      
      if (error) throw error;
      
      setSettings({ ...settings, ...updates });
      toast.success('Configurações atualizadas');
    } catch (error: any) {
      toast.error('Erro ao atualizar configurações');
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('escalation_rules')
        .update({ enabled })
        .eq('id', ruleId);
      
      if (error) throw error;
      
      setRules(rules.map(r => r.id === ruleId ? { ...r, enabled } : r));
      toast.success(`Regra ${enabled ? 'ativada' : 'desativada'}`);
    } catch (error: any) {
      toast.error('Erro ao atualizar regra');
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) return;
    
    try {
      const { error } = await supabase
        .from('escalation_rules')
        .delete()
        .eq('id', ruleId);
      
      if (error) throw error;
      
      setRules(rules.filter(r => r.id !== ruleId));
      toast.success('Regra excluída');
    } catch (error: any) {
      toast.error('Erro ao excluir regra');
    }
  };

  const startEdit = (rule: EscalationRule) => {
    setEditingRule(rule.id);
    setEditForm(rule);
  };

  const cancelEdit = () => {
    setEditingRule(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingRule) return;
    
    try {
      const { error } = await supabase
        .from('escalation_rules')
        .update(editForm)
        .eq('id', editingRule);
      
      if (error) throw error;
      
      await loadRules();
      setEditingRule(null);
      setEditForm({});
      toast.success('Regra atualizada');
    } catch (error: any) {
      toast.error('Erro ao atualizar regra');
    }
  };

  if (loading || !settings) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Escalonamento</CardTitle>
          <CardDescription>
            Configure como as conversas devem ser escalonadas entre departamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Escalonamento Automático</Label>
              <p className="text-sm text-muted-foreground">
                Ativar detecção e escalonamento automático de conversas
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
            />
          </div>

          <div className="space-y-3">
            <Label>Modo de Escalonamento</Label>
            <RadioGroup
              value={settings.mode}
              onValueChange={(mode) => updateSettings({ mode: mode as 'explicit' | 'silent' })}
            >
              <div className="flex items-start space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="explicit" id="explicit" />
                <div className="space-y-1">
                  <Label htmlFor="explicit" className="font-medium">
                    Escalonamento Explícito (Recomendado)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    O agente confirma a transferência com o cliente antes de escalonar
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="silent" id="silent" />
                <div className="space-y-1">
                  <Label htmlFor="silent" className="font-medium">
                    Escalonamento Silencioso
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Sistema transfere automaticamente sem intervenção do agente
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regras de Escalonamento</CardTitle>
          <CardDescription>
            Defina quando e como as conversas devem ser transferidas entre departamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>De</TableHead>
                <TableHead>Para</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  {editingRule === rule.id ? (
                    <>
                      <TableCell colSpan={6}>
                        <div className="space-y-3">
                          <Textarea
                            value={editForm.description || ''}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            placeholder="Descrição da regra"
                          />
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={editForm.priority || 0}
                              onChange={(e) => setEditForm({ ...editForm, priority: parseInt(e.target.value) })}
                              placeholder="Prioridade"
                              className="w-24"
                            />
                            <Button onClick={saveEdit} size="sm">
                              <Save className="h-4 w-4 mr-2" />
                              Salvar
                            </Button>
                            <Button onClick={cancelEdit} variant="outline" size="sm">
                              <X className="h-4 w-4 mr-2" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <Badge variant="outline">
                          {departmentLabels[rule.from_department as keyof typeof departmentLabels]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <Badge>
                            {departmentLabels[rule.to_department as keyof typeof departmentLabels]}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm">{rule.description}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{rule.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(enabled) => toggleRule(rule.id, enabled)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(rule)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}