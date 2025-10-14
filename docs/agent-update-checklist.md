# 📋 Checklist de Atualização de Agentes

## Quando Criar ou Modificar um Agente

### 1. **Documentação de Personalidade** 
📄 `docs/agent-personality-guide.md`

**Atualizar quando:**
- Criar novo agente de atendimento
- Mudar tom de comunicação
- Alterar fluxo de apresentação
- Modificar exemplos de mensagens

**O que incluir:**
- ✅ Nome e cargo do agente
- ✅ Personalidade e tom
- ✅ Como se apresentar (exemplos ✅ e ❌)
- ✅ Estilo de comunicação
- ✅ Fluxo de atendimento
- ✅ Exemplos de mensagens completas

**NÃO incluir:**
- ❌ Sistemas automatizados (Atlas, auto-reboot, etc.)
- ❌ Agentes que não conversam com clientes

---

### 2. **Configuração do Banco de Dados**
🗄️ Tabela `agent_configurations` no Supabase

**Atualizar quando:**
- Criar novo agente
- Mudar modelo de IA
- Alterar capacidades (capabilities)
- Modificar system prompt principal

**Como atualizar:**
```sql
INSERT INTO agent_configurations (
  agent_type,
  name,
  description,
  system_prompt,
  model,
  capabilities,
  temperature,
  max_tokens,
  is_active
) VALUES (
  'logistics',
  'Érik Souza - Coordenador de Logística',
  'Agente especializado em agendamento de instalações',
  'Você é Érik Souza...',
  'google/gemini-2.5-flash',
  '["schedule_installation", "reschedule_visit"]'::jsonb,
  0.7,
  2000,
  true
);
```

---

### 3. **Interface de Gerenciamento**
🖥️ `src/components/AgentManagement.tsx`

**Atualizar quando:**
- Adicionar novo agente visível no admin
- Mudar ícone ou cor do card
- Adicionar métricas específicas

**O que fazer:**
```typescript
// Adicionar no array AGENT_TYPES
{ value: 'logistics', label: 'Logística' }

// Adicionar card no render
{agentStats.logistics && (
  <Card className="gradient-border">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Wrench className="w-5 h-5" />
        Logística - Érik Souza
      </CardTitle>
      <CardDescription>
        Agendamento de instalações
      </CardDescription>
    </CardHeader>
    {/* ... restante do card ... */}
  </Card>
)}
```

---

### 4. **Prompts da Edge Function**
📝 `supabase/functions/{agent-name}/prompts.ts`

**Atualizar quando:**
- Modificar comportamento específico do agente
- Adicionar novos cenários
- Ajustar tom ou estilo de resposta

**Estrutura:**
```typescript
export const AGENT_PROMPTS = {
  MAIN_SYSTEM_PROMPT: `
    Você é [Nome], [cargo] da SUPERNET FIBRA.
    
    ## PERSONALIDADE
    - Tom: [descrição]
    - Objetivo: [descrição]
    
    ## REGRAS CRÍTICAS
    1. ...
  `,
  
  SCENARIOS: {
    scenario_name: `...`
  }
};
```

---

### 5. **Configuração da Edge Function**
⚙️ `supabase/functions/{agent-name}/config.ts`

**Atualizar quando:**
- Mudar parâmetros de IA
- Ajustar timeouts
- Modificar configurações técnicas

---

### 6. **Roteamento (Cloé)**
🔀 `supabase/functions/routing-agent/prompts.ts`

**Atualizar quando:**
- Adicionar novo agente no fluxo
- Mudar critérios de transferência
- Adicionar novos "gatilhos" de intenção

**O que fazer:**
```typescript
// Adicionar nas intenções identificadas
LOGÍSTICA: instalação, agendar, reagendar, técnico

// Adicionar na lista de agentes
- Érik (Logística): Agendamento de instalações

// Adicionar exemplos de roteamento
Frase: "quero agendar instalação"
→ Agent: logistics
→ Reason: Cliente quer agendar instalação
```

---

### 7. **Lógica de Roteamento**
🔀 `supabase/functions/routing-agent/index.ts`

**Atualizar quando:**
- Adicionar novo agente ao fluxo
- Implementar lógica de transferência
- Adicionar validações específicas

**O que fazer:**
```typescript
// 1. Adicionar no needsCPF se necessário
const needsCPF = decision.agent === 'support_financial' || 
                 decision.agent === 'support_tech' ||
                 decision.agent === 'logistics';

// 2. Adicionar mensagem de transferência
if (decision.agent === 'logistics') {
  transferMessage = `Perfeito! Transferindo você para o Érik Souza, da Logística...`;
}

// 3. Adicionar bloco de invoke
if (decision.agent === 'logistics' && conversation?.customer_cpf) {
  const { data: logisticsData, error: logisticsError } = await supabase.functions.invoke(
    'logistics-agent',
    {
      body: {
        conversationId,
        customerName: conversation.customer_name,
        customerCPF: conversation.customer_cpf,
        customerPhone: conversation.customer_phone,
        messageHistory: previousMessages,
        currentMessage: messageText
      }
    }
  );
  // ... tratamento de erro e inserção de mensagem
}
```

---

## 🎯 Checklist Rápido

Ao criar/modificar um agente, verificar:

- [ ] Documentação de personalidade atualizada (`agent-personality-guide.md`)
- [ ] Registro no banco de dados (`agent_configurations`)
- [ ] Card visível no Admin (`AgentManagement.tsx`)
- [ ] Prompts específicos criados/atualizados (`{agent}/prompts.ts`)
- [ ] Configuração técnica (`{agent}/config.ts`)
- [ ] Intenções no roteamento (`routing-agent/prompts.ts`)
- [ ] Lógica de transferência (`routing-agent/index.ts`)
- [ ] Edge function criada (`supabase/functions/{agent}/index.ts`)
- [ ] Testes realizados

---

## 📚 Documentação Relacionada

- `docs/agent-personality-guide.md` - Guia completo de personalidade
- `docs/multiagent-architecture.md` - Arquitetura do sistema
- `docs/tools-reference.md` - Ferramentas disponíveis

---

**Última atualização:** Janeiro 2025
