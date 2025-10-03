import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, RefreshCw, Users, MapPin, Clock, CheckCircle, Loader2, Zap } from 'lucide-react';

interface MassOutageEvent {
  id: string;
  region_pattern: string;
  affected_count: number;
  affected_logins: string[];
  detected_at: string;
  resolved_at: string | null;
  status: string;
  notifications_sent: boolean;
  metadata?: any;
}

export function MassOutageMonitor() {
  const [events, setEvents] = useState<MassOutageEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const { toast } = useToast();

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mass_outage_events')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar eventos:', error);
      toast({
        title: "Erro ao carregar eventos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const detectOutages = async () => {
    setDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-mass-outage');
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "Detecção concluída",
          description: `${data.mass_outages_detected} quedas em massa detectadas`,
        });
        loadEvents();
      } else {
        throw new Error(data?.error || 'Erro ao detectar quedas');
      }
    } catch (error: any) {
      console.error('Erro ao detectar quedas:', error);
      toast({
        title: "Erro na detecção",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDetecting(false);
    }
  };

  useEffect(() => {
    loadEvents();
    
    // Detecção automática inicial após 5 segundos
    const initialDetection = setTimeout(() => {
      detectOutages();
    }, 5000);
    
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
  }, []);

  const activeEvents = events.filter(e => e.status === 'active');
  const resolvedEvents = events.filter(e => e.status === 'resolved');

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
                              {event.metadata?.group_type && `${event.metadata.group_type}`}
                              {event.metadata?.pon_port && ` - Porta: ${event.metadata.pon_port}`}
                            </p>
                            {event.metadata?.group_type === 'Porta PON' && event.metadata?.pon_port && (
                              <Badge variant="outline" className="w-fit gap-1 text-xs">
                                <MapPin className="h-3 w-3" />
                                PON: {event.metadata.pon_port}
                              </Badge>
                            )}
                            {event.metadata?.bairros && event.metadata.bairros.length > 0 && (
                              <Badge variant="secondary" className="w-fit gap-1 text-xs mt-1">
                                <MapPin className="h-3 w-3" />
                                Bairros: {event.metadata.bairros.join(', ')}
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
                        {event.metadata?.power_outage && (
                          <Badge variant="outline" className="gap-2 border-yellow-500 text-yellow-500">
                            <Zap className="h-3 w-3" />
                            Falta de Energia
                          </Badge>
                        )}
                      </div>
                    </div>

                    {event.metadata?.power_outage && event.metadata?.power_outage_description && (
                      <Alert className="border-yellow-500/50 bg-yellow-500/10">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <AlertDescription className="text-sm">
                          <strong>Causa identificada:</strong> {event.metadata.power_outage_description}
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

      {/* Lista de Eventos Resolvidos */}
      {resolvedEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-500">
              <CheckCircle className="h-5 w-5" />
              Eventos Resolvidos
            </CardTitle>
            <CardDescription>
              Últimas quedas em massa que foram resolvidas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resolvedEvents.slice(0, 5).map((event) => (
              <Card key={event.id} className="border-green-500/20 bg-green-500/5">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-green-500" />
                        <div>
                          <h3 className="font-bold">{event.region_pattern}</h3>
                          <p className="text-sm text-muted-foreground">
                            {event.affected_count} clientes foram afetados
                            {event.metadata?.power_outage && ' - Falta de energia'}
                          </p>
                          {event.metadata?.bairros && event.metadata.bairros.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Bairros: {event.metadata.bairros.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline" className="border-green-500/50 text-green-500">
                          Resolvido
                        </Badge>
                        {event.metadata?.power_outage && (
                          <Badge variant="outline" className="gap-1 text-xs border-yellow-500/50 text-yellow-500">
                            <Zap className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Início: {new Date(event.detected_at).toLocaleString('pt-BR')}
                      </div>
                      {event.resolved_at && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Fim: {new Date(event.resolved_at).toLocaleString('pt-BR')}
                        </div>
                      )}
                    </div>
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
