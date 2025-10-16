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
- Aguardar 1-2 minutos para sincronização
- Testar novamente

**Se persistir após reboot:** Seguir para Etapa 5

### Etapa 5: Troubleshooting Pós-Reboot (Cliente Ainda Offline)

#### 5.1 Verificar Alimentação Elétrica

**Perguntar ao cliente:**
- "O equipamento está ligado na tomada? ✅"
- "A fonte de energia está conectada? 🔌"
- "O botão Power está ligado (se houver)? 💡"

**Se equipamento estava desligado:**
- Pedir para ligar
- Aguardar 1-2 minutos
- Verificar se voltou online
- Se SIM → Problema resolvido
- Se NÃO → Continuar para 5.2

#### 5.2 Diagnóstico por LEDs

**Identificar o problema:**

| Situação | Diagnóstico | Ação |
|----------|-------------|------|
| Todos LEDs apagados | Sem energia local | Verificar energia da residência/fonte |
| PON/LOS vermelho | Problema de sinal óptico | **Abrir atendimento IXC** |
| PON/LOS piscando | Sincronizando | Aguardar mais 2 minutos |
| Power apagado | Equipamento sem energia | Verificar tomada/cabo de força |
| LAN apagado | Cabo desconectado | Reconectar cabo ethernet |

#### 5.3 Problema de Sinal Confirmado (PON Vermelho)

**Luan deve:**

1. Confirmar o diagnóstico:
   ```
   "Luz PON vermelha indica problema no sinal óptico da fibra.
   Isso pode ser:
   - Fibra danificada
   - Problema no equipamento da rede
   - Conector solto na caixa de emenda"
   ```

2. Abrir atendimento técnico no IXC:
   ```
   Usar tool: criar_atendimento_ixc
   Tipo: "Problema de sinal óptico - PON vermelho"
   Descrição: "Cliente [nome] - Equipamento offline após reboot. 
               LED PON/LOS vermelho. Necessário verificar sinal óptico 
               e integridade da fibra."
   ```

3. Transferir para LOGÍSTICA:
   ```
   "Protocolo IXC: [número]
   
   Vou transferir você para nossa equipe de logística que vai 
   agendar a visita técnica. Você receberá contato em até 4 horas úteis."
   
   [Atualizar conversation: department = "logistica"]
   ```

#### 5.4 Equipamento com Defeito

**Se todas as luzes estão OK mas sem internet:**
- Possível problema no equipamento
- Abrir atendimento IXC para troca
- Transferir para logística

#### 5.5 O que NÃO Fazer

- ❌ Escalar para "equipe técnica de campo"
- ❌ Prometer visita sem abrir atendimento IXC
- ❌ Pular verificações (sempre seguir ordem: energia → luzes → sinal)
- ❌ Dizer "vou acionar o NOC"

### Etapa 6: Encerramento Adequado

**Após transferir para logística:**
- Confirmar protocolo IXC gerado
- Informar prazo de contato (4 horas úteis)
- Despedir-se educadamente
- Sistema fecha conversa automaticamente

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
