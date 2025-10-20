# Configuração de Tools nos Agentes

## Visão Geral

O sistema permite configurar tools (ferramentas/ações) que os agentes podem executar de forma **dinâmica via banco de dados**, sem necessidade de modificar código.

## Estrutura no Banco de Dados

### Tabela: `agent_flow_subjects`

Configurações **padrão** aplicadas a todos os steps de um subject:

```sql
-- Campos adicionados
default_tools jsonb DEFAULT '[]'::jsonb  -- Tools padrão para o subject
default_media jsonb DEFAULT '[]'::jsonb  -- Mídias padrão para o subject
```

**Exemplo:**
```json
{
  "subject_key": "ENERGIA",
  "agent_type": "support-tech-agent",
  "default_tools": ["test-equipment-connectivity", "criar_atendimento_ixc"],
  "default_media": []
}
```

### Tabela: `agent_flow_steps`

Configurações **específicas** por step (sobrescrevem o padrão se definidas):

```sql
-- Campos adicionados
step_tools jsonb DEFAULT NULL  -- Tools específicas deste step
step_media jsonb DEFAULT NULL  -- Mídias específicas deste step
```

**Exemplo:**
```json
{
  "step_key": "ENERGIA_VERIFICAR_EQUIPAMENTO",
  "subject_key": "ENERGIA",
  "step_tools": ["test-equipment-connectivity"],  // Usa apenas teste
  "step_media": ["video_tutorial_luzes"]
}
```

## Hierarquia de Configuração

```
┌─────────────────────────────┐
│ 1. step_tools (específico)  │  ← Prioridade ALTA
├─────────────────────────────┤
│ 2. default_tools (subject)  │  ← Prioridade MÉDIA
├─────────────────────────────┤
│ 3. Sem tools configuradas   │  ← Prioridade BAIXA
└─────────────────────────────┘
```

### Lógica de Resolução

```typescript
// Buscar configuração do step atual
const stepConfig = await getStepConfig(stepKey);
const subjectConfig = await getSubjectConfig(subjectKey);

// Resolver tools (específico sobrescreve padrão)
const tools = stepConfig.step_tools 
  || subjectConfig.default_tools 
  || [];

// Resolver media (específico sobrescreve padrão)
const media = stepConfig.step_media 
  || subjectConfig.default_media 
  || [];
```

## Tools Disponíveis por Agente

### Support-Tech-Agent (Luan)

**Tools técnicas:**
- `test-equipment-connectivity` - Testa conectividade do equipamento
- `criar_atendimento_ixc` - Cria atendimento técnico no IXC
- `reiniciar_equipamento` - Solicita reboot remoto do equipamento
- `consultar_sinal_onu` - Busca valores TX/RX da ONU

**Quando usar:**
- **ENERGIA**: `["test-equipment-connectivity", "criar_atendimento_ixc"]`
- **SINAL_FRACO**: `["consultar_sinal_onu", "criar_atendimento_ixc"]`
- **EQUIPAMENTO_TRAVADO**: `["reiniciar_equipamento", "test-equipment-connectivity"]`

### Support-Financial-Agent (Sofia)

**Tools financeiras:**
- `buscar_faturas_cliente` - Lista faturas do cliente
- `gerar_segunda_via` - Gera 2ª via de boleto
- `enviar_pix_boleto` - Envia PIX/boleto via WhatsApp
- `negociar_debito` - Inicia negociação de débito
- `consultar_plano_cliente` - Busca plano contratado

**Quando usar:**
- **PAGAMENTO**: `["buscar_faturas_cliente", "gerar_segunda_via", "enviar_pix_boleto"]`
- **NEGOCIACAO**: `["buscar_faturas_cliente", "negociar_debito"]`
- **UPGRADE**: `["consultar_plano_cliente"]`

### Sales-Agent (Bia)

**Tools comerciais:**
- `verificar_cobertura_cep` - Verifica disponibilidade por CEP
- `listar_planos_disponiveis` - Lista planos para região
- `criar_agendamento_instalacao` - Agenda instalação
- `enviar_contrato_assinatura` - Envia link para assinatura digital

**Quando usar:**
- **CONSULTA_PLANOS**: `["verificar_cobertura_cep", "listar_planos_disponiveis"]`
- **FECHAMENTO**: `["criar_agendamento_instalacao", "enviar_contrato_assinatura"]`

## Configuração via Interface

### 1. Configurar Subject (Padrão Global)

```typescript
// Atualizar subject com tools padrão
await supabase
  .from('agent_flow_subjects')
  .update({
    default_tools: ['test-equipment-connectivity', 'criar_atendimento_ixc'],
    default_media: ['video_tutorial_equipamento']
  })
  .eq('subject_key', 'ENERGIA')
  .eq('agent_type', 'support-tech-agent');
```

### 2. Configurar Step Específico (Override)

```typescript
// Step específico usa apenas teste, não cria atendimento ainda
await supabase
  .from('agent_flow_steps')
  .update({
    step_tools: ['test-equipment-connectivity'],
    step_media: null  // Usa default_media do subject
  })
  .eq('step_key', 'ENERGIA_STEP_1')
  .eq('agent_type', 'support-tech-agent');
```

