import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Power, PowerOff } from "lucide-react";
import { useState, useEffect } from "react";

export const RebootSettings = () => {
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(true);
  const [cronInterval, setCronInterval] = useState(30);
  const [bandwidthThreshold, setBandwidthThreshold] = useState(900);
  const [verificationCount, setVerificationCount] = useState(3);
  const [verificationInterval, setVerificationInterval] = useState(60);
  const [cooldownHours, setCooldownHours] = useState(24);
  const [excludeStart, setExcludeStart] = useState(1);
  const [excludeEnd, setExcludeEnd] = useState(6);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['auto-reboot-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auto_reboot_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setCronInterval(settings.cron_interval_minutes);
      setBandwidthThreshold(settings.bandwidth_threshold_kbps);
      setVerificationCount(settings.verification_count);
      setVerificationInterval(settings.verification_interval_seconds);
      setCooldownHours(settings.cooldown_hours);
      setExcludeStart(settings.exclude_hours_start);
      setExcludeEnd(settings.exclude_hours_end);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('auto_reboot_settings')
        .update({
          enabled,
          cron_interval_minutes: cronInterval,
          bandwidth_threshold_kbps: bandwidthThreshold,
          verification_count: verificationCount,
          verification_interval_seconds: verificationInterval,
          cooldown_hours: cooldownHours,
          exclude_hours_start: excludeStart,
          exclude_hours_end: excludeEnd,
          updated_by: user?.id
        })
        .eq('id', settings?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-reboot-settings'] });
      toast({
        title: "Configurações salvas",
        description: "As novas configurações foram aplicadas com sucesso."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar configurações",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações do Sistema</CardTitle>
        <CardDescription>
          Ajuste os parâmetros de detecção e reinicialização automática
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status do Sistema */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {enabled ? (
              <Power className="h-5 w-5 text-green-500" />
            ) : (
              <PowerOff className="h-5 w-5 text-red-500" />
            )}
            <div>
              <Label className="text-base font-medium">
                Sistema de Auto-Reboot
              </Label>
              <p className="text-sm text-muted-foreground">
                {enabled ? "Sistema ativo e monitorando" : "Sistema desativado"}
              </p>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Intervalo da Cron */}
          <div className="space-y-2">
            <Label htmlFor="cron_interval">Intervalo de Verificação (minutos)</Label>
            <Input
              id="cron_interval"
              type="number"
              min={5}
              max={120}
              value={cronInterval}
              onChange={(e) => setCronInterval(parseInt(e.target.value) || 30)}
            />
            <p className="text-xs text-muted-foreground">
              Com que frequência o sistema verifica equipamentos
            </p>
          </div>

          {/* Limite de Banda */}
          <div className="space-y-2">
            <Label htmlFor="bandwidth_threshold">Limite de Banda (Kbps)</Label>
            <Input
              id="bandwidth_threshold"
              type="number"
              min={100}
              max={10000}
              value={bandwidthThreshold}
              onChange={(e) => setBandwidthThreshold(parseInt(e.target.value) || 900)}
            />
            <p className="text-xs text-muted-foreground">
              Banda abaixo deste valor indica equipamento travado
            </p>
          </div>

          {/* Número de Verificações */}
          <div className="space-y-2">
            <Label htmlFor="verification_count">Número de Verificações</Label>
            <Input
              id="verification_count"
              type="number"
              min={1}
              max={10}
              value={verificationCount}
              onChange={(e) => setVerificationCount(parseInt(e.target.value) || 3)}
            />
            <p className="text-xs text-muted-foreground">
              Quantas verificações consecutivas antes de reiniciar
            </p>
          </div>

          {/* Intervalo entre Verificações */}
          <div className="space-y-2">
            <Label htmlFor="verification_interval">Intervalo entre Verificações (seg)</Label>
            <Input
              id="verification_interval"
              type="number"
              min={30}
              max={300}
              value={verificationInterval}
              onChange={(e) => setVerificationInterval(parseInt(e.target.value) || 60)}
            />
            <p className="text-xs text-muted-foreground">
              Tempo de espera entre cada verificação
            </p>
          </div>

          {/* Cooldown */}
          <div className="space-y-2">
            <Label htmlFor="cooldown_hours">Cooldown (horas)</Label>
            <Input
              id="cooldown_hours"
              type="number"
              min={1}
              max={168}
              value={cooldownHours}
              onChange={(e) => setCooldownHours(parseInt(e.target.value) || 24)}
            />
            <p className="text-xs text-muted-foreground">
              Tempo mínimo entre reinicializações do mesmo equipamento
            </p>
          </div>

          {/* Horário de Exclusão */}
          <div className="space-y-2">
            <Label>Horário de Exclusão</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                max={23}
                value={excludeStart}
                onChange={(e) => setExcludeStart(parseInt(e.target.value) || 1)}
                placeholder="Início"
              />
              <span className="flex items-center">até</span>
              <Input
                type="number"
                min={0}
                max={23}
                value={excludeEnd}
                onChange={(e) => setExcludeEnd(parseInt(e.target.value) || 6)}
                placeholder="Fim"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Não reiniciar equipamentos neste período (formato 24h)
            </p>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            <Save className="h-4 w-4 mr-2" />
            Salvar Configurações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};