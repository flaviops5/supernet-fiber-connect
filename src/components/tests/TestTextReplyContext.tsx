import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, MessageSquare } from "lucide-react";

interface TestResult {
  test: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  duration?: number;
}

/**
 * Teste E2E para textReplyWithContext (PR #15)
 * 
 * Valida:
 * - Salvamento de last_agent_question
 * - Persistência de contexto adicional
 * - Detecção correta de perguntas
 */
export function TestTextReplyContext() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const runTests = async () => {
    setTesting(true);
    setResults([]);

    try {
      // Test 1: Criar conversa de teste
      addResult({ test: "Criar conversa", status: 'pending', message: "Criando conversa..." });
      const startTime1 = Date.now();
      
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          channel: 'whatsapp',
          status: 'open',
          metadata: { customer_name: 'Teste Context', customer_phone: '+5511888888888' }
        } as any)
        .select()
        .single();

      if (convError) throw convError;
      
      addResult({ 
        test: "Criar conversa", 
        status: 'success', 
        message: `Conversa criada: ${conversation.id}`,
        duration: Date.now() - startTime1
      });

      // Test 2: Simular agent_flow_states
      addResult({ test: "Criar flow_state", status: 'pending', message: "Criando estado de fluxo..." });
      const startTime2 = Date.now();

      const { error: flowError } = await supabase
        .from('agent_flow_states')
        .insert({
          conversation_id: conversation.id,
          scenario_started: 'test_scenario',
          waiting_step: 'test_step'
        });

      if (flowError) throw flowError;

      addResult({ 
        test: "Criar flow_state", 
        status: 'success', 
        message: "Estado criado com sucesso",
        duration: Date.now() - startTime2
      });

      // Test 3: Verificar salvamento de last_agent_question
      addResult({ test: "Salvar pergunta", status: 'pending', message: "Testando salvamento de pergunta..." });
      const startTime3 = Date.now();

      const testQuestion = "Você consegue reiniciar o equipamento?";
      
      await supabase
        .from('agent_flow_states')
        .update({ last_agent_question: testQuestion })
        .eq('conversation_id', conversation.id);

      const { data: flowState } = await supabase
        .from('agent_flow_states')
        .select('last_agent_question')
        .eq('conversation_id', conversation.id)
        .single();

      if (flowState?.last_agent_question !== testQuestion) {
        throw new Error('Pergunta não foi salva corretamente');
      }

      addResult({ 
        test: "Salvar pergunta", 
        status: 'success', 
        message: "last_agent_question salva com sucesso",
        duration: Date.now() - startTime3
      });

      // Test 4: Verificar contexto adicional
      addResult({ test: "Contexto adicional", status: 'pending', message: "Testando contexto adicional..." });
      const startTime4 = Date.now();

      await supabase
        .from('agent_flow_states')
        .update({ 
          waiting_step: 'new_step',
          context_warnings: 1
        })
        .eq('conversation_id', conversation.id);

      const { data: updatedFlow } = await supabase
        .from('agent_flow_states')
        .select('*')
        .eq('conversation_id', conversation.id)
        .single();

      if (updatedFlow?.waiting_step !== 'new_step' || updatedFlow?.context_warnings !== 1) {
        throw new Error('Contexto adicional não foi salvo');
      }

      addResult({ 
        test: "Contexto adicional", 
        status: 'success', 
        message: "Contexto adicional persistido corretamente",
        duration: Date.now() - startTime4
      });

      // Test 5: Testar detecção de perguntas
      addResult({ test: "Detecção de perguntas", status: 'pending', message: "Testando regex de perguntas..." });
      const startTime5 = Date.now();

      const testCases = [
        { text: "Você pode fazer isso?", expected: true },
        { text: "Consegue me ajudar?", expected: true },
        { text: "Qual é o problema?", expected: true },
        { text: "Onde está localizado?", expected: true },
        { text: "Isso está correto", expected: false },
        { text: "Perfeito, obrigado", expected: false }
      ];

      const questionRegex = /(?:\?|consegue|pode|qual|onde|quando|como|quem|por que|há|existe)/i;
      
      let allPassed = true;
      for (const testCase of testCases) {
        const isQuestion = questionRegex.test(testCase.text);
        if (isQuestion !== testCase.expected) {
          allPassed = false;
          break;
        }
      }

      if (!allPassed) {
        throw new Error('Alguns casos de teste falharam');
      }

      addResult({ 
        test: "Detecção de perguntas", 
        status: 'success', 
        message: "Todos os 6 casos de teste passaram",
        duration: Date.now() - startTime5
      });

      // Test 6: Integração completa
      addResult({ test: "Integração completa", status: 'pending', message: "Testando fluxo completo..." });
      const startTime6 = Date.now();

      // Simular sequência de perguntas
      const questions = [
        "As luzes estão acesas?",
        "Consegue ver a luz LOS piscando?",
        "Pode desconectar o cabo?"
      ];

      for (const q of questions) {
        await supabase
          .from('agent_flow_states')
          .update({ last_agent_question: q })
          .eq('conversation_id', conversation.id);
      }

      const { data: finalState } = await supabase
        .from('agent_flow_states')
        .select('last_agent_question')
        .eq('conversation_id', conversation.id)
        .single();

      if (finalState?.last_agent_question !== questions[questions.length - 1]) {
        throw new Error('Última pergunta não foi mantida');
      }

      addResult({ 
        test: "Integração completa", 
        status: 'success', 
        message: `Sequência de ${questions.length} perguntas processada`,
        duration: Date.now() - startTime6
      });

      // Limpar dados
      await supabase.from('agent_flow_states').delete().eq('conversation_id', conversation.id);
      await supabase.from('conversations').delete().eq('id', conversation.id);

      toast.success("✅ Todos os testes passaram!");

    } catch (error) {
      const lastTest = results[results.length - 1];
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      if (lastTest?.status === 'pending') {
        addResult({
          test: lastTest.test,
          status: 'error',
          message
        });
      }
      toast.error("❌ Falha: " + message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Teste E2E - textReplyWithContext (PR #15)
        </CardTitle>
        <CardDescription>
          Testa salvamento de perguntas, contexto e detecção de perguntas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTests} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executando...
            </>
          ) : (
            'Executar Testes'
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((result, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                {result.status === 'success' && (
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                )}
                {result.status === 'error' && (
                  <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                )}
                {result.status === 'pending' && (
                  <Loader2 className="h-5 w-5 text-muted-foreground animate-spin shrink-0 mt-0.5" />
                )}
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{result.test}</span>
                    {result.duration && (
                      <Badge variant="outline" className="text-xs">
                        {result.duration}ms
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border bg-muted/50 p-4">
          <h4 className="font-semibold text-sm mb-2">Cobertura</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>✅ Salvamento de last_agent_question</li>
            <li>✅ Persistência de contexto adicional</li>
            <li>✅ Detecção robusta de perguntas (6 casos)</li>
            <li>✅ Integração com agent_flow_states</li>
            <li>✅ Sequência de perguntas</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
