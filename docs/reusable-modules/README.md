# 📦 Módulos Reutilizáveis para SaaS

## ONU Signal Analyzer

Módulo **puro** (zero dependências) para diagnóstico de sinal óptico de ONUs.

### Instalação

Copie `onu-signal-analyzer.ts` para o seu projeto.

### Uso Básico

```typescript
import { analyzeOnuSignal, formatSignalReport } from './onu-signal-analyzer';

// Dados vindos da API IXC (qualquer tenant)
const result = analyzeOnuSignal({ tx: 1.2, rx: -18.5 });

console.log(result.severity);          // 0 (OK)
console.log(result.diagnosis);         // "Sinal óptico dentro dos padrões ideais"
console.log(formatSignalReport(result));
// 📡 Status: ONLINE
// RX: 🟢 -18.5 dBm (Excelente)
// TX: 🟢 1.2 dBm (Ideal)
// Diagnóstico: Sinal óptico dentro dos padrões ideais
// Ação: Problema não está relacionado ao sinal - investigar outras causas
```

### Integração Multi-Tenant (SaaS)

```typescript
// 1. Buscar credenciais do tenant
const tenant = await db.tenants.findById(tenantId);

// 2. Chamar API IXC do tenant
const ixcResponse = await fetch(`${tenant.ixc_base_url}/webservice/v1/radusuario`, {
  headers: { Authorization: `Basic ${btoa(`${tenant.ixc_user}:${tenant.ixc_pass}`)}` }
});

// 3. Analisar sinal
const data = await ixcResponse.json();
const result = analyzeOnuSignal({
  tx: parseFloat(data.tx_power),
  rx: parseFloat(data.rx_power)
});

// 4. Usar severity para automações
if (isUrgent(result)) {
  await createTicket(tenantId, clientId, result.diagnosis);
}
```

### Faixas de Classificação

| Métrica | Faixa (dBm) | Classificação |
|---------|-------------|---------------|
| RX | > -8 | 🔴 Saturado |
| RX | -8 a -20 | 🟢 Excelente |
| RX | -20 a -25 | 🟡 Aceitável |
| RX | -25 a -28 | 🟠 Fraco |
| RX | < -28 | 🔴 Crítico |
| TX | > 2 | 🔴 Alto demais |
| TX | 0 a 2 | 🟢 Ideal |
| TX | -2 a 0 | 🟡 Aceitável |
| TX | < -2 | 🟠 Baixo |
