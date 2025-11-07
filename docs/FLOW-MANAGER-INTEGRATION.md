# Flow Manager - Integração com Support-Tech-Agent

## ✅ O que foi implementado

### 1. Novos Módulos (_shared)

#### `flow-manager.ts`
Sistema central de gerenciamento de flows baseado em banco de dados:
- ✅ `getFlowSteps()` - Busca steps ativos de um subject
- ✅ `getFlowSubject()` - Busca configuração do subject
- ✅ `getFlowStepByKey()` - Busca step específico
- ✅ `getNextStep()` - Determina próximo step baseado em resposta
- ✅ `buildStepPrompt()` - Monta prompt com instruction + question
- ✅ `validateUserResponse()` - Valida resposta contra response_options
- ✅ `getInitialStep()` - Busca step inicial do subject
- ✅ `resolveStepTools()` - Resolve tools (step_tools ou default_tools)

#### `flow-executor.ts`
Executor de steps usando interpretação híbrida:
- ✅ `executeFlowStep()` - Executa step completo
- ✅ `processUserResponse()` - Processa resposta e determina ação

#### `flow-adapter.ts`
Adaptador para migração gradual:
- ✅ `getStepMessage()` - Busca do banco com fallback hardcoded
- ✅ `getScenarioConfig()` - Busca configuração completa de cenário
- ✅ `SCENARIO_MAPPING` - Mapeamento de flowStates para subjects/steps

### 2. Integração no Support-Tech-Agent

#### Mudanças Aplicadas:
- ✅ **Linha 1-22**: Importação do flow-adapter
- ✅ **Linha 1304-1312**: Cenário A - Mensagem inicial usando banco
- ✅ **Linha 1323-1325**: Cenário B - Mensagem usando banco

#### Funcionalidades Mantidas:
- ✅ **Detecção de frustração** (intacta)
- ✅ **Interpretação híbrida** (intacta)
- ✅ **Fast-path** (intacta)
- ✅ **Mass outage detection** (intacta)
- ✅ **Circuit breaker** (intacto)
- ✅ **Timeout protocol** (intacto)
- ✅ **Tool execution** (intacto)

## 🎯 Como Funciona Agora

### Fluxo de Mensagens:

```
1. Support-tech-agent precisa de mensagem
   ↓
2. Chama getStepMessage()
   ↓
3. Flow-adapter busca no banco (agent_flow_steps)
   ↓
4. Se encontrar → usa mensagem do banco ✅
   ↓
5. Se não encontrar → usa fallback hardcoded ⚠️
```

### Exemplo de Uso:

```typescript
// ANTES (hardcoded):
const message = `Olá ${customerName}! Detectei sinal zerado...`;

// AGORA (banco com fallback):
const message = await getStepMessage(
  supabase,
  'support-tech-agent',
  'cenario_a_verificar_luzes',
  `Olá ${customerName}! Detectei sinal zerado...`, // fallback
  { customer_name: customerName }
);
```

## 📋 Status Atual

### ✅ Funcionando:
1. **Sistema de flows** - Totalmente implementado
2. **Adaptador** - Integrado e funcional
3. **Cenário A (início)** - Usando banco de dados
4. **Cenário B (início)** - Usando banco de dados
5. **Fallback seguro** - Se banco falhar, usa hardcoded
6. **Logs detalhados** - Identifica quando usa banco vs hardcoded

### ⏳ Próximos Passos (Opcional):

1. **Substituir mais mensagens**:
   - Cenário A (steps restantes)
   - Cenário C (sinal fraco)
   - Cenário D (sinal crítico)
   - Cenário E (WAN/Wi-Fi)

2. **Integrar flow-executor**:
   - Usar `executeFlowStep()` para processar respostas
   - Eliminar lógica hardcoded de detecção de respostas
   - Usar `getNextStep()` dinamicamente

3. **Popular approved_messages**:
   - Migrar exemplos aprovados para o banco
   - Usar em treinamento de AI

## 🔍 Como Verificar se Está Funcionando

### 1. Logs do Edge Function:

```
✅ FLOW-MANAGER: Usando mensagem do banco para cenario_a_verificar_luzes
```

Ou:

```
⚠️ Usando fallback hardcoded para cenario_a_verificar_luzes
```

### 2. Testar Mudanças:

1. Acesse `/admin/fluxo-luan`
2. Edite a pergunta de "cenario_a_verificar_luzes"
3. Inicie novo atendimento
4. Verifique se usa a nova mensagem

### 3. Verificar no Banco:

```sql
SELECT step_key, question, instruction 
FROM agent_flow_steps 
WHERE agent_type = 'support-tech-agent' 
  AND subject_key = 'energia'
  AND step_key = 'cenario_a_verificar_luzes';
```

## 🎨 Exemplos de Edição

### Via Interface (`/admin/fluxo-luan`):

1. Selecione "support-tech-agent"
2. Escolha subject "Energia"
3. Edite step "cenario_a_verificar_luzes"
4. Modifique "question" e "instruction"
5. Salve

### Via SQL (direto no banco):

```sql
UPDATE agent_flow_steps
SET 
  question = 'Nova pergunta aqui',
  instruction = 'Nova instrução aqui'
WHERE agent_type = 'support-tech-agent'
  AND subject_key = 'energia'
  AND step_key = 'cenario_a_verificar_luzes';
```

## 🚀 Vantagens do Novo Sistema

### ✅ Configurável:
- Editar fluxos sem mexer no código
- Mudanças instantâneas (sem redeploy)

### ✅ Escalável:
- Adicionar novos cenários facilmente
- Criar variações de mensagens

### ✅ Testável:
- Testar diferentes abordagens rapidamente
- A/B testing de mensagens

### ✅ Auditável:
- Histórico de mudanças no banco
- Rastreabilidade completa

### ✅ Seguro:
- Fallback automático se banco falhar
- Não quebra funcionamento existente

## 📚 Documentação Relacionada

- `/admin/fluxo-luan` - Interface de gerenciamento
- `docs/knowledge-base/data-sources/sistema/configuracao-tools-agentes.md` - Doc de tools
- `agent_flow_steps` - Tabela de steps
- `agent_flow_subjects` - Tabela de subjects
- `agent_flow_scenario_approvals` - Tabela de aprovações

## 🎯 Resultado Final

O sistema agora **usa configurações do banco** quando disponíveis, mas **mantém compatibilidade total** com o código existente. É uma **migração gradual e segura** que permite **controle total pelo admin**.

### Status: ✅ Implementado e Funcionando

### Impacto: 🟢 Zero (se banco vazio, usa fallback)

### Próximo Passo: 📝 Substituir mais mensagens conforme necessário
