# 🤝 Guia de Contribuição - Agentes

Como adicionar ou modificar agentes no sistema multiagente da SUPERNET FIBRA.

## 📋 Índice

1. [Antes de Começar](#antes-de-começar)
2. [Criando um Novo Agente](#criando-um-novo-agente)
3. [Modificando um Agente Existente](#modificando-um-agente-existente)
4. [Estrutura de Arquivos](#estrutura-de-arquivos)
5. [Boas Práticas](#boas-práticas)
6. [Testes](#testes)
7. [Deployment](#deployment)

---

## 🔒 REGRAS OBRIGATÓRIAS PARA NOVOS AGENTES

**CRITICAL**: Todo novo agente DEVE seguir estas regras para manter consistência e qualidade:

### 1. Estrutura de Arquivos (OBRIGATÓRIO)

```
supabase/functions/[agent-name]/
├── index.ts          # Entry point principal
├── prompts.ts        # System prompts e mensagens
├── config.ts         # Configurações e constantes
└── README.md         # Documentação específica do agente
```

### 2. Arquivo prompts.ts (TEMPLATE OBRIGATÓRIO)

```typescript
/**
 * [Agent Name] - System Prompts & Instructions
 */

export const [AGENT]_SYSTEM_PROMPT = `Você é o Agente de [Função] da SUPERNET FIBRA...

## 🎯 OBJETIVO PRINCIPAL
[Descrever objetivo claro e mensurável]

## 🤝 PERSONALIDADE
- [Traço 1]
- [Traço 2]
- [Traço 3]

## 📋 FLUXO DE ATENDIMENTO OBRIGATÓRIO
[Passo a passo detalhado]

## 🛠️ FERRAMENTAS DISPONÍVEIS
[Lista de tools com quando usar]

## 💬 TRATAMENTO DE SITUAÇÕES
[Casos comuns e como lidar]

## ⚠️ REGRAS CRÍTICAS
1. **SEMPRE** [regra]
2. **NUNCA** [anti-padrão]

## 🚨 SITUAÇÕES DE ESCALAÇÃO
[Quando e para quem escalar]

## 📊 METAS
[KPIs esperados]
`;

export const [AGENT]_WELCOME_MESSAGE = `[Mensagem inicial acolhedora]`;

export const [AGENT]_ERROR_MESSAGE = `[Mensagem de erro amigável]`;
```

### 3. Arquivo config.ts (TEMPLATE OBRIGATÓRIO)

```typescript
/**
 * [Agent Name] - Configuration
 */

export const [AGENT]_CONFIG = {
  // Model settings (OBRIGATÓRIO)
  model: "gpt-4o-mini", // Default, ajustar se necessário
  temperature: 0.7, // 0.3-0.9 conforme necessidade
  maxTokens: 2000, // Ajustar conforme complexidade
  
  // Agent behavior (OBRIGATÓRIO)
  maxMessagesInContext: 10, // Quantidade de mensagens no histórico
  enableToolCalling: true, // false apenas se não usar tools
  
  // Available tools (OBRIGATÓRIO se enableToolCalling = true)
  allowedTools: [
    "tool_name_1",
    "tool_name_2",
  ],
  
  // Business rules (ESPECÍFICO DO AGENTE)
  [regrasDeNegocio]: { ... },
  
  // Timeouts (OBRIGATÓRIO)
  responseTimeout: 30000, // 30s padrão
  toolTimeout: 10000, // 10s padrão
};
```

### 4. Características Funcionais Obrigatórias

Todo agente DEVE implementar:

✅ **CORS handling** completo
✅ **Error handling** robusto (429, 402, 500, etc.)
✅ **Logging** estruturado (console.log/error com contexto)
✅ **Rate limiting** awareness (tratar erro 429)
✅ **Timeout** configuration
✅ **Validation** de input
✅ **Graceful degradation** (fallbacks)
✅ **Security** (sanitização, não expor secrets)

### 5. Checklist de Qualidade (VALIDAR ANTES DE MERGE)

- [ ] Arquivos `prompts.ts`, `config.ts`, `index.ts` criados
- [ ] System prompt segue template obrigatório com todas as seções
- [ ] Config tem todos os campos obrigatórios
- [ ] CORS headers presentes no index.ts
- [ ] Error handling completo (429, 402, 500)
- [ ] Logging adequado (info + error)
- [ ] Documentação atualizada (`agent-tools-matrix.md`)
- [ ] Testado manualmente no Supabase Functions UI
- [ ] Logs verificados (sem erros críticos)
- [ ] Rate limiting considerado

### 6. Anti-Padrões (NUNCA FAZER)

❌ **Hardcoded prompts** no index.ts
❌ **Magic numbers** (usar config.ts)
❌ **Falta de error handling**
❌ **Logs insuficientes**
❌ **Ignorar CORS**
❌ **Expor secrets** no código
❌ **Misturar responsabilidades** (lógica de negócio no index.ts)
❌ **Não documentar** tools e behavior

### 7. Exemplos de Referência

Para criar um novo agente, use como base:
- **Vendas**: `sales-agent/` (completo, com tools)
- **Roteamento**: `routing-agent/` (simples, sem tools)
- **Técnico**: `support-tech-agent/` (troubleshooting complexo)
- **Financeiro**: `support-financial-agent/` (regras de negócio)
- **Automação**: `automacao-agent/` (catálogo de produtos)
- **Telemedicina**: `telemedicina-agent/` (agendamentos)

---

## 🎯 Antes de Começar

### Pré-requisitos

- [ ] Conhecimento de TypeScript
- [ ] Familiaridade com Supabase Edge Functions
- [ ] Acesso ao projeto no Supabase
- [ ] Chaves de API configuradas (se necessário)

### Leitura Obrigatória

1. `docs/multiagent-architecture.md` - Arquitetura do sistema
2. `docs/tools-reference.md` - Ferramentas disponíveis
3. `docs/agent-tools-matrix.md` - Permissões de ferramentas

---

## 🆕 Criando um Novo Agente

### Passo 1: Definir Escopo

Antes de criar um agente, responda:

1. **Qual problema específico ele resolve?**
   - Ex: "Atendimento para serviço X"
   
2. **Quais ferramentas ele precisa?**
   - Consultar `agent-tools-matrix.md`
   
3. **Como ele se integra com agentes existentes?**
   - Será roteado pelo Routing Agent?
   - Precisa comunicar com outros agentes?

4. **Qual LLM usar?**
   - `google/gemini-2.5-flash` (padrão, mais rápido e barato)
   - `google/gemini-2.5-pro` (raciocínio complexo)
   - `openai/gpt-5` (máxima capacidade)

### Passo 2: Estrutura de Diretório

Criar nova pasta em `/supabase/functions/`:

```
/supabase/functions/meu-novo-agent/
├── index.ts          # Lógica principal
├── prompts.ts        # Prompts do sistema (separado!)
├── config.ts         # Configurações (opcional)
└── README.md         # Documentação do agente
```

### Passo 3: Template Base

**Arquivo: `index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { systemPrompt } from './prompts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: string;
  content: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId, customerData } = await req.json();
    
    console.log('Meu Novo Agent - Processing request');
    
    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get agent configuration from database
    const { data: agentConfig, error: configError } = await supabase
      .from('agent_configurations')
      .select('*')
      .eq('agent_type', 'meu_novo_agent')
      .eq('is_active', true)
      .single();

    if (configError || !agentConfig) {
      console.error('Error fetching agent config:', configError);
      throw new Error('Agent configuration not found');
    }

    // Get conversation history
    let conversationHistory: Message[] = [];
    if (conversationId) {
      const { data: historyMessages } = await supabase
        .from('conversation_messages')
        .select('content, sender_type')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (historyMessages) {
        conversationHistory = historyMessages.map(msg => ({
          role: msg.sender_type === 'client' ? 'user' : 'assistant',
          content: msg.content
        }));
      }
    }

    // Build system prompt
    const prompt = systemPrompt(agentConfig, customerData);

    // Call AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: agentConfig.model,
        messages: [
          { role: 'system', content: prompt },
          ...conversationHistory,
          ...messages
        ],
        temperature: parseFloat(agentConfig.temperature),
        max_tokens: agentConfig.max_tokens,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;

    console.log('Meu Novo Agent - Response generated');

    return new Response(
      JSON.stringify({ 
        message: assistantMessage,
        agent: 'meu_novo_agent'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in meu-novo-agent:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

**Arquivo: `prompts.ts`**

```typescript
export const systemPrompt = (config: any, customerData?: any) => {
  const customerContext = customerData ? `
Cliente: ${customerData.customer_name}
CPF: ${customerData.customer_cpf}
` : '';

  return `${config.system_prompt}

${customerContext}

SUAS RESPONSABILIDADES:
1. [Definir claramente]
2. [Listar objetivos]
3. [Descrever comportamento esperado]

TOM E ESTILO:
- [Descrever personalidade]
- [Nível de formalidade]
- [Exemplos de frases]

LIMITAÇÕES:
- [O que NÃO pode fazer]
- [Quando escalonar]
`;
};
```

### Passo 4: Registrar no Banco

Inserir configuração na tabela `agent_configurations`:

```sql
INSERT INTO public.agent_configurations (
  agent_type,
  name,
  description,
  system_prompt,
  model,
  temperature,
  max_tokens,
  is_active,
  capabilities
) VALUES (
  'meu_novo_agent',
  'Meu Novo Agent',
  'Descrição do que o agente faz',
  'Prompt base do sistema (pode ser editado depois na UI)',
  'google/gemini-2.5-flash',
  0.7,
  2000,
  true,
  '["capability1", "capability2"]'::jsonb
);
```

### Passo 5: Configurar no `config.toml`

Adicionar ao `/supabase/config.toml`:

```toml
[functions.meu-novo-agent]
verify_jwt = false  # true se requer autenticação
```

### Passo 6: Atualizar Routing Agent

Se o agente deve ser acessível via roteamento automático, adicionar lógica no `routing-agent/index.ts`:

```typescript
// Na análise de intenção do LLM
const routingPrompt = `
...
- "meu_novo_agent": Para [descrever quando rotear]
...
`;
```

### Passo 7: Documentar

Criar `/supabase/functions/meu-novo-agent/README.md`:

```markdown
# Meu Novo Agent

## Descrição
[O que o agente faz]

## Responsabilidades
- [Lista de responsabilidades]

## Ferramentas Utilizadas
- [Lista de ferramentas do _shared]

## Exemplo de Uso
[Como testar o agente]

## Métricas
[Quais métricas coleta]
```

---

## ✏️ Modificando um Agente Existente

### Alterando Prompts

**❌ ERRADO** (modificar direto no index.ts):
```typescript
// NÃO FAÇA ISSO
const systemPrompt = `Você é um agente...`; // hardcoded
```

**✅ CORRETO** (editar `prompts.ts`):
```typescript
// prompts.ts
export const systemPrompt = (config, customerData) => `
${config.system_prompt}

[Suas adições aqui]
`;

// index.ts
import { systemPrompt } from './prompts.ts';
const prompt = systemPrompt(agentConfig, customerData);
```

### Adicionando Tool Calling

Se o agente precisa executar ações via tool calling:

```typescript
// Definir tools
const tools = [{
  type: "function",
  function: {
    name: "minha_funcao",
    description: "O que a função faz",
    parameters: {
      type: "object",
      properties: {
        param1: {
          type: "string",
          description: "Descrição do parâmetro"
        }
      },
      required: ["param1"]
    }
  }
}];

// Passar tools para AI
const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  body: JSON.stringify({
    // ... outros parâmetros
    tools: tools,
    tool_choice: "auto"
  })
});

// Processar tool calls
if (choice.message.tool_calls) {
  const toolCall = choice.message.tool_calls[0];
  
  if (toolCall.function.name === 'minha_funcao') {
    const args = JSON.parse(toolCall.function.arguments);
    // Executar lógica
    const result = await executarFuncao(args);
    
    // Atualizar mensagem do assistente
    assistantMessage = `Executei a ação: ${result}`;
  }
}
```

---

## 📁 Estrutura de Arquivos Recomendada

```
/supabase/functions/meu-agent/
├── index.ts                 # ✅ Lógica principal (< 500 linhas)
├── prompts.ts               # ✅ Todos os prompts do sistema
├── config.ts                # ⚠️ Opcional: configs estáticas
├── tools.ts                 # ⚠️ Opcional: definições de tools
├── handlers/                # ⚠️ Opcional: para agentes complexos
│   ├── tool-handler.ts
│   └── error-handler.ts
└── README.md                # ✅ Documentação
```

**Regras:**
- ✅ `index.ts` deve ser < 500 linhas
- ✅ Prompts sempre em arquivo separado
- ✅ Cada arquivo com responsabilidade única
- ❌ Não criar subpastas desnecessárias

---

## 🎯 Boas Práticas

### 1. Logging

```typescript
// ✅ Logs estruturados
console.log('Agent Name - Action:', { data, timestamp });

// ❌ Logs vagos
console.log('processing...');
```

### 2. Error Handling

```typescript
try {
  // lógica
} catch (error) {
  console.error('Agent Name - Specific Error:', error);
  
  // Retornar erro user-friendly
  return new Response(
    JSON.stringify({ 
      error: 'Desculpe, houve um problema. Tente novamente.' 
    }),
    {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
```

### 3. Métricas

Sempre registrar métricas de ações importantes:

```typescript
import { recordMetric } from '../_shared/metrics-helper.ts';

const startTime = Date.now();

// ... lógica

const duration = Date.now() - startTime;
await recordMetric('agent_action', {
  agent: 'meu_agent',
  action: 'processar_request',
  duration_ms: duration,
  success: true
});
```

### 4. Rate Limiting

Para agentes públicos:

```typescript
import { checkRateLimit } from '../_shared/rate-limiter.ts';

const identifier = customerData?.customer_cpf || req.headers.get('x-forwarded-for');
const rateLimitCheck = await checkRateLimit(identifier);

if (!rateLimitCheck.allowed) {
  return new Response(
    JSON.stringify({ error: 'Muitas requisições' }),
    { status: 429, headers: corsHeaders }
  );
}
```

---

## 🧪 Testes

### Teste Manual

1. Deploy do agente
2. Testar via Supabase Functions UI
3. Verificar logs
4. Testar integração com routing

### Teste Automatizado (TODO)

```typescript
// tests/meu-agent.test.ts
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test("Meu Agent - deve responder corretamente", async () => {
  const response = await fetch('http://localhost:54321/functions/v1/meu-agent', {
    method: 'POST',
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'teste' }]
    })
  });
  
  assertEquals(response.status, 200);
});
```

---

## 🚀 Deployment

### Processo de Deploy

1. **Commit das mudanças:**
```bash
git add supabase/functions/meu-agent/
git commit -m "feat: adicionar meu-agent"
```

2. **Deploy automático via Lovable:**
   - O Lovable detecta mudanças em `supabase/functions/`
   - Faz deploy automaticamente

3. **Verificar deployment:**
   - Ir para Supabase Dashboard → Functions
   - Verificar se função aparece
   - Testar endpoint

### Rollback

Se algo der errado:

1. Reverter commit
2. Lovable fará redeploy automático
3. Ou desativar temporariamente no banco:

```sql
UPDATE agent_configurations 
SET is_active = false 
WHERE agent_type = 'meu_agent';
```

---

## 📚 Recursos

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Lovable AI Gateway](https://docs.lovable.dev/features/ai)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Documentação IXC](https://wikiapiprovedor.ixcsoft.com.br/)

---

## ❓ FAQ

**P: Posso usar bibliotecas externas?**
R: Sim, mas apenas via ESM imports do deno.land ou esm.sh

**P: Como debugar um agente?**
R: Use `console.log` e veja logs em Supabase Functions → Logs

**P: Qual modelo de LLM usar?**
R: `google/gemini-2.5-flash` para 95% dos casos

**P: Preciso de permissão para criar um agente?**
R: Sim, discutir com o time primeiro para evitar duplicação

---

**Última atualização:** Outubro 2025
**Mantenedor:** Equipe Técnica SUPERNET FIBRA
