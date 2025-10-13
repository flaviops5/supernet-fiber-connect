import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Code2, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const HPFuncoes = () => {
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [selectedCode, setSelectedCode] = useState<{ name: string; code: string } | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);

  const viewCode = async (functionName: string) => {
    setLoadingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-function-code', {
        body: { functionName }
      });

      if (!error && data?.code) {
        setSelectedCode({ name: functionName, code: data.code });
        return;
      }

      // Fallback: carregar diretamente do bundle usando import.meta.glob com ?raw
      const files = import.meta.glob('../../supabase/functions/*/index.ts', { as: 'raw' });
      const path = `../../supabase/functions/${functionName}/index.ts`;
      const loader = files[path] as undefined | (() => Promise<string>);
      if (loader) {
        const code = await loader();
        setSelectedCode({ name: functionName, code });
        return;
      }

      throw new Error('Código da função não encontrado');
    } catch (error) {
      console.error('Error loading code:', error);
      toast.error("Erro ao carregar código da função");
    } finally {
      setLoadingCode(false);
    }
  };

  const functionsData = {
    agents: [
      { name: "automacao-agent", desc: "Agente de automação residencial (Google Home, Alexa, dispositivos inteligentes)" },
      { name: "logistics-agent", desc: "Coordenação de agendamentos de instalação" },
      { name: "routing-agent", desc: "Roteamento inteligente de conversas para agentes especializados" },
      { name: "sales-agent", desc: "Vendas e contratação de planos de internet" },
      { name: "support-financial-agent", desc: "Suporte financeiro, faturas e negociação de débitos" },
      { name: "support-tech-agent", desc: "Suporte técnico e diagnóstico de problemas de conexão" },
    ],
    ixc: [
      { name: "ixc-proxy", desc: "Proxy centralizado com cache, rate limiting e circuit breaker" },
      { name: "ixc-integration", desc: "Interface principal para operações IXC (clientes, faturas, contratos)" },
      { name: "ixc-evolution-proxy", desc: "Proxy para Evolution API integrada ao IXC" },
      { name: "ixc-count-clients", desc: "Contagem de clientes ativos no sistema IXC" },
      { name: "ixc-discover-gpon-endpoints", desc: "Descoberta automática de endpoints GPON" },
      { name: "ixc-endpoints-health", desc: "Verificação de saúde dos endpoints IXC" },
      { name: "ixc-financial-analytics", desc: "Análise de dados financeiros e receitas" },
      { name: "ixc-list-contracts", desc: "Listagem de contratos de clientes" },
      { name: "ixc-list-plans", desc: "Sincronização de planos disponíveis" },
      { name: "ixc-list-subjects", desc: "Listagem de assuntos/categorias de atendimento" },
      { name: "ixc-pon-status", desc: "Monitoramento de status de portas PON (GPON)" },
      { name: "ixc-radio-status", desc: "Monitoramento de status de rádios e torres" },
      { name: "ixc-revenue-stats", desc: "Estatísticas detalhadas de receita" },
      { name: "ixc-sync-plans", desc: "Sincronização de planos IXC para Supabase" },
      { name: "sync-ixc-documentation", desc: "Sincronização de documentação da API IXC" },
    ],
    whatsapp: [
      { name: "whatsapp-webhook", desc: "Recebe e processa mensagens do WhatsApp via Evolution API" },
      { name: "send-whatsapp-message", desc: "Envia mensagens via WhatsApp (texto, mídia, templates)" },
      { name: "voice-to-text", desc: "Transcrição de áudios do WhatsApp para texto" },
      { name: "send-locaweb-email", desc: "Envio de emails via API Locaweb" },
    ],
    automation: [
      { name: "auto-send-overdue-invoices", desc: "Envio automático de faturas vencidas via WhatsApp" },
      { name: "auto-reboot-frozen-equipment", desc: "Reboot automático de equipamentos congelados" },
      { name: "check-due-invoices", desc: "Verificação de faturas próximas do vencimento" },
      { name: "check-reboot-candidates", desc: "Identificação de equipamentos candidatos a reboot" },
      { name: "check-escalation", desc: "Verificação de conversas que precisam escalação" },
      { name: "retry-failed-actions", desc: "Reprocessamento de ações falhas (Dead Letter Queue)" },
      { name: "network-maintenance-executor", desc: "Execução de manutenções programadas na rede" },
    ],
    monitoring: [
      { name: "detect-mass-outage", desc: "Detecção de quedas massivas de conexão" },
      { name: "metrics-collector", desc: "Coleta de métricas de desempenho do sistema" },
      { name: "system-health", desc: "Health check de infraestrutura e componentes" },
      { name: "check-lovable-ai-config", desc: "Verificação de configuração do Lovable AI Gateway" },
      { name: "reset-circuit-breaker", desc: "Reset manual de circuit breakers" },
    ],
    knowledge: [
      { name: "sync-chatbot-knowledge", desc: "Sincronização de conhecimento para chatbot" },
      { name: "sync-github-docs", desc: "Importação de documentação do GitHub" },
      { name: "sync-knowledge-docs", desc: "Sincronização de docs markdown para base vetorial" },
      { name: "migrate-knowledge-batch", desc: "Migração em lote para índice vetorial" },
      { name: "migrate-knowledge-full", desc: "Migração completa com embeddings OpenAI" },
    ],
    ai: [
      { name: "corporate-ai-chat", desc: "Chat corporativo com IA usando RAG" },
      { name: "ai-auto-tag", desc: "Classificação automática de conversas com tags" },
      { name: "ai-text-review", desc: "Revisão de textos antes do envio" },
      { name: "ai-suggest-reply", desc: "Sugestões de resposta para agentes" },
      { name: "site-analyzer-agent", desc: "Análise e extração de informações de sites" },
    ],
    contracts: [
      { name: "generate-contract-pdf", desc: "Geração de PDFs de contratos personalizados" },
      { name: "process-contract", desc: "Processamento de assinaturas e contratos" },
    ],
    cep: [
      { name: "chatbot-cep-lookup", desc: "Verificação de cobertura por CEP" },
      { name: "process-cep-import", desc: "Importação em lote de CEPs de cobertura" },
    ],
    payments: [
      { name: "send-payment-to-customer", desc: "Envio de boleto/PIX para clientes" },
    ],
    projections: [
      { name: "calculate-projections", desc: "Cálculo de projeções de fluxo de caixa" },
    ],
    nps: [
      { name: "nps-webhook", desc: "Recebimento e processamento de pesquisas NPS" },
    ],
    telemedicine: [
      { name: "telemedicina-agent", desc: "Agente especializado em serviços de telemedicina" },
      { name: "telemedicina-auth", desc: "Autenticação para telemedicina" },
      { name: "telemedicina-forgot-password", desc: "Recuperação de senha telemedicina" },
    ],
  };

  const generatePdf = async () => {
    setGeneratingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-system-documentation-pdf');
      
      if (error) throw error;

      // Criar blob e download
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documentacao-sistema-${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Documentação gerada com sucesso!");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Erro ao gerar documentação");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">⚙️ HP Funções</h1>
            <p className="text-muted-foreground">Documentação completa das Edge Functions do sistema</p>
          </div>
          <Button onClick={generatePdf} disabled={generatingPdf} size="lg">
            <Download className="mr-2 h-4 w-4" />
            {generatingPdf ? "Gerando..." : "Baixar Documentação PDF"}
          </Button>
        </div>

        <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
          <Tabs defaultValue="agents" className="w-full">
            <TabsList className="grid grid-cols-4 lg:grid-cols-7 gap-2 h-auto mb-6">
              <TabsTrigger value="agents" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Agentes IA ({functionsData.agents.length})
              </TabsTrigger>
              <TabsTrigger value="ixc" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                IXC ({functionsData.ixc.length})
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                WhatsApp ({functionsData.whatsapp.length})
              </TabsTrigger>
              <TabsTrigger value="automation" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Automação ({functionsData.automation.length})
              </TabsTrigger>
              <TabsTrigger value="monitoring" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Monitor ({functionsData.monitoring.length})
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Knowledge ({functionsData.knowledge.length})
              </TabsTrigger>
              <TabsTrigger value="ai" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                IA & Analytics ({functionsData.ai.length})
              </TabsTrigger>
            </TabsList>

            {Object.entries(functionsData).map(([category, functions]) => (
              <TabsContent key={category} value={category} className="mt-4">
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-4">
                    {functions.map((func) => (
                      <Card key={func.name} className="p-4 border-primary/10 hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Code2 className="h-5 w-5 text-primary" />
                              <h3 className="font-mono text-lg font-semibold text-foreground">{func.name}</h3>
                              <Badge variant="outline" className="ml-2">
                                <FileText className="h-3 w-3 mr-1" />
                                index.ts
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground ml-7">{func.desc}</p>
                          </div>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => viewCode(func.name)}
                                  disabled={loadingCode}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Código
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh]">
                                <DialogHeader>
                                  <DialogTitle className="font-mono">{selectedCode?.name || func.name}</DialogTitle>
                                  <DialogDescription>Visualização do código da Edge Function</DialogDescription>
                                </DialogHeader>
                                <ScrollArea className="h-[60vh] w-full">
                                  {selectedCode && selectedCode.name === func.name ? (
                                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                                      <code className="text-sm font-mono">{selectedCode.code}</code>
                                    </pre>
                                  ) : (
                                    <div className="flex items-center justify-center h-32">
                                      <p className="text-muted-foreground">Carregando código...</p>
                                    </div>
                                  )}
                                </ScrollArea>
                              </DialogContent>
                            </Dialog>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`supabase/functions/${func.name}/index.ts`);
                                toast.success("Caminho copiado!");
                              }}
                            >
                              Copiar Path
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </Card>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2 text-foreground">📊 Resumo</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total de Funções:</span>
              <span className="ml-2 font-bold text-foreground">58</span>
            </div>
            <div>
              <span className="text-muted-foreground">Agentes IA:</span>
              <span className="ml-2 font-bold text-primary">{functionsData.agents.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Integrações IXC:</span>
              <span className="ml-2 font-bold text-primary">{functionsData.ixc.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Automações:</span>
              <span className="ml-2 font-bold text-primary">{functionsData.automation.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HPFuncoes;
