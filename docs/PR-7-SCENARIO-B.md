# PR #7 — Cenário B inteligente (roteador travado com sinal bom)

## 🎯 Objetivo

Detectar automaticamente clientes com sinal óptico bom mas roteador travado, guiar desliga/liga do roteador, testar pós-ação e decidir o próximo passo (A/C/encerrar/abrir IXC) de forma adaptativa.

## 🔍 Gatilho Automático do Cenário B

- **RX > -24 dBm** (sinal bom)
- **TX "ok"** (transmitindo)
- Cliente reporta problema ou está offline
- Teste de conectividade indica travamento (não navega ou intermitente)

## 🗂️ Estados (Máquina de Estado)

### B1: `scenario_b_power_cycle_request`
- Solicita desliga/liga do roteador
- Aguarda confirmação do cliente

### B2: Confirmação do cliente
- Cliente confirma que fez o procedimento
- Sistema avança para teste pós-ação

### B3: `scenario_b_post_reboot_test`
- Testa conectividade remotamente
- Decide próximo passo baseado em resultado

## 🔄 Decisão Adaptativa (B3)

### Caso 1: TX/RX = 0 → Redireciona para Cenário A
```
Cliente: [após reiniciar]
Sistema: [detecta TX/RX zerado]
Ação: Redireciona para fluxo de energia (Cenário A)
```

### Caso 2: Texto indica LOS piscando → Redireciona para Cenário C
```
Cliente: "a luz vermelha está piscando"
Sistema: [detecta LOS piscando]
Ação: Redireciona para fluxo óptico (Cenário C)
```

### Caso 3: Conectividade OK → Sucesso
```
Sistema: [teste remoto passa]
Ação: Confirma navegação com cliente e encerra
```

### Caso 4: Persistência → Cria Ticket IXC
```
Sistema: [teste remoto falha]
Ação: Cria atendimento técnico com prioridade alta
```

## 📊 Logs

### Eventos Registrados

| Ação | Descrição |
|------|-----------|
| `scenario_b_probe` | Teste inicial de conectividade |
| `scenario_b_start` | Cenário B detectado automaticamente |
| `scenario_b_power_cycle_ack` | Cliente confirmou reinício |
| `scenario_b_post_reboot_probe` | Teste pós-reinício |
| `scenario_b_success` | Cliente confirmou resolução |
| `scenario_b_ticket_created` | Ticket criado no IXC |

### Exemplo de Log Completo

```json
{
  "acao": "scenario_b_probe",
  "fluxo": "support-tech",
  "conversation_id": "uuid",
  "detalhes": {
    "signal": { "tx": 2.3, "rx": -18.5 },
    "reachable": false
  }
}
```

## 🧪 Casos de Teste

### Teste 1: Detecção Automática
```
Entrada:
- RX: -20 dBm (bom)
- TX: 2.5 dBm (ok)
- Conectividade: falhou

Esperado:
- Cenário B inicia automaticamente
- Solicita desliga/liga do roteador
```

### Teste 2: Resolução Rápida
```
Fluxo:
1. Cenário B detectado
2. Cliente reinicia roteador
3. Teste remoto: OK
4. Cliente confirma: "voltou"

Esperado:
- Finaliza sem ticket
- KPI registrado como "resolved"
```

### Teste 3: Redirecionamento para A
```
Fluxo:
1. Cenário B detectado
2. Cliente reinicia
3. Sinal vira TX/RX = 0.00

Esperado:
- Redireciona para Cenário A
- Mensagem: "ficou sem sinal óptico"
```

### Teste 4: Redirecionamento para C
```
Fluxo:
1. Cenário B detectado
2. Cliente reinicia
3. Cliente diz: "luz vermelha piscando"

Esperado:
- Redireciona para Cenário C
- Mensagem sobre LOS e conector verde
```

### Teste 5: Escalação
```
Fluxo:
1. Cenário B detectado
2. Cliente reinicia
3. Problema persiste
4. Teste remoto: FALHA

Esperado:
- Ticket criado automaticamente
- Prioridade: alta
- KPI registrado como "escalated"
```

## 📈 KPIs Registrados

```typescript
kpiLog({
  action: "kpi_update",
  conversation_id,
  scenario_completed: "B",
  hybrid_mode: "ON" | "OFF",
  resolved: true | false,
  escalated: true | false,
  ticket_id: string | null
});
```

## 🔧 Helpers Implementados

### `logB()`
Log específico para eventos do Cenário B

### `setWaitingStep()`
Atualiza estado de espera no flow_state

### `safeTestConnectivity()`
Testa conectividade com fallback para busca de IP

### `isGoodSignal()`
Verifica se RX > -24 dBm

### `isZeroSignal()`
Verifica se TX/RX = 0.00

## ✅ Status de Implementação

- [x] Helpers do Cenário B
- [x] Detecção automática (B1)
- [x] Confirmação do cliente (B2)
- [x] Teste pós-ação e roteamento adaptativo (B3)
- [x] Redirecionamento para A (TX/RX=0)
- [x] Redirecionamento para C (LOS piscando)
- [x] Criação de ticket IXC
- [x] Logs estruturados
- [x] KPIs registrados
- [x] Documentação completa

## 🎉 PR #7 COMPLETO E PRONTO PARA MERGE!
