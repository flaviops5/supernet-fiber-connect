import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const RebootHistory = () => {
  const { data: reboots, isLoading, refetch } = useQuery({
    queryKey: ['equipment-reboots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_reboots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      success: { variant: "default", label: "Sucesso" },
      failed: { variant: "destructive", label: "Falhou" },
      pending: { variant: "secondary", label: "Pendente" },
      rebooting: { variant: "outline", label: "Reiniciando" },
      skipped: { variant: "outline", label: "Ignorado" }
    };

    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Histórico de Reinicializações</CardTitle>
            <CardDescription>
              Últimas 50 tentativas de reinicialização automática
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !reboots || reboots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma reinicialização registrada ainda
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Banda Antes</TableHead>
                  <TableHead>Banda Depois</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Verificações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reboots.map((reboot) => (
                  <TableRow key={reboot.id}>
                    <TableCell className="font-medium">
                      {reboot.client_name || '-'}
                    </TableCell>
                    <TableCell>{reboot.client_login || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {reboot.client_ip || '-'}
                    </TableCell>
                    <TableCell>
                      {reboot.bandwidth_before_kbps 
                        ? `${reboot.bandwidth_before_kbps.toFixed(2)} Kbps`
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {reboot.bandwidth_after_kbps 
                        ? `${reboot.bandwidth_after_kbps.toFixed(2)} Kbps`
                        : '-'
                      }
                    </TableCell>
                    <TableCell>{getStatusBadge(reboot.status)}</TableCell>
                    <TableCell className="text-xs">
                      {formatDistanceToNow(new Date(reboot.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </TableCell>
                    <TableCell className="text-center">
                      {reboot.verification_count || 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
