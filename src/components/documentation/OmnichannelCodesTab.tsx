import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Code2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const BACKEND_FILES = [
  {
    name: 'whatsapp-webhook/index.ts',
    description: 'Webhook que recebe mensagens do WhatsApp via Evolution API',
    category: 'webhook',
    language: 'typescript',
    code: `// Código completo do webhook WhatsApp
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

serve(async (req) => {
  // Processamento de mensagens WhatsApp
  // ... código completo disponível no repositório
});`
  },
  {
    name: 'routing-agent/index.ts',
    description: 'Agente de roteamento inteligente (Cloé) - identifica CPF e direciona para especialistas',
    category: 'agent',
    language: 'typescript',
    code: `// Agente de roteamento Cloé
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Lógica de roteamento inteligente
  // ... código completo disponível no repositório
});`
  },
  {
    name: 'sales-agent/index.ts',
    description: 'Agente de Vendas - Júlia',
    category: 'agent',
    language: 'typescript',
    code: `// Agente de Vendas Júlia
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Lógica de vendas
  // ... código completo disponível no repositório
});`
  },
  {
    name: 'support-tech-agent/index.ts',
    description: 'Agente de Suporte Técnico - Luan',
    category: 'agent',
    language: 'typescript',
    code: `// Agente de Suporte Técnico Luan
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Lógica de suporte técnico
  // ... código completo disponível no repositório
});`
  },
  {
    name: 'support-financial-agent/index.ts',
    description: 'Agente de Suporte Financeiro - Vicente',
    category: 'agent',
    language: 'typescript',
    code: `// Agente de Suporte Financeiro Vicente
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Lógica de suporte financeiro
  // ... código completo disponível no repositório
});`
  }
];

export const OmnichannelCodesTab = () => {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopyCode = async (fileName: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedFile(fileName);
      toast({
        title: 'Código copiado!',
        description: 'O código foi copiado para a área de transferência.',
      });
      setTimeout(() => setCopiedFile(null), 2000);
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o código.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadAll = () => {
    const allCode = BACKEND_FILES.map(
      file => `// ${file.name}\n// ${file.description}\n\n${file.code}\n\n${'='.repeat(80)}\n\n`
    ).join('');

    const blob = new Blob([allCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'omnichannel-complete-code.ts';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Download iniciado!',
      description: 'Todos os códigos foram baixados.',
    });
  };

  const categories = {
    webhook: 'Webhooks',
    agent: 'Agentes IA',
    integration: 'Integrações'
  };

  const getFilesByCategory = (category: string) => {
    return BACKEND_FILES.filter(f => f.category === category);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/10 to-purple-500/5 rounded-lg p-6 border border-purple-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Code2 className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Códigos Omnichannel</h2>
              <p className="text-sm text-muted-foreground">
                Edge functions completas para implementação omnichannel
              </p>
            </div>
          </div>
          <Button onClick={handleDownloadAll} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Baixar Todos
          </Button>
        </div>
        <div className="flex gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">Deno + Supabase</Badge>
          <Badge variant="outline">TypeScript</Badge>
          <Badge variant="outline">Edge Functions</Badge>
        </div>
      </div>

      {/* Files by Category */}
      <Accordion type="single" collapsible className="space-y-4">
        {Object.entries(categories).map(([key, label]) => {
          const files = getFilesByCategory(key);
          if (files.length === 0) return null;

          return (
            <AccordionItem key={key} value={key} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{files.length}</Badge>
                  <span className="font-semibold">{label}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  {files.map((file) => (
                    <Card key={file.name} className="overflow-hidden">
                      <CardHeader className="bg-muted/50">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <Code2 className="h-4 w-4 text-purple-500" />
                              <CardTitle className="text-base font-mono">{file.name}</CardTitle>
                            </div>
                            <p className="text-sm text-muted-foreground">{file.description}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyCode(file.name, file.code)}
                          >
                            {copiedFile === file.name ? (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar
                              </>
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <pre className="bg-secondary/50 p-4 rounded-lg overflow-x-auto text-xs">
                          <code className="language-typescript">{file.code}</code>
                        </pre>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Info Footer */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Code2 className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Código Fonte Completo</p>
              <p className="text-sm text-muted-foreground">
                Os códigos exibidos aqui são versões simplificadas. Para o código fonte completo e atualizado,
                acesse o diretório <code className="bg-muted px-1.5 py-0.5 rounded">supabase/functions/</code> no repositório.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
