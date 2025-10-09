import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Zap, Monitor, Database, Bot, Settings } from "lucide-react";

interface KnowledgeItem {
  id: string;
  title: string;
  explanation: string;
  coreLogic: string;
  interface: string;
  database: string;
  agentIntegration?: string;
  configuration: string;
}

interface SubCategory {
  id: string;
  title: string;
  items: KnowledgeItem[];
}

interface Category {
  id: string;
  title: string;
  description: string;
  subcategories: SubCategory[];
}

const knowledgeBase: Category[] = [
  {
    id: "ai-agents",
    title: "🤖 Agentes de IA",
    description: "Documentação completa dos agentes inteligentes do sistema",
    subcategories: [
      {
        id: "sales",
        title: "Agente de Vendas",
        items: [
          {
            id: "sales-main",
            title: "Sistema de Vendas com IA",
            explanation: `# Agente de Vendas SUPERNET

## Objetivo
Automatizar o processo de vendas através de conversas inteligentes, qualificação de leads e agendamento de instalações.

## Funcionalidades
- Consulta de disponibilidade por CEP
- Apresentação de planos personalizados
- Qualificação automática de leads
- Agendamento de instalação
- Integração com IXC Provedor`,
            coreLogic: `// Edge Function: sales-agent/index.ts

**Endpoint**: \`/functions/v1/sales-agent\`

**Principais Recursos**:
- Tool calling para consulta CEP
- Tool calling para listar planos
- Tool calling para criar agendamento
- Context management com histórico
- Integração com Lovable AI (Gemini Flash)

**Fluxo**:
1. Recebe mensagem do usuário
2. Carrega histórico da conversa
3. Envia para IA com tools disponíveis
4. Processa tool calls se necessário
5. Retorna resposta conversacional`,
            interface: `// Componente: SalesAgentChat.tsx

**Funcionalidades**:
- Interface de chat em tempo real
- Exibição de planos disponíveis
- Formulário de agendamento inline
- Histórico de conversas
- Estados de loading e erro

**Tecnologias**:
- React + TypeScript
- Supabase Realtime
- React Hook Form + Zod
- Tailwind CSS`,
            database: `-- Tabelas utilizadas:

1. **ai_conversations**
   - Armazena conversas dos usuários
   - user_id, title, created_at

2. **ai_messages**
   - Mensagens de cada conversa
   - conversation_id, role, content

3. **cep_coverage**
   - Cobertura por CEP
   - cep_start, cep_end, available

4. **residential_plans**
   - Planos disponíveis
   - name, speed, price, features

5. **installation_appointments**
   - Agendamentos criados
   - customer_data, plan_id, appointment_date`,
            agentIntegration: `## Integração com Sistema

**Prompt do Agente**: \`sales-agent/prompts.ts\`
- Define personalidade comercial
- Instruções de qualificação
- Fluxo de vendas estruturado

**Tools Disponíveis**:
\`\`\`typescript
const tools = [
  {
    name: "check_cep_coverage",
    description: "Verifica disponibilidade no CEP"
  },
  {
    name: "list_plans",
    description: "Lista planos disponíveis"
  },
  {
    name: "create_appointment",
    description: "Agenda instalação"
  }
];
\`\`\`

**Configuração**: \`sales-agent/config.ts\`
- Model: gemini-2.5-flash
- Temperature: 0.7
- Max tokens: 2000`,
            configuration: `## Setup e Configuração

### 1. Secrets Necessários
\`\`\`bash
LOVABLE_API_KEY=your_key_here
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
\`\`\`

### 2. Deploy da Edge Function
\`\`\`bash
# Já configurado no supabase/config.toml
[functions.sales-agent]
verify_jwt = false
\`\`\`

### 3. Configurar Widget no Site
\`\`\`tsx
import { SalesAgentWidget } from "@/components/SalesAgentWidget";

// Adicionar na página desejada
<SalesAgentWidget />
\`\`\`

### 4. Personalizar Prompts
Editar arquivo: \`supabase/functions/sales-agent/prompts.ts\`

### 5. Monitoramento
- Logs: Supabase Dashboard → Functions → sales-agent
- Métricas: Tabela \`agent_metrics\``,
          },
        ],
      },
      {
        id: "support-tech",
        title: "Agente de Suporte Técnico",
        items: [
          {
            id: "support-tech-main",
            title: "Sistema de Suporte Técnico",
            explanation: `# Agente de Suporte Técnico

## Objetivo
Automatizar atendimento técnico de primeiro nível, diagnósticos e abertura de chamados.

## Funcionalidades
- Diagnóstico de conectividade
- Troubleshooting de ONUs
- Consulta de status no IXC
- Abertura de tickets técnicos
- Orientações de auto-resolução`,
            coreLogic: `// Edge Function: support-tech-agent/index.ts

**Tools Disponíveis**:
- \`check_client_status\`: Consulta IXC
- \`test_connectivity\`: Testa conexão do equipamento
- \`create_technical_ticket\`: Abre chamado
- \`check_mass_outage\`: Verifica queda em massa

**Fluxo de Diagnóstico**:
1. Coleta CPF do cliente
2. Consulta dados no IXC
3. Testa conectividade
4. Analisa sintomas
5. Sugere soluções ou abre chamado`,
            interface: `// Componente integrado no OmnichannelChat

**Features**:
- Chat técnico dedicado
- Cards de diagnóstico
- Botões de ação rápida
- Status do equipamento em tempo real
- Histórico de chamados`,
            database: `-- Tabelas principais:

1. **conversations**
   - department: 'technical'
   - status, assigned_agent_id

2. **conversation_messages**
   - Histórico de mensagens técnicas

3. **customer_contact_history**
   - CPF, contact_reason
   - was_found_in_ixc

4. **agent_metrics**
   - Métricas de atendimento técnico`,
            agentIntegration: `## Integração Técnica

**Knowledge Base**:
\`docs/knowledge-base/data-sources/suporte/troubleshooting-onu.md\`

**Tools de Diagnóstico**:
\`\`\`typescript
{
  name: "test_equipment_connectivity",
  endpoint: "/functions/v1/test-equipment-connectivity"
}
\`\`\`

**Integração IXC**:
\`\`\`typescript
{
  name: "ixc_get_client_status",
  endpoint: "/functions/v1/ixc-integration"
}
\`\`\``,
            configuration: `## Configuração Suporte Técnico

### 1. Knowledge Base
Sincronizar documentação técnica:
\`\`\`bash
deno run --allow-all docs/knowledge-base/scripts/sync-kb-to-supabase.ts
\`\`\`

### 2. Integração IXC
Secrets necessários:
- IXC_API_BASE_URL
- IXC_API_USERNAME
- IXC_API_PASSWORD

### 3. Monitoramento de Quedas
Habilitar edge function:
\`detect-mass-outage\` (cron job)

### 4. Widget de Atendimento
\`\`\`tsx
<OmnichannelChat department="technical" />
\`\`\``,
          },
        ],
      },
      {
        id: "support-financial",
        title: "Agente Financeiro",
        items: [
          {
            id: "support-financial-main",
            title: "Sistema Financeiro e Negociação",
            explanation: `# Agente de Suporte Financeiro

## Objetivo
Automatizar consultas de faturas, negociação de débitos e orientações sobre pagamentos.

## Funcionalidades
- Consulta de faturas em aberto
- Envio de segunda via
- Negociação de débitos
- Parcelamento de valores
- Registro de promessas de pagamento`,
            coreLogic: `// Edge Function: support-financial-agent/index.ts

**Tools Financeiros**:
- \`get_invoices\`: Lista faturas do cliente
- \`send_invoice_copy\`: Envia 2ª via por email
- \`negotiate_debt\`: Registra negociação
- \`create_payment_promise\`: Cria promessa

**Fluxo de Negociação**:
1. Identifica cliente por CPF
2. Busca faturas no IXC
3. Apresenta situação financeira
4. Oferece opções de pagamento
5. Registra acordo no sistema`,
            interface: `// Integrado no sistema de atendimento

**Componentes**:
- PaymentNotifications
- Lista de faturas interativa
- Calculadora de parcelamento
- Status de negociações`,
            database: `-- Estrutura financeira:

1. **conversations**
   - department: 'financial'

2. **campaign_recipients**
   - Para campanhas de cobrança

3. **customer_contact_history**
   - Registro de negociações

4. **action_log**
   - Log de ações financeiras`,
            agentIntegration: `## Integração Sistema Financeiro

**Knowledge Base**:
\`docs/knowledge-base/data-sources/suporte/negociacao-debitos.md\`

**Políticas de Negociação**:
- Desconto máximo configurável
- Regras de parcelamento
- Condições especiais

**Integração IXC**:
- Consulta de faturas
- Envio de boletos
- Registro de acordos`,
            configuration: `## Setup Financeiro

### 1. Configurar Políticas
Editar knowledge base:
\`negociacao-debitos.md\`

### 2. Integração Email
Secret: \`LOCAWEB_API_TOKEN\`

### 3. Campanhas de Cobrança
Configurar em:
\`/admin/campanhas\`

### 4. Dashboard Financeiro
Acessar:
\`/admin/financeiro\``,
          },
        ],
      },
      {
        id: "routing",
        title: "Agente de Roteamento",
        items: [
          {
            id: "routing-main",
            title: "Sistema de Roteamento Inteligente",
            explanation: `# Agente de Roteamento

## Objetivo
Direcionar conversas automaticamente para o departamento ou agente correto.

## Funcionalidades
- Classificação de intenção
- Detecção de emergências
- Priorização automática
- Balanceamento de carga
- Transferência entre departamentos`,
            coreLogic: `// Edge Function: routing-agent/index.ts

**Classificação**:
\`\`\`typescript
const departments = {
  sales: ["contratar", "plano", "preço"],
  technical: ["sem internet", "lento", "não funciona"],
  financial: ["fatura", "boleto", "débito"],
  general: ["informação", "dúvida"]
};
\`\`\`

**Priorização**:
- Emergência: Queda de serviço
- Alta: Cliente sem serviço
- Média: Dúvidas gerais
- Baixa: Informações comerciais`,
            interface: `// Componente: ConversationQueue

**Features**:
- Fila por departamento
- Indicador de prioridade
- Status de agentes
- Tempo de espera
- Transferências ativas`,
            database: `-- Tabelas de roteamento:

1. **conversations**
   - department (enum)
   - priority (integer)
   - assigned_agent_id

2. **conversation_transfers**
   - from_department → to_department
   - reason, notes

3. **agent_presence**
   - status, current_conversations
   - max_conversations`,
            agentIntegration: `## Lógica de Roteamento

**Critérios**:
1. Intenção detectada
2. Disponibilidade de agentes
3. Prioridade do caso
4. Histórico do cliente
5. Balanceamento de carga

**Regras de Transferência**:
\`\`\`typescript
if (technical && not_resolved_24h) {
  escalate_to_supervisor();
}
if (financial && high_value) {
  assign_to_specialist();
}
\`\`\``,
            configuration: `## Configuração Roteamento

### 1. Definir Departamentos
Editar: \`routing-agent/config.ts\`

### 2. Palavras-chave
Atualizar: \`routing-agent/prompts.ts\`

### 3. Prioridades
Configurar no painel admin

### 4. Agentes Disponíveis
Gerenciar em:
\`/admin/atendimento\``,
          },
        ],
      },
      {
        id: "telemedicina",
        title: "Agente Telemedicina",
        items: [
          {
            id: "telemedicina-main",
            title: "Sistema de Telemedicina",
            explanation: `# Agente de Telemedicina

## Objetivo
Orientar sobre serviços de telemedicina, agendar consultas e esclarecer dúvidas sobre planos de saúde.

## Funcionalidades
- Informações sobre planos
- Agendamento de consultas
- Orientações de uso da plataforma
- Suporte a dúvidas médicas gerais
- Gestão de autenticação de pacientes`,
            coreLogic: `// Edge Function: telemedicina-agent/index.ts

**Capabilities**:
- Consulta de planos
- Verificação de elegibilidade
- Agendamento online
- Envio de lembretes
- FAQ médica

**Autenticação**:
\`telemedicina-auth/index.ts\`
- Login de pacientes
- Recuperação de senha
- Validação de dados`,
            interface: `// Componentes:
- TelemedicinaChatAgent
- TelemedicinaChatWidget
- TelemedicinLoginSection

**Features**:
- Chat médico dedicado
- Área do paciente
- Histórico de consultas
- Documentos médicos`,
            database: `-- Estrutura médica:

1. **conversations**
   - department: 'telemedicina'
   - metadata (dados do paciente)

2. **ai_conversations**
   - Histórico de atendimentos

3. **ai_messages**
   - Mensagens do atendimento médico`,
            agentIntegration: `## Integração Médica

**Knowledge Base**:
\`docs/knowledge-base/data-sources/telemedicina/planos-servicos.md\`

**Compliance**:
- LGPD para dados de saúde
- Disclaimers obrigatórios
- Limitações do atendimento virtual

**Tools**:
- Consulta de disponibilidade
- Agendamento de consultas
- Envio de links de videochamada`,
            configuration: `## Setup Telemedicina

### 1. Knowledge Base Médica
Atualizar informações em:
\`data-sources/telemedicina/\`

### 2. Autenticação
Edge functions:
- telemedicina-auth
- telemedicina-forgot-password

### 3. Widget no Site
\`\`\`tsx
<TelemedicinaAgentWidget />
\`\`\`

### 4. Página Dedicada
Rota: \`/telemedicina\``,
          },
        ],
      },
      {
        id: "automacao",
        title: "Agente Automação Residencial",
        items: [
          {
            id: "automacao-main",
            title: "Sistema de Automação Smart Home",
            explanation: `# Agente de Automação Residencial

## Objetivo
Vender e orientar sobre soluções de smart home e automação residencial.

## Funcionalidades
- Apresentação de dispositivos
- Compatibilidade de equipamentos
- Orçamentos personalizados
- Agendamento de instalação
- Suporte técnico smart home`,
            coreLogic: `// Edge Function: automacao-agent/index.ts

**Produtos**:
- Lâmpadas inteligentes
- Tomadas smart
- Câmeras de segurança
- Fechaduras eletrônicas
- Assistentes de voz

**Tools**:
- Lista de dispositivos compatíveis
- Cálculo de investimento
- Agendamento de instalação`,
            interface: `// Componentes:
- AutomacaoAgentChat
- AutomacaoChatWidget

**Features**:
- Catálogo de produtos
- Simulador de cenários
- Calculadora de economia
- Demonstrações em vídeo`,
            database: `-- Tabela de automação:

1. **ai_conversations**
   - Conversas sobre automação

2. **ai_messages**
   - Interações do chat

3. **installation_appointments**
   - Agendamentos de instalação smart home`,
            agentIntegration: `## Integração Smart Home

**Knowledge Base**:
\`data-sources/automacao/dispositivos-compativeis.md\`

**Planos**:
- Smart Básico: R$ 79,90
- Smart Premium: R$ 149,90

**Parcerias**:
- Philips Hue
- Intelbras
- Positivo Smart`,
            configuration: `## Setup Automação

### 1. Catálogo de Produtos
Atualizar: \`dispositivos-compativeis.md\`

### 2. Widget
\`\`\`tsx
<AutomacaoChatWidget />
\`\`\`

### 3. Página de Automação
Rota: \`/automacao\`

### 4. Integração Vendas
Conectar com agente de vendas`,
          },
        ],
      },
    ],
  },
  {
    id: "integrations",
    title: "🔌 Integrações",
    description: "Sistemas externos integrados",
    subcategories: [
      {
        id: "ixc",
        title: "IXC Provedor",
        items: [
          {
            id: "ixc-integration",
            title: "Integração IXC Provedor",
            explanation: `# Integração IXC Provedor

## Objetivo
Sincronizar dados do sistema de gestão de provedores IXC com a plataforma.

## Funcionalidades
- Consulta de clientes
- Status de conexão
- Faturas e pagamentos
- Contratos ativos
- Chamados técnicos
- Estatísticas de rede`,
            coreLogic: `// Edge Functions IXC:

**Principais**:
- \`ixc-integration\`: API principal
- \`ixc-proxy\`: Proxy seguro
- \`test-ixc-connection\`: Testes de conectividade

**Cliente Reutilizável**:
\`_shared/ixc-client.ts\`
- Autenticação
- Rate limiting
- Error handling
- Retry logic`,
            interface: `// Componente: IXCIntegration.tsx

**Abas**:
- Teste de Conexão
- Listagem de Contratos
- Seletor de Planos
- Discovery de Endpoints
- Testador de Funções

**Monitoramento**:
- IXCConnectionTester
- IXCFunctionsTester`,
            database: `-- Estrutura IXC:

1. **customer_contact_history**
   - ixc_client_id
   - was_found_in_ixc

2. **installation_appointments**
   - ixc_contract_id

3. **residential_plans**
   - ixc_plan_id (referência)`,
            agentIntegration: `## Integração com Agentes

**Todos os agentes** podem consultar IXC:
- Verificar status do cliente
- Buscar faturas
- Criar chamados
- Atualizar cadastro

**Endpoint Unificado**:
\`/functions/v1/ixc-integration\`

**Métodos**:
- GET /client/:id
- GET /invoices/:id
- POST /ticket
- GET /connection-status/:id`,
            configuration: `## Configuração IXC

### 1. Secrets Obrigatórios
\`\`\`
IXC_API_BASE_URL=https://seu-ixc.com.br/webservice
IXC_API_USERNAME=seu_usuario
IXC_API_PASSWORD=sua_senha
\`\`\`

### 2. Testar Conexão
Acessar: \`/admin/ixc-integration\`

### 3. Sincronizar Planos
Edge function: \`ixc-sync-plans\`

### 4. Documentação IXC
Edge function: \`sync-ixc-documentation\``,
          },
        ],
      },
      {
        id: "whatsapp",
        title: "WhatsApp (Evolution API)",
        items: [
          {
            id: "whatsapp-integration",
            title: "Integração WhatsApp Business",
            explanation: `# Integração WhatsApp

## Objetivo
Conectar WhatsApp Business API para atendimento multicanal.

## Funcionalidades
- Envio de mensagens
- Recebimento via webhook
- Mensagens com mídia
- Mensagens em template
- Status de entrega`,
            coreLogic: `// Edge Functions WhatsApp:

**Principais**:
- \`send-whatsapp-message\`: Envio
- \`whatsapp-webhook\`: Recebimento
- \`test-evolution-api\`: Testes

**Evolution API**:
API de terceiros que conecta com WhatsApp oficial

**Secrets**:
- EVOLUTION_API_KEY
- EVOLUTION_API_BASE_URL
- EVOLUTION_PHONE_NUMBER`,
            interface: `// Componentes:
- WhatsAppConversations
- WhatsAppTester
- OmnichannelChat (canal WhatsApp)

**Features**:
- Lista de conversas WhatsApp
- Envio de mensagens
- Upload de mídia
- Status de leitura`,
            database: `-- Conversas WhatsApp:

1. **conversations**
   - channel: 'whatsapp'
   - metadata (número, nome)

2. **conversation_messages**
   - attachments (mídias)
   - metadata (status)

3. **campaign_recipients**
   - whatsapp_status`,
            agentIntegration: `## Integração com Agentes

**Todos os agentes** podem usar WhatsApp como canal:
- Responder mensagens
- Enviar notificações
- Campanhas em massa

**Webhook Handler**:
Recebe mensagens e roteia para agente correto`,
            configuration: `## Setup WhatsApp

### 1. Contratar Evolution API
Obter credenciais do provedor

### 2. Configurar Secrets
\`\`\`
EVOLUTION_API_KEY=your_key
EVOLUTION_API_BASE_URL=https://api.evolution.com
EVOLUTION_PHONE_NUMBER=5511999999999
\`\`\`

### 3. Configurar Webhook
URL: \`https://your-project.supabase.co/functions/v1/whatsapp-webhook\`

### 4. Testar
\`/admin/whatsapp\` → Aba Testes`,
          },
        ],
      },
      {
        id: "email",
        title: "Email (Locaweb)",
        items: [
          {
            id: "email-integration",
            title: "Integração de Email",
            explanation: `# Integração Email Locaweb

## Objetivo
Envio transacional e marketing de emails via API Locaweb.

## Funcionalidades
- Envio de emails transacionais
- Templates HTML personalizados
- Variáveis dinâmicas
- Rastreamento de abertura/cliques
- Gestão de remetentes`,
            coreLogic: `// Edge Function: send-locaweb-email

**Funcionalidades**:
\`\`\`typescript
{
  to: string | string[],
  subject: string,
  template_slug?: string,
  variables?: Record<string, string>,
  html?: string,
  text?: string
}
\`\`\`

**Templates**:
Gerenciados na tabela \`email_templates\``,
            interface: `// Componentes:
- EmailTemplateManagement
- EmailTestSender
- SMTPSettings

**Features**:
- Editor de templates
- Teste de envio
- Configurações SMTP
- Histórico de envios`,
            database: `-- Estrutura Email:

1. **email_templates**
   - slug, name, subject
   - body_html, body_plain
   - variables (jsonb)
   - is_active

2. **email_settings**
   - default_from_email
   - default_from_name

3. **campaign_recipients**
   - email_status
   - sent_at, opened_at, clicked_at`,
            agentIntegration: `## Uso pelos Agentes

**Casos de Uso**:
- Envio de segunda via (financeiro)
- Confirmação de agendamento (vendas)
- Notificações de chamado (técnico)
- Lembretes de consulta (telemedicina)

**Templates Disponíveis**:
- \`welcome\`: Boas-vindas
- \`invoice\`: Fatura
- \`appointment\`: Agendamento
- \`notification\`: Notificação geral`,
            configuration: `## Configuração Email

### 1. Secret Locaweb
\`\`\`
LOCAWEB_API_TOKEN=your_token
\`\`\`

### 2. Configurar Remetente
Painel admin → Email Settings

### 3. Criar Templates
\`/admin/email-templates\`

### 4. Testar Envio
\`/admin/email-test\``,
          },
        ],
      },
    ],
  },
  {
    id: "monitoring",
    title: "📊 Monitoramento",
    description: "Sistemas de monitoramento e alertas",
    subcategories: [
      {
        id: "mass-outage",
        title: "Detecção de Quedas em Massa",
        items: [
          {
            id: "mass-outage-detection",
            title: "Sistema de Detecção de Quedas em Massa",
            explanation: `# Detecção de Quedas em Massa

## Objetivo
Detectar automaticamente quando há queda de internet em múltiplos clientes simultaneamente.

## Funcionalidades
- Detecção em tempo real
- Alertas automáticos
- Histórico de quedas
- Análise de impacto
- Notificações multicanal`,
            coreLogic: `// Edge Function: detect-mass-outage

**Algoritmo**:
1. Conta clientes offline no IXC
2. Compara com baseline histórico
3. Identifica correlação geográfica
4. Detecta padrões (PON, rádio, região)
5. Dispara alertas se threshold atingido

**Circuit Breaker**:
Previne alertas repetitivos`,
            interface: `// Componentes:
- MassOutageMonitor
- MassOutageHistory
- MassOutageAlertCard

**Dashboard**:
- Status atual de quedas
- Timeline de detecções
- Mapa de impacto
- Métricas agregadas`,
            database: `-- Estrutura de Quedas:

1. **mass_outage_detections**
   - total_affected_clients
   - outage_percentage
   - detection_timestamp
   - is_active
   - affected_regions (jsonb)

2. **alert_history**
   - alert_type: 'mass_outage'
   - severity, message
   - notified_at, resolved_at

3. **alert_config**
   - threshold_value
   - window_minutes
   - notification_channels`,
            agentIntegration: `## Integração com Agentes

**Agente Técnico**:
Consulta se há queda em massa antes de diagnosticar problema individual

**Tool Available**:
\`\`\`typescript
{
  name: "check_mass_outage",
  description: "Verifica se há queda generalizada"
}
\`\`\`

**Resposta Automática**:
"Detectamos uma queda em massa na sua região. Técnicos já foram acionados."`,
            configuration: `## Configuração Quedas em Massa

### 1. Threshold
Configurar em: \`alert_config\`
- Padrão: 10% de clientes offline
- Janela: 5 minutos

### 2. Cron Job
Executado a cada 5 minutos automaticamente

### 3. Notificações
Canais: email, WhatsApp, dashboard

### 4. Circuit Breaker
Reset manual: \`/functions/v1/reset-circuit-breaker\`

### 5. Monitoramento
\`/admin/monitoramento\``,
          },
        ],
      },
      {
        id: "auto-reboot",
        title: "Auto-Reboot de Equipamentos",
        items: [
          {
            id: "auto-reboot-system",
            title: "Sistema de Auto-Reboot",
            explanation: `# Sistema de Auto-Reboot

## Objetivo
Reiniciar automaticamente equipamentos de clientes quando detectado tráfego anormalmente baixo.

## Funcionalidades
- Detecção de equipamentos congelados
- Reboot automático via IXC
- Blacklist de clientes
- Cooldown period
- Histórico completo`,
            coreLogic: `// Edge Functions:

**Principal**:
\`auto-reboot-frozen-equipment\`
- Identifica candidatos
- Verifica blacklist
- Testa conectividade
- Executa reboot
- Registra resultado

**Auxiliar**:
\`check-reboot-candidates\`
- Lista clientes com tráfego baixo

**Configuração**:
\`test-equipment-connectivity\`
- Testa antes de reboot`,
            interface: `// Página: AutoRebootMonitoring

**Abas**:
1. Candidatos: Clientes elegíveis
2. Blacklist: Clientes excluídos
3. Histórico: Reboots executados
4. Configurações: Parâmetros
5. Estatísticas: Métricas

**Componentes**:
- RebootCandidates
- RebootBlacklist
- RebootHistory
- RebootSettings
- RebootStats`,
            database: `-- Estrutura Auto-Reboot:

1. **equipment_reboots**
   - ixc_client_id, client_name
   - status (pending, success, failed, skipped)
   - bandwidth_before_kbps
   - bandwidth_after_kbps
   - verification_count
   - error_message

2. **equipment_reboot_blacklist**
   - ixc_client_id
   - reason
   - added_by

3. **auto_reboot_settings**
   - enabled
   - bandwidth_threshold_kbps
   - verification_count
   - cooldown_hours
   - exclude_hours_start/end`,
            agentIntegration: `## Integração com Suporte

**Agente Técnico** pode:
- Consultar histórico de reboots
- Adicionar cliente à blacklist
- Ver últimos reboots do cliente

**Resposta Automática**:
"Seu equipamento foi reiniciado automaticamente há X horas. Problema resolvido?"`,
            configuration: `## Configuração Auto-Reboot

### 1. Habilitar Sistema
\`/admin/auto-reboot\` → Configurações

### 2. Parâmetros Padrão
- Threshold: 900 Kbps (0.9 Mbps)
- Verificações: 3 (intervalo 60s)
- Cooldown: 24 horas
- Horário excluído: 01:00 - 06:00

### 3. Cron Job
Executado a cada 30 minutos

### 4. Blacklist
Adicionar clientes que não devem ter reboot automático

### 5. Logs
Supabase → Functions → auto-reboot-frozen-equipment`,
          },
        ],
      },
      {
        id: "pon-radio",
        title: "Monitoramento PON e Rádio",
        items: [
          {
            id: "pon-radio-monitoring",
            title: "Monitoramento de PONs e Rádios",
            explanation: `# Monitoramento PON e Rádio

## Objetivo
Monitorar status de portas PON (fibra) e torres de rádio em tempo real.

## Funcionalidades
- Status de portas PON
- Clientes por PON
- Status de rádios
- Alertas de degradação
- Histórico de status`,
            coreLogic: `// Edge Functions:

**PON**:
\`ixc-pon-status\`
- Consulta status de todas as PONs
- Detecta PONs offline
- Lista clientes afetados

**Rádio**:
\`ixc-radio-status\`
- Status de torres/setores
- Clientes conectados
- Qualidade do sinal`,
            interface: `// Componentes:
- PonPortsMonitor
- RadioMonitor

**Features**:
- Grid de PONs com status
- Lista de clientes por PON
- Mapa de rádios
- Gráficos de qualidade
- Alertas visuais`,
            database: `-- Monitoramento em cache:

Dados consultados do IXC em tempo real
Não persistidos permanentemente

**Estrutura de Resposta**:
\`\`\`typescript
{
  pon_id: string,
  status: "online" | "offline" | "degraded",
  total_clients: number,
  affected_clients: number,
  last_check: timestamp
}
\`\`\``,
            agentIntegration: `## Uso pelos Agentes

**Detecção Automática**:
Se PON offline → Informar sobre queda em massa

**Tool para Técnico**:
\`\`\`typescript
{
  name: "check_pon_status",
  description: "Verifica status da PON do cliente"
}
\`\`\`

**Resposta**:
"Sua PON está com problemas. Equipe técnica já foi acionada."`,
            configuration: `## Setup PON/Rádio

### 1. Endpoints IXC
Configurar no IXC Integration:
- Endpoint PON
- Endpoint Rádio

### 2. Discovery Automático
\`/admin/ixc-integration\` → Discovery

### 3. Monitoramento
\`/admin/monitoramento\` → Abas PON e Rádio

### 4. Alertas
Configurar thresholds no alert_config`,
          },
        ],
      },
      {
        id: "metrics",
        title: "Métricas e Analytics",
        items: [
          {
            id: "metrics-system",
            title: "Sistema de Métricas",
            explanation: `# Sistema de Métricas

## Objetivo
Coletar, armazenar e visualizar métricas de performance e uso do sistema.

## Funcionalidades
- Métricas de agentes
- Performance de edge functions
- Taxa de conversão de vendas
- Tempo de resposta
- Taxa de resolução`,
            coreLogic: `// Edge Function: metrics-collector

**Coleta**:
- Duração de chamadas de função
- Sucesso/erro de operações
- Métricas de negócio
- Uso de recursos

**Helper**:
\`_shared/metrics-helper.ts\`
- Funções reutilizáveis
- Batching de métricas
- Agregações`,
            interface: `// Página: SystemMetrics

**Dashboards**:
- Visão geral do sistema
- Performance de agentes
- Métricas financeiras
- Status de integrações
- Health checks

**Componentes**:
- NPSDashboard
- AtendimentoMetrics
- SystemRobustnessScore`,
            database: `-- Estrutura de Métricas:

1. **agent_metrics**
   - agent_name, action_type
   - duration_ms
   - success, error_message
   - metadata (jsonb)

2. **system_health_checks**
   - service_name
   - status, response_time
   - last_check

3. **nps_responses**
   - score, category
   - campaign_id

4. **campaign_stats**
   - Agregações de campanhas`,
            agentIntegration: `## Métricas dos Agentes

**Rastreamento Automático**:
Todos os agentes registram:
- Tempo de resposta
- Tool calls executados
- Taxa de sucesso
- Erros encontrados

**Query Exemplo**:
\`\`\`sql
SELECT 
  agent_name,
  COUNT(*) as total_actions,
  AVG(duration_ms) as avg_duration,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
FROM agent_metrics
WHERE created_at > now() - interval '24 hours'
GROUP BY agent_name;
\`\`\``,
            configuration: `## Configuração Métricas

### 1. Habilitar Coleta
Já habilitado por padrão em todas as edge functions

### 2. Dashboard
Acessar: \`/admin/metrics\`

### 3. Período de Retenção
Configurar retention policy para agent_metrics

### 4. Alertas de Performance
Criar alertas quando:
- Duração > 5s
- Taxa de erro > 10%
- Disponibilidade < 99%`,
          },
        ],
      },
    ],
  },
  {
    id: "management",
    title: "⚙️ Gestão",
    description: "Ferramentas de administração e gestão",
    subcategories: [
      {
        id: "campaigns",
        title: "Gestão de Campanhas",
        items: [
          {
            id: "campaign-system",
            title: "Sistema de Campanhas",
            explanation: `# Sistema de Campanhas

## Objetivo
Criar e gerenciar campanhas de marketing e comunicação multicanal.

## Funcionalidades
- Campanhas de email
- Campanhas WhatsApp
- Campanhas SMS
- Segmentação de público
- Agendamento
- Rastreamento de resultados`,
            coreLogic: `// Estrutura de Campanha:

**Tipos**:
- Marketing
- Cobrança
- NPS
- Informativa

**Canais**:
- WhatsApp
- Email
- SMS
- Ligação

**Fluxo**:
1. Criar campanha
2. Definir público-alvo
3. Criar conteúdo
4. Configurar CTA
5. Agendar envio
6. Acompanhar métricas`,
            interface: `// Componentes:
- CampaignManagement
- CampaignForm
- Lista de Recipients
- Campaign Stats

**Features**:
- Editor rich text
- Upload de mídia
- Filtros de segmentação
- Preview de mensagens
- Dashboard de resultados`,
            database: `-- Estrutura Campanhas:

1. **campaigns**
   - name, type, status
   - channels (array)
   - target_filters (jsonb)
   - scheduled_at

2. **campaign_content**
   - content_text, media_url
   - cta_type, cta_config

3. **campaign_recipients**
   - customer_name, email, phone
   - whatsapp_status, email_status
   - sent_at, delivered_at, opened_at

4. **campaign_stats**
   - total_recipients, total_sent
   - delivery_rate, open_rate, click_rate`,
            agentIntegration: `## Uso pelos Agentes

**Campanhas Automáticas**:
- NPS pós-atendimento
- Follow-up de vendas
- Lembretes de pagamento
- Confirmação de agendamento

**Integração**:
Agentes podem criar recipients dinamicamente durante conversa`,
            configuration: `## Setup Campanhas

### 1. Acessar Gestão
\`/admin/campanhas\`

### 2. Criar Campanha
- Nome e descrição
- Tipo e canal
- Agendar ou enviar

### 3. Segmentação
Filtros JSON:
\`\`\`json
{
  "city": "São Paulo",
  "plan_type": "500 Mega",
  "status": "active"
}
\`\`\`

### 4. Conteúdo
- Texto da mensagem
- Upload de imagem/vídeo
- Configurar CTA (link, botão, etc)

### 5. Monitorar
Dashboard com métricas em tempo real`,
          },
        ],
      },
      {
        id: "nps",
        title: "Sistema NPS",
        items: [
          {
            id: "nps-system",
            title: "Net Promoter Score",
            explanation: `# Sistema NPS (Net Promoter Score)

## Objetivo
Medir satisfação dos clientes através da metodologia NPS.

## Funcionalidades
- Campanhas NPS automatizadas
- Coleta de feedback
- Classificação (Promotor/Neutro/Detrator)
- Follow-up de detratores
- Dashboard de resultados`,
            coreLogic: `// Edge Function: nps-webhook

**Webhook**:
Recebe respostas de plataformas externas

**Cálculo NPS**:
\`\`\`typescript
NPS = (% Promotores - % Detratores)

Promotor: score 9-10
Neutro: score 7-8
Detrator: score 0-6
\`\`\`

**Auto Follow-up**:
Detratores automaticamente marcados para follow-up`,
            interface: `// Componente: NPSDashboard

**Métricas**:
- Score NPS atual
- Distribuição por categoria
- Evolução temporal
- Comentários destacados
- Follow-ups pendentes

**Gráficos**:
- Pizza de distribuição
- Linha temporal
- Funil de respostas`,
            database: `-- Estrutura NPS:

1. **campaigns**
   - type: 'nps'

2. **nps_responses**
   - campaign_id
   - customer_name, email, phone
   - score (0-10)
   - category (promoter/neutral/detractor)
   - comment
   - follow_up_needed, follow_up_completed

3. **nps_stats**
   - campaign_id
   - total_responses
   - nps_score
   - promoters_percentage
   - follow_ups_needed`,
            agentIntegration: `## Integração com Atendimento

**Após Resolução**:
Sistema pergunta se cliente deseja avaliar atendimento

**Agent Follow-up**:
Agente de suporte entra em contato com detratores

**Melhoria Contínua**:
Análise de comentários alimenta treinamento dos agentes`,
            configuration: `## Setup NPS

### 1. Criar Campanha NPS
\`/admin/campanhas\` → Tipo: NPS

### 2. Configurar Webhook
URL: \`/functions/v1/nps-webhook\`

### 3. Periodicidade
- Pós-instalação: 7 dias
- Pós-atendimento: 1 dia
- Periódica: Trimestral

### 4. Dashboard
\`/admin/nps\`

### 5. Follow-up
Lista de detratores em:
\`nps_responses\` WHERE follow_up_needed = true`,
          },
        ],
      },
      {
        id: "contracts",
        title: "Gestão de Contratos",
        items: [
          {
            id: "contract-management",
            title: "Sistema de Contratos",
            explanation: `# Sistema de Gestão de Contratos

## Objetivo
Criar, assinar e gerenciar contratos digitais de clientes.

## Funcionalidades
- Templates de contrato personalizáveis
- Assinatura eletrônica
- Geração de PDF
- Armazenamento seguro
- Histórico de versões`,
            coreLogic: `// Edge Function: process-contract

**Fluxo**:
1. Cliente preenche dados
2. Sistema seleciona template apropriado
3. Preenche variáveis do template
4. Cliente assina eletronicamente
5. Gera PDF final
6. Armazena em storage bucket

**PDF Generation**:
\`generate-contract-pdf\`
- Usa template HTML
- Substitui variáveis
- Converte para PDF`,
            interface: `// Componentes:
- ContractTemplatesView
- SignedContractsView
- ContractSigning
- TestContractFlow

**Features**:
- Editor de templates
- Preview em tempo real
- Assinatura digital
- Download de PDFs
- Status de contratos`,
            database: `-- Estrutura Contratos:

1. **contract_templates**
   - name, template_content
   - plan_types (jsonb)
   - version, is_active

2. **signed_contracts**
   - contract_number (auto-gerado)
   - customer_data (jsonb)
   - plan_data (jsonb)
   - template_id
   - signature_data (jsonb)
   - pdf_url
   - signed_at

3. **installation_appointments**
   - contract_number (referência)`,
            agentIntegration: `## Integração com Vendas

**Agente de Vendas**:
Após qualificação, oferece assinatura de contrato

**Tool Available**:
\`\`\`typescript
{
  name: "generate_contract",
  description: "Gera link para assinatura de contrato"
}
\`\`\`

**Fluxo**:
1. Agente coleta dados
2. Cria link de assinatura
3. Envia por WhatsApp/Email
4. Cliente assina
5. Sistema notifica conclusão`,
            configuration: `## Setup Contratos

### 1. Criar Template
\`/admin/contratos\` → Templates

**Variáveis Disponíveis**:
\`{{customer_name}}\`
\`{{customer_cpf}}\`
\`{{plan_name}}\`
\`{{plan_price}}\`
\`{{installation_date}}\`

### 2. Storage Bucket
Bucket: \`signed-contracts\` (privado)

### 3. Numeração Automática
Função: \`generate_contract_number()\`
Formato: CT2025-000001

### 4. Testar Fluxo
\`/admin/contratos\` → Aba "Testar Fluxo"`,
          },
        ],
      },
      {
        id: "knowledge-base",
        title: "Base de Conhecimento",
        items: [
          {
            id: "knowledge-base-system",
            title: "Sistema de Base de Conhecimento",
            explanation: `# Base de Conhecimento

## Objetivo
Centralizar informações que alimentam os agentes de IA.

## Funcionalidades
- Organização por categorias
- Suporte a markdown
- Atribuição a agentes específicos
- Versionamento
- Sincronização automática`,
            coreLogic: `// Sincronização:

**Script Deno**:
\`docs/knowledge-base/scripts/sync-kb-to-supabase.ts\`

**Fluxo**:
1. Lê arquivos .md em data-sources/
2. Extrai front matter (metadados YAML)
3. Parseia conteúdo markdown
4. Faz upsert no Supabase

**Categorias**:
- vendas
- suporte (técnico, financeiro)
- automacao
- telemedicina`,
            interface: `// Componente: KnowledgeManagement

**Features**:
- Navegação por pastas
- Busca de conteúdo
- Editor markdown
- Filtro por agente
- Status ativo/inativo

**Estrutura**:
- Folder tree
- Breadcrumbs
- Preview markdown
- Botão de sincronizar`,
            database: `-- Estrutura KB:

1. **knowledge_base**
   - title, content
   - category, source
   - is_active
   - metadata (jsonb):
     - agent_types (array)
     - last_updated
     - author
     - version

**Fonte de Verdade**:
Arquivos markdown em:
\`docs/knowledge-base/data-sources/\``,
            agentIntegration: `## Uso pelos Agentes

**Query Automática**:
Agentes buscam KB com base em:
- Categoria relevante
- Tipo de agente
- Palavras-chave da pergunta

**Exemplo**:
\`\`\`typescript
const kb = await supabase
  .from('knowledge_base')
  .select('*')
  .eq('category', 'vendas')
  .contains('metadata->agent_types', ['sales'])
  .eq('is_active', true);
\`\`\`

**Injeção no Prompt**:
Conteúdo relevante da KB é injetado no system prompt`,
            configuration: `## Gestão da KB

### 1. Adicionar Conteúdo
Criar arquivo .md em:
\`docs/knowledge-base/data-sources/{categoria}/{arquivo}.md\`

**Front Matter**:
\`\`\`yaml
---
title: "Título"
category: "vendas"
agent_types: ["sales", "support-financial"]
is_active: true
last_updated: "2025-01-10"
author: "Equipe"
version: "1.0"
---
\`\`\`

### 2. Sincronizar
\`\`\`bash
deno run --allow-all docs/knowledge-base/scripts/sync-kb-to-supabase.ts
\`\`\`

### 3. Interface Web
\`/admin/knowledge\`

### 4. Desativar Conteúdo
Marcar \`is_active: false\` no front matter`,
          },
        ],
      },
      {
        id: "maintenance",
        title: "Manutenção Programada",
        items: [
          {
            id: "maintenance-system",
            title: "Sistema de Manutenção",
            explanation: `# Sistema de Manutenção Programada

## Objetivo
Gerenciar manutenções preventivas e corretivas de rede.

## Funcionalidades
- Agendamento de manutenções
- Notificação prévia de clientes
- Registro de execução
- Histórico de manutenções
- Configuração de cron jobs`,
            coreLogic: `// Edge Function: network-maintenance-executor

**Tipos de Manutenção**:
- Preventiva
- Corretiva
- Emergencial

**Fluxo**:
1. Admin agenda manutenção
2. Sistema notifica clientes afetados (24h antes)
3. Na hora agendada, executa tarefas
4. Registra resultado
5. Notifica conclusão

**Cron Control**:
Funções para enable/disable cron via SQL`,
            interface: `// Página: NetworkMaintenance

**Abas**:
1. Tarefas: Manutenções agendadas
2. Histórico: Manutenções passadas
3. Configurações: Cron settings

**Componentes**:
- MaintenanceTasks
- MaintenanceLog
- MaintenanceSettings`,
            database: `-- Estrutura Manutenção:

1. **maintenance_tasks**
   - title, description
   - scheduled_for
   - status (pending, running, completed, failed)
   - affected_regions (jsonb)
   - notify_customers
   - executed_at

2. **maintenance_log**
   - task_id
   - action, status
   - details

3. **maintenance_cron_control**
   - cron_name, cron_schedule
   - is_active
   - last_enabled_at

**Funções SQL**:
- enable_maintenance_cron()
- disable_maintenance_cron()`,
            agentIntegration: `## Notificação Automática

**Agentes Notificam**:
Clientes recebem aviso de manutenção via:
- WhatsApp (preferencial)
- Email
- SMS

**Mensagem Padrão**:
"Atenção: Manutenção programada em [data] das [hora_inicio] às [hora_fim]. Sua internet ficará indisponível neste período."

**Durante Manutenção**:
Agente técnico informa automaticamente sobre manutenção em andamento`,
            configuration: `## Setup Manutenção

### 1. Acessar Gestão
\`/admin/network-maintenance\`

### 2. Criar Manutenção
- Título e descrição
- Data e horário
- Regiões afetadas
- Marcar "Notificar clientes"

### 3. Cron Job
Padrão: A cada 30 minutos verifica manutenções pendentes

**Habilitar**:
\`SELECT enable_maintenance_cron();\`

**Desabilitar**:
\`SELECT disable_maintenance_cron();\`

### 4. Notificações
Configurar canais em campaign settings`,
          },
        ],
      },
    ],
  },
];

