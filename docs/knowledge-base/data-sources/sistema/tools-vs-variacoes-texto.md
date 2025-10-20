# Tools vs Variações de Texto

## Diferença Fundamental

Este documento explica a diferença crucial entre **tools (ações técnicas)** e **variações de texto (conversação)** no sistema.

## O Que São

### Variações de Texto (Conversação)

**O QUE É:**
- Textos que o agente **fala** para o cliente
- Mensagens conversacionais aprovadas
- Diferentes formas de perguntar/responder

**ONDE FICA:**
- Tabela `agent_flow_scenario_approvals`
- Campo `variation_path` contém o texto
- Aprovadas via interface admin

**EXEMPLO:**
```
"Vou verificar sua conexão agora..."
"Detectei que seu modem está offline..."
"Vou criar um chamado técnico para você..."
"Aguarde um momento enquanto consulto o sistema..."
```

### Tools (Ações Técnicas)

**O QUE É:**
- Ações que o agente **executa** tecnicamente
- Chamadas para APIs/funções do sistema
- Operações concretas no backend

**ONDE FICA:**
- Tabela `agent_flow_subjects.default_tools`
- Tabela `agent_flow_steps.step_tools`
- Configuração JSON no banco

**EXEMPLO:**
```json
["test-equipment-connectivity", "criar_atendimento_ixc", "enviar_pix_boleto"]
```

## Comparação Lado a Lado

| Aspecto | Variações de Texto | Tools |
|---------|-------------------|-------|
| **Tipo** | Texto conversacional | Ação técnica |
| **Uso** | O que o agente **fala** | O que o agente **faz** |
| **Visível para** | Cliente (WhatsApp/Chat) | Sistema (backend) |
| **Tabela** | `agent_flow_scenario_approvals` | `agent_flow_subjects/steps` |
| **Campo** | `variation_path` | `default_tools`/`step_tools` |
| **Formato** | String de texto | Array JSON de nomes |
| **Quantidade** | 144+ por assunto | 2-5 por subject/step |
| **Mudança** | Requer aprovação formal | Configuração admin |
| **Impacto** | Tom/estilo da conversa | Funcionalidade técnica |

## Exemplo Completo: Fluxo de Energia

### Situação: Cliente reporta "internet caiu"

#### 1. VARIAÇÃO (O que o agente fala)

```
Agente: "Vou verificar sua conexão agora, só um momento! 🔍"
```

**Origem:**
- Tabela: `agent_flow_scenario_approvals`
- Subject: `ENERGIA`
- Variation: `verificacao_inicial_educada_v2`
- Status: `approved`

#### 2. TOOL (O que o agente faz)

```json
{
  "tool_name": "test-equipment-connectivity",
  "parameters": {
    "ixc_client_id": "12345"
  }
}
```

**Origem:**
- Tabela: `agent_flow_subjects`
- Subject: `ENERGIA`
- Campo: `default_tools = ["test-equipment-connectivity"]`

#### 3. Resultado da Tool

```json
{
  "is_online": false,
  "tx_power": 0.00,
  "rx_power": 0.00
}
```

#### 4. VARIAÇÃO (Resposta baseada no resultado)

```
Agente: "Detectei que seu modem está sem sinal óptico (TX/RX zerados). 
Isso indica problema de energia ou no cabo de fibra.
As luzes do equipamento estão acesas?"
```

**Origem:**
- Tabela: `agent_flow_scenario_approvals`
- Subject: `ENERGIA`
- Variation: `diagnostico_sem_sinal_direto_v5`
- Status: `approved`

## Workflow Completo

```mermaid
graph TD
    A[Cliente: "Internet caiu"] --> B[Agente usa VARIAÇÃO]
    B --> C["Vou verificar agora..."]
    C --> D[Agente executa TOOL]
    D --> E[test-equipment-connectivity]
    E --> F{Resultado?}
    F -->|Offline| G[Agente usa VARIAÇÃO]
    G --> H["Detectei problema..."]
    H --> I[Agente executa TOOL]
    I --> J[criar_atendimento_ixc]
    J --> K[Agente usa VARIAÇÃO]
    K --> L["Chamado aberto!"]
```

## Por Que São Independentes?

### Variações Permanecem Estáveis

✅ **144 variações de ENERGIA** já aprovadas
✅ Tom, estilo, abordagem definidos
✅ Testadas e validadas
✅ **NÃO precisam mudar**

### Tools São Configuráveis

✅ Definir **quando** testar conectividade
✅ Definir **quando** criar chamado
✅ Adicionar/remover actions
✅ **Sem impacto nas variações**

## Casos de Uso

### Caso 1: Mudar Tom da Conversa

**PROBLEMA:** Agente está muito técnico, cliente não entende

