import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Clock, CheckCircle, Users, Search, Zap } from 'lucide-react';
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
  metadata?: Json;
}

// Helper to parse metadata safely
function parseMetadata(metadata: Json | undefined): MassOutageMetadata | undefined {
  if (!metadata || typeof metadata !== 'object' || metadata === null) return undefined;
  return metadata as MassOutageMetadata;
}

export function MassOutageHistory() {
  const [events, setEvents] = useState<MassOutageEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mass_outage_events')
        .select('*')
        .eq('status', 'resolved')
        .order('resolved_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      const err = parseError(error);
      console.error('Erro ao carregar histórico:', err);
      toast({
        title: "Erro ao carregar histórico",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadHistory();

    // Inscrever em mudanças em tempo real
    const channel = supabase
      .channel('mass_outage_history_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mass_outage_events'
        },
        () => {
          loadHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadHistory]);

  const filteredEvents = events.filter(event => 
    event.region_pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.affected_logins.some(login => login.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const calculateDuration = (detected: string, resolved: string | null) => {
    if (!resolved) return 'N/A';
    const start = new Date(detected);
    const end = new Date(resolved);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  return (
    <div className="space-y-6">
      {/* Header com Busca */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Histórico de Quedas em Massa</h2>
          <p className="text-muted-foreground">
            Registro completo de eventos resolvidos
          </p>
        </div>
        <div className="w-full max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por região ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Lista de Eventos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Eventos Resolvidos
          </CardTitle>
          <CardDescription>
            {filteredEvents.length} evento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <Card key={event.id} className="border-green-500/20 bg-green-500/5">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-green-500" />
                        <div>
                          <h3 className="font-bold">{event.region_pattern}</h3>
                          <p className="text-sm text-muted-foreground">
                            {parseMetadata(event.metadata)?.group_type && `${parseMetadata(event.metadata)?.group_type}`}
                            {parseMetadata(event.metadata)?.pon_port && ` - Porta: ${parseMetadata(event.metadata)?.pon_port}`}
                          </p>
                          {parseMetadata(event.metadata)?.bairros && parseMetadata(event.metadata)!.bairros!.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Bairros: {parseMetadata(event.metadata)!.bairros!.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline" className="gap-2">
                          <Users className="h-3 w-3" />
                          {event.affected_count} clientes
                        </Badge>
                        {parseMetadata(event.metadata)?.power_outage && (
                          <Badge variant="outline" className="gap-1 text-xs border-yellow-500/50 text-yellow-500">
                            <Zap className="h-3 w-3" />
                            Falta de energia
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs">Início</span>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(event.detected_at).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs">Resolução</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>{event.resolved_at ? new Date(event.resolved_at).toLocaleString('pt-BR') : 'N/A'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs">Duração</span>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{calculateDuration(event.detected_at, event.resolved_at)}</span>
                        </div>
                      </div>
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
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum evento encontrado</h3>
              <p className="text-muted-foreground max-w-md">
                {searchTerm ? 'Tente ajustar os termos de busca' : 'Ainda não há quedas resolvidas no histórico'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}