## Exemplos Práticos

### Exemplo 1: Fluxo de Energia Completo

```json
// Subject: ENERGIA
{
  "subject_key": "ENERGIA",
  "default_tools": ["test-equipment-connectivity", "criar_atendimento_ixc"],
  "default_media": ["video_tutorial_luzes"]
}

// Step 1: Verificar luzes
{
  "step_key": "ENERGIA_VERIFICAR_LUZES",
  "step_tools": null,  // Usa default: test + criar_atendimento
  "step_media": ["imagem_luzes_modem"]  // Override: imagem específica
}

// Step 2: Testar tomada
{
  "step_key": "ENERGIA_TESTAR_TOMADA",
  "step_tools": ["test-equipment-connectivity"],  // Apenas teste
  "step_media": null  // Usa default: video_tutorial_luzes
}

// Step 3: Criar chamado
{
  "step_key": "ENERGIA_CRIAR_CHAMADO",
  "step_tools": ["criar_atendimento_ixc"],  // Apenas criação
  "step_media": ["checklist_instalacao"]
}
```

### Exemplo 2: Subject sem Tools

```json
// Subject: DUVIDAS_GERAIS
{
  "subject_key": "DUVIDAS_GERAIS",
  "default_tools": [],  // Nenhuma tool por padrão
  "default_media": []
}

// Todos os steps herdam: nenhuma tool
```

### Exemplo 3: Override Total

```json
// Subject: SUPORTE_AVANCADO
{
  "subject_key": "SUPORTE_AVANCADO",
  "default_tools": ["diagnostico_basico"],
  "default_media": []
}

// Step específico sobrescreve completamente
{
  "step_key": "AVANCADO_TESTE_COMPLETO",
  "step_tools": ["diagnostico_avancado", "teste_porta_olt", "verificar_vlan"],
  "step_media": ["manual_tecnico_completo"]
}
```

## Migrando de Hardcoded para Configurável

### Antes (Hardcoded)

```typescript
// ❌ ANTIGO: No código do agente
if (subject === "ENERGIA") {
  tools = [
    { type: "function", function: { name: "test-equipment-connectivity" } },
    { type: "function", function: { name: "criar_atendimento_ixc" } }
  ];
}
```

### Depois (Configurável)

```typescript
// ✅ NOVO: Busca do banco
const { data: stepConfig } = await supabase
  .from('agent_flow_steps')
  .select('step_tools, subject_key')
  .eq('step_key', currentStep)
  .single();

const { data: subjectConfig } = await supabase
  .from('agent_flow_subjects')
  .select('default_tools')
  .eq('subject_key', stepConfig.subject_key)
  .single();

const toolsList = stepConfig.step_tools || subjectConfig.default_tools || [];

// Montar tools no formato OpenAI
const tools = toolsList.map(toolName => ({
  type: "function",
  function: AVAILABLE_TOOLS[toolName]  // Definições centralizadas
}));
```

## Vantagens do Sistema Configurável

✅ **Flexibilidade**: Alterar tools sem mexer no código
✅ **Testabilidade**: Testar diferentes combinações facilmente
✅ **Auditoria**: Histórico de mudanças no banco
✅ **Sem Deploy**: Configurações instantâneas
✅ **Por Variação**: Cada cenário pode ter tools diferentes
✅ **Reutilização**: Mesmas tools em múltiplos subjects
✅ **Segurança**: Apenas tools pré-aprovadas podem ser configuradas

## Manutenção e Boas Práticas

### Ao Adicionar Nova Tool

1. **Definir a tool** em `AVAILABLE_TOOLS` do agente
2. **Documentar** uso e parâmetros
3. **Testar** isoladamente
4. **Configurar** nos subjects/steps relevantes

### Ao Modificar Subject

1. **Verificar impacto** em todos os steps
2. **Testar variações** aprovadas
3. **Documentar** motivo da mudança
4. **Notificar** equipe de testes

### Ao Criar Novo Subject

1. **Definir `default_tools`** apropriadas
2. **Configurar `default_media`** se necessário
3. **Criar steps** com overrides quando necessário
4. **Aprovar variações** antes de ativar

## Troubleshooting

### Tools não estão sendo executadas

```sql
-- Verificar configuração do step
SELECT step_key, step_tools, subject_key 
FROM agent_flow_steps 
WHERE step_key = 'SEU_STEP';

-- Verificar configuração do subject
SELECT subject_key, default_tools 
FROM agent_flow_subjects 
WHERE subject_key = 'SEU_SUBJECT';
```

### Tool executada na hora errada

- Verificar se `step_tools` está sobrescrevendo incorretamente
- Confirmar que `default_tools` está apropriada para o subject
- Revisar lógica de quando o step é ativado

### Múltiplas tools executando simultaneamente

- Isso é esperado se configuradas no array
- Para sequencial, usar steps separados
- Revisar se `default_tools` está muito ampla

## Referências

- [Guia de Contribuição - Agentes](../contributing-agents.md)
- [Agent Tools Matrix](../agent-tools-matrix.md)
- [Tools Reference](../tools-reference.md)
- [Fluxo Guiado - Support Tech Agent](../fluxograma-cloe-validacao-cpf-v2.md)
