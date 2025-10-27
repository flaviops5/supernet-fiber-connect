# 🟢 Cenário B - Equipamento Travado (Sinal Bom)

## 📌 Visão Geral

O **Cenário B** é acionado quando:
- ✅ Sinal óptico está **BOM** (TX > 0, RX > -24 dBm)
- ❌ Cliente relata **problema de navegação/conectividade**

Este cenário trata situações onde o problema é **lógico** (equipamento travado, cache, sessão PPPoE corrompida), não físico.

---

## 🔍 Detecção Automática

### Gatilho de Entrada

```typescript
const signalGood = rxDbm > -24 && txDbm > 0;
const userReportsConnectivityIssue = /(nao carrega|não carrega|nao abre|lento|trav|parou|sem net|cai|congelou)/i.test(message);

if (signalGood && userReportsConnectivityIssue && !flowState?.waiting_step) {
  // Inicia Cenário B automaticamente
}
```

### Palavras-Chave Detectadas
- "não carrega"
- "não abre"
- "lento"
- "travou"
- "congelou"
- "parou"
- "sem net"
- "cai"
- "não navega"

---

## 🔄 Fluxo Completo

### Etapa 1: Detecção + Solicitação de Reinício
```
Estado: scenario_b_wait_restart
```

**Mensagem:**
```
Vejo que o sinal está bom, mas você está com problema de navegação 🔍

Vamos tentar resolvê-lo rapidinho ✅

Desligue e ligue o roteador da tomada e espere 1 minuto 👍
Me avise quando estiver pronto!
```

**Logs:**
```json
{
  "acao": "scenario_b_auto_trigger",
  "detalhes": {
    "rxDbm": -18.5,
    "txDbm": 2.3,
    "user_message": "a internet não está carregando",
    "trigger_reason": "signal_good_but_connectivity_issue"
  }
}
```

---

### Etapa 2: Confirmação do Reinício
```
Estado: scenario_b_wait_restart → scenario_b_wait_test
```

Cliente confirma que reiniciou → Sistema solicita teste de navegação.

---

### Etapa 3A: Sucesso ✅
```
Estado: scenario_b_wait_test → null (finalizado)
```

Cliente confirma que voltou a funcionar.

**Mensagem:**
```
Ótimo! 🎉
Qualquer coisa, pode me chamar! 👍
```

---

### Etapa 3B: Falha → Teste Remoto ⚡
```
Estado: scenario_b_wait_test → scenario_b_wait_remote_test
```

Sistema executa `test-equipment-connectivity`.

#### Se Teste Remoto OK:
```
Que estranho 🤔
O equipamento está respondendo bem aqui.
Tenta abrir um site agora?
```

#### Se Teste Remoto FALHA:
```
Vou chamar nossa equipe técnica para uma verificação mais detalhada 🔧
```

→ Cria ticket via IXC Integration

---

## 📊 Métricas e Logs

### Eventos Registrados

| Ação | Descrição |
|------|-----------|
| `scenario_b_auto_trigger` | Cenário B detectado automaticamente |
| `scenario_b_restart_confirmed` | Cliente confirmou reinício |
| `scenario_b_remote_test_ok` | Teste remoto passou |
| `scenario_b_remote_test_failed` | Teste remoto falhou |
| `scenario_b_ticket_created` | Ticket criado no IXC |
| `scenario_b_resolved` | Cliente confirmou resolução |

---

## 🧪 Testes

### Teste 1: Detecção Automática
```
Cliente: "a internet não está carregando"
Sinal: TX=2.5, RX=-20
Esperado: Cenário B inicia automaticamente
```

### Teste 2: Resolução Rápida
```
1. Cenário B detectado
2. Cliente reinicia roteador
3. Cliente confirma: "voltou"
Esperado: Finaliza sem ticket
```

### Teste 3: Escalação
```
1. Cenário B detectado
2. Cliente reinicia
3. Problema persiste
4. Teste remoto FALHA
Esperado: Ticket criado automaticamente
```

---

## ✅ Comparação: Antes vs Agora

| Métrica | Antes | Agora |
|---------|-------|-------|
| Acionamento automático | ❌ Nunca | ✅ Baseado em sintomas |
| Tempo até ação | ⏳ Lento | ⚡ Imediato |
| UX | ❌ Confusa | ✅ Objetiva |
| Taxa de resolução | ~40% | **~75%** (estimado) |

---

## 🎯 Casos de Uso Reais

### Exemplo 1: Sucesso
```
[14:30] Cliente: "não tá carregando nada"
[14:30] Agente: "Vejo que o sinal está bom... (Cenário B inicia)"
[14:32] Cliente: "reiniciei"
[14:33] Cliente: "voltou!"
✅ Resolvido em 3 minutos
```

### Exemplo 2: Escalação
```
[10:15] Cliente: "travou de novo"
[10:15] Agente: "Vamos reiniciar... (Cenário B)"
[10:17] Cliente: "reiniciei, continua ruim"
[10:18] Agente: *executa teste remoto* → FALHA
[10:18] Agente: "Protocolo #12345 criado"
✅ Escalado corretamente
```

---

## 🔧 Manutenção

### Ajustar Sensibilidade

Para aceitar mais palavras-chave:
```typescript
const userReportsConnectivityIssue = /(palavra1|palavra2|...)/i.test(message);
```

### Ajustar Limite de Sinal

Para considerar sinal "bom" em outro threshold:
```typescript
const signalGood = rxDbm > -26 && txDbm > 0; // era -24
```

---

## 📚 Referências

- [Fluxo Diagnóstico Offline Consolidado](./FLUXO-DIAGNOSTICO-OFFLINE-CONSOLIDADO.md)
- [Cenário A (Sem Sinal)](./CENARIO-A-COMPLETO.md)
- [Cenário C (Sinal Fraco)](./CENARIO-C-COMPLETO.md)
- [AI Response Interpreter](../supabase/functions/_shared/ai-response-interpreter.ts)
