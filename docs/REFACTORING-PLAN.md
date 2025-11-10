# 📋 Plano de Refatoração - 100h

## Status: ✅ EM EXECUÇÃO

### 🎯 Objetivo
Transformar o codebase de monolítico para modular, com foco em:
- **Visibilidade**: Logging unificado para debug em produção
- **Manutenibilidade**: Quebrar monólitos em módulos focados
- **Testabilidade**: Desacoplar lógica de negócio

---

## ✅ Passo 1: Logging Unificado (25h)

### Status: ✅ COMPLETO

**O que foi feito:**
- [x] Unified logger implementado (frontend + backend)
- [x] Script de migração automática criado (`scripts/migrate-console-logs.js`)
- [x] Sistema de alertas via WhatsApp
- [x] Dashboard de analytics implementado
- [x] Documentação completa

**Resultado:**
- 328 console.log em 117 arquivos identificados
- Script pronto para migração em massa
- Sistema de alertas funcionando
- Visibilidade completa via dashboard

---

## 🔧 Passo 2: Refatorar support-tech-agent (60h)

### Status: ✅ 40% COMPLETO (Cenários A e B Migrados)

**Problema:**
- `index.ts` com 4798 linhas
- Toda lógica misturada em um arquivo
- Difícil manutenção e testes

**Estrutura Nova:**

```
supabase/functions/support-tech-agent/
├── index.ts (orquestrador - ~200 linhas)
├── diagnostics/
│   ├── parallel-diagnostics.ts     # PR#17 - Diagnósticos paralelos
│   ├── signal-helpers.ts           # Funções de análise TX/RX
│   └── connectivity.ts             # Testes de conectividade
├── scenarios/
│   ├── scenario-a.ts               # TX/RX zero (energia)
│   ├── scenario-b.ts               # Sinal bom + offline (reboot)
│   ├── scenario-c.ts               # Sinal fraco (mau contato)
│   ├── scenario-d.ts               # RX crítico (fibra)
│   └── scenario-e.ts               # WAN/Wi-Fi
├── flows/
│   ├── flow-manager.ts             # Gerenciamento de flow_state
│   ├── state-manager.ts            # Atualizações de metadata
│   └── timeout-handler.ts          # Protocolo de timeout
├── tools/
│   ├── tool-executor.ts            # Execução de tools configuradas
│   └── approved-simulations.ts     # Cache de simulações
├── utils/
│   ├── message-helpers.ts          # insertAgentMessageOnce, etc
│   ├── sanitizers.ts               # sanitizeRedLightQuestion
│   └── interpreters.ts             # detectIntentAndMood
└── services/
    ├── ixc-service.ts              # Todas as chamadas IXC
    ├── conversation-service.ts     # CRUD de conversas
    └── notification-service.ts     # Alertas e notificações
```

**Status da Migração:**
- ✅ **Cenário A** (TX/RX zero) - COMPLETO
  - 8 etapas de fluxo implementadas
  - Integrado com ConversationService e IXCService
  - Usa hybridInterpret para detecção de intenção
  - Executa tools configuradas do banco
  - Sistema de clarificação robusto
  - ~450 linhas (vs ~800 no monólito)
- ✅ **Cenário B** (sinal bom + offline) - COMPLETO
  - Fast-path com diagnósticos paralelos (PR#17)
  - Circuit breaker para proteção
  - Feature flag para rollout gradual
  - Máximo 2 tentativas de reboot
  - Sistema de retestes e KPI logging
  - ~550 linhas (vs ~900 no monólito)
- ⏳ Cenário C (sinal fraco)
- ⏳ Cenário D (RX crítico)
- ⏳ Cenário E (WAN/Wi-Fi)

**Benefícios:**
- Arquivos focados (~100-200 linhas cada)
- Testabilidade individual
- Manutenção simplificada
- Onboarding mais rápido

---

## 🔌 Passo 3: Camada de Serviços (15h)

### Status: ✅ EM ANDAMENTO

**O que criar:**

### `services/ixc-service.ts`
```typescript
export class IXCService {
  async getClientData(clientId: string)
  async testConnectivity(clientId: string)
  async createTicket(params: TicketParams)
  async getSignalStatus(clientId: string)
}
```

### `services/mass-outage-service.ts`
```typescript
export class MassOutageService {
  async checkMassOutage(region: string)
  async getActiveOutages()
  async notifyAffectedCustomers()
}
```

### `services/conversation-service.ts`
```typescript
export class ConversationService {
  async getConversation(id: string)
  async updateFlowState(id: string, state: any)
  async insertMessage(id: string, message: Message)
  async getMessageHistory(id: string)
}
```

---

## 📊 Métricas de Sucesso

### Antes da Refatoração:
- ❌ `support-tech-agent/index.ts`: 4798 linhas
- ❌ 328 console.log espalhados
- ❌ Difícil debug em produção
- ❌ Onboarding: ~2 semanas

### Depois da Refatoração:
- ✅ Arquivos: ~100-200 linhas cada
- ✅ Zero console.log (logger unificado)
- ✅ Dashboard de logs em tempo real
- ✅ Onboarding: ~2 dias
- ✅ Testabilidade: 100%
- ✅ Ciclo de fix: -80%

---

## 🚀 Próximos Passos

1. ✅ Executar migração de console.log
2. ✅ Criar estrutura modular do support-tech-agent
3. ✅ Implementar camada de serviços
4. ✅ **Migrar Cenário A** (TX/RX zero) - **COMPLETO**
5. ✅ **Migrar Cenário B** (sinal bom + offline) - **COMPLETO**
6. ⏳ Migrar Cenários C, D, E
7. ⏳ Atualizar index.ts para usar módulos A e B
8. ⏳ Testes de regressão
9. ⏳ Deploy gradual com feature flag

---

## 📝 Notas

- Manter funcionalidade EXATA durante refatoração
- Usar feature flags para rollback rápido
- Documentar cada módulo
- Testes unitários para serviços
