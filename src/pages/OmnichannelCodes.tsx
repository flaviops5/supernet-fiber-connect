import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Code2, FileCode, Folder, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AuthGuard } from '@/components/AuthGuard';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

const OMNICHANNEL_FILES = {
  frontend: [
    'src/pages/Atendimento.tsx',
    'src/components/atendimento/ConversationQueue.tsx',
    'src/components/atendimento/ChatArea.tsx',
    'src/components/atendimento/ClientInfoPanel.tsx',
    'src/components/atendimento/AgentInfoPanel.tsx',
    'src/components/atendimento/SendRealMessageButton.tsx',
    'src/components/atendimento/ConversationHistory.tsx',
    'src/components/atendimento/ClosureMessageSelector.tsx',
    'src/components/atendimento/AgentPresencePanel.tsx',
    'src/components/atendimento/ConversationSearch.tsx',
  ],
  backend: [
    'supabase/functions/whatsapp-webhook/index.ts',
    'supabase/functions/routing-agent/index.ts',
    'supabase/functions/routing-agent/config.ts',
    'supabase/functions/routing-agent/prompts.ts',
    'supabase/functions/send-whatsapp-message/index.ts',
    'supabase/functions/check-escalation/index.ts',
    'supabase/functions/summarize-conversation/index.ts',
  ],
};

