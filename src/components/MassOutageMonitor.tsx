import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, RefreshCw, Users, MapPin, Clock, CheckCircle, Loader2, Zap } from 'lucide-react';
import { parseError } from '@/types/error.types';
import type { Json } from '@/integrations/supabase/types';

interface MassOutageMetadata {
  group_type?: string;
  pon_port?: string;
  bairros?: string[];
  power_outage?: boolean;
  power_outage_description?: string;
}

interface MassOutageEvent {
  id: string;
  region_pattern: string;
  affected_count: number;
  affected_logins: string[];
  detected_at: string;
  resolved_at: string | null;
  status: string;
  notifications_sent: boolean;
  metadata?: Json;
}

// Helper to parse metadata safely
function parseMetadata(metadata: Json | undefined): MassOutageMetadata | undefined {
  if (!metadata || typeof metadata !== 'object' || metadata === null) return undefined;
  return metadata as MassOutageMetadata;
}

export function MassOutageMonitor() {
  const [events, setEvents] = useState<MassOutageEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const { toast } = useToast();

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mass_outage_events')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      const err = parseError(error);
      console.error('Erro ao carregar eventos:', err);
      toast({
        title: "Erro ao carregar eventos",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const detectOutages = useCallback(async () => {
    // Evita disparos concorrentes no cliente
    if (detecting) {
      toast({
        title: "Detecção em andamento",
        description: "Aguarde a conclusão antes de iniciar outra tentativa.",
      });
      return;
    }

    setDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-mass-outage');

      // Trata erro HTTP (ex.: 409 lock_busy) de forma amigável
      if (error) {
        const isHttpErr = (error as any)?.name === 'FunctionsHttpError' ||
          (error as any)?.message?.includes('non-2xx');
        if (isHttpErr) {
          toast({
            title: "Detecção já em execução",
            description: "Já existe uma detecção em andamento. Tente novamente em até 5 minutos.",
          });
          return;
        }
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Detecção concluída",
          description: `${data.mass_outages_detected} quedas em massa detectadas`,
        });
        loadEvents();
      } else {
        const friendly = data?.reason === 'lock_busy'
          ? 'Já existe uma detecção em andamento. Tente novamente em até 5 minutos.'
          : (data?.error || 'Erro ao detectar quedas');
        toast({ title: "Aviso", description: friendly });
      }
    } catch (error) {
      const err = parseError(error);
      console.error('Erro ao detectar quedas:', err);
      toast({
        title: "Erro na detecção",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDetecting(false);
    }
  }, [toast, loadEvents, detecting]);

  useEffect(() => {
    loadEvents();
    
    // Detecção automática inicial após 15 segundos (aguarda cold start)
    const initialDetection = setTimeout(() => {
      detectOutages();
    }, 15000);
    
    // Pooling automático a cada 3 minutos
    const detectionInterval = setInterval(() => {
      detectOutages();
    }, 3 * 60 * 1000);

    // Inscrever em mudanças em tempo real
    const channel = supabase
      .channel('mass_outage_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mass_outage_events'
        },
        () => {
          loadEvents();
        }
      )
      .subscribe();

    return () => {
      clearTimeout(initialDetection);
      clearInterval(detectionInterval);
      supabase.removeChannel(channel);
    };
  }, [loadEvents, detectOutages]);

  const activeEvents = events.filter(e => e.status === 'active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monitor de Quedas em Massa</h2>
          <p className="text-muted-foreground">
            Detecção automática de interrupções regionais (atualização a cada 3 minutos)
          </p>
        </div>
        <Button 
          onClick={detectOutages}
          disabled={detecting}
          className="gap-2"
        >
          {detecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Detectando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Detectar Agora
            </>
          )}
        </Button>
      </div>

      {/* Alertas Ativos */}
      {activeEvents.length > 0 && (
        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">
            {activeEvents.length} Queda{activeEvents.length > 1 ? 's' : ''} em Massa Ativa{activeEvents.length > 1 ? 's' : ''}
          </AlertTitle>
          <AlertDescription>
            Múltiplos clientes da mesma região estão offline simultaneamente
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de Eventos Ativos */}
      {activeEvents.length > 0 && (
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Eventos Ativos
            </CardTitle>
            <CardDescription>
              Quedas em massa que ainda não foram resolvidas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeEvents.map((event) => (
              <Card key={event.id} className="border-red-500/20 bg-red-500/5">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-red-500" />
                        <div>
                          <h3 className="font-bold text-lg">{event.region_pattern}</h3>
                          <div className="flex flex-col gap-1">
                            <p className="text-sm text-muted-foreground">
                              {parseMetadata(event.metadata)?.group_type && `${parseMetadata(event.metadata)?.group_type}`}
                              {parseMetadata(event.metadata)?.pon_port && ` - Porta: ${parseMetadata(event.metadata)?.pon_port}`}
                            </p>
                            {parseMetadata(event.metadata)?.group_type === 'Porta PON' && parseMetadata(event.metadata)?.pon_port && (
                              <Badge variant="outline" className="w-fit gap-1 text-xs">
                                <MapPin className="h-3 w-3" />
                                PON: {parseMetadata(event.metadata)!.pon_port}
                              </Badge>
                            )}
                            {parseMetadata(event.metadata)?.bairros && parseMetadata(event.metadata)!.bairros!.length > 0 && (
                              <Badge variant="secondary" className="w-fit gap-1 text-xs mt-1">
                                <MapPin className="h-3 w-3" />
                                Bairros: {parseMetadata(event.metadata)!.bairros!.join(', ')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="destructive" className="gap-2">
                          <Users className="h-3 w-3" />
                          {event.affected_count} clientes
                        </Badge>
                        {parseMetadata(event.metadata)?.power_outage && (
                          <Badge variant="outline" className="gap-2 border-yellow-500 text-yellow-500">
                            <Zap className="h-3 w-3" />
                            Falta de Energia
                          </Badge>
                        )}
                      </div>
                    </div>

                    {parseMetadata(event.metadata)?.power_outage && parseMetadata(event.metadata)?.power_outage_description && (
                      <Alert className="border-yellow-500/50 bg-yellow-500/10">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <AlertDescription className="text-sm">
                          <strong>Causa identificada:</strong> {parseMetadata(event.metadata)!.power_outage_description}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Detectado: {new Date(event.detected_at).toLocaleString('pt-BR')}
                    </div>

                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium hover:underline">
                        Ver clientes afetados ({event.affected_logins.length})
                      </summary>
                      <div className="mt-2 max-h-40 overflow-y-auto bg-background/50 rounded p-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {event.affected_logins.map((login, idx) => (
                            <div key={idx} className="text-xs font-mono bg-background/80 rounded px-2 py-1">
                              {login}
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && events.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma queda detectada</h3>
            <p className="text-muted-foreground max-w-md">
              A detecção automática está ativa. Clique em "Detectar Agora" para forçar uma verificação imediata.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