export default function TechnicalKnowledgeBase() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">📚 Banco de Conhecimento Técnico</h1>
        <p className="text-muted-foreground text-lg">
          Documentação completa do sistema organizada por categorias
        </p>
      </div>

      <Accordion type="multiple" className="space-y-4">
        {knowledgeBase.map((category) => (
          <AccordionItem key={category.id} value={category.id} className="border rounded-lg">
            <AccordionTrigger className="px-6 hover:no-underline">
              <div className="flex flex-col items-start text-left">
                <h2 className="text-2xl font-bold">{category.title}</h2>
                <p className="text-sm text-muted-foreground">{category.description}</p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <Accordion type="multiple" className="space-y-3 mt-4">
                {category.subcategories.map((subcategory) => (
                  <AccordionItem
                    key={subcategory.id}
                    value={subcategory.id}
                    className="border rounded-md bg-muted/30"
                  >
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <h3 className="text-lg font-semibold">{subcategory.title}</h3>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {subcategory.items.map((item) => (
                        <Card key={item.id} className="mt-4">
                          <CardHeader>
                            <CardTitle>{item.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Tabs defaultValue="explanation" className="w-full">
                              <TabsList className="grid w-full grid-cols-6">
                                <TabsTrigger value="explanation" className="flex items-center gap-1">
                                  <BookOpen className="h-4 w-4" />
                                  <span className="hidden sm:inline">Explicação</span>
                                </TabsTrigger>
                                <TabsTrigger value="core-logic" className="flex items-center gap-1">
                                  <Zap className="h-4 w-4" />
                                  <span className="hidden sm:inline">Core Logic</span>
                                </TabsTrigger>
                                <TabsTrigger value="interface" className="flex items-center gap-1">
                                  <Monitor className="h-4 w-4" />
                                  <span className="hidden sm:inline">Interface</span>
                                </TabsTrigger>
                                <TabsTrigger value="database" className="flex items-center gap-1">
                                  <Database className="h-4 w-4" />
                                  <span className="hidden sm:inline">Database</span>
                                </TabsTrigger>
                                {item.agentIntegration && (
                                  <TabsTrigger value="agent" className="flex items-center gap-1">
                                    <Bot className="h-4 w-4" />
                                    <span className="hidden sm:inline">Agente</span>
                                  </TabsTrigger>
                                )}
                                <TabsTrigger value="config" className="flex items-center gap-1">
                                  <Settings className="h-4 w-4" />
                                  <span className="hidden sm:inline">Config</span>
                                </TabsTrigger>
                              </TabsList>

                              <TabsContent value="explanation" className="mt-4">
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                  <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg">
                                    {item.explanation}
                                  </pre>
                                </div>
                              </TabsContent>

                              <TabsContent value="core-logic" className="mt-4">
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                  <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg">
                                    {item.coreLogic}
                                  </pre>
                                </div>
                              </TabsContent>

                              <TabsContent value="interface" className="mt-4">
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                  <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg">
                                    {item.interface}
                                  </pre>
                                </div>
                              </TabsContent>

                              <TabsContent value="database" className="mt-4">
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                  <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg">
                                    {item.database}
                                  </pre>
                                </div>
                              </TabsContent>

                              {item.agentIntegration && (
                                <TabsContent value="agent" className="mt-4">
                                  <div className="prose prose-sm max-w-none dark:prose-invert">
                                    <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg">
                                      {item.agentIntegration}
                                    </pre>
                                  </div>
                                </TabsContent>
                              )}

                              <TabsContent value="config" className="mt-4">
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                  <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg">
                                    {item.configuration}
                                  </pre>
                                </div>
                              </TabsContent>
                            </Tabs>
                          </CardContent>
                        </Card>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
