import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseError } from "@/types/error.types";
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

interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_name?: string;
  content?: string;
  created_at: string;
}

interface MassOutageData {
  region_pattern: string;
  affected_count: number;
  status: string;
}

interface TestResults {
  success: boolean;
  conversation_id?: string;
  messages?: ConversationMessage[];
  outage_detected?: boolean;
  outage_data?: MassOutageData | null;
  error?: string;
  scenario?: string;
  usedRefactored?: boolean;
  executionTime?: number;
}

export const TestSupportTechAgent = () => {
  const [loading, setLoading] = useState(false);
  const [outageActive, setOutageActive] = useState(false);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');
  const { toast } = useToast();

  // Simples: detectar se última mensagem do Luan tem "reinici" e próxima não tem conclusão
  const messages = testResults?.messages || [];
  const lastLuanMsg = [...messages].reverse().find((m) => 
    m.sender_type === 'agent' && /Luan/i.test(m.sender_name || '')
  );
  const isRebootMsg = lastLuanMsg && /(reinici|reinício remoto|reboot)/i.test(lastLuanMsg.content || '');
  const hasCompletion = messages.some((m, idx) => {
    if (!lastLuanMsg) return false;
    const luanIdx = messages.findIndex((msg) => msg.id === lastLuanMsg.id);
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
        (payload) => {
          setTestResults((prev) => 
            prev ? { ...prev, messages: [...(prev.messages || []), payload.new as ConversationMessage] } : prev
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
    } catch (error) {
      const err = parseError(error);
      toast({
        title: "❌ Erro ao ativar outage",
        description: err.message,
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
    } catch (error) {
      const err = parseError(error);
      toast({
        title: "❌ Erro ao limpar outage",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testScenario = async (scenario: 'A' | 'B' | 'C' | 'D' | 'E') => {
    setLoading(true);
    setTestResults(null);
    
    try {
      const startTime = Date.now();
      
      // Mensagens e sinais específicos por cenário
      const scenarioData = {
        'A': {
          message: 'A internet está sem funcionar',
          onu_signal: { tx_power: 0, rx_power: 0, status: 'offline' },
          description: 'TX/RX = 0.00 (Sem energia)'
        },
        'B': {
          message: 'A internet está lenta',
          onu_signal: { tx_power: 0.5, rx_power: -20, status: 'online' },
          description: 'Sinal bom com lentidão (Fast-path)'
        },
        'C': {
          message: 'A internet cai muito',
          onu_signal: { tx_power: -2, rx_power: -27, status: 'online' },
          description: 'Sinal fraco (-24 a -28 dBm)'
        },
        'D': {
          message: 'Sem internet completamente',
          onu_signal: { tx_power: -5, rx_power: -31, status: 'critical' },
          description: 'RX crítico (< -28 dBm)'
        },
        'E': {
          message: 'O wi-fi não funciona',
          onu_signal: { tx_power: -3, rx_power: -25, status: 'good' },
          description: 'Sinal OK mas WAN/Wi-Fi'
        }
      };

      const testData = scenarioData[scenario];

      // 1. Buscar conversa existente
      const { data: existing } = await supabase
        .from('conversations')
        .select('id, status, current_department')
        .eq('customer_phone', '11999999999')
        .eq('channel', 'whatsapp')
        .maybeSingle();

      let conversation: { id: string; status: string; current_department: string };

      if (existing) {
        await supabase
          .from('conversations')
          .update({ 
            status: 'waiting', 
            current_department: 'tecnico', 
            assigned_agent_id: null,
            metadata: { test_scenario: scenario, test_signal: testData.onu_signal }
          })
          .eq('id', existing.id);
        conversation = existing;
      } else {
        const { data: created, error: convError } = await supabase
          .from('conversations')
          .insert({
            customer_cpf: '111.111.111-11',
            customer_name: `Cliente Teste Cenário ${scenario}`,
            customer_phone: '11999999999',
            channel: 'whatsapp',
            current_department: 'tecnico',
            assigned_agent_id: null,
            status: 'waiting',
            metadata: { test_scenario: scenario, test_signal: testData.onu_signal }
          })
          .select()
          .single();
        if (convError) throw convError;
        conversation = created;
      }

      // 2. Chamar support-tech-agent com modo de teste
      const { data: agentResponse, error: agentError } = await supabase.functions.invoke(
        'support-tech-agent',
        { 
          body: { 
            conversation_id: conversation.id, 
            customer_cpf: '111.111.111-11', 
            message: testData.message,
            onu_signal: testData.onu_signal,
            testHarness: true, // Ativar modo de teste
            testModeScenario: scenario
          } 
        }
      );

      if (agentError) throw agentError;
      
      const executionTime = Date.now() - startTime;

      // 3. Buscar mensagens
      const { data: messages } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      // 4. Verificar mass outage
      const { data: outages } = await supabase
        .from('mass_outage_events')
        .select('*')
        .eq('status', 'active')
        .limit(1);

      setTestResults({
        success: true,
        conversation_id: conversation.id,
        messages: messages || [],
        outage_detected: (outages?.length || 0) > 0,
        outage_data: outages?.[0] || null,
        scenario,
        usedRefactored: agentResponse?.usedRefactored || false,
        executionTime
      });

      const refactoredStatus = agentResponse?.usedRefactored ? "✅ Refatorado" : "⚠️ Inline";
      toast({
        title: `✅ Cenário ${scenario} Testado (${refactoredStatus})`,
        description: `${testData.description} - ${executionTime}ms`,
      });
    } catch (error) {
      const err = parseError(error);
      toast({
        title: "❌ Erro no Teste",
        description: err.message,
        variant: "destructive",
      });
      setTestResults({ success: false, error: err.message });
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

      {/* Teste de Cenários Refatorados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-500" />
            Teste de Cenários Refatorados
          </CardTitle>
          <CardDescription>
            Testa cada cenário refatorado (A, B, C, D, E) individualmente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seletor de Cenário */}
          <div className="grid grid-cols-5 gap-2">
            {(['A', 'B', 'C', 'D', 'E'] as const).map((scenario) => (
              <Button
                key={scenario}
                variant={selectedScenario === scenario ? 'default' : 'outline'}
                onClick={() => setSelectedScenario(scenario)}
                disabled={loading}
                className="h-16 flex-col"
              >
                <span className="text-lg font-bold">Cenário {scenario}</span>
                <span className="text-xs">
                  {scenario === 'A' && 'TX/RX=0'}
                  {scenario === 'B' && 'Fast-path'}
                  {scenario === 'C' && 'Fraco'}
                  {scenario === 'D' && 'Crítico'}
                  {scenario === 'E' && 'WAN/Wi-Fi'}
                </span>
              </Button>
            ))}
          </div>
          
          <Button
            onClick={() => testScenario(selectedScenario)}
            disabled={loading}
            className="w-full"
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Testar Cenário {selectedScenario}
          </Button>

          {testResults && (
            <div className="space-y-3">
              {testResults.success ? (
                <>
                  <Alert className={testResults.usedRefactored ? "border-green-600 bg-green-50 dark:bg-green-950" : "border-yellow-600 bg-yellow-50 dark:bg-yellow-950"}>
                    {testResults.usedRefactored ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                    <AlertDescription className={testResults.usedRefactored ? "text-green-900 dark:text-green-100" : "text-yellow-900 dark:text-yellow-100"}>
                      <strong>{testResults.usedRefactored ? '✅ Cenário Refatorado Usado' : '⚠️ Código Inline Usado (Fallback)'}</strong>
                      <br />
                      <div className="flex gap-4 mt-2 text-xs">
                        <span>Cenário: <code className="px-1 py-0.5 rounded bg-muted">{testResults.scenario || 'N/A'}</code></span>
                        <span>Tempo: <code className="px-1 py-0.5 rounded bg-muted">{testResults.executionTime}ms</code></span>
                        <span>ID: <code className="px-1 py-0.5 rounded bg-muted">{testResults.conversation_id}</code></span>
                      </div>
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
                          {testResults.messages.map((msg, idx) => (
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
            Validação dos Cenários Refatorados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">✅ O que deve acontecer:</h4>
              <ul className="space-y-2 list-disc list-inside text-sm">
                <li><strong>Cenário A:</strong> Detecta TX/RX = 0.00 e inicia protocolo de energia</li>
                <li><strong>Cenário B:</strong> Ativa fast-path (pula reinicialização) se sinal bom</li>
                <li><strong>Cenário C:</strong> Identifica sinal fraco e solicita verificação de cabos</li>
                <li><strong>Cenário D:</strong> Detecta RX crítico e escala para técnico</li>
                <li><strong>Cenário E:</strong> Diagnostica problema WAN/Wi-Fi com sinal óptico OK</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">🎯 Indicadores de Sucesso:</h4>
              <ul className="space-y-2 list-disc list-inside text-sm">
                <li>Badge verde "✅ Cenário Refatorado Usado" deve aparecer</li>
                <li>Tempo de execução deve ser &lt; 2000ms</li>
                <li>Mensagem do agente deve mencionar o problema específico</li>
                <li>Flow updates devem refletir o cenário correto</li>
              </ul>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Próximos passos:</strong> Se todos os cenários testarem OK (badge verde), a refatoração está funcionando perfeitamente. Caso veja "⚠️ Código Inline Usado", verifique a feature flag no banco de dados.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
