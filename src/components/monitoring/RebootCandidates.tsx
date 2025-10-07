import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Candidate {
  clientId: string;
  login: string;
  ip: string;
  bandwidthKbps: number;
  clientName?: string;
  isBlocked?: boolean;
  isBlacklisted?: boolean;
  recentReboot?: boolean;
}

export const RebootCandidates = () => {
  const [isScanning, setIsScanning] = useState(false);

  const { data: candidates, isLoading, refetch } = useQuery({
    queryKey: ['reboot-candidates'],
    queryFn: async () => {
      setIsScanning(true);
      try {
        const { data, error } = await supabase.functions.invoke('check-reboot-candidates');
        
        if (error) throw error;
        
        return data?.candidates as Candidate[] || [];
      } finally {
        setIsScanning(false);
      }
    },
    enabled: false, // Só executa quando o usuário clicar em "Verificar"
    retry: false
  });

  const handleScan = () => {
    toast({
      title: "Verificando clientes...",
      description: "Buscando clientes com banda baixa no sistema IXC"
    });
    refetch();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Candidatos para Reboot</CardTitle>
            <CardDescription>
              Clientes online com banda {'< 900 Kbps'} neste momento
            </CardDescription>
          </div>
          <Button 
            onClick={handleScan} 
            disabled={isLoading || isScanning}
            size="sm"
          >
            {(isLoading || isScanning) ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar Agora
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!candidates && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Clique em "Verificar Agora" para buscar clientes com problemas de banda</p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {candidates && candidates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-lg font-medium text-green-600">
              ✅ Nenhum cliente com problema detectado no momento
            </p>
            <p className="text-sm mt-2">
              Todos os clientes online estão com banda acima de 900 Kbps
            </p>
          </div>
        )}

        {candidates && candidates.length > 0 && (
          <>
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                ⚠️ {candidates.length} cliente{candidates.length > 1 ? 's' : ''} com banda baixa detectado{candidates.length > 1 ? 's' : ''}
              </p>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Banda Atual</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((candidate) => (
                    <TableRow key={candidate.clientId}>
                      <TableCell className="font-medium">
                        {candidate.clientName || candidate.clientId}
                      </TableCell>
                      <TableCell>{candidate.login}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {candidate.ip || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="font-mono">
                          {candidate.bandwidthKbps.toFixed(2)} Kbps
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {candidate.isBlacklisted && (
                          <Badge variant="outline" className="bg-gray-100">
                            🚫 Blacklist
                          </Badge>
                        )}
                        {candidate.isBlocked && (
                          <Badge variant="outline" className="bg-red-100">
                            💰 Bloqueado
                          </Badge>
                        )}
                        {candidate.recentReboot && (
                          <Badge variant="outline" className="bg-blue-100">
                            ⏰ Cooldown
                          </Badge>
                        )}
                        {!candidate.isBlacklisted && !candidate.isBlocked && !candidate.recentReboot && (
                          <Badge variant="outline" className="bg-green-100">
                            ✅ Elegível
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};