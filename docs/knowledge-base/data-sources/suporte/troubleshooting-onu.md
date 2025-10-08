---
title: "Troubleshooting ONU/Modem"
category: "suporte_tecnico"
agent_types: ["support_tech"]
is_active: true
last_updated: "2025-10-08"
author: "Equipe Técnica"
version: "1.3"
---

# Troubleshooting ONU/Modem

## 🔴 Cliente Offline - Fluxo Obrigatório

### Etapa 1: Verificar Luzes do Equipamento

**Perguntar ao cliente:**
- "Quais luzes estão acesas no modem?"
- "Alguma luz está piscando? Qual cor?"

**Interpretação:**

| LED | Estado Normal | Problema |
|-----|---------------|----------|
| Power | Verde fixo | Apagado = sem energia |
| PON/LOS | Verde fixo | Vermelho/piscando = sem sinal óptico |
| LAN | Verde piscando | Apagado = cabo desconectado |
| Wi-Fi | Verde/Azul fixo | Apagado = Wi-Fi desabilitado |

### Etapa 2: Luzes Apagadas ou Vermelhas

**Checklist:**
1. Equipamento está ligado na tomada?
2. Tem energia elétrica no local?
3. Cabo de energia conectado no modem?
4. Botão power ligado (se houver)?

**Ação:** Pedir para desligar 30 segundos e religar

**Se continuar:** Escalonar para troca de equipamento

### Etapa 3: Luzes OK mas Sem Internet

**Teste de Conectividade:**

1. **Conexão por cabo:**
   - Testar em outro dispositivo
   - Verificar cabo de rede

2. **Conexão Wi-Fi:**
   - Rede visível?
   - Consegue conectar?
   - Pede senha?

**Diagnósticos:**
- Nenhum dispositivo conecta → Problema no modem/sinal
- Alguns conectam → Problema no dispositivo do cliente
- Conecta mas não navega → Problema de autenticação

### Etapa 4: Reinicialização Remota

Se diagnóstico indicar problema no modem:
- Solicitar desligar 30s e religar
- Aguardar 3-5 minutos para sincronização
- Testar novamente

**Se persistir:** Usar ferramenta `criar_atendimento_ixc`

---

## 📶 Problemas de Wi-Fi

### Wi-Fi Lento

**Causas comuns:**
1. Roteador longe dos dispositivos
2. Obstáculos (paredes, móveis)
3. Interferência de outros roteadores
4. Muitos dispositivos conectados

**Soluções:**
- Aproximar roteador ou dispositivo
- Usar cabo de rede se possível
- Trocar canal do Wi-Fi
- Considerar amplificador de sinal (R$ 29,90/mês)

### Não Conecta no Wi-Fi

**Checklist:**
1. Senha correta?
2. Wi-Fi do modem está ligado? (LED aceso)
3. Dispositivo suporta a frequência (2.4GHz/5GHz)?
4. Esquecer rede e reconectar

---

## 🔧 Comandos Úteis (Cliente)

### Teste de Velocidade
- speedtest.net
- fast.com

### Verificar IP
- Windows: `ipconfig`
- Linux/Mac: `ifconfig`

---

**Última atualização:** Outubro 2025
