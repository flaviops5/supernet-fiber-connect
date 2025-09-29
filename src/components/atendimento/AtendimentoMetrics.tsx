import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, MessageSquare } from 'lucide-react';

export default function AtendimentoMetrics() {
  const [metrics, setMetrics] = useState({
    waiting: 0,
    active: 0,
    avgResponseTime: '0m'
  });

  useEffect(() => {
    loadMetrics();

    const interval = setInterval(loadMetrics, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    // Count waiting conversations
    const { count: waitingCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting');

    // Count active conversations
    const { count: activeCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    setMetrics({
      waiting: waitingCount || 0,
      active: activeCount || 0,
      avgResponseTime: '2m' // This would be calculated from actual data
    });
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Aguardando:</span>
        <Badge variant={metrics.waiting > 5 ? 'destructive' : 'secondary'}>
          {metrics.waiting}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Em atendimento:</span>
        <Badge variant="default">{metrics.active}</Badge>
      </div>

      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Tempo médio:</span>
        <Badge variant="outline">{metrics.avgResponseTime}</Badge>
      </div>
    </div>
  );
}
