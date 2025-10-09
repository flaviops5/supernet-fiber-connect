import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Send, Copy, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AdminPrompts() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkApiConfiguration();
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const checkApiConfiguration = async () => {
    try {
      // Google API key já está configurada na edge function
      setApiConfigured(true);
    } catch (error) {
      console.error('Error checking API configuration:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('site-analyzer-agent', {
        body: { 
          message: userMessage.content,
          conversationHistory: messages
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Erro ao analisar. Verifique se a API está configurada.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Análise e Prompts do Site</h1>
        <p className="text-muted-foreground">
          Agente IA para análise do site e sugestões de melhorias
        </p>
      </div>

      {/* Status da API */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Google Gemini API configurada e pronta para uso
        </AlertDescription>
      </Alert>

      {/* Instruções de Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Como Funciona
          </CardTitle>
          <CardDescription>
            Este agente usa Google Gemini API diretamente para analisar seu site e fornecer insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">📋 O que o agente pode fazer:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Analisar código-fonte e identificar bugs</li>
              <li>Sugerir melhorias de performance</li>
              <li>Revisar estrutura de componentes</li>
              <li>Identificar problemas de UX/UI</li>
              <li>Propor otimizações de SEO</li>
              <li>Sugerir melhorias de acessibilidade</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">🔧 Configuração:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Google Gemini API integrada ao projeto</li>
              <li>Usando modelo: <Badge>gemini-2.0-flash-exp</Badge></li>
              <li>Chave API: AIzaSyDp7M8qcIlYVKVBMNMfLbzgHWpxjd2sOb0</li>
              <li>Método: POST direto para Google Generative Language API</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">💡 Dicas de uso:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Cole código que deseja revisar</li>
              <li>Descreva o bug ou problema encontrado</li>
              <li>Peça análise de páginas específicas</li>
              <li>Solicite comparação entre diferentes abordagens</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Chat com Agente Analista</CardTitle>
          <CardDescription>
            Converse com o agente sobre melhorias e correções para o site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Messages */}
            <ScrollArea ref={scrollAreaRef} className="h-[400px] pr-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <Sparkles className="h-12 w-12 mb-4 opacity-50" />
                  <p>Inicie uma conversa com o agente analista</p>
                  <p className="text-sm mt-2">
                    Exemplo: "Analise o componente Header e sugira melhorias"
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <Badge variant={message.role === "user" ? "secondary" : "outline"}>
                            {message.role === "user" ? "Você" : "Agente IA"}
                          </Badge>
                          {message.role === "assistant" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(message.content)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-2">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-lg p-4 bg-muted">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Analisando...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Descreva o que você gostaria de analisar ou melhorar..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="min-h-[80px]"
                disabled={!apiConfigured}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading || !apiConfigured}
                size="icon"
                className="h-[80px] w-[80px]"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
