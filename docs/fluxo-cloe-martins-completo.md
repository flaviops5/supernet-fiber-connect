# Fluxo Completo: Cloé Martins (Routing Agent)

**Versão:** 1.0.0  
**Última atualização:** 2026-02-04  
**Arquivo principal:** `supabase/functions/routing-agent/index.ts`

---

## 📋 Sumário

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Fluxo Detalhado Passo a Passo](#3-fluxo-detalhado-passo-a-passo)
4. [Integrações](#4-integrações)
5. [Estruturas de Dados](#5-estruturas-de-dados)
6. [Regras de Negócio](#6-regras-de-negócio)
7. [Mensagens Padrão](#7-mensagens-padrão)
8. [Configurações](#8-configurações)

---

## 1. Visão Geral

**Cloé Martins** é o agente de roteamento inicial (routing-agent) responsável por:
- Recepcionar o cliente no primeiro contato
- Validar CPF e localizar cadastro no IXC
- Verificar situação do cliente (bloqueio, offline, mass outage)
- Direcionar para o departamento correto

### Departamentos de Destino

| Agente | Departamento | Condição de Transferência |
|--------|--------------|---------------------------|
| **Julia** | Financeiro | Cliente bloqueado ou em atraso |
| **Luan** | Técnico | Cliente offline (após falha de reboot) |
| **Vicente** | Vendas | CPF não encontrado após 3 tentativas |
| **Cloé** | Atendimento | Continua atendimento (cliente online) |

---

## 2. Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        WHATSAPP/CANAL                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     routing-agent/index.ts                      │
│                        (Cloé Martins)                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  1. Recebe mensagem                                      │   │
│  │  2. Extrai CPF (se houver)                               │   │
│  │  3. Consulta IXC via ixc-integration                     │   │
│  │  4. Verifica Mass Outage                                 │   │
│  │  5. Determina departamento                               │   │
│  │  6. Transfere ou continua                                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┬──────────────┐
              ▼               ▼               ▼              ▼
     ┌────────────┐   ┌────────────┐   ┌────────────┐  ┌──────────┐
     │ Julia      │   │ Luan       │   │ Vicente    │  │ Supabase │
     │ Financeiro │   │ Técnico    │   │ Vendas     │  │ Database │
     └────────────┘   └────────────┘   └────────────┘  └──────────┘
```

### Componentes

| Arquivo | Responsabilidade |
|---------|------------------|
| `routing-agent/index.ts` | Orquestração principal |
| `routing-agent/prompts.ts` | System prompt da Cloé |
| `routing-agent/config.ts` | Configurações do agente |
| `routing-agent/helpers.ts` | Funções auxiliares (CPF, IXC, roteamento) |
| `ixc-integration` | Edge Function para consultas IXC |
| `ixc-proxy` | Proxy seguro com HMAC para API IXC |

---

## 3. Fluxo Detalhado Passo a Passo

### ETAPA 1: Recepção da Mensagem

```
┌─────────────────────────────────────────────────────────────────┐
│ ENTRADA: Mensagem do cliente via WhatsApp                       │
│                                                                 │
│ Payload recebido:                                               │
│ {                                                               │
│   "conversation_id": "uuid",                                    │
│   "message": "texto do cliente",                                │
│   "phone": "+5561999999999",                                    │
│   "timestamp": "2026-02-04T10:00:00Z"                          │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ AÇÃO: Verificar se é primeira mensagem da conversa              │
│                                                                 │
│ SE primeira_mensagem:                                           │
│   - Gerar protocolo: PROT-{timestamp}-{random}                  │
│   - Enviar saudação inicial + solicitar CPF                     │
│                                                                 │
│ SENÃO:                                                          │
│   - Continuar fluxo de validação                                │
└─────────────────────────────────────────────────────────────────┘
```

**Mensagem Inicial:**
```
Olá! 👋 Sou a Cloé Martins da SUPERNET. 📋 Protocolo: PROT-XXXXX

Para começarmos, preciso do seu CPF para localizar seu cadastro.

Lembre-se que o sistema aceita os formatos 128.930.562-53 e 12893056253.
```

---

### ETAPA 2: Extração e Validação de CPF

```
┌─────────────────────────────────────────────────────────────────┐
│ FUNÇÃO: extractCPF(message: string): string | null              │
│                                                                 │
│ Regex de extração:                                              │
│ /(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/                                │
│                                                                 │
│ Formatos aceitos:                                               │
│   ✅ 128.930.562-53 (com pontuação)                             │
│   ✅ 12893056253 (sem pontuação)                                │
│   ✅ "CPF: 123.456.789-10" (com prefixo)                        │
│   ✅ "meu cpf é 12345678910" (texto natural)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ DECISÃO: CPF encontrado na mensagem?                            │
│                                                                 │
│ SE NÃO:                                                         │
│   - Incrementar attempts_for_cpf                                │
│   - SE attempts >= 3:                                           │
│       → Transferir para VICENTE (Vendas)                        │
│       → Motivo: "CPF não encontrado após 3 tentativas"          │
│   - SENÃO:                                                      │
│       → Solicitar CPF novamente (mensagem amigável)             │
│                                                                 │
│ SE SIM:                                                         │
│   → Prosseguir para ETAPA 3                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Contador de Tentativas:**
```typescript
// Armazenado em: conversations.metadata.attempts_for_cpf
{
  "attempts_for_cpf": 1,  // incrementa a cada tentativa falha
  "max_attempts": 3       // limite configurável
}
```

---

### ETAPA 3: Verificação de Mass Outage (PRIORIDADE MÁXIMA)

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️  PRIORIDADE MÁXIMA - VERIFICAR ANTES DE TUDO                 │
│                                                                 │
│ FUNÇÃO: checkMassOutage(supabase, clientRegion)                 │
│                                                                 │
│ Consulta:                                                       │
│   SELECT * FROM mass_outage_events                              │
│   WHERE status = 'active'                                       │
│     AND region ILIKE '%{clientRegion}%'                         │
│   ORDER BY created_at DESC                                      │
│   LIMIT 1                                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ DECISÃO: Mass Outage ativo para região do cliente?              │
│                                                                 │
│ SE SIM (mass_outage.active === true):                           │
│   ❌ NÃO pedir CPF                                              │
│   ❌ NÃO tentar reboot                                          │
│   ❌ NÃO abrir atendimento individual                           │
│   ❌ NÃO transferir para técnico                                │
│   ✅ Informar cliente IMEDIATAMENTE                             │
│   ✅ Fornecer protocolo e previsão                              │
│   ✅ FINALIZAR conversa                                         │
│                                                                 │
│ SE NÃO:                                                         │
│   → Prosseguir para ETAPA 4                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Mensagem de Mass Outage:**
```
Olá! 👋 Sou a Cloé.

⚠️ Identifiquei que estamos com uma QUEDA EM MASSA na região de [REGIÃO] 
afetando [NÚMERO] clientes.

Nossa equipe técnica já está trabalhando na resolução.

Previsão de normalização: [TEMPO]

Você será avisado assim que o serviço for restabelecido.

📋 Protocolo: [PROTOCOLO]

Lamento o transtorno. Tem algo mais que posso ajudar?
```

**Estrutura do Contexto Mass Outage:**
```typescript
interface MassOutageContext {
  active: boolean;
  event_id?: string;
  region?: string;
  affected_clients?: number;
  estimated_resolution?: string;
  protocol?: string;
}
```

---

### ETAPA 4: Consulta ao IXC (Busca de Cliente)

```
┌─────────────────────────────────────────────────────────────────┐
│ FUNÇÃO: getClientRoutingStatus(supabase, cpf)                   │
│                                                                 │
│ Chamada: ixc-integration → searchCustomers(cpf)                 │
│                                                                 │
│ Endpoint IXC: /cliente                                          │
│ Método: GET                                                     │
│ Filtro: cnpj_cpf = {cpf}                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ DECISÃO: Cliente encontrado no IXC?                             │
│                                                                 │
│ SE NÃO ENCONTRADO:                                              │
│   1. Tentar fallback: customer_contact_history                  │
│      SELECT * FROM customer_contact_history                     │
│      WHERE cpf = {cpf}                                          │
│      ORDER BY created_at DESC LIMIT 1                           │
│                                                                 │
│   2. SE fallback falhar:                                        │
│      → Transferir para VICENTE (Vendas)                         │
│      → Motivo: "Cliente não encontrado - possível prospect"     │
│                                                                 │
│ SE ENCONTRADO:                                                  │
│   → Armazenar dados do cliente                                  │
│   → Prosseguir para ETAPA 5                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Dados Retornados do IXC:**
```typescript
interface IXCClientData {
  id: number;
  razao: string;           // Nome do cliente
  cnpj_cpf: string;        // CPF/CNPJ
  email: string;
  telefone_celular: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  cep: string;
  ativo: string;           // "S" ou "N"
  bloqueado: string;       // "S" ou "N"
}
```

---

### ETAPA 5: Verificação Financeira (Bloqueio/Inadimplência)

```
┌─────────────────────────────────────────────────────────────────┐
│ CONSULTA: Contratos do cliente                                  │
│                                                                 │
│ Chamada: ixc-integration → getCustomerContracts(client_id)      │
│                                                                 │
│ Endpoint IXC: /cliente_contrato                                 │
│ Filtro: id_cliente = {client_id}                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ VERIFICAÇÕES:                                                   │
│                                                                 │
│ 1. cliente.bloqueado === "S"                                    │
│    → Cliente está BLOQUEADO por inadimplência                   │
│                                                                 │
│ 2. contrato.status === "Bloqueado"                              │
│    → Contrato bloqueado                                         │
│                                                                 │
│ 3. contrato.status_internet === "Bloqueado"                     │
│    → Serviço de internet bloqueado                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ DECISÃO: Cliente bloqueado ou em atraso?                        │
│                                                                 │
│ SE SIM:                                                         │
│   → Transferir para JULIA (Financeiro)                          │
│   → Motivo: "Cliente bloqueado por inadimplência"               │
│   → NÃO tentar diagnóstico técnico                              │
│                                                                 │
│ SE NÃO:                                                         │
│   → Prosseguir para ETAPA 6                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Mensagem de Transferência para Financeiro:**
```
Entendi, [NOME]! Identifiquei uma pendência financeira no seu cadastro.

Vou te transferir para a Julia do setor Financeiro. Ela vai te ajudar 
a resolver isso rapidinho! ⏳

Aguarde um momento...
```

---

### ETAPA 6: Diagnóstico de Conectividade

```
┌─────────────────────────────────────────────────────────────────┐
│ CONSULTA: Status de conexão (RadUsuario)                        │
│                                                                 │
│ Chamada: ixc-integration → getCustomerStatus(client_id)         │
│                                                                 │
│ Endpoint IXC: /radusuarios                                      │
│ Filtro: id_cliente = {client_id}                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ DADOS RETORNADOS:                                               │
│                                                                 │
│ {                                                               │
│   "status": "online" | "offline",                               │
│   "last_online_minutes": number,     // minutos desde última    │
│   "signal_db": number | null,        // potência do sinal       │
│   "ont_serial": string,              // serial da ONU           │
│   "config_mismatch": boolean,        // erro de configuração    │
│   "login": string,                   // PPPoE login             │
│   "ip": string                       // IP atribuído            │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ DECISÃO: Cliente está ONLINE?                                   │
│                                                                 │
│ SE ONLINE (status === "online"):                                │
│   → Analisar intenção da mensagem                               │
│   → Continuar atendimento com Cloé                              │
│   → OU transferir baseado em keywords                           │
│                                                                 │
│ SE OFFLINE (status === "offline"):                              │
│   → Prosseguir para ETAPA 7 (Reboot Remoto)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

### ETAPA 7: Tentativa de Reboot Remoto

```
┌─────────────────────────────────────────────────────────────────┐
│ CONDIÇÃO: Cliente OFFLINE detectado                             │
│                                                                 │
│ VERIFICAÇÃO PRÉVIA:                                             │
│   - Mass Outage NÃO está ativo (já verificado na ETAPA 3)       │
│   - Cliente NÃO está bloqueado (já verificado na ETAPA 5)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ AÇÃO: Tentar reboot remoto do equipamento                       │
│                                                                 │
│ Chamada: ixc-integration → rebootEquipment(ont_serial)          │
│                                                                 │
│ Parâmetros:                                                     │
│   - ont_serial: Serial da ONU do cliente                        │
│   - timeout: 30 segundos                                        │
│   - max_attempts: 3                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ AGUARDAR: 60 segundos para equipamento reiniciar                │
│                                                                 │
│ VERIFICAR: Novo status de conexão                               │
│   - Chamada: getCustomerStatus(client_id)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ DECISÃO: Reboot foi bem-sucedido?                               │
│                                                                 │
│ SE SIM (novo status === "online"):                              │
│   → Informar cliente que problema foi resolvido                 │
│   → Manter com Cloé para verificar satisfação                   │
│   → Finalizar atendimento                                       │
│                                                                 │
│ SE NÃO (ainda offline OU erro no reboot):                       │
│   → Prosseguir para ETAPA 8 (Transferência Técnica)             │
└─────────────────────────────────────────────────────────────────┘
```

**Mensagem Durante Reboot:**
```
[NOME], identifiquei que sua conexão está offline. 🔄

Vou tentar reiniciar seu equipamento remotamente. Isso pode levar 
até 2 minutos...

Por favor, aguarde! ⏳
```

**Mensagem de Sucesso:**
```
Pronto, [NOME]! ✅

O reboot foi realizado com sucesso e sua conexão foi restabelecida!

Pode verificar se está tudo funcionando agora?
```

---

### ETAPA 8: Transferência para Suporte Técnico

```
┌─────────────────────────────────────────────────────────────────┐
│ CONDIÇÃO: Reboot falhou OU problema persiste                    │
│                                                                 │
│ AÇÃO: Preparar payload de transferência para LUAN               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PAYLOAD DE TRANSFERÊNCIA (RoutingPayload):                      │
│                                                                 │
│ {                                                               │
│   "conversation_id": "uuid",                                    │
│   "client": {                                                   │
│     "cpf": "12345678910",                                       │
│     "name": "Nome do Cliente",                                  │
│     "email": "cliente@email.com",                               │
│     "phone": "+5561999999999",                                  │
│     "contract_id": 12345,                                       │
│     "pppoe_login": "cliente.login",                             │
│     "address": {                                                │
│       "cep": "72000-000",                                       │
│       "city": "Brasília",                                       │
│       "region": "Taguatinga"                                    │
│     }                                                           │
│   },                                                            │
│   "ixc": {                                                      │
│     "cliente_full": { /* dados completos IXC */ },              │
│     "radusuario": {                                             │
│       "status": "offline",                                      │
│       "last_online_minutes": 45,                                │
│       "signal_db": -26.5,                                       │
│       "ont_serial": "HWTC12345678",                             │
│       "config_mismatch": false                                  │
│     },                                                          │
│     "contracts": [ /* lista de contratos */ ]                   │
│   },                                                            │
│   "supabase": {                                                 │
│     "mass_outage_checked": true,                                │
│     "mass_outage_match": false,                                 │
│     "mass_outage_event_id": null                                │
│   },                                                            │
│   "context": {                                                  │
│     "conversation_id": "uuid",                                  │
│     "protocol": "PROT-1234567890-ABC123",                       │
│     "initial_message": "Mensagem original do cliente",          │
│     "timestamp": "2026-02-04T10:05:00Z"                         │
│   },                                                            │
│   "next_action": "support-tech-agent",                          │
│   "routeReason": "Cliente offline após tentativa de reboot"     │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ AÇÃO: Invocar support-tech-agent (Luan)                         │
│                                                                 │
│ supabase.functions.invoke("support-tech-agent", {               │
│   body: routingPayload                                          │
│ })                                                              │
└─────────────────────────────────────────────────────────────────┘
```

**Mensagem de Transferência para Técnico:**
```
Entendi, [NOME]. O problema persiste mesmo após o reinício remoto. 😔

Vou te transferir para o Luan do Suporte Técnico. Ele é especialista 
e vai resolver isso pra você!

Aguarde um momento... ⏳
```

---

## 4. Integrações

### 4.1 IXC-Integration (Edge Function)

```typescript
// Endpoints disponíveis:

// Buscar cliente por CPF
POST /ixc-integration
{
  "action": "searchCustomers",
  "cpf": "12345678910"
}

// Status do cliente (RadUsuario)
POST /ixc-integration
{
  "action": "getCustomerStatus",
  "client_id": 12345
}

// Contratos do cliente
POST /ixc-integration
{
  "action": "getCustomerContracts",
  "client_id": 12345
}

// Reboot de equipamento
POST /ixc-integration
{
  "action": "rebootEquipment",
  "ont_serial": "HWTC12345678"
}
```

### 4.2 IXC-Proxy (Proxy Seguro)

```typescript
// Todas as chamadas IXC passam pelo proxy com HMAC
// Headers obrigatórios:
{
  "X-HMAC-Signature": "{hash_hmac_sha256}",
  "X-Timestamp": "{unix_timestamp}",
  "Content-Type": "application/json"
}
```

### 4.3 Mass Outage Check

```typescript
// Consulta direta ao Supabase
const { data: outage } = await supabase
  .from("mass_outage_events")
  .select("*")
  .eq("status", "active")
  .ilike("region", `%${clientRegion}%`)
  .order("created_at", { ascending: false })
  .limit(1)
  .single();
```

---

## 5. Estruturas de Dados

### 5.1 RoutingPayload (Transferência entre Agentes)

```typescript
interface RoutingPayload {
  conversation_id: string;
  client: {
    cpf: string;
    name: string;
    email?: string;
    phone?: string;
    contract_id?: number;
    pppoe_login?: string;
    address?: {
      cep?: string;
      city?: string;
      region?: string;
    };
  };
  ixc?: {
    cliente_full?: Record<string, unknown>;
    radusuario?: {
      status: 'online' | 'offline';
      last_online_minutes?: number;
      signal_db?: number | null;
      ont_serial?: string;
      config_mismatch?: boolean;
    };
    contracts?: Array<Record<string, unknown>>;
  };
  supabase?: {
    mass_outage_checked: boolean;
    mass_outage_match: boolean;
    mass_outage_event_id?: string | null;
  };
  context: ConversationContext;
  next_action?: AgentRole;
  routeReason?: string;
}
```

### 5.2 ConversationContext

```typescript
interface ConversationContext {
  conversation_id: string;
  customer_cpf?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  protocol?: string;
  initial_message: string;
  attempts_for_cpf?: number;
  timestamp: string;
}
```

### 5.3 AgentRole (Tipos de Agente)

```typescript
type AgentRole = 
  | 'routing-agent'        // Cloé Martins
  | 'support-tech-agent'   // Luan (Técnico)
  | 'support-financial-agent' // Julia (Financeiro)
  | 'sales-agent'          // Vicente (Vendas)
  | 'telemedicina-agent'   // Telemedicina
  | 'automacao-agent';     // Automação
```

---

## 6. Regras de Negócio

### 6.1 Prioridade de Verificações

A ordem de verificação é **OBRIGATÓRIA** e deve ser seguida exatamente:

```
1. Mass Outage     → Se ativo, FINALIZA (não transfere)
2. Bloqueio        → Se bloqueado, transfere para JULIA
3. Conectividade   → Se offline, tenta REBOOT
4. Reboot Falhou   → Transfere para LUAN
5. Cliente Online  → Analisa intenção ou continua com CLOÉ
```

### 6.2 Keywords de Roteamento (Cliente Online)

```typescript
// Keywords Financeiras → Julia
const financialKeywords = /\b(boleto|fatura|pagamento|débito|mensalidade|pagar|pix)\b/i;

// Keywords Técnicas → Luan
const technicalKeywords = /\b(internet|lenta|conexão|sem sinal|travando|wifi|caiu|fora do ar)\b/i;

// Contexto Negativo (ignora keywords se presente)
const negativeContext = /\b(novo|ótimo|funcionando|excelente)\b/i;
```

### 6.3 Limites e Timeouts

| Parâmetro | Valor | Descrição |
|-----------|-------|-----------|
| `maxCPFAttempts` | 3 | Máximo de tentativas para obter CPF |
| `responseTimeout` | 15000ms | Timeout para resposta do agente |
| `massOutageTimeout` | 3000ms | Timeout para consulta mass outage |
| `rebootTimeout` | 30000ms | Timeout para comando de reboot |
| `rebootWaitTime` | 60000ms | Tempo de espera após reboot |

### 6.4 Sanitização de Dados (LGPD)

```typescript
// Dados que SÃO salvos no histórico
{
  "protocol": "PROT-1234567890-ABC123",
  "status": "ativo",
  "cpf_redacted": "***910",  // Apenas últimos 3 dígitos
  "source": "ixc"
}

// Dados que NÃO são salvos
// - CPF completo
// - Endereço completo
// - CNPJ
// - Login PPPoE
// - Informações financeiras detalhadas
```

---

## 7. Mensagens Padrão

### 7.1 Saudação Inicial

```
Olá! 👋 Sou a Cloé Martins da SUPERNET. 📋 Protocolo: PROT-XXXXX

Para começarmos, preciso do seu CPF para localizar seu cadastro.

Lembre-se que o sistema aceita os formatos 128.930.562-53 e 12893056253.
```

### 7.2 CPF Não Encontrado (Tentativa 1-2)

```
Hmm, não consegui identificar o CPF na sua mensagem. 🤔

Poderia me enviar apenas o número do CPF? Pode ser com ou sem pontos:
• 123.456.789-10
• 12345678910
```

### 7.3 CPF Não Encontrado (Após 3 Tentativas)

```
[NOME], não consegui localizar seu cadastro em nosso sistema.

Vou te transferir para o Vicente do setor Comercial. Ele pode te ajudar 
a fazer seu cadastro ou verificar se há algum problema! 😊

Aguarde um momento...
```

### 7.4 Mass Outage Detectado

```
Olá! 👋 Sou a Cloé.

⚠️ Identifiquei que estamos com uma QUEDA EM MASSA na região de [REGIÃO] 
afetando [NÚMERO] clientes.

Nossa equipe técnica já está trabalhando na resolução.

Previsão de normalização: [TEMPO]

Você será avisado assim que o serviço for restabelecido.

📋 Protocolo: [PROTOCOLO]

Lamento o transtorno. Tem algo mais que posso ajudar?
```

### 7.5 Cliente Bloqueado

```
Entendi, [NOME]! Identifiquei uma pendência financeira no seu cadastro.

Vou te transferir para a Julia do setor Financeiro. Ela vai te ajudar 
a resolver isso rapidinho! ⏳

Aguarde um momento...
```

### 7.6 Iniciando Reboot

```
[NOME], identifiquei que sua conexão está offline. 🔄

Vou tentar reiniciar seu equipamento remotamente. Isso pode levar 
até 2 minutos...

Por favor, aguarde! ⏳
```

### 7.7 Reboot Bem-Sucedido

```
Pronto, [NOME]! ✅

O reboot foi realizado com sucesso e sua conexão foi restabelecida!

Pode verificar se está tudo funcionando agora?
```

### 7.8 Reboot Falhou

```
Entendi, [NOME]. O problema persiste mesmo após o reinício remoto. 😔

Vou te transferir para o Luan do Suporte Técnico. Ele é especialista 
e vai resolver isso pra você!

Aguarde um momento... ⏳
```

### 7.9 Transferência Genérica

```
Perfeito, [NOME]! Vou te transferir para o [DEPARTAMENTO]. 

Um momento! ⏳
```

---

## 8. Configurações

### 8.1 Config do Routing Agent

```typescript
// supabase/functions/routing-agent/config.ts

export const ROUTING_AGENT_CONFIG = {
  // Model settings
  model: "google/gemini-2.5-flash",
  temperature: 0.7,
  maxTokens: 800,

  // Agent behavior
  maxMessagesInContext: 10,
  enableToolCalling: false,

  // Business rules
  maxCPFAttempts: 3,
  requireCPFBeforeRouting: false,

  // Timeouts
  responseTimeout: 15000,

  // Mass Outage Integration
  massOutage: {
    enabled: true,
    useCached: true,
    cacheTTL: 5000,
    timeout: 3000,
    skipCPFValidation: true,
    priorityResponse: true,
  },

  // Rate limiting
  rateLimit: {
    enabled: true,
    windowMinutes: 15,
    maxAttempts: 5,
    blockMinutes: 60,
  },
};
```

### 8.2 Variáveis de Ambiente

```env
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
IXC_API_BASE_URL=https://...
IXC_API_USERNAME=...
IXC_API_PASSWORD=...
HMAC_SHARED_SECRET=...
```

---

## Diagrama de Fluxo Completo

```
                    ┌─────────────┐
                    │   INÍCIO    │
                    └──────┬──────┘
                           │
                           ▼
                ┌──────────────────────┐
                │  Receber Mensagem    │
                │  (WhatsApp/Canal)    │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │  Primeira Mensagem?  │
                └──────────┬───────────┘
                           │
              ┌────────────┴────────────┐
              │ SIM                     │ NÃO
              ▼                         ▼
    ┌─────────────────┐      ┌─────────────────┐
    │ Gerar Protocolo │      │ Recuperar       │
    │ + Saudação      │      │ Contexto        │
    └────────┬────────┘      └────────┬────────┘
             │                        │
             └───────────┬────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Extrair CPF        │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   CPF Encontrado?    │
              └──────────┬───────────┘
                         │
         ┌───────────────┴───────────────┐
         │ NÃO                           │ SIM
         ▼                               │
┌─────────────────┐                      │
│ Tentativas >= 3?│                      │
└────────┬────────┘                      │
         │                               │
    ┌────┴────┐                          │
    │SIM      │NÃO                       │
    ▼         ▼                          │
┌───────┐ ┌──────────┐                   │
│VICENTE│ │ Solicitar│                   │
│(Vendas)│ │ CPF      │                   │
└───────┘ └──────────┘                   │
                                         │
                         ┌───────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  ⚠️ MASS OUTAGE?     │
              │  (PRIORIDADE MÁXIMA) │
              └──────────┬───────────┘
                         │
         ┌───────────────┴───────────────┐
         │ SIM                           │ NÃO
         ▼                               │
┌─────────────────┐                      │
│ Informar Cliente│                      │
│ + FINALIZAR     │                      │
└─────────────────┘                      │
                                         │
                         ┌───────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Buscar no IXC      │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Cliente Encontrado? │
              └──────────┬───────────┘
                         │
         ┌───────────────┴───────────────┐
         │ NÃO                           │ SIM
         ▼                               │
┌─────────────────┐                      │
│  VICENTE        │                      │
│  (Vendas)       │                      │
└─────────────────┘                      │
                                         │
                         ┌───────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Cliente BLOQUEADO?  │
              └──────────┬───────────┘
                         │
         ┌───────────────┴───────────────┐
         │ SIM                           │ NÃO
         ▼                               │
┌─────────────────┐                      │
│  JULIA          │                      │
│  (Financeiro)   │                      │
└─────────────────┘                      │
                                         │
                         ┌───────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Cliente OFFLINE?    │
              └──────────┬───────────┘
                         │
         ┌───────────────┴───────────────┐
         │ SIM                           │ NÃO
         ▼                               ▼
┌─────────────────┐            ┌─────────────────┐
│ Tentar REBOOT   │            │ Analisar        │
│ Remoto          │            │ Intenção        │
└────────┬────────┘            │ (Keywords)      │
         │                     └────────┬────────┘
         ▼                              │
┌─────────────────┐                     │
│ Reboot OK?      │                     │
└────────┬────────┘                     │
         │                              │
    ┌────┴────┐                         │
    │SIM      │NÃO                      │
    ▼         ▼                         │
┌───────┐ ┌──────────┐                  │
│ FIM   │ │  LUAN    │                  │
│ (OK)  │ │ (Técnico)│                  │
└───────┘ └──────────┘                  │
                                        │
                         ┌──────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Continuar com CLOÉ  │
              │  ou Transferir       │
              │  baseado em keywords │
              └──────────────────────┘
```

---

**Documento gerado em:** 2026-02-04  
**Autor:** Sistema de Documentação Automática  
**Próxima revisão:** A definir
