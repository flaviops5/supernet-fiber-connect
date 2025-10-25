import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface MassOutageEvent {
  id: string;
  region_pattern: string;
  affected_count: number;
  detected_at: string;
  status: string;
  metadata?: any;
}

export const MassOutageAlertCard = () => {
  const [activeEvents, setActiveEvents] = useState<MassOutageEvent[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();

  const loadActiveEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('mass_outage_events')
      .select('*')
      .eq('status', 'active')
      .order('detected_at', { ascending: false });

    if (!error && data) {
      setActiveEvents(data as MassOutageEvent[]);
    }
  }, []);

  useEffect(() => {
    loadActiveEvents();

    // Configurar pooling automático a cada 3 minutos
    const interval = setInterval(() => {
      loadActiveEvents();
    }, 3 * 60 * 1000);

    // Configurar realtime subscription
    const subscription = supabase
      .channel('mass_outage_events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mass_outage_events',
          filter: 'status=eq.active'
        },
        () => {
          loadActiveEvents();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [loadActiveEvents]);

  // Efeito de piscar
  useEffect(() => {
    if (activeEvents.length > 0) {
      const blinkInterval = setInterval(() => {
        setIsVisible(prev => !prev);
      }, 800);

      return () => clearInterval(blinkInterval);
    } else {
      setIsVisible(true);
    }
  }, [activeEvents]);

  if (activeEvents.length === 0) return null;

  return (
    <Card 
      className={`border-2 transition-all duration-300 cursor-pointer hover:scale-[1.02] ${
        isVisible 
          ? 'border-red-500 bg-red-50 dark:bg-red-950/20 shadow-lg shadow-red-500/50' 
          : 'border-red-300 bg-red-25 dark:bg-red-950/10'
      }`}
      onClick={() => navigate('/admin/monitoramento')}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-red-700 dark:text-red-400">
          <AlertTriangle className={`h-5 w-5 ${isVisible ? 'animate-pulse' : ''}`} />
          ALERTA: Quedas em Massa Detectadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm text-red-900 dark:text-red-300 font-medium">
          {activeEvents.length} evento{activeEvents.length > 1 ? 's' : ''} ativo{activeEvents.length > 1 ? 's' : ''}
        </div>
        
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {activeEvents.slice(0, 3).map((event) => (
            <div 
              key={event.id}
              className="p-2 bg-white dark:bg-gray-900 rounded border border-red-200 dark:border-red-800"
            >
              <div className="flex justify-between items-start text-xs">
                <div>
                  <span className="font-semibold">
                    {event.metadata?.group_type || 'Região'}: {event.metadata?.group_identifier || event.region_pattern}
                  </span>
                  {event.metadata?.bairros && event.metadata.bairros.length > 0 && (
                    <div className="text-muted-foreground mt-1">
                      Bairros: {event.metadata.bairros.join(', ')}
                    </div>
                  )}
                </div>
                <span className="text-red-600 dark:text-red-400 font-bold">
                  {event.affected_count} clientes
                </span>
              </div>
            </div>
          ))}
        </div>

        {activeEvents.length > 3 && (
          <div className="text-xs text-center text-muted-foreground pt-1">
            +{activeEvents.length - 3} evento{activeEvents.length - 3 > 1 ? 's' : ''} adiciona{activeEvents.length - 3 > 1 ? 'is' : 'l'}
          </div>
        )}

        <Button 
          variant="destructive" 
          size="sm" 
          className="w-full mt-2"
          onClick={() => navigate('/admin/monitoramento')}
        >
          Ver Detalhes no Monitoramento
        </Button>
      </CardContent>
    </Card>
  );
};
