import { useEffect, useMemo, useState } from "react";
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

  // Detecta reboot em progresso baseado nas mensagens do Luan
  const messagesList = useMemo(() => testResults?.messages || [], [testResults]);
  const lastAgentTrigger = useMemo(() => {
    for (let i = messagesList.length - 1; i >= 0; i--) {
      const m = messagesList[i];
      if (
        (m.sender_type === 'agent' || /Luan/i.test(m.sender_name || '')) &&
        /(reinici|reinício remoto|reboot)/i.test(m.content || '')
      ) {
        return m;
      }
    }
    return undefined;
  }, [messagesList]);

  const hasCompletionAfterTrigger = useMemo(() => {
    if (!lastAgentTrigger) return false;
    const idx = messagesList.findIndex((m: any) => m.id === lastAgentTrigger.id);
    if (idx === -1) return false;
    return messagesList.slice(idx + 1).some((m: any) =>
      (m.sender_type === 'agent' || /Luan/i.test(m.sender_name || '')) &&
      /(ONLINE|ainda está offline|Reboot executado|religado|falhou)/i.test(m.content || '')
    );
  }, [messagesList, lastAgentTrigger]);

  const rebootInProgress = !!lastAgentTrigger && !hasCompletionAfterTrigger;
  const rebootStartedAt = lastAgentTrigger ? Date.parse(lastAgentTrigger.created_at) : undefined;

  // Realtime status derivado de equipment_reboots
  const rebootStatus = testResults?.reboot_event?.status as string | undefined;
  const rebootInProgressRT = useMemo(() => rebootStatus ? !/(completed|success|failed|error)/i.test(rebootStatus) : false, [rebootStatus]);

  // Polling leve enquanto o reboot estiver em progresso para atualizar mensagens
  useEffect(() => {
    if (!rebootInProgress || !testResults?.conversation_id) return;
    const id = setInterval(async () => {
      const { data: messages } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', testResults.conversation_id)
        .order('created_at', { ascending: true });
      setTestResults((prev: any) => (prev ? { ...prev, messages: messages || [] } : prev));
    }, 4000);
    return () => clearInterval(id);
  }, [rebootInProgress, testResults?.conversation_id]);

  // Realtime: atualizar mensagens assim que Luan enviar algo
  useEffect(() => {
    if (!testResults?.conversation_id) return;
    const channel = supabase
      .channel('conversation-messages-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${testResults.conversation_id}`,
        },
        (payload: any) => {
          const newMsg = payload.new as any;
          setTestResults((prev: any) =>
            prev ? { ...prev, messages: [...(prev.messages || []), newMsg] } : prev
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [testResults?.conversation_id]);

  // Realtime: acompanhar status em equipment_reboots pelo ixc_client_id
  useEffect(() => {
    if (!testResults?.ixc_client_id) return;
    const channel = supabase
      .channel('equipment-reboots-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment_reboots',
          filter: `ixc_client_id=eq.${testResults.ixc_client_id}`,
        },
        (payload: any) => {
          setTestResults((prev: any) => prev ? { ...prev, reboot_event: payload.new } : prev);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [testResults?.ixc_client_id]);

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

  const testLuanEscalation = async () => {
    setLoading(true);
    setTestResults(null);
    
    try {
      // 1. Buscar conversa existente (evitar duplicação pela unique constraint)
      const { data: existing, error: selError } = await supabase
        .from('conversations')
        .select('id, status, current_department')
        .eq('customer_phone', '11999999999')
        .eq('channel', 'whatsapp')
        .maybeSingle();

      if (selError) throw selError;

      let conversation: any;

      if (existing) {
        // Garantir estado apropriado para o teste
        await supabase
          .from('conversations')
          .update({
            status: 'waiting',
            current_department: 'tecnico',
            assigned_agent_id: null
          })
          .eq('id', existing.id);
        conversation = existing;
      } else {
        // 2. Criar conversa de teste
        const { data: created, error: convError } = await supabase
          .from('conversations')
          .insert({
            customer_cpf: '111.111.111-11',
            customer_name: 'Cliente Teste Técnico',
            customer_phone: '11999999999',
            channel: 'whatsapp',
            current_department: 'tecnico',
            assigned_agent_id: null,
            status: 'waiting'
          })
          .select()
          .single();
        if (convError) throw convError;
        conversation = created;
      }

      // Buscar ixc_client_id para assinar updates de reboot
      const { data: convData } = await supabase
        .from('conversations')
        .select('ixc_client_id')
        .eq('id', conversation.id)
        .maybeSingle();

      // 2. Chamar support-tech-agent
      const { data: agentResponse, error: agentError } = await supabase.functions.invoke(
        'support-tech-agent',
        {
          body: {
            conversation_id: conversation.id,
            customer_cpf: '111.111.111-11',
            message: 'Test'
          }
        }
      );

      if (agentError) throw agentError;

      // 3. Buscar mensagens da conversa
      const { data: messages } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      // 4. Verificar se há mass outage ativo
      const { data: outages } = await supabase
        .from('mass_outage_events')
        .select('*')
        .eq('status', 'active')
        .limit(1);

      setTestResults({
        success: true,
        conversation_id: conversation.id,
        ixc_client_id: convData?.ixc_client_id || null,
        messages: messages || [],
        outage_detected: (outages?.length || 0) > 0,
        outage_data: outages?.[0] || null,
        reboot_event: null,
      });

      toast({
        title: "✅ Teste Concluído",
        description: `Conversa ${conversation.id} criada e Luan acionado`,
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
            onClick={testLuanEscalation}
            disabled={loading}
            className="w-full"
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Executar Teste Completo
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

                  {/* Mass Outage Detection */}
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Detecção de Mass Outage
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {testResults.outage_detected ? (
                        <div className="space-y-2">
                          <Badge variant="destructive">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Outage Detectado
                          </Badge>
                          <div className="text-xs space-y-1 bg-muted p-3 rounded">
                            <p><strong>Região:</strong> {testResults.outage_data.region_pattern}</p>
                            <p><strong>Clientes Afetados:</strong> {testResults.outage_data.affected_count}</p>
                            <p><strong>Status:</strong> {testResults.outage_data.status}</p>
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Nenhum Outage Ativo
                        </Badge>
                      )}
                    </CardContent>
                  </Card>

{(rebootInProgress || rebootInProgressRT) && (
                    <RebootLoader totalSeconds={60} startedAt={rebootStartedAt} />
                  )}

                  {testResults?.reboot_event && (
                    <Card className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Status do Reboot (Realtime)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs space-y-1 bg-muted p-3 rounded">
                          <p><strong>Status:</strong> {testResults.reboot_event.status}</p>
                          <p><strong>Mensagem:</strong> {testResults.reboot_event.result_message || '—'}</p>
                          <p><strong>Atualizado em:</strong> {new Date(testResults.reboot_event.updated_at || testResults.reboot_event.created_at).toLocaleTimeString()}</p>
                        </div>
                      </CardContent>
                    </Card>
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
              <strong>✅ Mass Outage Detectado:</strong> O Luan deve mencionar a queda na mensagem inicial
            </li>
            <li>
              <strong>✅ Mensagem Contém Região:</strong> Deve indicar "SRI" e número de clientes afetados
            </li>
            <li>
              <strong>✅ Conversa Criada:</strong> Deve aparecer na fila de atendimento técnico
            </li>
            <li>
              <strong>✅ Logs Estruturados:</strong> Verifique os logs da edge function para detalhes
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
