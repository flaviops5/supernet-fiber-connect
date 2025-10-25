import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Phone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseError } from "@/types/error.types";

interface TestResult {
  ok?: boolean;
  needsCPF?: boolean;
  protocol?: string;
  targetDepartment?: string;
  [key: string]: unknown;
}

export const TestCPFValidation = () => {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const testValidation = async () => {
    if (!input.trim()) {
      toast({
        title: "Campo vazio",
        description: "Digite um CPF para testar",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Criar conversa de teste
      const { data: conversation } = await supabase
        .from("conversations")
        .insert({
          customer_name: "Teste",
          channel: "whatsapp",
          status: "waiting",
        })
        .select()
        .single();

      if (!conversation) throw new Error("Erro ao criar conversa de teste");

      // Chamar routing-agent
      const { data, error } = await supabase.functions.invoke("routing-agent", {
        body: {
          conversationId: conversation.id,
          message: input,
        },
      });

      if (error) throw error;

      setResult(data);
      
      toast({
        title: "✅ Teste concluído",
        description: "Veja os resultados abaixo",
      });
    } catch (error) {
      const err = parseError(error);
      console.error("Erro no teste:", err);
      toast({
        title: "❌ Erro no teste",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInputTypeIcon = () => {
    if (!result) return null;
    
    // Detectar tipo pela resposta
    if (result.needsCPF) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <User className="h-5 w-5 text-blue-500" />;
  };

  const getValidationStatus = () => {
    if (!result) return null;

    if (result.needsCPF) {
      return (
        <Badge variant="outline" className="gap-2">
          <XCircle className="h-4 w-4 text-red-500" />
          CPF Inválido ou Não Encontrado
        </Badge>
      );
    }

    if (result.ok) {
      return (
        <Badge variant="outline" className="gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          Processado com Sucesso
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-2">
        <XCircle className="h-4 w-4 text-red-500" />
        Erro no Processamento
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔐 Teste de Validação de CPF
        </CardTitle>
        <CardDescription>
          Teste a validação real de CPF com mascaramento automático (LGPD compliant)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input de Teste */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Digite um CPF para testar:</label>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: 123.456.789-10 ou 12345678910"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && testValidation()}
            />
            <Button onClick={testValidation} disabled={loading}>
              {loading ? "Testando..." : "Testar"}
            </Button>
          </div>
        </div>

        {/* Exemplos */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Exemplos para testar:</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("003.458.371-85")}
            >
              ✅ CPF válido
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("12345678999")}
            >
              ❌ CPF inválido
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("11999887766")}
            >
              📞 Telefone
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("oi, quero contratar")}
            >
              💬 Mensagem simples
            </Button>
          </div>
        </div>

        {/* Resultados */}
        {result && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Resultados:</h3>
              {getValidationStatus()}
            </div>

            <div className="grid gap-3">
              {/* Protocolo */}
              {result.protocol && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Protocolo:</span>
                  <code className="text-sm bg-background px-2 py-1 rounded">
                    {result.protocol}
                  </code>
                </div>
              )}

              {/* Departamento */}
              {result.targetDepartment && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Roteado para:</span>
                  <Badge>
                    {result.targetDepartment === "cloe" && "🤖 Cloé (Continua atendimento)"}
                    {result.targetDepartment === "comercial" && "💼 Vicente (Comercial)"}
                    {result.targetDepartment === "financeiro" && "💰 Julia (Financeiro)"}
                    {result.targetDepartment === "tecnico" && "🔧 Luan (Técnico)"}
                  </Badge>
                </div>
              )}

              {/* CPF Solicitado */}
              {result.needsCPF && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    CPF não identificado ou inválido - solicitado ao cliente
                  </span>
                </div>
              )}

              {/* Resposta Completa */}
              <details className="p-3 bg-muted rounded-lg">
                <summary className="text-sm font-medium cursor-pointer">
                  Ver resposta completa (JSON)
                </summary>
                <pre className="text-xs mt-2 overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}

        {/* Info de Segurança */}
        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300">
            🔒 <strong>Segurança LGPD:</strong> CPFs são validados e mascarados automaticamente antes de qualquer log. 
            Apenas os últimos 4 dígitos são visíveis nos logs.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
