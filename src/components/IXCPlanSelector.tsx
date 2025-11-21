import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, CheckCircle2, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { parseError } from "@/types/error.types";

interface IXCPlan {
  id: string;
  name: string;
  download?: string;
  upload?: string;
  price?: number;
  type?: string;
}

interface IXCDebugInfo {
  source?: string;
  vdContratosCount: number;
  radgruposCount: number;
  produtoCount: number;
  ossPlanoCount: number;
  uniqueTotal: number;
  sampleIds: string[];
  masterPlans: Array<{ id: string; name: string }>;
}

export const IXCPlanSelector = () => {
  const [ixcPlans, setIxcPlans] = useState<IXCPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingVd, setTestingVd] = useState(false);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<IXCDebugInfo | null>(null);
  const { toast } = useToast();

  const loadIXCPlans = async () => {
    setLoading(true);
    try {
      console.log('🔄 Iniciando carregamento de planos do IXC...');
      
      const { data, error } = await supabase.functions.invoke('ixc-list-plans', {
        body: {}
      });

      console.log('📦 Resposta do IXC:', { data, error });
      console.log('🧪 IXC debug (JSON completo):', JSON.stringify(data, null, 2));
      console.log('🧪 IXC debug (campo debug isolado):', data?.debug);
      
      if (data?.debug) {
        console.log('📊 Contadores por endpoint:');
        console.log(`   ✅ FONTE PRINCIPAL: ${data.debug.source || 'vd_contratos'}`);
        console.log(`   - vd_contratos (PRINCIPAL): ${data.debug.vdContratosCount}`);
        console.log(`   - radgrupos (debug): ${data.debug.radgruposCount}`);
        console.log(`   - produto (debug): ${data.debug.produtoCount}`);
        console.log(`   - su_oss_plano (debug): ${data.debug.ossPlanoCount}`);
        console.log(`   - Total retornado: ${data.debug.uniqueTotal}`);
        console.log(`   - Planos MASTER: ${data.debug.masterPlans?.length || 0}`);
      }

      if (error) {
        console.error('❌ Erro na invocação:', error);
        throw error;
      }

      if (data?.error) {
        console.error('❌ Erro retornado pela função:', data.error);
        throw new Error(data.error);
      }

      if (data?.success && data?.plans) {
        console.log(`✅ ${data.plans.length} planos carregados com sucesso`);
        setIxcPlans(data.plans);
        setDebugInfo(data.debug || null);
        toast({
          title: "Planos IXC carregados",
          description: `${data.plans.length} planos encontrados no IXC.`,
        });
      } else {
        console.warn('⚠️ Resposta inesperada:', data);
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error) {
      const err = parseError(error);
      console.error('💥 Erro ao carregar planos do IXC:', {
        message: err.message,
        details: err.details,
        originalError: error
      });
      toast({
        title: "Erro ao carregar planos do IXC",
        description: err.message || 'Erro desconhecido ao carregar planos',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncSelectedPlans = async () => {
    if (selectedPlanIds.length === 0) {
      toast({
        title: "Selecione ao menos um plano",
        description: "Você precisa selecionar ao menos um plano do IXC para sincronizar.",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    try {
      console.log('🔄 Iniciando sincronização de planos:', selectedPlanIds);
      
      const { data, error } = await supabase.functions.invoke('ixc-sync-plans', {
        body: { planIds: selectedPlanIds }
      });

      console.log('📦 Resposta da sincronização:', { data, error });

      if (error) {
        console.error('❌ Erro na invocação da sincronização:', error);
        throw error;
      }

      if (data?.error) {
        console.error('❌ Erro retornado pela função de sincronização:', data.error);
        throw new Error(data.error);
      }

      if (data?.success) {
        console.log(`✅ ${data.synced} plano(s) sincronizado(s)`);
        toast({
          title: "Planos sincronizados com sucesso",
          description: `${data.synced} plano(s) sincronizado(s). ${data.errors > 0 ? `${data.errors} erro(s).` : ''}`,
        });
        setSelectedPlanIds([]);
      } else {
        console.warn('⚠️ Resposta inesperada da sincronização:', data);
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error) {
      const err = parseError(error);
      console.error('💥 Erro ao sincronizar planos:', {
        message: err.message,
        details: err.details,
        originalError: error
      });
      toast({
        title: "Erro ao sincronizar planos",
        description: err.message || 'Erro desconhecido ao sincronizar planos',
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const togglePlanSelection = (planId: string) => {
    setSelectedPlanIds(prev => 
      prev.includes(planId) 
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
  };

  const selectAllPlans = () => {
    if (selectedPlanIds.length === ixcPlans.length) {
      setSelectedPlanIds([]);
    } else {
      setSelectedPlanIds(ixcPlans.map(p => p.id));
    }
  };

  const testEndpoints = async () => {
    setTesting(true);
    try {
      console.log('🧪 Descobrindo endpoints do IXC...');
      
      const { data, error } = await supabase.functions.invoke('ixc-discover-gpon-endpoints', {
        body: {}
      });

      console.log('📊 Resultado da descoberta:', { data, error });

      if (error) {
        console.error('❌ Erro ao descobrir endpoints:', error);
        throw error;
      }

      if (data?.success) {
        const summary = data.summary;
        const functional = data.functionalEndpoints;
        
        console.log('✅ Descoberta concluída:', summary);
        
        // Focar nos endpoints de planos
        const planEndpoints = functional.filter((e: any) => 
          ['radgrupos', 'produto', 'su_oss_plano'].includes(e.endpoint)
        );
        
        const planDetails = planEndpoints
          .map((e: any) => `${e.endpoint}: ${e.recordCount} registros`)
          .join('\n');
        
        toast({
          title: "Diagnóstico de endpoints concluído",
          description: `${summary.functional} endpoints funcionais encontrados.\n\nEndpoints de planos:\n${planDetails || 'Nenhum endpoint de planos encontrado'}`,
        });
      } else {
        console.warn('⚠️ Resposta inesperada:', data);
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error) {
      const err = parseError(error);
      console.error('💥 Erro ao descobrir endpoints:', {
        message: err.message,
        details: err.details,
        originalError: error
      });
      toast({
        title: "Erro ao descobrir endpoints",
        description: err.message || 'Erro desconhecido ao descobrir endpoints do IXC',
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Sincronizar Planos do IXC
        </CardTitle>
        <CardDescription>
          Busque e sincronize planos do IXC com o sistema. Os planos sincronizados ficarão disponíveis na aba "Planos" para configuração.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={loadIXCPlans} disabled={loading || testing} variant="outline" className="flex-1">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Buscar Planos do IXC
              </>
            )}
          </Button>
          <Button onClick={testEndpoints} disabled={testing || loading} variant="secondary">
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <FlaskConical className="w-4 h-4 mr-2" />
                Outros Endpoints
              </>
            )}
          </Button>
          {ixcPlans.length > 0 && (
            <Button 
              onClick={syncSelectedPlans} 
              disabled={syncing || selectedPlanIds.length === 0}
              className="flex-1"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Sincronizar Selecionados ({selectedPlanIds.length})
                </>
              )}
            </Button>
          )}
        </div>

        {debugInfo && (
          <Card className="bg-muted/50 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                🧪 Debug Info - Endpoints IXC
              </CardTitle>
              {debugInfo.source && (
                <CardDescription className="text-xs mt-1">
                  Fonte principal: <span className="font-semibold text-primary">{debugInfo.source}</span>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1 border-2 border-primary/30 rounded-lg p-2 bg-primary/5">
                  <p className="text-xs text-muted-foreground">vd_contratos ⭐</p>
                  <p className="text-lg font-semibold text-primary">{debugInfo.vdContratosCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">radgrupos</p>
                  <p className="text-lg font-semibold text-muted-foreground">{debugInfo.radgruposCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">produto</p>
                  <p className="text-lg font-semibold text-muted-foreground">{debugInfo.produtoCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">su_oss_plano</p>
                  <p className="text-lg font-semibold text-muted-foreground">{debugInfo.ossPlanoCount}</p>
                </div>
              </div>

              {debugInfo.masterPlans && debugInfo.masterPlans.length > 0 && (
                <div className="space-y-2 mt-4 pt-3 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground">
                    🎯 Planos MASTER encontrados ({debugInfo.masterPlans.length}):
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {debugInfo.masterPlans.map((plan, idx) => (
                      <div key={idx} className="text-xs font-mono bg-background/50 p-2 rounded border border-border">
                        <span className="text-muted-foreground">[{plan.id}]</span> {plan.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <details className="mt-3 pt-3 border-t border-border">
                <summary className="text-xs font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  📋 Sample IDs (primeiros 10)
                </summary>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {debugInfo.sampleIds.map((id, idx) => (
                    <div key={idx} className="text-xs font-mono bg-background/50 p-1.5 rounded border border-border">
                      {id}
                    </div>
                  ))}
                </div>
              </details>
            </CardContent>
          </Card>
        )}

        {ixcPlans.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {ixcPlans.length} plano(s) encontrado(s)
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={selectAllPlans}
              >
                {selectedPlanIds.length === ixcPlans.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {ixcPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => togglePlanSelection(plan.id)}
                >
                  <Checkbox
                    checked={selectedPlanIds.includes(plan.id)}
                    onCheckedChange={() => togglePlanSelection(plan.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{plan.name}</h4>
                      {plan.type && (
                        <Badge variant="outline" className="text-xs">
                          {plan.type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      {plan.download && plan.upload && (
                        <span>
                          ⬇️ {plan.download} / ⬆️ {plan.upload}
                        </span>
                      )}
                      {plan.price && (
                        <span>
                          R$ {plan.price.toFixed(2)}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ID: {plan.id}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {ixcPlans.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Clique em "Buscar Planos do IXC" para carregar os planos disponíveis</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
