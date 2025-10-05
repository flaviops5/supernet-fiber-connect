import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const Roteamento = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Sistema de Roteamento Omnichannel</h1>
        <p className="text-muted-foreground">
          Documentação completa do fluxo de conversação e roteamento de agentes
        </p>
      </div>

      <Tabs defaultValue="fluxograma" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="fluxograma">Fluxograma</TabsTrigger>
          <TabsTrigger value="cloe">Cloé (Routing)</TabsTrigger>
          <TabsTrigger value="luan">Luan (Técnico)</TabsTrigger>
          <TabsTrigger value="julia">Julia (Financeiro)</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
        </TabsList>

        <TabsContent value="fluxograma" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Fluxo Completo de Roteamento</CardTitle>
              <CardDescription>
                Visualização do fluxo de decisão desde o primeiro contato até a transferência para agentes especializados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full">
                <div className="mermaid-container">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
{`flowchart TD
    Start([👤 Cliente inicia conversa]) --> Cloe[🤖 CLOÉ - Agente de Roteamento]

    %% Saudação e Coleta de CPF
    Cloe --> Greeting[Saudação inicial + contexto]
    Greeting --> ExtractCPF{Extrair CPF<br/>da mensagem}
    ExtractCPF -->|CPF encontrado| ValidateCPF[Validar formato do CPF]
    ExtractCPF -->|Sem CPF| AskCPF[Solicitar CPF ao cliente]
    
    AskCPF --> WaitCPF[Aguardar resposta]
    WaitCPF --> ExtractCPF
    
    ValidateCPF -->|Formato inválido| RetryCPF[Contagem de tentativas +1]
    RetryCPF -->|Tentativas < 3| AskCPF
    RetryCPF -->|Tentativas ≥ 3| TransferSalesCPF[⚡ Transferir para VENDAS<br/>auxílio de cadastro]
    
    ValidateCPF -->|Formato válido| CheckHistory[📋 Verificar histórico<br/>customer_contact_history]
    
    %% Busca no IXC
    CheckHistory --> SearchIXC[🔍 Consultar cliente no IXC]
    SearchIXC --> FoundIXC{Cliente<br/>encontrado?}
    FoundIXC -->|NÃO| NewCustomer[🆕 Cliente novo]
    FoundIXC -->|SIM| GetStatus[📡 Obter status do IXC:<br/>online/offline, bloqueado, faturas]

    %% Avaliação de Status - Prioridade 1: Bloqueio
    GetStatus --> CheckBlocked{Bloqueado ou<br/>faturas em atraso?}
    CheckBlocked -->|SIM| TransferJulia[⚡ Transferir para JULIA<br/>Financeiro]
    
    %% Prioridade 2: Verificar Outage em Massa
    CheckBlocked -->|NÃO| CheckMassOutage{Detectar<br/>outage em massa?}
    CheckMassOutage -->|SIM| NotifyOutage[📢 Notificar cliente sobre<br/>interrupção regional]
    NotifyOutage --> InfoAgent
    
    %% Prioridade 3: Cliente Offline ou Relata Problema
    CheckMassOutage -->|NÃO| CheckOffline{Cliente OFFLINE<br/>ou relata sem internet?}
    CheckOffline -->|SIM| TransferLuan[⚡ Transferir para LUAN<br/>Suporte Técnico]
    
    %% Cliente Online - Análise de Intenção
    CheckOffline -->|NÃO| ProceedOnline[Cliente ONLINE sem problemas]
    ProceedOnline --> AskReason[Perguntar: Qual o motivo do contato?]
    AskReason --> UserResponse[Cliente responde]
    UserResponse --> AnalyzeIntent{Analisar intenção<br/>com IA Gemini 2.5 Flash}
    AnalyzeIntent -->|Problema técnico| TransferLuan
    AnalyzeIntent -->|Dúvida financeira| TransferJulia
    AnalyzeIntent -->|Interesse comercial| TransferSales
    AnalyzeIntent -->|Informação geral| InfoAgent[💬 Cloé continua<br/>informações gerais]

    %% Clientes Novos
    NewCustomer --> TransferSales[⚡ Transferir para VENDAS<br/>sales-agent]

    %% Julia (Financeiro)
    TransferJulia --> Julia[💰 JULIA - Agente Financeiro]
    Julia --> CheckAutoUnblock{Pode desbloquear<br/>automaticamente?}
    CheckAutoUnblock -->|SIM| ProcessAutoUnblock[🔓 Executar desbloqueio de confiança]
    CheckAutoUnblock -->|NÃO| SendPayment[Enviar QR Code PIX + Instruções]
    
    ProcessAutoUnblock --> SendPayment
    SendPayment --> MonitorPayment[⏱️ Monitorar pagamento em tempo real]
    MonitorPayment --> PaymentConfirmed{Pagamento<br/>confirmado?}
    PaymentConfirmed -->|SIM| AutoUnblock[✅ Desbloqueio automático]
    PaymentConfirmed -->|Timeout 30min| RemindPayment[Lembrar cliente]
    RemindPayment --> MonitorPayment
    AutoUnblock --> JuliaContinue[Atendimento contínuo com Julia]
    JuliaContinue --> Resolved

    %% Luan (Técnico)
    TransferLuan --> Luan[🔧 LUAN - Suporte Técnico]
    Luan --> TechDiagnosis[Diagnóstico:<br/>luzes ONT, conectividade, sinal]
    TechDiagnosis --> CheckEquipment[🔌 Verificar equipamentos via IXC API]
    CheckEquipment --> TroubleshootSteps[Orientar troubleshooting passo a passo]
    TroubleshootSteps --> FixIssue{Problema resolvido?}
    FixIssue -->|SIM| Resolved
    FixIssue -->|NÃO| ScheduleVisit[📅 Agendar visita técnica]
    ScheduleVisit --> Resolved

    %% Vendas
    TransferSales --> Sales[🤝 VENDAS - Agente Comercial]
    Sales --> CheckCoverage[🗺️ Consultar CEP de cobertura]
    CheckCoverage -->|Sem cobertura| InformUnavailable[Informar indisponibilidade + Notificar interesse]
    CheckCoverage -->|Com cobertura| ShowPlans[Apresentar planos disponíveis]
    ShowPlans --> SelectPlan{Cliente escolhe plano?}
    SelectPlan -->|SIM| CreateOrder[Criar pedido no IXC]
    SelectPlan -->|NÃO| FollowUp[Agendar follow-up]
    CreateOrder --> Resolved
    FollowUp --> Resolved
    InformUnavailable --> Resolved

    %% InfoAgent (Cloé continua)
    InfoAgent --> Resolved

    %% Encerramento
    Resolved --> End([✅ Conversa finalizada])

    %% Estilos
    style Start fill:#e3f2fd
    style End fill:#c8e6c9
    style Cloe fill:#fff9c4
    style Julia fill:#f8bbd0
    style Luan fill:#b3e5fc
    style Sales fill:#c5e1a5
    style TransferJulia fill:#ff4081,color:#fff
    style TransferLuan fill:#29b6f6,color:#fff
    style TransferSales fill:#66bb6a,color:#fff
    style TransferSalesCPF fill:#66bb6a,color:#fff
    style InfoAgent fill:#e1bee7
    style CheckMassOutage fill:#ff9800
    style NotifyOutage fill:#ffc107`}
                  </pre>
                </div>
              </ScrollArea>
              
              <Separator className="my-6" />
              
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Legenda de Cores</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{backgroundColor: '#fff9c4'}}></div>
                    <span>Cloé (Routing)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{backgroundColor: '#f8bbd0'}}></div>
                    <span>Julia (Financeiro)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{backgroundColor: '#b3e5fc'}}></div>
                    <span>Luan (Técnico)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{backgroundColor: '#c5e1a5'}}></div>
                    <span>Vendas</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cloe" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>🤖 Cloé - Agente de Roteamento</CardTitle>
                    <CardDescription>Edge Function: routing-agent</CardDescription>
                  </div>
                  <Badge variant="secondary">Orquestração</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Responsabilidades Principais</h3>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li>Primeira interação com o cliente</li>
                    <li>Extração e validação de CPF da mensagem</li>
                    <li>Consulta ao histórico de contatos (customer_contact_history)</li>
                    <li>Integração com IXC para buscar dados do cliente</li>
                    <li>Análise de status: ONLINE/OFFLINE, BLOQUEADO, FATURAS</li>
                    <li>Decisão de roteamento baseada em regras de negócio</li>
                    <li>Transferência para agentes especializados</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Lógica de Roteamento</h3>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-muted rounded">
                      <p className="font-medium">1. Cliente BLOQUEADO ou com FATURA EM ATRASO:</p>
                      <p className="text-muted-foreground">→ Transfere para Julia (support-financial-agent)</p>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <p className="font-medium">2. Cliente OFFLINE:</p>
                      <p className="text-muted-foreground">→ Transfere para Luan (support-tech-agent)</p>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <p className="font-medium">3. Cliente NÃO encontrado no IXC:</p>
                      <p className="text-muted-foreground">→ Transfere para Vendas (sales-agent)</p>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <p className="font-medium">4. Cliente ONLINE sem problemas:</p>
                      <p className="text-muted-foreground">→ Analisa a intenção da mensagem e roteia ou responde diretamente</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Tabelas Utilizadas</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">customer_contact_history</code> - Histórico de contatos</li>
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">conversations</code> - Registro da conversa</li>
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">conversation_messages</code> - Mensagens trocadas</li>
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">agent_configurations</code> - Configuração do agente</li>
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">knowledge_base</code> - Base de conhecimento</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Modelo de IA</h3>
                  <p className="text-sm">Google Gemini 2.5 Flash via Lovable AI Gateway</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="luan" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>🔧 Luan - Agente de Suporte Técnico</CardTitle>
                    <CardDescription>Edge Function: support-tech-agent</CardDescription>
                  </div>
                  <Badge>Técnico</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Quando é Acionado</h3>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li>Cliente está OFFLINE no IXC</li>
                    <li>Cliente relata problema de conexão</li>
                    <li>Cliente menciona "sem internet", "lento", "não conecta"</li>
                    <li>Transferência explícita de outro agente</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Procedimentos de Diagnóstico</h3>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-muted rounded">
                      <p className="font-medium">1. Verificação de equipamentos:</p>
                      <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                        <li>Status das luzes do roteador</li>
                        <li>Cabos conectados corretamente</li>
                        <li>Fonte de energia funcionando</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <p className="font-medium">2. Testes de conectividade:</p>
                      <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                        <li>Ping para servidores</li>
                        <li>Status da ONU/ONT</li>
                        <li>Nível de sinal</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <p className="font-medium">3. Procedimentos de correção:</p>
                      <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                        <li>Reinicialização do equipamento</li>
                        <li>Verificação de configurações</li>
                        <li>Agendamento de visita técnica se necessário</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Ferramentas Disponíveis (Tools)</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">check_equipment_status</code> - Consulta status de equipamentos no IXC</li>
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">test_connectivity</code> - Testes de conectividade</li>
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">schedule_technical_visit</code> - Agendar visita técnica</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Base de Conhecimento</h3>
                  <p className="text-sm text-muted-foreground">
                    Acessa artigos técnicos filtrados por agent_types contendo "support_tech"
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="julia" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>💰 Julia - Agente Financeiro</CardTitle>
                    <CardDescription>Edge Function: support-financial-agent</CardDescription>
                  </div>
                  <Badge variant="destructive">Financeiro</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Quando é Acionada</h3>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li>Cliente está BLOQUEADO no IXC</li>
                    <li>Cliente possui FATURAS EM ATRASO</li>
                    <li>Cliente menciona "boleto", "pagamento", "fatura"</li>
                    <li>Dúvidas sobre planos e valores</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Desbloqueio Automático de Confiança</h3>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-muted rounded">
                      <p className="font-medium">Processo Automático:</p>
                      <ol className="list-decimal list-inside ml-4 mt-1 space-y-1 text-muted-foreground">
                        <li>Detecta que cliente está bloqueado</li>
                        <li>Chama IXC para buscar contratos bloqueados</li>
                        <li>Executa desbloqueioConfianca via API IXC</li>
                        <li>Busca faturas em aberto</li>
                        <li>Gera QR Code PIX para pagamento</li>
                        <li>Envia informações ao cliente</li>
                      </ol>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-950 rounded">
                      <p className="font-medium text-green-700 dark:text-green-300">✅ Se sucesso:</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Julia informa que o desbloqueio foi realizado e apresenta os dados de pagamento
                      </p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-950 rounded">
                      <p className="font-medium text-red-700 dark:text-red-300">❌ Se falha:</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Julia informa que não foi possível desbloquear automaticamente e oferece alternativas
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Ferramentas Disponíveis (Tools)</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">get_customer_invoices</code> - Buscar faturas do cliente</li>
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">generate_pix_payment</code> - Gerar QR Code PIX</li>
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">check_payment_status</code> - Verificar status de pagamento</li>
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">send_invoice_copy</code> - Enviar 2ª via de boleto</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Integração IXC</h3>
                  <p className="text-sm text-muted-foreground">
                    Comunicação completa com a API do IXC para gestão financeira e desbloqueios
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>🤝 Agente de Vendas</CardTitle>
                    <CardDescription>Edge Function: sales-agent</CardDescription>
                  </div>
                  <Badge variant="outline">Comercial</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Quando é Acionado</h3>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li>Cliente NÃO encontrado no IXC (novo cliente)</li>
                    <li>Cliente demonstra interesse em contratar</li>
                    <li>Perguntas sobre planos e cobertura</li>
                    <li>Solicitação de orçamento</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Processo de Vendas</h3>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-muted rounded">
                      <p className="font-medium">1. Consulta de Cobertura:</p>
                      <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                        <li>Solicita CEP do cliente</li>
                        <li>Verifica disponibilidade na tabela cep_coverage</li>
                        <li>Apresenta planos disponíveis para a região</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <p className="font-medium">2. Apresentação de Planos:</p>
                      <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                        <li>Lista planos ativos da base de dados</li>
                        <li>Explica características de cada plano</li>
                        <li>Compara velocidades e preços</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <p className="font-medium">3. Criação do Pedido:</p>
                      <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                        <li>Coleta dados do cliente (CPF, nome, endereço, etc.)</li>
                        <li>Cria cliente no IXC</li>
                        <li>Cria contrato no IXC (se ixc_plan_id disponível)</li>
                        <li>Agenda instalação</li>
                        <li>Registra em installation_appointments</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Ferramentas Disponíveis (Tools)</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">check_cep_coverage</code> - Verificar cobertura por CEP</li>
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">create_installation_order</code> - Criar pedido de instalação</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Modo Direct Order</h3>
                  <p className="text-sm text-muted-foreground">
                    Suporta criação de pedidos diretos sem conversa, para integração com formulários
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Arquitetura do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Frontend</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><code>src/components/OmnichannelChat.tsx</code> - Interface de chat</li>
                <li><code>src/components/SalesAgentWidget.tsx</code> - Widget do agente de vendas</li>
                <li><code>src/components/AutomacaoChatWidget.tsx</code> - Widget de automação</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Edge Functions (Backend)</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><code>supabase/functions/routing-agent/index.ts</code> - Cloé (1220 linhas)</li>
                <li><code>supabase/functions/support-tech-agent/index.ts</code> - Luan (209 linhas)</li>
                <li><code>supabase/functions/support-financial-agent/index.ts</code> - Julia (317 linhas)</li>
                <li><code>supabase/functions/sales-agent/index.ts</code> - Vendas (743 linhas)</li>
                <li><code>supabase/functions/ixc-integration/index.ts</code> - Integração IXC</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Banco de Dados (Tabelas Principais)</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><code>conversations</code> - Conversas ativas</li>
                <li><code>conversation_messages</code> - Histórico de mensagens</li>
                <li><code>customer_contact_history</code> - Histórico de contatos por CPF</li>
                <li><code>agent_configurations</code> - Configurações dos agentes</li>
                <li><code>knowledge_base</code> - Base de conhecimento</li>
                <li><code>cep_coverage</code> - Cobertura por CEP</li>
                <li><code>installation_appointments</code> - Agendamentos de instalação</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Roteamento;