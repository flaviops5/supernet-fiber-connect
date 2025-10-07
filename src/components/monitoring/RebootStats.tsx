import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

export const RebootStats = () => {
  const { data: stats } = useQuery({
    queryKey: ['reboot-stats'],
    queryFn: async () => {
      const [
        totalResult,
        successResult,
        failedResult,
        pendingResult,
        last24hResult
      ] = await Promise.all([
        supabase.from('equipment_reboots').select('id', { count: 'exact', head: true }),
        supabase.from('equipment_reboots').select('id', { count: 'exact', head: true }).eq('status', 'success'),
        supabase.from('equipment_reboots').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
        supabase.from('equipment_reboots').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase
          .from('equipment_reboots')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ]);

      return {
        total: totalResult.count || 0,
        success: successResult.count || 0,
        failed: failedResult.count || 0,
        pending: pendingResult.count || 0,
        last24h: last24hResult.count || 0
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const statCards = [
    {
      title: "Total de Reboots",
      value: stats?.total || 0,
      icon: Activity,
      color: "text-blue-500"
    },
    {
      title: "Bem-sucedidos",
      value: stats?.success || 0,
      icon: CheckCircle,
      color: "text-green-500"
    },
    {
      title: "Falhados",
      value: stats?.failed || 0,
      icon: XCircle,
      color: "text-red-500"
    },
    {
      title: "Pendentes",
      value: stats?.pending || 0,
      icon: Clock,
      color: "text-yellow-500"
    },
    {
      title: "Últimas 24h",
      value: stats?.last24h || 0,
      icon: AlertTriangle,
      color: "text-orange-500"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
