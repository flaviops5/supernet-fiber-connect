/**
 * GAP #2: Controle de Feature Flag - PR#17
 * UI para gerenciar rollout do fast-path
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Shield, Zap } from "lucide-react";

interface FeatureFlagConfig {
  flag_key: string;
  enabled: boolean;
  rollout_percentage: number;
  updated_at: string;
}

export function FeatureFlagControl() {
  const [enabled, setEnabled] = useState(true);
  const [rollout, setRollout] = useState(100);
  const [loading, setLoading] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<FeatureFlagConfig | null>(null);

  useEffect(() => {
    fetchCurrentConfig();
  }, []);

  const fetchCurrentConfig = async () => {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('flag_key', 'pr17_fast_path')
      .single();

    if (!error && data) {
      setCurrentConfig(data);
      setEnabled(data.enabled);
      setRollout(data.rollout_percentage);
    }
  };

  const updateFlag = async () => {
    setLoading(true);
    
    const { error } = await supabase
      .from('feature_flags')
      .update({ 
        enabled, 
        rollout_percentage: rollout,
        updated_at: new Date().toISOString()
      })
      .eq('flag_key', 'pr17_fast_path');

    if (error) {
      toast.error('Erro ao atualizar feature flag', {
        description: error.message
      });
    } else {
      toast.success('Feature flag atualizada!', {
        description: `Fast-path ${enabled ? 'ativado' : 'desativado'} para ${rollout}% dos usuários`
      });
      fetchCurrentConfig();
    }

    setLoading(false);
  };

  const quickRollout = async (percentage: number) => {
    setRollout(percentage);
    setLoading(true);

    const { error } = await supabase
      .from('feature_flags')
      .update({ 
        rollout_percentage: percentage,
        updated_at: new Date().toISOString()
      })
      .eq('flag_key', 'pr17_fast_path');

    if (!error) {
      toast.success(`Rollout ajustado para ${percentage}%`);
      fetchCurrentConfig();
    }

    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <CardTitle>PR#17 Fast-Path Control</CardTitle>
        </div>
        <CardDescription>
          Controle de rollout e ativação do fast-path
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Atual */}
        {currentConfig && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <span className={`text-sm font-semibold ${currentConfig.enabled ? 'text-success' : 'text-muted-foreground'}`}>
                {currentConfig.enabled ? '✅ Ativo' : '⚠️ Desativado'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Rollout atual:</span>
              <span className="text-sm font-semibold">{currentConfig.rollout_percentage}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Última atualização:</span>
              <span className="text-sm text-muted-foreground">
                {new Date(currentConfig.updated_at).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        )}

        {/* Toggle Ativação */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="enable-flag">Ativar Fast-Path</Label>
            <p className="text-sm text-muted-foreground">
              Habilita ou desabilita completamente o fast-path
            </p>
          </div>
          <Switch
            id="enable-flag"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {/* Slider de Rollout */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Rollout Percentage: {rollout}%</Label>
            <p className="text-sm text-muted-foreground">
              Percentual de usuários que terão acesso ao fast-path
            </p>
          </div>
          <Slider
            value={[rollout]}
            onValueChange={([v]) => setRollout(v)}
            max={100}
            step={10}
            disabled={!enabled}
            className="w-full"
          />
          
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => quickRollout(10)}
              disabled={loading || !enabled}
            >
              10%
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => quickRollout(50)}
              disabled={loading || !enabled}
            >
              50%
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => quickRollout(100)}
              disabled={loading || !enabled}
            >
              100%
            </Button>
          </div>
        </div>

        {/* Botão de Aplicar */}
        <Button 
          onClick={updateFlag}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Aplicando...' : 'Aplicar Alterações'}
        </Button>

        {/* Rollback Rápido */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium">Rollback de Emergência</span>
          </div>
          <Button 
            variant="destructive"
            size="sm"
            onClick={() => {
              setEnabled(false);
              setRollout(0);
              updateFlag();
            }}
            disabled={loading}
            className="w-full"
          >
            Desativar Imediatamente
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Use apenas em caso de problemas críticos. Desativa o fast-path para 100% dos usuários.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