export default function OmnichannelCodes() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateFileListPrompt = () => {
    let prompt = `# ANÁLISE COMPLETA DO SISTEMA OMNICHANNEL\n\n`;
    prompt += `Por favor, leia e analise TODO O CÓDIGO dos seguintes arquivos do sistema:\n\n`;
    
    prompt += `## FRONTEND COMPONENTS\n\n`;
    OMNICHANNEL_FILES.frontend.forEach(file => {
      prompt += `Leia o arquivo: ${file}\n`;
    });
    
    prompt += `\n## BACKEND EDGE FUNCTIONS\n\n`;
    OMNICHANNEL_FILES.backend.forEach(file => {
      prompt += `Leia o arquivo: ${file}\n`;
    });
    
    prompt += `\n## CONTEXTO DO SISTEMA\n\n`;
    prompt += `Este é um sistema de atendimento omnichannel que integra:\n`;
    prompt += `- WhatsApp (via Evolution API)\n`;
    prompt += `- Roteamento inteligente com IA\n`;
    prompt += `- Atendimento multicanal\n`;
    prompt += `- Resumo automático de conversas\n`;
    prompt += `- Escalonamento entre departamentos\n\n`;
    
    prompt += `## TECNOLOGIAS UTILIZADAS\n\n`;
    prompt += `- Frontend: React + TypeScript + Tailwind CSS\n`;
    prompt += `- Backend: Supabase Edge Functions (Deno)\n`;
    prompt += `- IA: Lovable AI Gateway (Google Gemini 2.5 Flash)\n`;
    prompt += `- Database: PostgreSQL (Supabase)\n`;
    prompt += `- Real-time: Supabase Realtime (WebSockets)\n\n`;
    
    prompt += `## FLUXO PRINCIPAL\n\n`;
    prompt += `1. Cliente envia mensagem via WhatsApp\n`;
    prompt += `2. Evolution API recebe e webhook envia para whatsapp-webhook\n`;
    prompt += `3. routing-agent analisa e roteia para departamento correto\n`;
    prompt += `4. Agente humano atende via interface (Atendimento.tsx)\n`;
    prompt += `5. Sistema pode escalar para outros departamentos (check-escalation)\n`;
    prompt += `6. Ao finalizar, gera resumo via IA (summarize-conversation)\n\n`;
    
    prompt += `## O QUE VOCÊ DEVE FAZER\n\n`;
    prompt += `Depois de ler TODOS os arquivos listados acima, você pode:\n`;
    prompt += `- Analisar a arquitetura completa do sistema\n`;
    prompt += `- Identificar pontos de melhoria\n`;
    prompt += `- Sugerir otimizações de código\n`;
    prompt += `- Revisar segurança e boas práticas\n`;
    prompt += `- Propor novas funcionalidades\n`;
    prompt += `- Explicar o funcionamento detalhado\n`;
    
    return prompt;
  };

  const handleCopy = async () => {
    try {
      const prompt = generateFileListPrompt();
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast({
        title: 'Prompt copiado!',
        description: 'Cole este prompt em uma LLM com acesso ao projeto (Cursor, Copilot, etc.)',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o prompt.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadZip = async () => {
    try {
      toast({
        title: 'Gerando arquivo...',
        description: 'Aguarde enquanto compilamos os arquivos',
      });

      const { data, error } = await supabase.functions.invoke('generate-omnichannel-zip');

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([data], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omnichannel-3-arquivos.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Código baixado!',
        description: 'Arquivo com todo o código do backend salvo',
      });
    } catch (error) {
      console.error('Erro ao baixar código:', error);
      toast({
        title: 'Erro ao gerar arquivo',
        description: 'Não foi possível criar o arquivo',
        variant: 'destructive',
      });
    }
  };

  const totalFiles = OMNICHANNEL_FILES.frontend.length + OMNICHANNEL_FILES.backend.length;

  return (
    <AuthGuard requiredRoles={['admin', 'editor']}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Code2 className="h-8 w-8 text-primary" />
              Omnichannel Codes
            </h1>
            <p className="text-muted-foreground mt-2">
              Lista de arquivos do sistema para análise por LLMs
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCopy}
              size="lg"
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-5 w-5" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-5 w-5" />
                  Copiar Prompt
                </>
              )}
            </Button>
            
            <Button
              onClick={handleDownloadZip}
              size="lg"
              variant="secondary"
              className="gap-2"
            >
              <Download className="h-5 w-5" />
              Baixar 3 Arquivos (.txt)
            </Button>
          </div>
        </div>

        <Separator />

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Como usar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="font-semibold">📋 Passo 1: Copiar o Prompt</p>
              <p className="text-sm text-muted-foreground">
                Clique no botão "Copiar Prompt" para copiar um prompt que pede à LLM para ler todos os arquivos do Omnichannel.
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="font-semibold">🤖 Passo 2: Usar uma LLM com acesso ao projeto</p>
              <p className="text-sm text-muted-foreground">
                Cole o prompt em uma LLM que tenha acesso ao código:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground ml-4">
                <li><strong>Cursor AI</strong>: Cole no chat e a IA lerá todos os arquivos automaticamente</li>
                <li><strong>GitHub Copilot</strong>: Use no VS Code com acesso ao workspace</li>
                <li><strong>Windsurf</strong>: Cole no chat para análise completa</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <p className="font-semibold">💬 Passo 3: A LLM lerá tudo</p>
              <p className="text-sm text-muted-foreground">
                A LLM terá contexto completo de:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground ml-4">
                <li>Todo o código de {totalFiles} arquivos</li>
                <li>Arquitetura e fluxo do sistema</li>
                <li>Integração WhatsApp + IA + Supabase</li>
                <li>Frontend e Backend completos</li>
              </ul>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="font-semibold">💡 Exemplos de perguntas para fazer:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                <div className="p-3 bg-white dark:bg-gray-900 rounded border text-sm">
                  "Analise a segurança deste sistema"
                </div>
                <div className="p-3 bg-white dark:bg-gray-900 rounded border text-sm">
                  "Como adicionar suporte a Facebook?"
                </div>
                <div className="p-3 bg-white dark:bg-gray-900 rounded border text-sm">
                  "Explique o fluxo de uma conversa"
                </div>
                <div className="p-3 bg-white dark:bg-gray-900 rounded border text-sm">
                  "Sugira melhorias de performance"
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total de Arquivos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalFiles}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Frontend</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{OMNICHANNEL_FILES.frontend.length}</p>
              <Badge variant="secondary" className="mt-2">React Components</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Backend</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{OMNICHANNEL_FILES.backend.length}</p>
              <Badge variant="secondary" className="mt-2">Edge Functions</Badge>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Arquivos Frontend ({OMNICHANNEL_FILES.frontend.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {OMNICHANNEL_FILES.frontend.map((file) => (
                <div key={file} className="p-3 bg-muted rounded text-sm font-mono flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span className="truncate">{file}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Edge Functions Backend ({OMNICHANNEL_FILES.backend.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {OMNICHANNEL_FILES.backend.map((file) => (
                <div key={file} className="p-3 bg-muted rounded text-sm font-mono flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-purple-500 flex-shrink-0" />
                  <span className="truncate">{file}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview do Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-xs font-mono whitespace-pre-wrap">
              {generateFileListPrompt()}
            </pre>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
