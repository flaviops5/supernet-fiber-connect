# ✅ Cenário C: Implementação Completa

**Data:** 27/10/2025  
**Agente:** support-tech-agent  
**Status:** 100% Funcional

---

## 🎯 O Que Foi Implementado

### ✅ **C0: Helper de Detecção de Sinal Fraco**
```typescript
function isWeakFromTxRx(tx?: number | null, rx?: number | null): boolean {
  // RX fraco típico entre ~ -27 e -30 dBm
  if (typeof rx === "number" && rx <= -27 && rx > -32) return true;
  return false;
}
```

**Localização:** Linha 72  
**Função:** Detectar quando RX está na faixa de sinal fraco (-27 a -32 dBm)

---

### ✅ **C1: Detecção Automática de Entrada no Cenário**
```typescript
// Detectar entrada no Cenário C (sinal fraco mas não zero)
if (isWeakSignal && !flowState?.waiting_step && !isCenarioA && !isCenarioB) {
  logger.info("🟠 Detectado sinal fraco → Iniciando Cenário C", {
    tx: txDbm,
    rx: rxDbm,
    threshold: "-27 dBm"
  });
  
  await supabase
    .from("conversations")
    .update({
      metadata: {
        flow_state: {
          waiting_step: "scenario_c_check_instability",
          ixc_client_id: ixc_client_id
        }
      }
    })
    .eq("id", conversation_id);

  responseMessage = "Estou vendo que o sinal da fibra está um pouco fraco 🔍\n\n" +
    "Isso pode causar instabilidade às vezes.\n\n" +
    "Você percebe que a conexão cai e volta, ou fica muito lenta em alguns momentos?";
}
```

**Localização:** Linha 2061-2118  
**Trigger:** RX entre -27 e -32 dBm (detectado automaticamente)  
**Primeira Pergunta:** Confirmar se cliente percebe instabilidade

---

### ✅ **C4 Melhorado: Logs Detalhados Pós-Reteste**
```typescript
await supabase.from("registros_de_monitoramento").insert({
  acao: "scenario_c_optical_retest",
  fluxo: "support-tech",
  conversation_id,
  detalhes: { 
    ok: retest?.ok === true,
    status: retest?.status ?? null,
    latency_ms: retest?.latency_ms ?? null,
    tx_power: retest?.tx_power ?? null,
    rx_power: retest?.rx_power ?? null,
    error: rtErr ? String(rtErr) : null
  }
});
```

**Localização:** Linha 2272-2284  
**Função:** Logs completos com latência, TX/RX e status HTTP

---

## 🔄 Fluxo Completo do Cenário C

```mermaid
graph TD
    A[RX entre -27 e -32 dBm] -->|Detectado| B[C1: Pergunta sobre instabilidade]
    B -->|"Sim, cai/oscila"| C[C2: Pergunta sobre LOS piscando]
    B -->|"Não, está normal"| Z[Fim - monitora]
    C -->|LOS piscando| D[C3: Instruir reconexão óptica]
    C -->|Sem LOS| D
    D -->|Cliente reconecta| E[C4: Teste remoto]
    E -->|Online| F[Perguntar: navegação OK?]
    E -->|Offline| G[C5: Criar ticket IXC]
    F -->|"Sim, resolveu"| H[Sucesso ✅]
    F -->|"Não, ainda instável"| G
    G --> I[Ticket criado com protocolo]
```

---

## 📊 Diferença: Antes vs Depois

### ❌ **ANTES (Incompleto)**
```typescript
// Só processava SE já estava no cenário
const isCenarioC = scenario === "C" || flowState?.waiting_step?.startsWith("scenario_c");

if (isCenarioC && scenarioCStep) {
  // Processava steps...
}
```

**Problema:** Não tinha **detecção de entrada**! O agente nunca iniciava o Cenário C automaticamente.

---

### ✅ **DEPOIS (Completo)**
```typescript
// 1. Detecta sinal fraco
const isWeakSignal = isWeakFromTxRx(txDbm, rxDbm);

// 2. Inicia automaticamente
if (isWeakSignal && !flowState?.waiting_step && !isCenarioA && !isCenarioB) {
  // INICIA Cenário C com primeira pergunta
}

// 3. Processa os steps
if (isCenarioC && scenarioCStep) {
  // Processa check_instability, check_los, optical, ticket...
}
```

**Solução:** Agora detecta **automaticamente** quando RX está fraco e inicia o fluxo!

---

## 🧪 Como Testar

