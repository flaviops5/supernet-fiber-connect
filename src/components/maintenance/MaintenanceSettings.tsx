import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState } from "react";

export const MaintenanceSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['maintenance-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const [formData, setFormData] = useState<any>(null);

  // Sincronizar formData quando settings carrega
  if (settings && !formData) {
    setFormData(settings);
  }

  const updateSettings = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('maintenance_settings')
        .update(data)
        .eq('id', settings?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-settings'] });
      toast.success('Configurações atualizadas');
    },
    onError: () => {
      toast.error('Erro ao atualizar configurações');
    }
  });

  const runMaintenance = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('network-maintenance-executor');
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Manutenção iniciada');
      queryClient.invalidateQueries({ queryKey: ['maintenance-log'] });
    },
    onError: () => {
      toast.error('Erro ao iniciar manutenção');
    }
  });

  if (!settings || !formData) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Sistema Ativo</Label>
              <p className="text-sm text-muted-foreground">
                Habilitar/desabilitar execução automática
              </p>
            </div>
            <Switch
              checked={formData.enabled ?? settings.enabled}
              onCheckedChange={(enabled) => {
                setFormData({ ...formData, enabled });
                updateSettings.mutate({ enabled });
              }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Intervalo Prioridade Alta (min)</Label>
              <Input
                type="number"
                value={formData.high_priority_interval_minutes ?? settings.high_priority_interval_minutes}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  high_priority_interval_minutes: parseInt(e.target.value) 
                })}
              />
            </div>
            <div>
              <Label>Intervalo Prioridade Média (min)</Label>
              <Input
                type="number"
                value={formData.medium_priority_interval_minutes ?? settings.medium_priority_interval_minutes}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  medium_priority_interval_minutes: parseInt(e.target.value) 
                })}
              />
            </div>
            <div>
              <Label>Intervalo Prioridade Baixa (min)</Label>
              <Input
                type="number"
                value={formData.low_priority_interval_minutes ?? settings.low_priority_interval_minutes}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  low_priority_interval_minutes: parseInt(e.target.value) 
                })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Threshold Estabilidade (min)</Label>
              <Input
                type="number"
                value={formData.network_stable_threshold_minutes ?? settings.network_stable_threshold_minutes}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  network_stable_threshold_minutes: parseInt(e.target.value) 
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tempo sem falhas críticas para considerar rede estável
              </p>
            </div>
            <div>
              <Label>Max Tarefas Simultâneas</Label>
              <Input
                type="number"
                value={formData.max_concurrent_tasks ?? settings.max_concurrent_tasks}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  max_concurrent_tasks: parseInt(e.target.value) 
                })}
              />
            </div>
          </div>

          <div>
            <Label>Email para Alertas</Label>
            <Input
              type="email"
              value={formData.alert_email ?? settings.alert_email}
              onChange={(e) => setFormData({ ...formData, alert_email: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-escalação de Falhas</Label>
              <p className="text-sm text-muted-foreground">
                Elevar prioridade de tarefas com falhas recorrentes
              </p>
            </div>
            <Switch
              checked={formData.auto_escalate_failures ?? settings.auto_escalate_failures}
              onCheckedChange={(auto_escalate_failures) => {
                setFormData({ ...formData, auto_escalate_failures });
                updateSettings.mutate({ auto_escalate_failures });
              }}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={() => updateSettings.mutate(formData)}
              disabled={updateSettings.isPending}
            >
              Salvar Configurações
            </Button>
            <Button 
              variant="outline"
              onClick={() => runMaintenance.mutate()}
              disabled={runMaintenance.isPending}
            >
              Executar Agora
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
