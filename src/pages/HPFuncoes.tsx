import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Code2, FileText, Eye, Copy, Check, Database, Bot, Zap, Server, MessageSquare, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const HPFuncoes = () => {
  const [selectedCode, setSelectedCode] = useState<{ name: string; code: string } | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const copyCode = (code: string, fileName: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFile(fileName);
    toast.success(`${fileName} copiado!`);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const downloadFile = (code: string, fileName: string) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${fileName} baixado!`);
  };

  const viewCode = async (functionName: string) => {
    setLoadingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-function-code', {
        body: { functionName }
      });

      if (error) throw error;

      setSelectedCode({
        name: functionName,
        code: data.code
      });
    } catch (error) {
      console.error('Error loading code:', error);
      toast.error('Erro ao carregar código');
    } finally {
      setLoadingCode(false);
    }
  };

  const functionsData = {
    analytics: [
      { name: 'atlas-analyzer', description: '🧠 Sistema de análise preditiva de falhas e eventos de rede com notificações automáticas (HIGH severity via WhatsApp)' },
    ],
    agentes: [
      { name: 'routing-agent', description: 'Roteador inteligente que analisa mensagens e direciona para o agente especializado correto (vendas, suporte técnico, financeiro, etc.)' },
      { name: 'sales-agent', description: 'Agente de vendas que apresenta planos, verifica cobertura por CEP e fecha contratos' },
      { name: 'support-tech-agent', description: 'Suporte técnico: diagnostica problemas de conexão, analisa ONUs/rádios, abre chamados técnicos no IXC' },
      { name: 'support-financial-agent', description: 'Suporte financeiro: consulta faturas, envia segunda via, negocia débitos e processa pagamentos' },
      { name: 'automacao-agent', description: 'Agente especializado em automação residencial e dispositivos inteligentes (Google Home, Alexa, câmeras)' },
      { name: 'telemedicina-agent', description: 'Agente especializado em telemedicina, agendamento de consultas e autenticação de pacientes' },
      { name: 'logistics-agent', description: 'Coordenador de logística (Érik Souza): agendamento de instalações técnicas, coordenação de equipes e gestão de disponibilidade' },
    ],
    ixc: [
      { name: 'ixc-proxy', description: 'Proxy centralizado para todas as chamadas à API IXC. Implementa cache, rate limiting, circuit breaker e autenticação unificada' },
      { name: 'ixc-integration', description: 'Interface principal para operações IXC: buscar cliente, faturas, contratos, criar chamados, etc.' },
      { name: 'ixc-count-clients', description: 'Conta total de clientes ativos no IXC' },
      { name: 'ixc-financial-analytics', description: 'Analisa dados financeiros: receitas, inadimplência, projeções' },
      { name: 'ixc-list-contracts', description: 'Lista contratos de clientes no IXC' },
      { name: 'ixc-list-plans', description: 'Sincroniza e lista planos disponíveis no IXC' },
      { name: 'ixc-pon-status', description: 'Monitora status de portas PON (GPON)' },
      { name: 'ixc-radio-status', description: 'Monitora status de rádios e torres' },
    ],
    whatsapp: [
      { name: 'whatsapp-webhook', description: 'Recebe webhooks do WhatsApp (Evolution API) e processa mensagens recebidas' },
      { name: 'send-whatsapp-message', description: 'Envia mensagens via WhatsApp com suporte a texto, mídia e templates' },
      { name: 'voice-to-text', description: 'Converte áudios de WhatsApp em texto usando IA' },
    ],
    automacao: [
      { name: 'auto-send-overdue-invoices', description: 'Envia automaticamente faturas vencidas via WhatsApp para clientes inadimplentes' },
      { name: 'auto-reboot-frozen-equipment', description: 'Reinicia automaticamente equipamentos congelados (sem tráfego) após validações' },
      { name: 'check-due-invoices', description: 'Verifica faturas próximas do vencimento e dispara notificações' },
      { name: 'check-reboot-candidates', description: 'Identifica equipamentos candidatos a reboot automático' },
      { name: 'network-maintenance-executor', description: 'Executa manutenções programadas na rede' },
    ],
    monitoramento: [
      { name: 'detect-mass-outage', description: 'Detecta quedas massivas de conexão usando análise de equipamentos offline' },
      { name: 'mass-outage-executor', description: 'Executa ações automatizadas quando detecta queda em massa (notificar responsáveis, criar tickets IXC)' },
      { name: 'metrics-collector', description: 'Coleta métricas de desempenho do sistema, agentes e integrações' },
      { name: 'system-health', description: 'Endpoint de health check para monitoramento de infraestrutura' },
    ],
    ia: [
      { name: 'corporate-ai-chat', description: 'Chat corporativo com IA usando RAG (busca vetorial na knowledge base)' },
      { name: 'ai-auto-tag', description: 'Classifica e adiciona tags automaticamente em conversas usando IA' },
      { name: 'ai-text-review', description: 'Revisa textos de agentes antes do envio, sugerindo melhorias' },
      { name: 'ai-suggest-reply', description: 'Sugere respostas para agentes humanos baseado no histórico' },
      { name: 'summarize-conversation', description: 'Gera resumo estruturado de conversas usando IA (Gemini 2.5 Flash)' },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              📚 Hub de Edge Functions
            </h1>
            <p className="text-muted-foreground mt-2">
              Todas as 64 funções do sistema organizadas por categoria
            </p>
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            64 Functions
          </Badge>
        </div>

        <Tabs defaultValue="agentes" className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-muted/50">
            <TabsTrigger value="agentes">
              <Bot className="w-4 h-4 mr-2" />
              Agentes IA
            </TabsTrigger>
            <TabsTrigger value="ixc">
              <Server className="w-4 h-4 mr-2" />
              Integração IXC
            </TabsTrigger>
            <TabsTrigger value="whatsapp">
              <MessageSquare className="w-4 h-4 mr-2" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="automacao">
              <Zap className="w-4 h-4 mr-2" />
              Automação
            </TabsTrigger>
            <TabsTrigger value="monitoramento">
              <Activity className="w-4 h-4 mr-2" />
              Monitoramento
            </TabsTrigger>
            <TabsTrigger value="ia">
              <Database className="w-4 h-4 mr-2" />
              IA & Analytics
            </TabsTrigger>
          </TabsList>

          {Object.entries(functionsData).map(([category, functions]) => (
            <TabsContent key={category} value={category} className="space-y-4">
              <Card className="p-6">
                <Accordion type="single" collapsible className="w-full">
                  {functions.map((func, index) => (
                    <AccordionItem key={func.name} value={func.name}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <Badge variant="outline">{index + 1}</Badge>
                          <div>
                            <p className="font-semibold">{func.name}</p>
                            <p className="text-sm text-muted-foreground">{func.description}</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex gap-2 mt-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewCode(func.name)}
                                disabled={loadingCode}
                              >
                                {loadingCode ? (
                                  <>
                                    <FileText className="w-4 h-4 mr-2 animate-spin" />
                                    Carregando...
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver Código
                                  </>
                                )}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh]">
                              <DialogHeader>
                                <DialogTitle className="flex items-center justify-between">
                                  <span>{selectedCode?.name || 'Código'}</span>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => selectedCode && copyCode(selectedCode.code, selectedCode.name)}
                                    >
                                      {copiedFile === selectedCode?.name ? (
                                        <Check className="w-4 h-4" />
                                      ) : (
                                        <Copy className="w-4 h-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => selectedCode && downloadFile(selectedCode.code, `${selectedCode.name}.ts`)}
                                    >
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </DialogTitle>
                                <DialogDescription>
                                  Código-fonte completo da edge function
                                </DialogDescription>
                              </DialogHeader>
                              <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
                                <pre className="text-sm">
                                  <code>{selectedCode?.code || 'Carregando...'}</code>
                                </pre>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/functions/${func.name}/logs`, '_blank')}
                          >
                            <Activity className="w-4 h-4 mr-2" />
                            Logs
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <Card className="p-6 bg-gradient-to-r from-primary/5 to-blue-500/5">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{functionsData.agentes.length}</div>
              <div className="text-sm text-muted-foreground">Agentes IA</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{functionsData.ixc.length}</div>
              <div className="text-sm text-muted-foreground">IXC</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{functionsData.whatsapp.length}</div>
              <div className="text-sm text-muted-foreground">WhatsApp</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{functionsData.automacao.length}</div>
              <div className="text-sm text-muted-foreground">Automação</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{functionsData.monitoramento.length}</div>
              <div className="text-sm text-muted-foreground">Monitoramento</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{functionsData.ia.length}</div>
              <div className="text-sm text-muted-foreground">IA & Analytics</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HPFuncoes;
