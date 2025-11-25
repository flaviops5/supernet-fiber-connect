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
  sessionHours: number;
  totalDataMB: number;
  clientName?: string;
  isBlocked?: boolean;
  isBlacklisted?: boolean;
  recentReboot?: boolean;
}

export const RebootCandidates = () => {
  const [isScanning, setIsScanning] = useState(false);

  const { data: candidates, isLoading, refetch, error } = useQuery({
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
    enabled: false, // Não carrega automaticamente
    retry: false,
    refetchOnWindowFocus: false,
  });

  const handleScan = () => {
    toast({
      title: "Verificando clientes...",
      description: "Buscando equipamentos congelados no sistema IXC"
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
              Cliente online com banda {'< 900 Kbps'}, não bloqueado
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
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm font-medium text-destructive">
              ❌ Erro ao verificar candidatos
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {(error as Error)?.message || 'Falha na comunicação com o IXC'}
            </p>
          </div>
        )}

        {!candidates && !isLoading && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Clique em "Verificar Agora" para buscar clientes com equipamento congelado</p>
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
              ✅ Nenhum equipamento congelado detectado no momento
            </p>
            <p className="text-sm mt-2">
              Todos os clientes estão com atividade de rede normal
            </p>
          </div>
        )}

        {candidates && candidates.length > 0 && (
          <>
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                ⚠️ {candidates.length} equipamento{candidates.length > 1 ? 's' : ''} congelado{candidates.length > 1 ? 's' : ''} detectado{candidates.length > 1 ? 's' : ''}
              </p>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Tempo Online</TableHead>
                    <TableHead>Dados Transmitidos</TableHead>
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
                        <Badge variant="outline" className="font-mono">
                          {candidate.sessionHours}h
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="font-mono">
                          {candidate.totalDataMB} MB
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