import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export const MaintenanceLog = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['maintenance-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_execution_log')
        .select(`
          *,
          task:network_maintenance_tasks(name, priority)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      case 'running': return 'secondary';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return <div>Carregando logs...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log de Execuções</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {logs?.map((log) => (
              <div key={log.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(log.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{log.task?.name}</span>
                        <Badge variant={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                        {log.task?.priority && (
                          <Badge variant="outline">{log.task.priority}</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                        {log.duration_ms && ` • ${log.duration_ms}ms`}
                        {log.retry_attempt > 0 && ` • Tentativa ${log.retry_attempt}`}
                      </div>
                      {log.error_message && (
                        <div className="text-sm text-red-500 mt-2">
                          {log.error_message}
                        </div>
                      )}
                      {log.result && (
                        <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-x-auto">
                          {JSON.stringify(log.result, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
