import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Code2, FileCode, Folder, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AuthGuard } from '@/components/AuthGuard';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
  const [loading, setLoading] = useState(true);
  const [fileCodes, setFileCodes] = useState<Record<string, { code?: string; error?: string }>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadFileCodes();
  }, []);

  const loadFileCodes = async () => {
    try {
      setLoading(true);
      const allFiles = [...OMNICHANNEL_FILES.frontend, ...OMNICHANNEL_FILES.backend];
      
      const { data, error } = await supabase.functions.invoke('get-omnichannel-code', {
        body: { filePaths: allFiles }
      });

      if (error) throw error;
      
      setFileCodes(data.results || {});
    } catch (error) {
      console.error('Error loading file codes:', error);
      toast({
        title: 'Erro ao carregar códigos',
        description: 'Não foi possível carregar o código dos arquivos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateFullCodePrompt = () => {
    let prompt = `# CÓDIGO COMPLETO DO SISTEMA OMNICHANNEL\n\n`;
    
    prompt += `## CONTEXTO DO SISTEMA\n\n`;
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
    
    prompt += `---\n\n`;
    
    prompt += `## FRONTEND COMPONENTS (${OMNICHANNEL_FILES.frontend.length} arquivos)\n\n`;
    OMNICHANNEL_FILES.frontend.forEach(file => {
      const fileData = fileCodes[file];
      prompt += `### ${file}\n\n`;
      if (fileData?.code) {
        prompt += `\`\`\`typescript\n${fileData.code}\n\`\`\`\n\n`;
      } else if (fileData?.error) {
        prompt += `*Erro ao carregar: ${fileData.error}*\n\n`;
      } else {
        prompt += `*Carregando...*\n\n`;
      }
      prompt += `---\n\n`;
    });
    
    prompt += `## BACKEND EDGE FUNCTIONS (${OMNICHANNEL_FILES.backend.length} arquivos)\n\n`;
    OMNICHANNEL_FILES.backend.forEach(file => {
      const fileData = fileCodes[file];
      prompt += `### ${file}\n\n`;
      if (fileData?.code) {
        prompt += `\`\`\`typescript\n${fileData.code}\n\`\`\`\n\n`;
      } else if (fileData?.error) {
        prompt += `*Erro ao carregar: ${fileData.error}*\n\n`;
      } else {
        prompt += `*Carregando...*\n\n`;
      }
      prompt += `---\n\n`;
    });
    
    return prompt;
  };

  const copyFileCode = async (filePath: string) => {
    const fileData = fileCodes[filePath];
    if (!fileData?.code) {
      toast({
        title: 'Código não disponível',
        description: 'O código deste arquivo ainda não foi carregado.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(fileData.code);
      toast({
        title: 'Código copiado!',
        description: `Código de ${filePath} copiado para a área de transferência.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o código.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyAll = async () => {
    try {
      const prompt = generateFullCodePrompt();
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast({
        title: 'Código completo copiado!',
        description: 'Todo o código do Omnichannel foi copiado para análise.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o código.',
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
          <Button
            onClick={handleCopyAll}
            size="lg"
            className="gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Carregando...
              </>
            ) : copied ? (
              <>
                <Check className="h-5 w-5" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="h-5 w-5" />
                Copiar Todo Código
              </>
            )}
          </Button>
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
                Clique no botão "Copiar Prompt" acima para copiar a lista formatada de todos os arquivos do Omnichannel.
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="font-semibold">🤖 Passo 2: Escolher uma LLM</p>
              <p className="text-sm text-muted-foreground">
                Abra uma LLM que tenha acesso ao código do projeto, como:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground ml-4">
                <li>GitHub Copilot Chat (se usar VS Code)</li>
                <li>Cursor AI (se usar Cursor)</li>
                <li>ChatGPT com acesso a arquivos</li>
                <li>Claude com upload de projeto</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <p className="font-semibold">💬 Passo 3: Colar e Conversar</p>
              <p className="text-sm text-muted-foreground">
                Cole o prompt copiado na LLM e ela terá contexto completo sobre:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground ml-4">
                <li>Todos os arquivos relevantes do Omnichannel</li>
                <li>A arquitetura e fluxo do sistema</li>
                <li>As tecnologias utilizadas</li>
                <li>Sugestões de análise</li>
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
            <Accordion type="single" collapsible className="w-full">
              {OMNICHANNEL_FILES.frontend.map((file, index) => {
                const fileData = fileCodes[file];
                return (
                  <AccordionItem key={file} value={`frontend-${index}`}>
                    <AccordionTrigger className="text-sm font-mono">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <span className="truncate">{file}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyFileCode(file)}
                            className="gap-2"
                          >
                            <Copy className="h-3 w-3" />
                            Copiar
                          </Button>
                        </div>
                        {loading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : fileData?.code ? (
                          <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-xs font-mono">
                            {fileData.code}
                          </pre>
                        ) : fileData?.error ? (
                          <p className="text-destructive text-sm">{fileData.error}</p>
                        ) : (
                          <p className="text-muted-foreground text-sm">Código não disponível</p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
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
            <Accordion type="single" collapsible className="w-full">
              {OMNICHANNEL_FILES.backend.map((file, index) => {
                const fileData = fileCodes[file];
                return (
                  <AccordionItem key={file} value={`backend-${index}`}>
                    <AccordionTrigger className="text-sm font-mono">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-purple-500 flex-shrink-0" />
                        <span className="truncate">{file}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyFileCode(file)}
                            className="gap-2"
                          >
                            <Copy className="h-3 w-3" />
                            Copiar
                          </Button>
                        </div>
                        {loading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : fileData?.code ? (
                          <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-xs font-mono">
                            {fileData.code}
                          </pre>
                        ) : fileData?.error ? (
                          <p className="text-destructive text-sm">{fileData.error}</p>
                        ) : (
                          <p className="text-muted-foreground text-sm">Código não disponível</p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
