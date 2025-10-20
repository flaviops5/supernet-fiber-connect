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

## 📶 Problemas de Wi-Fi - Cenários Detalhados

### 🐌 Cenário 1: Wi-Fi Lento

**Fluxo de Atendimento:**

1. **Identificar rede atual:**
   - Perguntar: "Você está conectado na rede 2.4 ou 5.8 GHz?"
   - Explicar diferença: 2.4 = mais lenta (max 80 Mbps), 5.8 = mais rápida

2. **Se cliente está na 2.4:**
   - Orientar mudança para 5.8 GHz
   - Solicitar teste de velocidade: https://www.speedtest.net/pt/server/60362
   - Pedir print do resultado

3. **Análise do teste:**
   - **Abaixo de 100 Mbps:** Problema na rede → Transferir para colaborador
   - **100-200 Mbps:** Sobrecarga/interferência → Transferir para ajustes
   - **300-500 Mbps:** Dentro do esperado, está OK

4. **Cliente sem equipamento 5.8:**
   - Explicar limitação técnica
   - Velocidade limitada a 80 Mbps pela rede 2.4

---

### 📡 Cenário 2: Sinal Não Pega em Algum Lugar

**Diagnóstico:**
- Diferenças entre 2.4 e 5.8:
  - 2.4 GHz: maior alcance, atravessa paredes melhor
  - 5.8 GHz: maior velocidade, menor alcance

**Ação:**
- Explicar sobre interferência de canais
- Transferir para colaborador experiente
- Pode demorar ~2h para configurações específicas

---

### 📱 Cenário 3: Aplicativo Específico Não Abre

**Fluxo de Diagnóstico:**

1. **Isolar problema:**
   - "Outros aplicativos funcionam normalmente?"

2. **Se outros funcionam:**
   - Problema no app específico, não na internet
   - Orientar: atualizar celular, atualizar app, verificar espaço
   - Explicar: funcionamento depende de vários fatores

3. **Se nenhum funciona:**
   - Reiniciar celular
   - Testar navegação web (sites)
   - Se sites funcionam → problema nos apps
   - Se sites não funcionam → problema na internet

---

### 📺 Cenário 4: TV Box / IPTV Travando

**Contextualização:**
- Serviços não homologados pela ANATEL
- Operam sem autorização
- Servidores na Ásia/África sem infraestrutura adequada
- Causa instabilidade independente da internet

**Procedimento:**
1. Explicar sobre serviços não homologados (sem julgar)
2. Solicitar teste de velocidade
3. Se velocidade > 100 Mbps → confirmar que internet está OK
4. Se cliente insiste → transferir para análise

---

### 💻 Cenário 5: Apenas Um Equipamento Não Navega

**Fluxo:**

1. **Confirmar isolamento:**
   - "Pelo menos 2 outros equipamentos navegam normalmente?"

2. **Se outros navegam:**
   - Problema no equipamento específico
   - Orientar: verificar senha, reiniciar, esquecer rede
   - Explicar: pode ser antena interna do equipamento

3. **Se nenhum navega:**
   - Problema na rede Wi-Fi
   - Seguir fluxo de troubleshooting de rede

---

### 🔍 Cenário 6: Redes 2.4 e 5.8 Não Aparecem

**Diagnóstico por Abrangência:**

1. **Apenas no celular:**
   - Modo avião por 45s
   - OU reiniciar smartphone

2. **Apenas na TV:**
   - Reiniciar TV (desligar da tomada 30s)

3. **Em todos os equipamentos:**
   - Reiniciar roteador (60s desligado)
   - Aguardar 1 minuto após ligar

**Se persistir:**
- Verificar se aparece rede "Mercusys", "TP Link" ou "Huawei"
- Se SIM → roteador perdeu configuração
  - Oferecer reconfiguração remota (se tiver PC/notebook)
  - OU abrir OS para visita técnica

---

### 🔐 Cenário 7: Alterar/Recuperar Senha Wi-Fi

**Procedimento de Segurança:**

1. **Validação de identidade:**
   - Solicitar: nome completo, CPF, data de nascimento
   
2. **Processo:**
   - Avisar: precisa de ~10 minutos
   - Transferir para colaborador
   - Não guardamos senhas no banco de dados

⚠️ **Importante:** Não realizar outros procedimentos técnicos quando assunto é senha

---

### 🔄 Cenário 8: Wi-Fi Cai e Volta

**Checklist de Verificação:**

1. **Alimentação elétrica:**
   - Apertar TODOS os cabos de energia
   - Conferir tomadas e réguas
   - Balançar cabos procurando mal contato
   - Verificar se tomada está frouxa
   - Observar se equipamento desliga

2. **Se encontrou mal contato:**
   - Corrigir
   - Observar se problema continua

3. **Se não encontrou problema:**
   - Transferir para análise técnica especializada

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
