# Documentação de Integração IXC ERP

> **SUPERNET FIBRA** - Sistema de Gestão para Provedores de Internet  
> Última atualização: 2025-02-07

---

## Índice

1. [Consultas de Cliente](#1-consultas-de-cliente)
2. [Diagnóstico de Conexão](#2-diagnóstico-de-conexão)
3. [Gestão Financeira](#3-gestão-financeira)
4. [Contratos e Planos](#4-contratos-e-planos)
5. [Suporte Técnico](#5-suporte-técnico)
6. [Infraestrutura e Resiliência](#6-infraestrutura-e-resiliência)
7. [Proxy Centralizado](#7-proxy-centralizado)

---

## 1. Consultas de Cliente

### 1.1 Busca por CPF/CNPJ (`ixc-customer-lookup`)

**Descrição:** Localiza clientes no IXC através do documento (CPF ou CNPJ).

**Endpoint Edge Function:** `ixc-integration` (action: `searchCustomers`)

**Lógica de Busca:**
```typescript
// 1. Limpeza de caracteres não numéricos
const cleanNumber = String(query).replace(/[.\-\/\(\)\s]/g, '');

// 2. Formatação automática para padrão CPF/CNPJ
if (cleanNumber.length === 11) {
  formatted = cleanNumber.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
} else if (cleanNumber.length === 14) {
  formatted = cleanNumber.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

// 3. Busca prioritária via grid_param
const gridForm = { 
  grid_param: JSON.stringify([{ 
    TB: 'cliente.cnpj_cpf', 
    OP: '=', 
    P: formatted 
  }]) 
};
```

**Payload de Entrada:**
```json
{
  "action": "searchCustomers",
  "query": "12345678900"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "id": "12345",
    "razao": "João Silva",
    "cnpj_cpf": "123.456.789-00",
    "email": "joao@email.com",
    "celular": "(11) 99999-9999",
    "status": "A",
    "bloqueado": "N"
  }
}
```

**Campos Retornados:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | ID único do cliente no IXC |
| `razao` | string | Nome/Razão social |
| `cnpj_cpf` | string | Documento formatado |
| `email` | string | Email principal |
| `celular` | string | Celular para contato |
| `telefone` | string | Telefone fixo |
| `whatsapp` | string | WhatsApp |
| `endereco` | string | Endereço completo |
| `bairro` | string | Bairro |
| `cidade` | string | Cidade |
| `uf` | string | Estado (2 letras) |
| `cep` | string | CEP |
| `status` | string | Status do cadastro |
| `bloqueado` | 'S'/'N' | Bloqueio geral |
| `bloqueado_admin` | 'S'/'N' | Bloqueio administrativo |
| `bloqueado_financeiro` | 'S'/'N' | Bloqueio financeiro |

---

### 1.2 Cadastro de Novo Cliente

**Endpoint Edge Function:** `ixc-integration` (action: `createCustomer`)

**Payload de Entrada:**
```json
{
  "action": "createCustomer",
  "data": {
    "razao": "Maria Santos",
    "cnpj_cpf": "98765432100",
    "email": "maria@email.com",
    "celular": "11988887777",
    "endereco": "Rua das Flores, 123",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "uf": "SP",
    "cep": "01234567"
  }
}
```

**Campos Obrigatórios:**
- `razao` - Nome completo
- `cnpj_cpf` - CPF ou CNPJ
- `email` - Email válido
- `celular` - Celular com DDD
- `endereco` - Endereço completo
- `bairro` - Bairro
- `cidade` - Cidade
- `uf` - Estado
- `cep` - CEP

---

## 2. Diagnóstico de Conexão

### 2.1 Sinal de ONU (`ixc-onu-signal`)

**Descrição:** Consulta níveis de sinal TX/RX da ONU do cliente para diagnóstico de fibra óptica.

**Endpoint IXC:** `/webservice/v1/su_onu_rx`

**Payload de Entrada:**
```json
{
  "action": "getOnuSignal",
  "clientId": "12345"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "id": "456",
    "id_cliente": "12345",
    "rx": -18.5,
    "tx": 2.3,
    "status": "ONLINE",
    "ont_serial": "HWTC12345678",
    "ultimo_online": "2025-02-07 14:30:00"
  }
}
```

**Interpretação dos Níveis:**
| Nível RX (dBm) | Status | Ação Recomendada |
|----------------|--------|------------------|
| -8 a -25 | ✅ Normal | Nenhuma |
| -25 a -27 | ⚠️ Atenção | Monitorar |
| < -27 | ❌ Crítico | Verificar fibra |

---

### 2.2 Status PPPoE (`ixc-radusuario`)

**Descrição:** Verifica status da conexão PPPoE do cliente (online/offline, IP, MAC).

**Endpoint IXC:** `/webservice/v1/radusuarios`

**Payload de Entrada:**
```json
{
  "action": "getRadusuario",
  "clientId": "12345"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "id": "789",
    "id_cliente": "12345",
    "login": "cliente_12345",
    "online": "S",
    "ip": "100.64.10.50",
    "mac": "AA:BB:CC:DD:EE:FF",
    "framedipaddress": "100.64.10.50",
    "acctsessiontime": 86400,
    "ultimo_online": "2025-02-07 14:30:00"
  }
}
```

**Status de Conexão:**
| Valor `online` | Significado |
|----------------|-------------|
| `S` | Online (conectado) |
| `N` | Offline (desconectado) |
| `SS` | Super sessão ativa |

---

### 2.3 Reinicialização de Equipamento (`ixc-equipment-restart`)

**Descrição:** Executa reboot remoto da ONU/roteador do cliente.

**Payload de Entrada:**
```json
{
  "action": "restartEquipment",
  "clientId": "12345",
  "equipmentType": "ONU"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Comando de reinicialização enviado com sucesso",
  "timestamp": "2025-02-07T14:30:00Z"
}
```

**⚠️ Importante:** Esta ação possui rate limiting de 1 execução por cliente a cada 5 minutos.

---

## 3. Gestão Financeira

### 3.1 Listagem de Faturas (`ixc-list-invoices`)

**Descrição:** Lista todas as faturas/títulos financeiros do cliente.

**Endpoint IXC:** `/webservice/v1/fn_areceber`

**Payload de Entrada:**
```json
{
  "action": "getInvoices",
  "clientId": "12345",
  "status": "aberto"
}
```

**Filtros Disponíveis:**
| Parâmetro | Valores | Descrição |
|-----------|---------|-----------|
| `status` | `aberto`, `pago`, `vencido`, `todos` | Filtra por status |
| `dataInicio` | `YYYY-MM-DD` | Data inicial |
| `dataFim` | `YYYY-MM-DD` | Data final |
| `limit` | number | Limite de registros |

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1001",
      "id_cliente": "12345",
      "valor": 99.90,
      "data_vencimento": "2025-02-15",
      "data_pagamento": null,
      "status": "A",
      "nosso_numero": "00001234567",
      "descricao": "Mensalidade Fibra 100MB - FEV/2025"
    }
  ],
  "total": 1,
  "soma_valores": 99.90
}
```

---

### 3.2 Geração de PIX (`ixc-generate-pix`)

**Descrição:** Gera código PIX para pagamento de fatura.

**Payload de Entrada:**
```json
{
  "action": "generatePix",
  "invoiceId": "1001"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "qrcode": "00020126580014br.gov.bcb.pix...",
    "qrcode_image_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "valor": 99.90,
    "vencimento": "2025-02-15",
    "beneficiario": "SUPERNET FIBRA LTDA"
  }
}
```

---

### 3.3 Segunda Via de Boleto

**Descrição:** Gera segunda via de boleto bancário.

**Payload de Entrada:**
```json
{
  "action": "generateBoleto",
  "invoiceId": "1001"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "linha_digitavel": "23793.38128 60000.000003 00000.000400 1 84340000009990",
    "codigo_barras": "23791843400000099903381260000000000000000040",
    "pdf_url": "https://ixc.../boleto.pdf",
    "vencimento": "2025-02-15"
  }
}
```

---

## 4. Contratos e Planos

### 4.1 Sincronização de Planos (`ixc-sync-plans`)

**Descrição:** Sincroniza catálogo de planos do IXC com a tabela local `plans`.

**Fluxo de Sincronização:**
```
IXC (vd_planos) → Mapeamento → Supabase (plans)
         ↓
    radgrupos (velocidades)
```

**Mapeamento de Campos:**
| IXC (`vd_planos`) | Supabase (`plans`) |
|-------------------|-------------------|
| `id` | `ixc_plan_id` |
| `nome` | `name` |
| `valor` | `price` |
| `descricao` | `description` |
| `velocidade` (via radgrupos) | `speed` |

**Endpoint Edge Function:** `ixc-sync-plans`

**Execução:**
```json
{
  "action": "syncPlans"
}
```

---

### 4.2 Listagem de Contratos do Cliente

**Descrição:** Lista todos os contratos ativos/inativos de um cliente.

**Endpoint IXC:** `/webservice/v1/cliente_contrato`

**Payload de Entrada:**
```json
{
  "action": "getContracts",
  "clientId": "12345"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": [
    {
      "id": "5001",
      "id_cliente": "12345",
      "status": "A",
      "valor": 99.90,
      "plano": "Fibra 100MB",
      "velocidade": "100 Mbps",
      "data_contrato": "2024-01-15",
      "data_ativacao": "2024-01-20"
    }
  ]
}
```

---

### 4.3 Criação de Contrato (`ixc-create-contract`)

**Descrição:** Cria novo contrato para cliente existente.

**Payload de Entrada:**
```json
{
  "action": "createContract",
  "clientId": "12345",
  "planId": "10",
  "data": {
    "data_contrato": "2025-02-07",
    "dia_vencimento": 15,
    "forma_pagamento": "boleto"
  }
}
```

---

### 4.4 Upgrade de Plano

**Descrição:** Realiza upgrade do plano do cliente.

**Payload de Entrada:**
```json
{
  "action": "upgradePlan",
  "contractId": "5001",
  "newPlanId": "15",
  "effectiveDate": "2025-03-01"
}
```

---

## 5. Suporte Técnico

### 5.1 Abertura de Chamado

**Descrição:** Cria ticket de suporte técnico no IXC.

**Endpoint IXC:** `/webservice/v1/su_ticket`

**Payload de Entrada:**
```json
{
  "action": "createTicket",
  "data": {
    "id_cliente": "12345",
    "id_assunto": "5",
    "assunto": "Sem conexão",
    "descricao": "Cliente relata que está sem internet desde as 10h.",
    "prioridade": "alta"
  }
}
```

**Prioridades Disponíveis:**
| Valor | Descrição | SLA |
|-------|-----------|-----|
| `baixa` | Informações gerais | 48h |
| `media` | Lentidão, intermitência | 24h |
| `alta` | Sem conexão total | 4h |
| `urgente` | Empresa, link dedicado | 2h |

---

### 5.2 Atualização de Chamado

**Payload de Entrada:**
```json
{
  "action": "updateTicket",
  "ticketId": "8001",
  "data": {
    "status": "em_andamento",
    "observacao": "Técnico a caminho"
  }
}
```

---

### 5.3 Listagem de Chamados

**Payload de Entrada:**
```json
{
  "action": "getTickets",
  "clientId": "12345",
  "status": "aberto"
}
```

---

## 6. Infraestrutura e Resiliência

### 6.1 Circuit Breaker

**Descrição:** Proteção contra falhas em cascata. Abre circuito após 5 falhas consecutivas.

**Estados:**
| Estado | Comportamento |
|--------|---------------|
| `CLOSED` | Requisições normais |
| `OPEN` | Bloqueia requisições (30s) |
| `HALF_OPEN` | Testa 1 requisição |

**Configuração:**
```typescript
const circuitBreaker = {
  failureThreshold: 5,      // Falhas para abrir
  resetTimeout: 30000,      // Tempo para tentar novamente (ms)
  halfOpenRequests: 1       // Requisições de teste
};
```

---

### 6.2 Rate Limiting

**Descrição:** Limita requisições por CPF/endpoint para evitar abuso.

**Limites Padrão:**
| Endpoint | Limite | Janela |
|----------|--------|--------|
| `searchCustomers` | 10 req | 1 min |
| `restartEquipment` | 1 req | 5 min |
| `generatePix` | 5 req | 1 min |
| `createTicket` | 3 req | 10 min |

---

### 6.3 Dead Letter Queue (DLQ)

**Descrição:** Armazena ações falhas para reprocessamento posterior.

**Estrutura:**
```json
{
  "id": "dlq_001",
  "action": "createContract",
  "payload": { ... },
  "error": "IXC timeout",
  "attempts": 3,
  "created_at": "2025-02-07T14:30:00Z",
  "next_retry": "2025-02-07T15:00:00Z"
}
```

**Política de Retry:**
- 1ª tentativa: imediata
- 2ª tentativa: +5 minutos
- 3ª tentativa: +15 minutos
- 4ª tentativa: +1 hora
- Após 4 falhas: notificação para admin

---

## 7. Proxy Centralizado

### 7.1 IXC Proxy (`ixc-proxy`)

**Descrição:** Ponto único de acesso ao IXC com cache, retry e logging.

**Características:**
- ✅ Cache de 30s para GET requests
- ✅ 3 tentativas automáticas com backoff exponencial
- ✅ Validação HMAC obrigatória
- ✅ Logging estruturado com trace ID
- ✅ Normalização de URLs (remove `/adm.php`)

**Payload de Entrada:**
```json
{
  "method": "POST",
  "path": "/webservice/v1/cliente",
  "query": "",
  "body": {
    "qtype": "cliente.cnpj_cpf",
    "query": "123.456.789-00",
    "oper": "=",
    "page": 1,
    "rp": 10
  }
}
```

**Resposta Padrão:**
```json
{
  "ok": true,
  "status": 200,
  "data": { ... },
  "cached": false,
  "duration_ms": 180
}
```

**Headers Automáticos:**
| Header | Valor | Quando |
|--------|-------|--------|
| `ixcsoft` | `listar` | Requisições de listagem |
| `Content-Type` | `application/x-www-form-urlencoded` | Listagens |
| `Content-Type` | `application/json` | Demais casos |

---

## Apêndice A: Códigos de Erro

| Código | Descrição | Ação |
|--------|-----------|------|
| `401` | Credenciais inválidas | Verificar IXC_API_USERNAME/PASSWORD |
| `403` | Sem permissão | Verificar permissões no IXC |
| `404` | Endpoint não encontrado | Verificar path |
| `429` | Rate limit excedido | Aguardar janela |
| `500` | Erro interno IXC | Retry automático |
| `502` | Resposta inválida (HTML) | Verificar URL base |
| `504` | Timeout | Retry com backoff |

---

## Apêndice B: Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `IXC_API_BASE_URL` | URL base do IXC (ex: `https://provedor.ixcsoft.com.br`) | ✅ |
| `IXC_API_USERNAME` | Usuário da API | ✅ |
| `IXC_API_PASSWORD` | Token/senha da API | ✅ |
| `HMAC_SHARED_SECRET` | Chave HMAC para validação | ✅ |

---

## Apêndice C: Tipos TypeScript

```typescript
// src/types/ixc-extended.types.ts

interface IXCClienteFull {
  id: string;
  razao: string;
  cnpj_cpf: string;
  email?: string;
  celular?: string;
  telefone?: string;
  whatsapp?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  status?: string;
  bloqueado?: 'S' | 'N';
  bloqueado_admin?: 'S' | 'N';
  bloqueado_financeiro?: 'S' | 'N';
}

interface IXCRadusuarioFull {
  id: string;
  id_cliente?: string;
  login: string;
  online: 'S' | 'N' | 'SS';
  ultimo_online?: string;
  ip?: string;
  mac?: string;
  signal_db?: number | null;
  ont_serial?: string;
  framedipaddress?: string;
  acctsessiontime?: number;
}

interface IXCTitulo {
  id: string;
  id_cliente: string;
  valor: string | number;
  data_vencimento: string;
  data_pagamento?: string;
  status: string;
  nosso_numero?: string;
  descricao?: string;
}

interface IXCContrato {
  id: string;
  id_cliente: string;
  status: string;
  valor: number;
  plano?: string;
  velocidade?: string;
  data_contrato?: string;
  data_ativacao?: string;
}
```

---

> **Nota:** Esta documentação é baseada na implementação atual do sistema SUPERNET FIBRA. Para detalhes de implementação, consulte os arquivos em `supabase/functions/` e `src/types/`.
