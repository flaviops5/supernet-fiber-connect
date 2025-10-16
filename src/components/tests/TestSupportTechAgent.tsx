import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Zap,
  PlayCircle,
  XCircle
} from "lucide-react";
import RebootLoader from "@/components/atendimento/RebootLoader";

export const TestSupportTechAgent = () => {
  const [loading, setLoading] = useState(false);
  const [outageActive, setOutageActive] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const { toast } = useToast();

  // Simples: detectar se última mensagem do Luan tem "reinici" e próxima não tem conclusão
  const messages = testResults?.messages || [];
  const lastLuanMsg = [...messages].reverse().find((m: any) => 
    m.sender_type === 'agent' && /Luan/i.test(m.sender_name || '')
  );
  const isRebootMsg = lastLuanMsg && /(reinici|reinício remoto|reboot)/i.test(lastLuanMsg.content || '');
  const hasCompletion = messages.some((m: any, idx: number) => {
    if (!lastLuanMsg) return false;
    const luanIdx = messages.findIndex((msg: any) => msg.id === lastLuanMsg.id);
    return idx > luanIdx && 
           m.sender_type === 'agent' && 
           /(ONLINE|offline|Reboot|religado|falhou|verifique)/i.test(m.content || '');
  });
  
  const showLoader = isRebootMsg && !hasCompletion;
  const rebootStartedAt = lastLuanMsg?.created_at ? Date.parse(lastLuanMsg.created_at) : Date.now();

  // Realtime: apenas escutar novas mensagens
  useEffect(() => {
    if (!testResults?.conversation_id) return;
    
    const channel = supabase
      .channel('test-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${testResults.conversation_id}`,
        },
        (payload: any) => {
          setTestResults((prev: any) => 
            prev ? { ...prev, messages: [...prev.messages, payload.new] } : prev
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [testResults?.conversation_id]);

  const createMassOutage = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("simulate-mass-outage", {
        body: { action: "activate" }
      });

      if (error) throw error;

      setOutageActive(true);
      toast({
        title: "✅ Mass Outage Ativado",
        description: "Simulação: Taguatinga e Samambaia - 1542 clientes afetados",
      });
    } catch (error: any) {
      toast({
        title: "❌ Erro ao ativar outage",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearMassOutage = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("simulate-mass-outage", {
        body: { action: "deactivate" }
      });

      if (error) throw error;

      setOutageActive(false);
      toast({
        title: "✅ Mass Outage Limpo",
        description: "Todos os eventos foram marcados como resolvidos",
      });
    } catch (error: any) {
      toast({
        title: "❌ Erro ao limpar outage",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testClienteOfflineSemOutage = async () => {
    setLoading(true);
    setTestResults(null);
    
    try {
      // 1. Garantir que mass outage está DESATIVADA
      await supabase.functions.invoke("simulate-mass-outage", {
        body: { action: "deactivate" }
      });
      setOutageActive(false);

      // 2. Buscar conversa existente
      const { data: existing, error: selError } = await supabase
        .from('conversations')
        .select('id, status, current_department')
        .eq('customer_phone', '11988887777')
        .eq('channel', 'whatsapp')
        .maybeSingle();

      if (selError) throw selError;

      let conversation: any;

      if (existing) {
        await supabase
          .from('conversations')
          .update({ 
            status: 'waiting', 
            current_department: 'cloe',
            assigned_agent_id: null,
            metadata: null 
          })
          .eq('id', existing.id);
        conversation = existing;
      } else {
        const { data: created, error: convError } = await supabase
          .from('conversations')
          .insert({
            customer_cpf: '222.222.222-22',
            customer_name: 'Cliente Offline Teste',
            customer_phone: '11988887777',
            channel: 'whatsapp',
            current_department: 'cloe',
            assigned_agent_id: null,
            status: 'waiting'
          })
          .select()
          .single();
        if (convError) throw convError;
        conversation = created;
      }

      // 3. Chamar routing-agent (Cloé) - ela deve detectar offline e rotear para Luan
      const { data: cloeResponse, error: cloeError } = await supabase.functions.invoke(
        'routing-agent',
        { 
          body: { 
            conversation_id: conversation.id,
            message: 'Minha internet está fora',
            customer_cpf: '222.222.222-22'
          } 
        }
      );

      if (cloeError) throw cloeError;

      // 4. Aguardar atualização do departamento
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 5. Buscar mensagens e conversa atualizada
      const { data: messages } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      const { data: updatedConv } = await supabase
        .from('conversations')
        .select('current_department, metadata')
        .eq('id', conversation.id)
        .single();

      // 6. Verificar se foi roteado para Luan
      const routedToLuan = updatedConv?.current_department === 'tecnico';

      setTestResults({
        success: true,
        conversation_id: conversation.id,
        messages: messages || [],
        outage_detected: false,
        routed_to_luan: routedToLuan,
        current_department: updatedConv?.current_department,
        metadata: updatedConv?.metadata,
      });

      toast({
        title: routedToLuan ? "✅ Teste OK - Roteado para Luan" : "⚠️ Não roteou para Luan",
        description: `Departamento atual: ${updatedConv?.current_department}`,
      });
    } catch (error: any) {
      toast({
        title: "❌ Erro no Teste",
        description: error.message,
        variant: "destructive",
      });
      setTestResults({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Este teste valida o <strong>support-tech-agent</strong> (Luan Silva) e a integração com mass outage detection.
        </AlertDescription>
      </Alert>

      {/* Controles de Mass Outage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Simulação de Mass Outage
          </CardTitle>
          <CardDescription>
            Crie uma queda massiva simulada para testar a detecção do Luan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={createMassOutage}
              disabled={loading || outageActive}
              variant="destructive"
              className="flex-1"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Ativar Pane Massiva
            </Button>
            <Button
              onClick={clearMassOutage}
              disabled={loading || !outageActive}
              variant="outline"
              className="flex-1"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Desativar Pane
            </Button>
          </div>

          {outageActive && (
            <Alert className="border-orange-600 bg-orange-50 dark:bg-orange-950">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-900 dark:text-orange-100">
                <strong>🚨 Pane Massiva Ativa:</strong> 1542 clientes afetados em Taguatinga e Samambaia
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Teste do Luan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-500" />
            Teste do Suporte Técnico (Luan)
          </CardTitle>
          <CardDescription>
            Simula uma conversa escalada para o departamento técnico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={testClienteOfflineSemOutage}
            disabled={loading}
            className="w-full"
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Testar Cliente Offline → Roteamento para Luan
          </Button>

          {testResults && (
            <div className="space-y-3">
              {testResults.success ? (
                <>
                  <Alert className="border-green-600 bg-green-50 dark:bg-green-950">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-900 dark:text-green-100">
                      <strong>✅ Teste Bem-Sucedido!</strong>
                      <br />
                      Conversa ID: <code className="text-xs bg-green-100 dark:bg-green-900 px-1 py-0.5 rounded">{testResults.conversation_id}</code>
                    </AlertDescription>
                  </Alert>

                   {/* Roteamento */}
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        Roteamento Cloé → Luan
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {testResults.routed_to_luan ? (
                          <Badge className="bg-green-600">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Roteado Corretamente para Luan
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="mr-1 h-3 w-3" />
                            Não foi roteado para Luan
                          </Badge>
                        )}
                        <div className="text-xs space-y-1 bg-muted p-3 rounded">
                          <p><strong>Departamento Atual:</strong> {testResults.current_department}</p>
                          <p><strong>Mass Outage:</strong> {testResults.outage_detected ? 'Detectada' : 'Não detectada ✓'}</p>
                          {testResults.metadata && (
                            <details className="mt-2">
                              <summary className="cursor-pointer font-semibold">Metadata</summary>
                              <pre className="text-xs mt-1 overflow-auto">
                                {JSON.stringify(testResults.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {showLoader && (
                    <RebootLoader totalSeconds={60} startedAt={rebootStartedAt} />
                  )}

                  {/* Mensagens */}
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        Mensagens do Luan ({testResults.messages.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {testResults.messages.length > 0 ? (
                        <div className="space-y-2">
                          {testResults.messages.map((msg: any, idx: number) => (
                            <div key={idx} className="p-3 bg-muted rounded text-xs">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{msg.sender_name || 'Sistema'}</Badge>
                                <span className="text-muted-foreground">
                                  {new Date(msg.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm">{msg.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma mensagem encontrada</p>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Erro:</strong> {testResults.error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Como Interpretar os Resultados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 list-decimal list-inside text-sm">
            <li>
              <strong>✅ Sem Mass Outage:</strong> Badge deve mostrar "Não detectada ✓"
            </li>
            <li>
              <strong>✅ Cloé Detecta Offline:</strong> Cliente reporta sem internet
            </li>
            <li>
              <strong>✅ Roteamento para Luan:</strong> Departamento atual deve ser "tecnico"
            </li>
            <li>
              <strong>✅ Luan Recebe Contexto:</strong> Metadata deve conter informações de diagnóstico
            </li>
            <li>
              <strong>✅ Mensagem de Transferência:</strong> Cloé deve informar transferência para suporte técnico
            </li>
          </ol>

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Próximo passo:</strong> Após o teste, acesse <code className="text-xs bg-muted px-1 py-0.5 rounded">/atendimento</code> para ver a conversa na fila do Luan.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};
