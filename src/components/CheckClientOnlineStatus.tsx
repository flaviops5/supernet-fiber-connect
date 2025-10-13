import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const CheckClientOnlineStatus = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkOnlineStatus = async () => {
    setLoading(true);
    setResult(null);

    try {
      const clientId = "313";
      const cpf = "619.538.901-30";
      
      console.log("🔍 Verificando status online do cliente:", clientId, cpf);

      // Buscar informações do cliente no radusuarios
      const { data: radiusData, error } = await supabase.functions.invoke('ixc-proxy', {
        body: {
          method: 'POST',
          path: '/webservice/v1/radusuarios',
          body: {
            qtype: 'radusuarios.id_cliente',
            query: clientId,
            oper: '=',
            page: '1',
            rp: '100',
          }
        }
      });

      if (error) {
        throw error;
      }

      console.log("📡 Resposta do Radius:", radiusData);

      const registros = radiusData?.data?.registros || [];
      const onlineUsers = Array.isArray(registros) 
        ? registros.filter((r: any) => r.online === 'S')
        : [];
      const offlineUsers = Array.isArray(registros)
        ? registros.filter((r: any) => r.online === 'N')
        : [];

      setResult({
        clientId,
        cpf,
        isOnline: onlineUsers.length > 0,
        totalConnections: registros.length,
        onlineConnections: onlineUsers.length,
        offlineConnections: offlineUsers.length,
        connections: registros.map((r: any) => ({
          login: r.login,
          online: r.online === 'S',
          ip: r.ip,
          sessionTime: r.tempo_sessao,
        })),
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error("❌ Erro ao verificar status:", error);
      setResult({
        error: error.message || "Erro desconhecido",
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Verificar Status Online</h3>
        <p className="text-sm text-muted-foreground">
          Cliente 313 - Cláudio Máximo Chaves (CPF: 619.538.901-30)
        </p>
      </div>

      <Button 
        onClick={checkOnlineStatus} 
        disabled={loading}
        className="w-full"
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Verificar se está Online
      </Button>

      {result && !result.error && (
        <div className="space-y-3">
          <div className={`p-4 rounded-lg ${result.isOnline ? 'bg-green-500/10 text-green-600' : 'bg-muted'}`}>
            <div className="font-semibold text-lg">
              {result.isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}
            </div>
            <div className="text-sm mt-2">
              <div>Conexões online: {result.onlineConnections}</div>
              <div>Conexões offline: {result.offlineConnections}</div>
              <div>Total de conexões: {result.totalConnections}</div>
            </div>
          </div>

          {result.connections && result.connections.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Detalhes das Conexões:</h4>
              {result.connections.map((conn: any, idx: number) => (
                <div key={idx} className="text-sm bg-muted p-3 rounded">
                  <div className="flex items-center gap-2">
                    <span className={conn.online ? 'text-green-600' : 'text-muted-foreground'}>
                      {conn.online ? '🟢' : '🔴'}
                    </span>
                    <span className="font-mono">{conn.login}</span>
                  </div>
                  {conn.ip && <div className="text-xs text-muted-foreground">IP: {conn.ip}</div>}
                  {conn.sessionTime && <div className="text-xs text-muted-foreground">Tempo: {conn.sessionTime}</div>}
                </div>
              ))}
            </div>
          )}

          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">Dados completos (JSON)</summary>
            <pre className="mt-2 bg-muted p-2 rounded overflow-auto max-h-48">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {result?.error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
          ❌ Erro: {result.error}
        </div>
      )}
    </Card>
  );
};
