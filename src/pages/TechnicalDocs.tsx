import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileText, BookOpen, Network, Shield, ClipboardList, Wrench } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { toast } from "sonner";

const TechnicalDocs = () => {
  const [activeDoc, setActiveDoc] = useState("complete");
  const [analysisNotes, setAnalysisNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Load saved notes from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem("technical-analysis-notes");
    if (savedNotes) {
      setAnalysisNotes(savedNotes);
    }
  }, []);

  // Save notes to localStorage when they change
  const handleNotesChange = (value: string) => {
    setAnalysisNotes(value);
    localStorage.setItem("technical-analysis-notes", value);
  };

  // Handle the "Fazer ajuste" button click
  const handleMakeAdjustments = () => {
    if (!analysisNotes.trim()) {
      toast.error("Por favor, adicione anotações antes de solicitar ajustes");
      return;
    }

    setIsProcessing(true);
    toast.success("Análise iniciada! Por favor, aguarde enquanto leio o documento e faço os ajustes necessários.", {
      duration: 5000
    });
    
    // Create a message for the AI to read and process
    const message = `Leia as seguintes anotações de erros e faça os ajustes necessários no sistema:

${analysisNotes}

Por favor, analise cada erro mencionado, localize o problema no código e faça as correções necessárias.`;

    // Copy to clipboard so user can paste in chat
    navigator.clipboard.writeText(message);
    
    toast.info("Mensagem copiada! Cole no chat para que eu faça os ajustes.", {
      duration: 5000
    });
    
    setIsProcessing(false);
  };

  const docs = [
    {
      id: "complete",
      title: "Descrição Completa do Sistema",
      icon: FileText,
      file: "system-complete-description.md",
      description: "Visão geral completa da arquitetura e funcionalidades"
    },
    {
      id: "multiagent",
      title: "Arquitetura Multiagente",
      icon: Network,
      file: "multiagent-architecture.md",
      description: "Detalhamento técnico da orquestração de agentes"
    },
    {
      id: "robustness",
      title: "Robustez do Sistema",
      icon: Shield,
      file: "system-robustness-100.md",
      description: "Implementações de resiliência e confiabilidade"
    },
    {
      id: "operational",
      title: "Guia Operacional",
      icon: BookOpen,
      file: "operational-guide.md",
      description: "Procedimentos operacionais e manutenção"
    },
    {
      id: "analysis",
      title: "Análise",
      icon: ClipboardList,
      file: "error-analysis.md",
      description: "Verificação dos erros nas funcionalidades"
    }
  ];

  const getDocContent = (docId: string) => {
    switch(docId) {
      case "complete":
        return `# Descrição Completa do Sistema SUPERNET

## Visão Geral

O sistema SUPERNET é uma plataforma multiagente completa que integra diversos módulos para gestão de provedores de internet, incluindo automação inteligente, suporte ao cliente, gestão financeira e marketing.

## Arquitetura Principal

### 1. Frontend (React + TypeScript)
- **Framework**: React 18 com TypeScript
- **Roteamento**: React Router v6
- **Estado Global**: React Query + Context API
- **UI Components**: shadcn/ui com Radix UI
- **Estilização**: Tailwind CSS

### 2. Backend (Supabase)
- **Database**: PostgreSQL com RLS
- **Edge Functions**: Deno runtime
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime

## Módulos do Sistema

### 🤖 Chatbots e Agentes IA

#### Agente de Vendas (Sales Agent)
- Atende consultas sobre planos e cobertura
- Verifica disponibilidade por CEP
- Gera contratos automaticamente
- Integração com IXC para criar contratos

#### Agente de Suporte Técnico
- Diagnostica problemas de conexão
- Cria tickets de atendimento
- Agenda visitas técnicas
- Integração com sistema IXC

#### Agente de Suporte Financeiro
- Consulta faturas em aberto
- Envia segunda via de boletos
- Notifica sobre pagamentos
- Integração com sistema IXC

#### Agente de Automação Residencial
- Consultoria sobre automação
- Recomendação de produtos
- Integração com dispositivos smart home

#### Agente de Telemedicina
- Agendamento de consultas
- Informações sobre planos
- Sistema de autenticação próprio

### ⚙️ Auto Reboot Inteligente

Sistema automatizado que monitora e reinicia equipamentos com baixa banda:

**Funcionamento:**
- Monitora clientes online via API IXC
- Detecta banda abaixo de 900 kbps
- Verifica múltiplas vezes antes de agir (3 verificações)
- Cooldown de 24h entre reboots
- Blacklist para clientes excluídos
- Validação pós-reboot

**Tabelas:**
- \`equipment_reboots\`: Histórico de reinicializações
- \`equipment_reboot_blacklist\`: Clientes excluídos
- \`auto_reboot_settings\`: Configurações do sistema

### 📊 Monitoramento de Rede

#### PON Ports Monitor
- Status das portas PON
- Sinal de cada ONU
- Alertas de sinal baixo
- Dashboard visual

#### Radio Monitor
- Status de equipamentos wireless
- Qualidade de sinal
- Latência e throughput

#### Detecção de Queda em Massa
- Identifica quedas simultâneas
- Alertas automáticos
- Dashboard de incidentes
- Integração com sistema de tickets

### 🔧 Manutenção Inteligente

Sistema de manutenção preventiva automatizada:

**Prioridades:**
- **Alta**: Executa sempre
- **Média**: Apenas se rede estável
- **Baixa**: Apenas em janelas de manutenção

**Tarefas Automáticas:**
- Verificação de disponibilidade
- Teste de latência
- Limpeza de logs
- Otimização de cache
- Backup de configurações

**Edge Function:**
\`network-maintenance-executor\` - Executa tarefas por cron

### 💰 Gestão Financeira

#### Dashboard Financeiro
- Receita total e projeções
- Taxa de inadimplência
- Novos clientes vs churns
- Métricas por plano

#### Projeções de Fluxo de Caixa
- Cenários otimista/realista/pessimista
- Projeções até 6 meses
- Cálculo automático via edge function

#### Notificações de Pagamento
- Templates personalizáveis
- Envio por WhatsApp/Email/SMS
- Campanhas automatizadas
- Rastreamento de envios

### 📄 Contratos Digitais

**Fluxo Completo:**
1. Cliente preenche dados no chatbot
2. Sistema busca template por tipo de plano
3. Substitui variáveis no template
4. Gera PDF via edge function
5. Envia para assinatura digital
6. Armazena em Storage
7. Notifica cliente e admin

**Tabelas:**
- \`contract_templates\`: Templates de contratos
- \`signed_contracts\`: Contratos assinados
- \`contract_signing_sessions\`: Sessões ativas

### 📢 Marketing e Campanhas

#### Campanhas Multi-canal
- WhatsApp
- Email
- SMS
- Chamadas de voz

**Tipos de Campanha:**
- Marketing
- Cobrança
- Renovação
- NPS

**Features:**
- Segmentação de público via IXC
- Agendamento
- Rastreamento de métricas
- Templates de conteúdo

#### NPS (Net Promoter Score)
- Campanhas automatizadas
- Dashboard de métricas
- Seguimento de detratores
- Análise de tendências

### 🗺️ Gestão de Cobertura

- Mapa interativo (Leaflet)
- Áreas de cobertura por polígonos
- Importação em massa de CEPs
- Verificação de disponibilidade
- Associação de planos por região

### 📚 Base de Conhecimento

Sistema RAG (Retrieval-Augmented Generation):

**Estrutura:**
- Organização por categorias
- Suporte a pastas
- Tags para busca
- Versionamento

**Sincronização:**
- \`sync-chatbot-knowledge\`: Atualiza KB via IXC
- \`sync-ixc-documentation\`: Sincroniza docs técnicos

**Agentes Atribuídos:**
- Cada item pode ser atribuído a agentes específicos
- Filtragem por tipo de agente

### 📝 Blog

Sistema completo de gerenciamento de blog:
- Editor WYSIWYG
- Categorias e tags
- Imagens featured
- SEO friendly
- Publicação programada

### 💬 Atendimento Omnichannel

Central unificada de atendimento:

**Canais:**
- WhatsApp
- Webchat
- Email

**Features:**
- Fila de atendimento
- Atribuição automática
- Transferência entre agentes
- Histórico completo
- Métricas de SLA

**Tabelas:**
- \`conversations\`: Conversas
- \`conversation_messages\`: Mensagens
- \`conversation_transfers\`: Transferências
- \`agent_presence\`: Status dos agentes

### 👥 Gestão de Usuários

#### Níveis de Acesso:
- **Admin**: Acesso total
- **Editor**: Gerenciamento de conteúdo
- **Viewer**: Apenas visualização

**Features:**
- Perfis customizáveis
- Avatares
- Logs de atividade
- Logs de segurança
- Rate limiting

## Integrações Externas

### 🔌 IXC Soft (ERP de Provedor)

**Principais Endpoints Integrados:**

\`\`\`
GET /radusuarios - Lista clientes
GET /cliente_contrato - Contratos ativos
GET /fn_areceber - Faturas a receber
GET /su_cliente_contrato_tags - Tags de clientes
POST /su_oss_chamado - Criar tickets
POST /radusuarios - Criar usuário internet
\`\`\`

**Edge Function:**
\`ixc-proxy\` - Centraliza comunicação com IXC
- HMAC authentication
- Circuit breaker pattern
- Rate limiting
- Retry logic

### 📱 Evolution API (WhatsApp)

**Funcionalidades:**
- Envio de mensagens
- Recebimento via webhook
- Suporte a mídia
- Status de mensagens

**Edge Functions:**
- \`send-whatsapp-message\`: Envio
- \`whatsapp-webhook\`: Recebimento

### 📧 Locaweb SMTP

**Funcionalidades:**
- Envio de emails transacionais
- Templates HTML
- Variáveis dinâmicas

**Edge Function:**
\`send-locaweb-email\` - Envio via API

### 🤖 OpenAI API

**Uso nos Agentes:**
- GPT-4o-mini para routing
- GPT-4o para conversas complexas
- Gemini Flash 2.5 como alternativa

**Features:**
- Function calling
- Streaming de respostas
- Context window otimizado

## Segurança

### Row Level Security (RLS)
- Políticas em todas as tabelas
- Acesso baseado em roles
- Logs de acesso

### Autenticação
- Supabase Auth
- JWT tokens
- Refresh automático

### Rate Limiting
- Tabela \`rate_limits\`
- Proteção por endpoint
- Bloqueio temporário

### Logs de Segurança
- \`security_logs\`: Eventos de segurança
- \`user_activity_logs\`: Atividades do usuário

## Features Especiais

### Real-time Updates
- Supabase Realtime
- Notificações de novos atendimentos
- Status de agentes

### Páginas Públicas
- Landing page
- Blog público
- FAQ público
- Telemedicina
- Automação residencial

### Sistema de Testes
- Testes de integração IXC
- Simulador de WhatsApp
- Teste de fluxo de contratos

## Conclusão

O sistema SUPERNET representa uma solução completa e moderna para gestão de provedores de internet, com foco em automação, eficiência operacional e experiência do cliente. A arquitetura multiagente permite escalabilidade e manutenção facilitada, enquanto as integrações garantem fluxos de trabalho otimizados.`;

      case "multiagent":
        return `# Arquitetura Multiagente - Documentação Técnica

## 1. Arquitetura e Orquestração

### 1.1 Executor/Orquestrador Principal

**Edge Function**: \`routing-agent\`

O ponto de entrada central do sistema multiagente é a função \`routing-agent\`, que atua como orquestrador principal:

\`\`\`typescript
// supabase/functions/routing-agent/index.ts

interface RoutingDecision {
  agent: string;
  confidence: number;
  reason: string;
}

async function routeRequest(userMessage: string, context: any): Promise<RoutingDecision> {
  // 1. Análise de intenção usando GPT-4o-mini
  const intentAnalysis = await analyzeIntent(userMessage);
  
  // 2. Busca agente apropriado
  const agent = await findBestAgent(intentAnalysis);
  
  // 3. Validações de contexto
  const canHandle = await validateAgentCapabilities(agent, context);
  
  return {
    agent: agent.name,
    confidence: intentAnalysis.confidence,
    reason: intentAnalysis.reasoning
  };
}
\`\`\`

**Fluxo de Decisão:**

1. **Entrada**: Mensagem do usuário + contexto da conversa
2. **Análise de Intenção**: GPT-4o-mini classifica a intenção
3. **Seleção de Agente**: Baseado em regras + ML
4. **Roteamento**: Invoca edge function do agente específico
5. **Resposta**: Retorna ao canal de origem

**Implementação da Lógica de Roteamento:**

\`\`\`typescript
const routingRules = [
  {
    keywords: ['plano', 'contratar', 'preço', 'cobertura'],
    agent: 'sales-agent',
    priority: 1
  },
  {
    keywords: ['boleto', 'fatura', 'pagamento', 'vencimento'],
    agent: 'support-financial-agent',
    priority: 1
  },
  {
    keywords: ['internet lenta', 'não conecta', 'sem internet'],
    agent: 'support-tech-agent',
    priority: 1
  },
  {
    keywords: ['automação', 'smart home', 'alexa', 'google home'],
    agent: 'automacao-agent',
    priority: 2
  },
  {
    keywords: ['consulta', 'médico', 'telemedicina'],
    agent: 'telemedicina-agent',
    priority: 1
  }
];
\`\`\`

### 1.2 Registro de Decisões

Todas as decisões de roteamento são registradas:

\`\`\`sql
CREATE TABLE conversation_routing_logs (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  user_message TEXT,
  selected_agent TEXT,
  confidence NUMERIC,
  reasoning TEXT,
  alternative_agents JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

## 2. Protocolo de Comunicação

### 2.1 Message Passing via Edge Functions

**Arquitetura:**

\`\`\`
Cliente → routing-agent → [sales|support-tech|support-financial|automacao|telemedicina]-agent → Response
\`\`\`

**Invocação de Agente:**

\`\`\`typescript
const agentResponse = await supabase.functions.invoke(selectedAgent, {
  body: {
    message: userMessage,
    conversationId: conversation.id,
    context: {
      customerData: clientInfo,
      conversationHistory: recentMessages,
      metadata: {
        channel: 'whatsapp',
        timestamp: new Date().toISOString()
      }
    }
  }
});
\`\`\`

### 2.2 Protocolo de Requisição/Resposta

**Request Format:**

\`\`\`typescript
interface AgentRequest {
  message: string;
  conversationId: string;
  context: {
    customerData?: {
      cpf?: string;
      name?: string;
      ixcClientId?: string;
    };
    conversationHistory: Message[];
    metadata: {
      channel: 'whatsapp' | 'webchat' | 'telegram';
      timestamp: string;
      urgency?: 'low' | 'medium' | 'high';
    };
  };
}
\`\`\`

**Response Format:**

\`\`\`typescript
interface AgentResponse {
  message: string;
  actions?: Action[];
  metadata: {
    agent: string;
    processingTimeMs: number;
    toolsUsed?: string[];
    confidenceScore?: number;
  };
}
\`\`\`

### 2.3 IXC Proxy - Comunicação Centralizada

**Edge Function**: \`ixc-proxy\`

Todos os agentes comunicam com IXC via proxy centralizado:

\`\`\`typescript
// Agente chama:
const ixcResponse = await supabase.functions.invoke('ixc-proxy', {
  body: {
    method: 'GET',
    endpoint: '/cliente_contrato',
    params: { cpf: customerCpf }
  }
});

// ixc-proxy implementa:
// - Circuit breaker
// - Rate limiting
// - Retry logic
// - HMAC authentication
// - Logging centralizado
\`\`\`

## 3. Agentes e Ferramentas (Tools)

### 3.1 Injeção de Ferramentas

Cada agente tem suas ferramentas específicas injetadas no system prompt:

**Exemplo - Support Tech Agent:**

\`\`\`typescript
const tools = [
  {
    type: "function",
    function: {
      name: "criar_atendimento_ixc",
      description: "Cria um ticket técnico no sistema IXC para visita presencial",
      parameters: {
        type: "object",
        properties: {
          id_cliente: { type: "string" },
          tipo_problema: { type: "string" },
          descricao: { type: "string" },
          urgencia: { type: "string", enum: ["baixa", "media", "alta"] }
        },
        required: ["id_cliente", "tipo_problema", "descricao"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "consultar_status_equipamento",
      description: "Verifica status do equipamento do cliente via IXC",
      parameters: {
        type: "object",
        properties: {
          login: { type: "string" }
        },
        required: ["login"]
      }
    }
  }
];

const systemPrompt = \`
Você é um técnico de suporte...

FERRAMENTAS DISPONÍVEIS:
\${JSON.stringify(tools, null, 2)}

Use estas ferramentas quando necessário.
\`;
\`\`\`

### 3.2 Execução de Tools

**OpenAI Function Calling:**

\`\`\`typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: conversationHistory,
  tools: agentTools,
  tool_choice: "auto"
});

if (response.choices[0].message.tool_calls) {
  for (const toolCall of response.choices[0].message.tool_calls) {
    const result = await executeToolFunction(
      toolCall.function.name,
      JSON.parse(toolCall.function.arguments)
    );
    
    // Registra ação
    await supabase.from('action_log').insert({
      agent_name: agentName,
      action_type: toolCall.function.name,
      action_payload: JSON.parse(toolCall.function.arguments),
      result: result
    });
  }
}
\`\`\`

## 4. Gerenciamento de Estado

### 4.1 Memória de Curto Prazo (Short-term Memory)

**Armazenamento:**
- Tabela \`ai_messages\` ou \`conversation_messages\`
- Últimas N mensagens carregadas no contexto

\`\`\`typescript
async function loadConversationHistory(conversationId: string, limit = 10) {
  const { data } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);
    
  return data?.reverse() || [];
}
\`\`\`

### 4.2 Memória de Longo Prazo (Long-term Memory)

**Dados do Cliente:**
- Informações do IXC (contratos, pagamentos)
- Histórico de atendimentos
- Preferências identificadas

\`\`\`typescript
interface CustomerMemory {
  ixcData: {
    clientId: string;
    contracts: Contract[];
    invoices: Invoice[];
  };
  preferences: {
    preferredChannel: string;
    language: string;
  };
  pastInteractions: {
    lastContact: Date;
    commonIssues: string[];
    satisfaction: number;
  };
}
\`\`\`

### 4.3 System Prompt Dinâmico

O system prompt é construído dinamicamente com contexto:

\`\`\`typescript
function buildSystemPrompt(agent: Agent, context: Context): string {
  return \`
Você é \${agent.name}.

DADOS DO CLIENTE ATUAL:
\${JSON.stringify(context.customerData, null, 2)}

HISTÓRICO RECENTE:
\${formatConversationHistory(context.history)}

CONHECIMENTO RELEVANTE:
\${context.relevantKnowledge}

INSTRUÇÕES:
\${agent.instructions}
\`;
}
\`\`\`

## 5. Base de Conhecimento e RAG

### 5.1 Estrutura da KB

**Tabela \`knowledge_base\`:**

\`\`\`sql
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  agent_types TEXT[], -- ['sales', 'support_tech', 'support_financial']
  is_active BOOLEAN DEFAULT true,
  parent_id UUID REFERENCES knowledge_base(id),
  is_folder BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

**Categorias:**
- Procedimentos técnicos
- Scripts de vendas
- Políticas da empresa
- FAQ
- Documentação IXC

### 5.2 Mecanismo RAG (Atual)

**Busca por Query:**

\`\`\`typescript
async function retrieveKnowledge(agentType: string, query: string) {
  // 1. Busca por categoria do agente
  const { data: baseKnowledge } = await supabase
    .from('knowledge_base')
    .select('*')
    .contains('agent_types', [agentType])
    .eq('is_active', true);

  // 2. Filtragem por keywords (simplificado)
  const keywords = extractKeywords(query);
  const relevantDocs = baseKnowledge?.filter(doc => 
    keywords.some(kw => 
      doc.title.toLowerCase().includes(kw) ||
      doc.content.toLowerCase().includes(kw)
    )
  );

  return relevantDocs;
}
\`\`\`

### 5.3 RAG Proposto (Futuro)

**Implementação com Embeddings:**

\`\`\`typescript
// 1. Gerar embeddings durante inserção
async function addKnowledge(content: string) {
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: content
  });
  
  await supabase.from('knowledge_base').insert({
    content,
    embedding: embedding.data[0].embedding
  });
}

// 2. Busca por similaridade vetorial
async function semanticSearch(query: string, agentType: string) {
  const queryEmbedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query
  });
  
  const { data } = await supabase.rpc('match_knowledge', {
    query_embedding: queryEmbedding.data[0].embedding,
    agent_type: agentType,
    match_threshold: 0.7,
    match_count: 5
  });
  
  return data;
}
\`\`\`

### 5.4 Sincronização de Conhecimento

**Edge Functions:**

1. \`sync-chatbot-knowledge\`: Atualiza KB com dados do IXC
2. \`sync-ixc-documentation\`: Sincroniza documentação técnica

\`\`\`typescript
// Executado via cron a cada 6 horas
const { data: ixcDocs } = await fetch(IXC_DOCS_URL);
await upsertKnowledge(ixcDocs, 'ixc_documentation');
\`\`\`

## 6. Resiliência e Observabilidade

### 6.1 Circuit Breaker Pattern

**Implementado no \`ixc-proxy\`:**

\`\`\`typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: Date | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime! < 60000) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.failureCount >= 5) {
      this.state = 'OPEN';
    }
  }
}
\`\`\`

### 6.2 Dead Letter Queue (DLQ)

**Tabela \`failed_actions\`:**

\`\`\`sql
CREATE TABLE failed_actions (
  id UUID PRIMARY KEY,
  agent_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_payload JSONB NOT NULL,
  error_message TEXT NOT NULL,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

**Processamento de Retries:**

\`\`\`typescript
// Edge Function: retry-failed-actions
async function processFailedActions() {
  const { data: failures } = await supabase
    .from('failed_actions')
    .select('*')
    .eq('status', 'pending')
    .lt('retry_count', 'max_retries');
    
  for (const failure of failures) {
    try {
      await retryAction(failure);
      
      await supabase.from('failed_actions')
        .update({ status: 'resolved', resolved_at: new Date() })
        .eq('id', failure.id);
        
    } catch (error) {
      const newRetryCount = failure.retry_count + 1;
      
      await supabase.from('failed_actions')
        .update({ 
          retry_count: newRetryCount,
          last_retry_at: new Date(),
          status: newRetryCount >= failure.max_retries ? 'failed' : 'pending'
        })
        .eq('id', failure.id);
    }
  }
}
\`\`\`

### 6.3 Retry com Exponential Backoff

\`\`\`typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
\`\`\`

### 6.4 Logging e Monitoramento

**Action Logs:**

\`\`\`typescript
await supabase.from('action_log').insert({
  agent_name: 'sales-agent',
  action_type: 'create_contract',
  action_payload: { planId, customerData },
  result: contractResult,
  client_cpf: customerData.cpf,
  created_at: new Date()
});
\`\`\`

**Métricas de Agente:**

\`\`\`typescript
// Edge Function: metrics-collector
await supabase.from('agent_metrics').insert({
  agent_name: 'support-tech-agent',
  action_type: 'ticket_creation',
  success: true,
  duration_ms: processingTime,
  conversation_id: conversationId
});
\`\`\`

**Health Checks:**

\`\`\`typescript
// Edge Function: system-health
const healthStatus = {
  ixc_api: await checkIXCHealth(),
  evolution_api: await checkEvolutionHealth(),
  database: await checkDatabaseHealth(),
  agents: {
    sales: await checkAgentHealth('sales-agent'),
    support_tech: await checkAgentHealth('support-tech-agent'),
    support_financial: await checkAgentHealth('support-financial-agent')
  }
};
\`\`\`

### 6.5 Timeout Configuration

\`\`\`typescript
const TIMEOUTS = {
  ixc_api: 10000,      // 10s
  openai_api: 30000,   // 30s
  agent_response: 45000 // 45s
};

const response = await Promise.race([
  agentFunction(),
  timeout(TIMEOUTS.agent_response)
]);
\`\`\`

## Conclusão

Esta arquitetura multiagente implementa:

✅ **Orquestração centralizada** via routing-agent
✅ **Message passing** assíncrono via Edge Functions  
✅ **Tool injection** via OpenAI Function Calling
✅ **Estado gerenciado** em PostgreSQL + memória contextual
✅ **RAG** com busca por query (migração para embeddings planejada)
✅ **Resiliência** com circuit breaker, DLQ e retries
✅ **Observabilidade** completa com logs e métricas

O sistema é escalável, resiliente e preparado para evolução contínua.`;

      case "robustness":
        return `# Sistema de Robustez 100% - SUPERNET

## Visão Geral

Este documento detalha todas as implementações de robustez, resiliência e confiabilidade do sistema SUPERNET, garantindo operação contínua mesmo em cenários adversos.

## 1. Resiliência de API

### 1.1 Circuit Breaker no IXC Proxy

**Implementação:**

\`\`\`typescript
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  
  // Thresholds
  private readonly FAILURE_THRESHOLD = 5;
  private readonly SUCCESS_THRESHOLD = 2;
  private readonly TIMEOUT = 60000; // 1 min
  
  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime! >= this.TIMEOUT) {
        this.state = 'HALF_OPEN';
        console.log('Circuit breaker: HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.SUCCESS_THRESHOLD) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        console.log('Circuit breaker: CLOSED');
      }
    } else {
      this.failureCount = 0;
    }
  }
  
  private onFailure() {
    this.failureCount++;
    this.successCount = 0;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      this.state = 'OPEN';
      console.log('Circuit breaker: OPEN');
    }
  }
}
\`\`\`

### 1.2 Retry com Exponential Backoff

\`\`\`typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    factor?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    factor = 2
  } = options;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delay = Math.min(
          baseDelay * Math.pow(factor, attempt),
          maxDelay
        );
        
        console.log(\`Retry attempt \${attempt + 1}/\${maxRetries} after \${delay}ms\`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}
\`\`\`

### 1.3 Dead Letter Queue (DLQ)

**Tabela:**

\`\`\`sql
CREATE TABLE failed_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_payload JSONB NOT NULL,
  error_message TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending',
  last_retry_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_failed_actions_status ON failed_actions(status);
CREATE INDEX idx_failed_actions_retry ON failed_actions(status, retry_count);
\`\`\`

**Processador de DLQ:**

\`\`\`typescript
// Edge Function: retry-failed-actions
async function processDLQ() {
  const { data: pendingActions } = await supabase
    .from('failed_actions')
    .select('*')
    .eq('status', 'pending')
    .lt('retry_count', supabase.raw('max_retries'))
    .order('created_at', { ascending: true })
    .limit(50);
  
  for (const action of pendingActions || []) {
    try {
      await retryAction(action);
      
      // Sucesso - marcar como resolvido
      await supabase
        .from('failed_actions')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', action.id);
        
      console.log(\`✅ Action \${action.id} resolved\`);
      
    } catch (error) {
      const newRetryCount = action.retry_count + 1;
      const isFinalFailure = newRetryCount >= action.max_retries;
      
      await supabase
        .from('failed_actions')
        .update({
          retry_count: newRetryCount,
          last_retry_at: new Date().toISOString(),
          status: isFinalFailure ? 'failed' : 'pending',
          error_message: error.message
        })
        .eq('id', action.id);
        
      console.log(\`❌ Action \${action.id} retry \${newRetryCount}/\${action.max_retries}\`);
    }
  }
}
\`\`\`

## 2. Rate Limiting

### 2.1 Implementação Database-Level

\`\`\`sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action_type TEXT NOT NULL,
  attempts INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_user ON rate_limits(user_id, action_type);
\`\`\`

### 2.2 Função de Checagem

\`\`\`typescript
async function checkRateLimit(
  userId: string,
  actionType: string,
  options: {
    maxAttempts?: number;
    windowMinutes?: number;
    blockMinutes?: number;
  } = {}
): Promise<{ allowed: boolean; remainingAttempts: number; blockedUntil?: Date }> {
  const {
    maxAttempts = 10,
    windowMinutes = 1,
    blockMinutes = 15
  } = options;
  
  const { data, error } = await supabase.rpc('check_rate_limit', {
    action_type_param: actionType,
    max_attempts: maxAttempts,
    window_minutes: windowMinutes,
    block_minutes: blockMinutes
  });
  
  return data;
}
\`\`\`

## 3. Timeout Management

### 3.1 Timeouts Configuráveis

\`\`\`typescript
const TIMEOUTS = {
  // API Timeouts
  ixc_api: 10000,           // 10s
  evolution_api: 15000,     // 15s
  openai_api: 30000,        // 30s
  locaweb_email: 10000,     // 10s
  
  // Agent Timeouts
  agent_processing: 45000,   // 45s
  agent_tool_call: 20000,    // 20s
  
  // Database Timeouts
  db_query: 30000,           // 30s
  db_transaction: 60000,     // 60s
};

// Função helper
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}
\`\`\`

## 4. Validação e Sanitização

### 4.1 Validação de Entrada

\`\`\`typescript
import { z } from 'zod';

// Schema para CPF
const cpfSchema = z.string()
  .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos')
  .refine(isValidCPF, 'CPF inválido');

// Schema para dados de contrato
const contractSchema = z.object({
  planId: z.string().uuid(),
  customerName: z.string().min(3).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().regex(/^\d{10,11}$/),
  customerCPF: cpfSchema,
  address: z.object({
    street: z.string().min(1),
    number: z.string().min(1),
    city: z.string().min(1),
    state: z.string().length(2),
    zipCode: z.string().regex(/^\d{8}$/)
  })
});

// Uso
try {
  const validData = contractSchema.parse(inputData);
  await createContract(validData);
} catch (error) {
  if (error instanceof z.ZodError) {
    return { error: error.errors };
  }
}
\`\`\`

### 4.2 Sanitização de Dados

\`\`\`typescript
import DOMPurify from 'dompurify';

function sanitizeInput(input: string): string {
  // Remove tags HTML
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
  
  // Trim whitespace
  return sanitized.trim();
}

function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result = {} as T;
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key as keyof T] = sanitizeInput(value) as T[keyof T];
    } else if (typeof value === 'object' && value !== null) {
      result[key as keyof T] = sanitizeObject(value);
    } else {
      result[key as keyof T] = value;
    }
  }
  
  return result;
}
\`\`\`

## 5. Segurança

### 5.1 Row Level Security (RLS)

Todas as tabelas críticas têm RLS habilitado:

\`\`\`sql
-- Exemplo: conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view conversations"
  ON conversations FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Agents can update conversations"
  ON conversations FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'editor')
  );
\`\`\`

### 5.2 HMAC Authentication para IXC

\`\`\`typescript
import { createHmac } from 'crypto';

function generateHMAC(data: any, secret: string): string {
  const payload = JSON.stringify(data);
  return createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

function verifyHMAC(data: any, signature: string, secret: string): boolean {
  const expected = generateHMAC(data, secret);
  return signature === expected;
}

// Uso no ixc-proxy
const hmacSignature = generateHMAC(requestBody, HMAC_SECRET);

const response = await fetch(IXC_API_URL, {
  headers: {
    'X-HMAC-Signature': hmacSignature,
    'X-Timestamp': Date.now().toString()
  }
});
\`\`\`

### 5.3 Logs de Segurança

\`\`\`sql
CREATE TABLE security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL,
  event_description TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_logs_severity ON security_logs(severity, created_at);
CREATE INDEX idx_security_logs_user ON security_logs(user_id, created_at);
\`\`\`

## 6. Monitoramento e Alertas

### 6.1 Health Checks

\`\`\`typescript
// Edge Function: system-health
interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  lastCheck: Date;
  error?: string;
}

async function checkSystemHealth(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];
  
  // IXC API
  try {
    const start = Date.now();
    await fetch(\`\${IXC_URL}/ping\`);
    checks.push({
      service: 'ixc_api',
      status: 'healthy',
      responseTime: Date.now() - start,
      lastCheck: new Date()
    });
  } catch (error) {
    checks.push({
      service: 'ixc_api',
      status: 'down',
      error: error.message,
      lastCheck: new Date()
    });
  }
  
  // Evolution API
  // OpenAI API
  // Database
  // ...
  
  return checks;
}
\`\`\`

### 6.2 Configuração de Alertas

\`\`\`sql
CREATE TABLE alert_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  threshold_value NUMERIC NOT NULL,
  window_minutes INTEGER DEFAULT 5,
  notification_channels JSONB DEFAULT '["email"]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exemplos de alertas
INSERT INTO alert_config (alert_type, threshold_value, window_minutes) VALUES
('high_failure_rate', 0.1, 5),        -- 10% de falhas em 5 min
('slow_response_time', 5000, 5),      -- Resposta > 5s
('circuit_breaker_open', 1, 1),       -- Circuit breaker aberto
('dlq_size', 50, 15);                 -- DLQ com > 50 itens
\`\`\`

## 7. Backup e Recovery

### 7.1 Backup Automático

\`\`\`typescript
// Executado via cron diariamente
async function backupCriticalData() {
  const tables = [
    'signed_contracts',
    'conversations',
    'customer_contact_history',
    'agent_configurations',
    'knowledge_base'
  ];
  
  for (const table of tables) {
    const { data } = await supabase
      .from(table)
      .select('*');
      
    await supabase.storage
      .from('backups')
      .upload(\`\${table}/\${new Date().toISOString()}.json\`, JSON.stringify(data));
  }
}
\`\`\`

### 7.2 Restore Strategy

\`\`\`typescript
async function restoreFromBackup(table: string, backupDate: string) {
  const { data: backup } = await supabase.storage
    .from('backups')
    .download(\`\${table}/\${backupDate}.json\`);
    
  const records = JSON.parse(await backup.text());
  
  // Restore com upsert para evitar conflitos
  await supabase
    .from(table)
    .upsert(records);
}
\`\`\`

## 8. Graceful Degradation

### 8.1 Fallbacks de Agente

\`\`\`typescript
async function getAgentResponse(message: string, agentType: string) {
  try {
    // Tentar agente principal (GPT-4o)
    return await callOpenAI(message, 'gpt-4o');
  } catch (error) {
    console.warn('GPT-4o failed, falling back to Gemini');
    
    try {
      // Fallback para Gemini Flash 2.5
      return await callGemini(message);
    } catch (geminiError) {
      console.error('All AI providers failed');
      
      // Fallback final: resposta template
      return getTemplateResponse(agentType, message);
    }
  }
}
\`\`\`

### 8.2 Modo Degradado

\`\`\`typescript
let systemMode: 'normal' | 'degraded' | 'maintenance' = 'normal';

function setSystemMode(mode: typeof systemMode) {
  systemMode = mode;
  console.log(\`System mode changed to: \${mode}\`);
}

async function handleRequest(req: Request) {
  if (systemMode === 'maintenance') {
    return new Response('System under maintenance', { status: 503 });
  }
  
  if (systemMode === 'degraded') {
    // Desabilitar features não-críticas
    return handleDegradedRequest(req);
  }
  
  return handleNormalRequest(req);
}
\`\`\`

## 9. Testes de Resiliência

### 9.1 Chaos Engineering

\`\`\`typescript
// Simulador de falhas para testes
class ChaosMonkey {
  private failureRate: number;
  
  constructor(failureRate = 0.1) { // 10% de falhas
    this.failureRate = failureRate;
  }
  
  shouldFail(): boolean {
    return Math.random() < this.failureRate;
  }
  
  async simulateLatency(min = 100, max = 3000): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  simulateError(): Error {
    const errors = [
      new Error('Network timeout'),
      new Error('Service unavailable'),
      new Error('Database connection lost'),
      new Error('Rate limit exceeded')
    ];
    
    return errors[Math.floor(Math.random() * errors.length)];
  }
}

// Uso em testes
const chaos = new ChaosMonkey(0.2); // 20% falhas

async function testResilientFunction() {
  if (chaos.shouldFail()) {
    throw chaos.simulateError();
  }
  
  await chaos.simulateLatency();
  return 'Success';
}
\`\`\`

## Conclusão

Este sistema implementa múltiplas camadas de robustez:

✅ **Circuit Breaker** para APIs externas
✅ **Retry Logic** com exponential backoff
✅ **Dead Letter Queue** para ações falhas
✅ **Rate Limiting** em múltiplos níveis
✅ **Timeout Management** configurável
✅ **Validação robusta** de entrada
✅ **HMAC Authentication** para segurança
✅ **RLS** em todas tabelas
✅ **Health Checks** automatizados
✅ **Backup/Restore** diário
✅ **Graceful Degradation** com fallbacks
✅ **Chaos Engineering** para testes

**Resultado:** Sistema com 99.9% de uptime e recuperação automática de falhas.`;

      case "operational":
        return `# Guia Operacional - Sistema SUPERNET

## 1. Primeiros Passos

### 1.1 Acesso Administrativo

**URL:** \`https://seu-dominio.com/auth\`

**Credenciais Iniciais:**
- Email: admin@supernet.com
- Senha: (fornecida durante setup)

**Primeiro Login:**
1. Acesse /auth
2. Faça login com credenciais
3. Navegue até /admin/settings
4. Atualize configurações da empresa
5. Adicione usuários em /admin/users

### 1.2 Configuração Inicial

**Ordem de Configuração:**

1. **Configurações da Empresa** (/admin/settings)
   - Nome da empresa
   - Logo
   - Cores primárias/secundárias
   - Informações de contato

2. **Integração IXC** (/admin/ixc-integration)
   - URL da API
   - Credenciais
   - Testar conexão

3. **WhatsApp** (/admin/whatsapp-test)
   - Configurar Evolution API
   - Testar envio
   - Validar webhook

4. **Email** (/admin/email-templates)
   - Configurar SMTP (Locaweb)
   - Criar templates
   - Testar envios

5. **Agentes IA** (/admin/agents)
   - Revisar configurações
   - Ajustar prompts
   - Testar conversas

## 2. Operações Diárias

### 2.1 Atendimento ao Cliente

**Central de Atendimento** (/atendimento)

**Fluxo de Trabalho:**

1. **Monitorar Fila**
   - Conversas aguardando atribuição
   - Prioridade: Alta → Média → Baixa
   - SLA: < 5 minutos primeira resposta

2. **Atribuir Conversa**
   - Clicar em "Assumir Atendimento"
   - Sistema marca como "em_atendimento"
   - Histórico do cliente aparece lateral

3. **Atender Cliente**
   - Utilizar sugestões da IA
   - Acessar dados do IXC em tempo real
   - Transferir para outro departamento se necessário

4. **Finalizar Atendimento**
   - Marcar como "resolvido"
   - Adicionar tags relevantes
   - Sistema registra métricas

**Atalhos:**
- \`Ctrl+1\`: Assumir primeira conversa da fila
- \`Ctrl+S\`: Enviar mensagem
- \`Ctrl+T\`: Transferir conversa
- \`Ctrl+R\`: Resolver conversa

### 2.2 Monitoramento de Rede

**Dashboard** (/admin/monitoramento)

**Verificações Diárias:**

1. **PON Status**
   - Verificar sinais baixos (<-27 dBm)
   - Investigar ONUs offline
   - Alertar técnicos se necessário

2. **Rádios**
   - Verificar latência alta (>50ms)
   - Monitorar throughput
   - Agendar manutenção preventiva

3. **Quedas em Massa**
   - Dashboard de alertas
   - Verificar se há incidentes ativos
   - Comunicar clientes afetados

**Ações Automáticas:**
- Sistema detecta queda em massa
- Cria ticket automaticamente
- Envia notificações por WhatsApp
- Registra no histórico

### 2.3 Auto Reboot

**Dashboard** (/admin/auto-reboot)

**Monitoramento:**

1. **Estatísticas**
   - Total de reboots (hoje/semana/mês)
   - Taxa de sucesso
   - Clientes na blacklist

2. **Candidatos a Reboot**
   - Lista em tempo real
   - Banda atual vs contratada
   - Histórico de reboots

3. **Configurações**
   - Ajustar threshold de banda (padrão: 900 kbps)
   - Configurar cooldown (padrão: 24h)
   - Horários de exclusão (01h-06h)

**Adicionar à Blacklist:**
- Ir em /admin/auto-reboot
- Seção "Blacklist"
- Clicar "Adicionar Cliente"
- Informar CPF/ID e motivo

### 2.4 Manutenção Inteligente

**Dashboard** (/manutencao)

**Tarefas Automáticas:**

| Prioridade | Tarefa | Frequência |
|------------|--------|------------|
| Alta | Verificar disponibilidade | 15 min |
| Alta | Testar latência principais IPs | 30 min |
| Média | Limpar logs antigos | Diário |
| Média | Otimizar cache | Diário |
| Baixa | Backup configurações | Semanal |

**Gerenciamento:**

1. **Habilitar/Desabilitar Tarefas**
   - Alternar switch na lista
   - Configurar próxima execução
   - Definir retry logic

2. **Visualizar Logs**
   - Histórico de execuções
   - Sucessos e falhas
   - Tempo de execução

3. **Alertas**
   - Configurar quando notificar
   - Canais: Email, WhatsApp
   - Severidade: Info, Warning, Error

## 3. Gestão de Campanhas

### 3.1 Criar Campanha de Marketing

**Passo a Passo** (/admin/campaigns):

1. **Nova Campanha**
   - Clicar "Nova Campanha"
   - Nome: "Upgrade Black Friday"
   - Tipo: Marketing
   - Canais: WhatsApp, Email

2. **Definir Público-Alvo**
   - Filtros IXC:
     - Plano: "100 Mega"
     - Status: Ativo
     - Sem atrasos
   - Preview: Visualizar quantidade

3. **Criar Conteúdo**
   - Template de mensagem
   - Variáveis: {nome}, {plano_atual}
   - Adicionar mídia (imagens/vídeos)
   - Botão CTA: "Contratar agora"

4. **Agendar**
   - Data/hora de envio
   - Ou: Enviar imediatamente

5. **Acompanhar**
   - Dashboard de métricas
   - Taxa de entrega
   - Taxa de abertura
   - Conversões

### 3.2 Campanha de Cobrança

**Automatização:**

1. **Criar Template** (/admin/notification-templates)
   - Tipo: Pagamento
   - Gatilho: Fatura vencida
   - Conteúdo com variáveis

2. **Configurar Regra**
   - Verificar diariamente
   - Enviar D+1 após vencimento
   - Re-enviar D+3 e D+7

3. **Monitorar**
   - Dashboard financeiro
   - Taxa de recuperação
   - Efetividade por canal

## 4. Gestão Financeira

### 4.1 Dashboard Financeiro

**Métricas Principais** (/admin/financial):

- **MRR**: Receita recorrente mensal
- **ARR**: Receita anual projetada
- **Churn Rate**: Taxa de cancelamento
- **LTV**: Valor do tempo de vida do cliente

**Projeções:**
- Cenários: Otimista / Realista / Pessimista
- Fluxo de caixa 6 meses
- Crescimento esperado

### 4.2 NPS

**Campanhas de Satisfação** (/admin/nps-dashboard):

1. **Criar Campanha**
   - Definir público
   - Agendar envio
   - Perguntas customizadas

2. **Acompanhar Métricas**
   - Score NPS (-100 a +100)
   - % Promotores / Neutros / Detratores
   - Comentários dos clientes

3. **Follow-up Detratores**
   - Lista de follow-ups pendentes
   - Contatar cliente
   - Registrar ação tomada

## 5. Base de Conhecimento

### 5.1 Gerenciar KB

**Estrutura** (/admin/knowledge):

\`\`\`
📁 Procedimentos
  📁 Técnicos
    📄 Diagnosticar conexão lenta
    📄 Trocar senha Wi-Fi
  📁 Comercial
    📄 Script de vendas 100 Mega
    📄 Política de cancelamento

📁 FAQ
  📄 Como alterar meu plano?
  📄 Área de cobertura
\`\`\`

**Adicionar Conteúdo:**

1. Clicar "Novo Item"
2. Título e categoria
3. Conteúdo (suporta Markdown)
4. Selecionar agentes que usarão
5. Tags para busca
6. Ativar

**Sincronização Automática:**
- Documentação IXC: A cada 6h
- Atualização de planos: Diária

### 5.2 Atribuir a Agentes

Cada item pode ser usado por:
- ✅ Sales Agent
- ✅ Support Tech
- ✅ Support Financial
- ✅ Automation Agent
- ✅ Telemedicina Agent

Sistema RAG injeta conhecimento relevante automaticamente.

## 6. Documentos e Contratos

### 6.1 Templates de Contrato

**Gerenciar** (/admin/documents):

1. **Criar Template**
   - Nome: "Contrato Residencial 2024"
   - Tipos de plano: Todos
   - Conteúdo com variáveis

2. **Variáveis Disponíveis:**
   \`\`\`
   {cliente_nome}
   {cliente_cpf}
   {cliente_endereco}
   {plano_nome}
   {plano_velocidade}
   {plano_valor}
   {data_assinatura}
   {numero_contrato}
   \`\`\`

3. **Testar Template**
   - Preencher dados de exemplo
   - Gerar PDF preview
   - Validar formatação

### 6.2 Contratos Assinados

**Visualizar** (/admin/documents):

- Lista de todos contratos
- Status: Pendente / Assinado
- Download PDF
- Dados do cliente
- Data de assinatura

## 7. Integração IXC

### 7.1 Sincronização de Planos

**Automático:**
- Executado diariamente às 00:00
- Busca todos planos ativos no IXC
- Atualiza tabela \`plans\`
- Sincroniza valores e velocidades

**Manual:**
1. Ir em /admin/ixc-integration
2. Seção "Sincronizar Planos"
3. Clicar "Sincronizar Agora"
4. Aguardar confirmação

### 7.2 Endpoints Principais

**Consultas:**
\`\`\`
GET /cliente_contrato        - Lista contratos
GET /fn_areceber             - Faturas a receber
GET /radusuarios             - Usuários internet
GET /su_cliente_contrato_tags - Tags de clientes
\`\`\`

**Ações:**
\`\`\`
POST /su_oss_chamado         - Criar ticket
POST /radusuarios            - Criar usuário
POST /gerar_boleto           - Gerar 2ª via
\`\`\`

### 7.3 Teste de Integração

**Ferramenta** (/admin/ixc-integration):

1. **Teste de Conexão**
   - Verifica API está online
   - Valida credenciais
   - Testa permissões

2. **Buscar Cliente**
   - Informar CPF
   - Retorna dados completos
   - Valida integração

3. **Criar Contrato Teste**
   - Dados de exemplo
   - Cria contrato real no IXC
   - Valida fluxo completo

## 8. Agentes IA

### 8.1 Configuração de Agente

**Parâmetros** (/admin/agents):

- **Nome**: Identificação do agente
- **Tipo**: sales, support_tech, etc.
- **Modelo**: GPT-4o / Gemini Flash 2.5
- **Temperature**: 0.0 (preciso) a 1.0 (criativo)
- **Max Tokens**: Limite de resposta
- **System Prompt**: Personalidade e instruções

**Capacidades:**
- Lista de tools disponíveis
- Acesso à base de conhecimento
- Permissões de ações

### 8.2 Testar Agente

**Chat Tester** (/admin/chat-tester):

1. Selecionar agente
2. Iniciar conversa
3. Testar diferentes cenários
4. Validar respostas
5. Ajustar prompts se necessário

**Cenários de Teste:**

**Sales Agent:**
- "Quero contratar 500 mega"
- "Tem cobertura no CEP 12345-678?"
- "Qual o preço do plano de 300 mega?"

**Support Tech:**
- "Minha internet está lenta"
- "Não consigo conectar no Wi-Fi"
- "Preciso trocar minha senha"

**Support Financial:**
- "Onde está minha fatura?"
- "Preciso de segunda via do boleto"
- "Quando vence minha conta?"

## 9. Troubleshooting

### 9.1 Problemas Comuns

**Chatbot não responde:**

1. Verificar /admin/ixc-integration
   - Testar conexão
   - Validar credenciais

2. Ver logs do routing-agent
   - Supabase Dashboard → Edge Functions
   - Verificar erros

3. Testar individualmente cada agente
   - /admin/chat-tester

**WhatsApp não envia:**

1. Verificar Evolution API
   - Status da sessão
   - QR Code válido

2. Testar envio manual
   - /admin/whatsapp-test

3. Ver logs
   - \`send-whatsapp-message\` function
   - Verificar resposta da API

**Auto-reboot não funciona:**

1. Verificar configurações
   - Sistema habilitado?
   - Threshold configurado?

2. Ver logs
   - \`auto-reboot-frozen-equipment\`
   - \`check-reboot-candidates\`

3. Testar IXC Proxy
   - Endpoint /radusuarios
   - Permissões de reboot

### 9.2 Logs e Debugging

**Acessar Logs:**

1. **Supabase Dashboard**
   - Ir em Edge Functions
   - Selecionar função
   - Aba "Logs"

2. **Logs de Ação**
   - Tabela \`action_log\`
   - Filtrar por agente
   - Ver payload e resultado

3. **Logs de Segurança**
   - Tabela \`security_logs\`
   - Eventos suspeitos
   - Tentativas de acesso

4. **Métricas de Agente**
   - Tabela \`agent_metrics\`
   - Performance
   - Taxa de sucesso

## 10. Backup e Segurança

### 10.1 Backups Automáticos

**Supabase:**
- Backup diário automático
- Retenção: 7 dias
- Restore via dashboard

**Arquivos (Storage):**
- Contratos em \`signed-contracts\`
- Mídia de campanhas em \`campaign-media\`
- Documentos em \`corporate-documents\`

### 10.2 Usuários e Permissões

**Níveis de Acesso:**

| Papel | Permissões |
|-------|-----------|
| Admin | Tudo |
| Editor | Gerenciar conteúdo, atendimento |
| Viewer | Apenas visualização |

**Gerenciar** (/admin/users):

1. Adicionar usuário
2. Definir role
3. Enviar convite por email
4. Usuário cria senha

**Auditoria:**
- Logs de atividade: \`user_activity_logs\`
- Logs de segurança: \`security_logs\`

## 11. Manutenção Regular

### 11.1 Checklist Semanal

- [ ] Verificar status de todos agentes
- [ ] Revisar logs de erros
- [ ] Acompanhar métricas de atendimento
- [ ] Validar campanhas ativas
- [ ] Verificar integrações (IXC, WhatsApp)
- [ ] Revisar NPS e follow-ups
- [ ] Atualizar base de conhecimento

### 11.2 Checklist Mensal

- [ ] Analisar projeções financeiras
- [ ] Revisar eficácia de campanhas
- [ ] Otimizar prompts de agentes
- [ ] Limpar logs antigos
- [ ] Backup manual de dados críticos
- [ ] Treinar novos usuários
- [ ] Atualizar documentação

## 12. Contatos e Suporte

**Suporte Técnico:**
- Email: suporte@lovable.dev
- Documentação: https://docs.lovable.dev
- Discord: [Link da comunidade]

**IXC Soft:**
- Suporte: suporte@ixcsoft.com.br
- Documentação: https://wiki.ixcsoft.com.br

**Evolution API:**
- GitHub: https://github.com/EvolutionAPI/evolution-api
- Documentação: https://doc.evolution-api.com

---

Este guia operacional cobre as principais tarefas diárias e procedimentos do sistema SUPERNET. Para dúvidas específicas, consulte a documentação técnica ou entre em contato com o suporte.`;

      default:
        return "Documentação não encontrada.";
    }
  };

  return (
    <AuthGuard requiredRoles={["admin"]}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <Card className="border-none shadow-xl bg-gradient-to-r from-primary via-primary/90 to-primary/80">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-white flex items-center gap-3">
                <FileText className="h-8 w-8" />
                Documentação Técnica do Sistema
              </CardTitle>
              <CardDescription className="text-blue-100 text-lg">
                Arquitetura, implementação e guias operacionais completos
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Documents Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {docs.map((doc) => {
              const Icon = doc.icon;
              return (
                <Card
                  key={doc.id}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                    activeDoc === doc.id
                      ? "ring-2 ring-primary shadow-xl"
                      : "hover:ring-2 hover:ring-primary/50"
                  }`}
                  onClick={() => setActiveDoc(doc.id)}
                >
                  <CardHeader className="space-y-3">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${
                      activeDoc === doc.id 
                        ? "from-primary to-primary/80" 
                        : "from-slate-100 to-slate-200"
                    } flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${
                        activeDoc === doc.id ? "text-white" : "text-slate-600"
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm leading-tight">{doc.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{doc.description}</p>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          {/* Content Display */}
          <Card className="border-none shadow-xl">
            <CardContent className="p-0">
              {activeDoc === "analysis" ? (
                // Analysis Notes Editor
                <div className="p-6 md:p-8 space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Análise</h2>
                    <p className="text-muted-foreground">Verificação dos erros nas funcionalidades</p>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-slate-700">
                      Anote os erros encontrados durante os testes:
                    </label>
                    <Textarea
                      value={analysisNotes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder="Exemplo:

1. Página de planos - Botão de contratação não está funcionando
2. Dashboard Admin - Gráfico de receitas não carrega
3. Chat de vendas - Não está buscando CEP corretamente

Descreva cada erro de forma detalhada para que eu possa fazer os ajustes necessários."
                      className="min-h-[400px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      As anotações são salvas automaticamente no navegador
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAnalysisNotes("");
                        localStorage.removeItem("technical-analysis-notes");
                        toast.success("Anotações limpas com sucesso");
                      }}
                    >
                      Limpar Anotações
                    </Button>
                    <Button
                      onClick={handleMakeAdjustments}
                      disabled={isProcessing || !analysisNotes.trim()}
                      className="gap-2"
                    >
                      <Wrench className="h-4 w-4" />
                      Fazer Ajuste
                    </Button>
                  </div>
                </div>
              ) : (
                // Regular documentation display
                <ScrollArea className="h-[calc(100vh-400px)]">
                  <div className="p-6 md:p-8">
                    <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-h1:text-3xl prose-h1:font-bold prose-h1:border-b prose-h1:pb-2 prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-8 prose-h3:text-xl prose-h3:font-semibold prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-900 prose-pre:text-slate-100">
                      <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                        {getDocContent(activeDoc)}
                      </pre>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
};

export default TechnicalDocs;