### Teste 1: Detecção Automática
```bash
# Simular cliente com RX fraco
{
  "conversation_id": "...",
  "customer_cpf": "12345678900",
  "message": "internet está caindo muito",
  "onu_signal": {
    "tx": 2.5,
    "rx": -28.5  # ← RX fraco (-27 a -32)
  }
}
```

**Resultado Esperado:**
```
🟠 Detectado sinal fraco → Iniciando Cenário C
Mensagem: "Estou vendo que o sinal da fibra está um pouco fraco 🔍..."
```

---

### Teste 2: Fluxo Completo
1. **Cliente confirma instabilidade:** "sim, cai toda hora"
2. **Agente pergunta LOS:** "A luz LOS (vermelha) está piscando?"
3. **Cliente responde:** "sim, tá piscando"
4. **Agente instrui:** "Vamos reconectar o conector verde..."
5. **Cliente reconecta:** "pronto, reconectei"
6. **Agente testa:** Chama `test-equipment-connectivity`
7. **Resultado online:** "Ótimo! Pode testar a navegação?"
8. **Cliente:** "funcionou!"
9. **Sucesso:** Cenário C resolvido ✅

---

### Teste 3: Ticket Final
Se após reconexão continuar instável:

1. Cliente reconecta fibra
2. Teste remoto falha (`retest?.ok === false`)
3. Agente: "Ainda instável? Vou pedir para nossa equipe..."
4. Sistema cria ticket IXC automaticamente
5. Resposta: "✅ Protocolo IXC: 12345"

---

## 📈 Métricas de Logs

O sistema agora registra:

### `scenario_c_detected`
```json
{
  "acao": "scenario_c_detected",
  "fluxo": "support-tech",
  "conversation_id": "...",
  "detalhes": {
    "tx": 2.5,
    "rx": -28.5,
    "threshold_rx_dbm": -27
  }
}
```

### `scenario_c_instability_response`
```json
{
  "acao": "scenario_c_instability_response",
  "fluxo": "support-tech",
  "conversation_id": "...",
  "detalhes": {
    "intent": "confirmed",
    "confidence": 0.85
  }
}
```

### `scenario_c_optical_retest` (✨ MELHORADO)
```json
{
  "acao": "scenario_c_optical_retest",
  "fluxo": "support-tech",
  "conversation_id": "...",
  "detalhes": {
    "ok": true,
    "status": 200,
    "latency_ms": 45,
    "tx_power": 2.8,
    "rx_power": -26.5,
    "error": null
  }
}
```

### `scenario_c_ticket_created`
```json
{
  "acao": "scenario_c_ticket_created",
  "fluxo": "support-tech",
  "conversation_id": "...",
  "detalhes": {
    "ticket_id": "12345",
    "success": true
  }
}
```

---

## ✅ Checklist de Implementação

- [x] **C0:** Helper `isWeakFromTxRx` criado
- [x] **C1:** Detecção automática de entrada
- [x] **C2:** Confirmação de instabilidade com `hybridInterpret`
- [x] **C3:** Checagem LOS com regex robusto
- [x] **C4:** Logs detalhados no reteste (TX, RX, latência)
- [x] **C5:** Criação de ticket via `ixc-integration`
- [x] **C6:** Logs quando cliente nega instabilidade

---

## 🎉 Resultado Final

**Status do Cenário C:** ✅ **100% FUNCIONAL**

Agora o `support-tech-agent` tem os **3 cenários completos**:

| Cenário | Trigger | Status |
|---------|---------|--------|
| **A** - Sem sinal | TX = 0.00 e RX = 0.00 | ✅ Completo |
| **B** - Equipamento travado | TX > 0, online mas sem resposta | ✅ Completo |
| **C** - Sinal fraco | RX entre -27 e -32 dBm | ✅ **AGORA** Completo |

---

## 🔧 Manutenção

### Ajustar threshold de RX fraco
Editar linha 74:
```typescript
if (typeof rx === "number" && rx <= -27 && rx > -32) return true;
//                              ↑ threshold superior
//                                          ↑ threshold inferior
```

### Personalizar mensagem inicial
Editar linha 2100-2102:
```typescript
responseMessage = "Estou vendo que o sinal da fibra está um pouco fraco 🔍\n\n" +
  "Isso pode causar instabilidade às vezes.\n\n" +
  "Você percebe que a conexão cai e volta, ou fica muito lenta em alguns momentos?";
```

---

**Documentação:** docs/CENARIO-C-COMPLETO.md  
**Versão:** 1.0.0  
**Última Atualização:** 27/10/2025