**SOLUÇÃO:** Modificar variações de texto
```sql
UPDATE agent_flow_scenario_approvals
SET variation_path = 'nova_variacao_mais_simples_v1'
WHERE scenario_key = 'diagnostico_sem_sinal';
```

**IMPACTO:** 
- ✅ Variações: SIM (objetivo da mudança)
- ❌ Tools: NÃO (continuam as mesmas)

### Caso 2: Adicionar Teste Técnico

**PROBLEMA:** Agente precisa verificar porta OLT antes de criar chamado

**SOLUÇÃO:** Adicionar tool ao fluxo
```sql
UPDATE agent_flow_steps
SET step_tools = '["test-equipment-connectivity", "verificar_porta_olt", "criar_atendimento_ixc"]'
WHERE step_key = 'ENERGIA_DIAGNOSTICO_AVANCADO';
```

**IMPACTO:**
- ❌ Variações: NÃO (continuam falando igual)
- ✅ Tools: SIM (nova ação executada)

### Caso 3: Remover Criação Automática de Ticket

**PROBLEMA:** Tickets sendo abertos prematuramente

**SOLUÇÃO:** Remover tool do step inicial
```sql
UPDATE agent_flow_steps
SET step_tools = '["test-equipment-connectivity"]'  -- Removeu criar_atendimento_ixc
WHERE step_key = 'ENERGIA_VERIFICACAO_INICIAL';
```

**IMPACTO:**
- ❌ Variações: NÃO (agente continua falando sobre verificar)
- ✅ Tools: SIM (não cria mais ticket neste step)

## Anti-Padrões Comuns

### ❌ ERRADO: Confundir os dois

```
"Preciso mudar o texto que o Luan fala quando testa conectividade"
→ Modifica VARIAÇÃO, não a tool
```

### ❌ ERRADO: Pensar que são acoplados

```
"Se eu mudar a tool, vou ter que reescrever as 144 variações?"
→ NÃO! São independentes
```

### ❌ ERRADO: Hardcodar mensagens nas tools

```typescript
// NUNCA fazer isso:
function testarConectividade() {
  const resultado = test();
  return "Detectei que seu modem está offline";  // ❌
}
```

### ✅ CORRETO: Separar responsabilidades

```typescript
// Tool retorna dados técnicos
function testarConectividade() {
  return { is_online: false, tx: 0, rx: 0 };  // ✅
}

// Variação decide como falar sobre isso
const mensagem = getVariacao("diagnostico_sem_sinal");  // ✅
```

## Benefícios da Separação

### Para o Time de Conteúdo
- ✅ Modifica textos **sem** mexer em código
- ✅ Testa diferentes abordagens facilmente
- ✅ Aprova variações independentemente

### Para o Time Técnico
- ✅ Adiciona funcionalidades **sem** reescrever textos
- ✅ Otimiza tools independentemente
- ✅ Testa ações sem aprovar conteúdo

### Para o Sistema
- ✅ Escalabilidade: mais variações + mais tools
- ✅ Manutenibilidade: mudanças isoladas
- ✅ Testabilidade: testar separadamente
- ✅ Auditoria: rastrear mudanças por tipo

## Resumo Visual

```
┌─────────────────────────────────────────┐
│          CLIENTE VÊ                     │
├─────────────────────────────────────────┤
│ "Vou verificar sua conexão agora..."    │  ← VARIAÇÃO
│ "Detectei problema de energia..."       │  ← VARIAÇÃO
│ "Chamado técnico aberto!"               │  ← VARIAÇÃO
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│          SISTEMA EXECUTA                │
├─────────────────────────────────────────┤
│ → test-equipment-connectivity()         │  ← TOOL
│ → criar_atendimento_ixc()               │  ← TOOL
└─────────────────────────────────────────┘
```

## Perguntas Frequentes

### P: Se eu modificar uma tool, preciso atualizar as variações?
**R:** Não. As variações falam sobre o problema, não sobre a ferramenta usada.

### P: Se eu aprovar novas variações, as tools mudam?
**R:** Não. Variações são texto, tools são código/configuração.

### P: Posso ter mesma variação com tools diferentes?
**R:** Sim! "Vou verificar agora" pode usar `test-connectivity` OU `consultar-sinal` OU ambos.

### P: Posso ter mesma tool com variações diferentes?
**R:** Sim! `criar_atendimento_ixc` pode ser anunciado como "Abrindo chamado" OU "Escalando para técnico" etc.

### P: As 144 variações aprovadas de ENERGIA vão mudar?
**R:** **NÃO!** Apenas tools serão configuradas. Textos permanecem iguais.

## Referências

- [Configuração de Tools nos Agentes](./configuracao-tools-agentes.md)
- [Agent Tools Matrix](../../agent-tools-matrix.md)
- [Guia de Contribuição - Agentes](../../contributing-agents.md)
