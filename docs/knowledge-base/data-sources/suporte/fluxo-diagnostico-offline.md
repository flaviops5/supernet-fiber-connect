# 🔧 Fluxo de Diagnóstico de Cliente Offline

**Versão:** 1.0.0  
**Data:** 2025-10-16  
**Responsáveis:** Cloé (Routing) → Julia (Financeiro) → Luan (Suporte Técnico)

---

## 📋 Ordem de Verificação (OBRIGATÓRIA)

**SEMPRE seguir esta sequência:**

1. ✅ **Mass Outage** (Cloé) - PRIORIDADE MÁXIMA
2. ✅ **Financeiro** (Cloé → Julia) - Segunda prioridade
3. ✅ **Reboot Remoto** (Cloé) - SEMPRE tentar primeiro
4. ✅ **Consulta TX/RX** (Luan) - Após reboot falhar
5. ✅ **Fluxo Específico** (Luan) - Conforme cenário diagnosticado

---

## 🚨 Prioridade 1: Mass Outage (Cloé)

**Responsável:** Cloé (Routing Agent)

Se `mass_outage.active === true`:
- ❌ NÃO pedir CPF
- ❌ NÃO tentar reboot
- ❌ NÃO abrir atendimento individual
- ❌ NÃO transferir para técnico
- ✅ Informar imediatamente
- ✅ Finalizar conversa

**Frase Cloé:**
```
"Identifiquei que estamos com uma QUEDA EM MASSA na região de [REGIÃO] afetando [NÚMERO] clientes.

Nossa equipe técnica já está trabalhando na resolução.

Previsão de normalização: [TEMPO]

Você será avisado assim que o serviço for restabelecido.

Lamento o transtorno. Tem algo mais que posso ajudar?"
```

---

## 💰 Prioridade 2: Financeiro (Julia)

**Responsável:** Julia (Support Financial Agent)

**Verificação:** Status BLOQUEADO ou FINANCEIRO EM ATRASO

### Fluxo:
1. ✅ Verificar status financeiro no IXC
2. ✅ Se BLOQUEADO ou EM ATRASO:
   - Avaliar disponibilidade de desbloqueio de confiança
   - Avisar cliente sobre o desbloqueio (se disponível)
   - Enviar Boleto e PIX
   - Explicar tempo de compensação
   - Perguntar se precisa de algo mais
   - Finalizar conversa (NÃO escalona)

### Desbloqueio Disponível:
```
"Verifiquei que há pendências financeiras que estão impedindo sua conexão.

Efetuei o desbloqueio de confiança. Sua internet já está funcionando!
Você tem 24 horas para regularizar o pagamento.

Estou te enviando o Boleto e o PIX atualizados.

⚠️ IMPORTANTE sobre formas de pagamento:
• PIX: Desbloqueio automático em menos de 5 segundos
• BOLETO: Seu banco pode demorar até 48 horas para confirmar o pagamento. 
  Se pagar por boleto e quiser desbloqueio rápido, nos envie o comprovante 
  que faremos a baixa manual.

Precisa de mais alguma ajuda?"
```

### Desbloqueio Indisponível:
```
"Verifiquei que há pendências financeiras que estão impedindo sua conexão.

O desbloqueio de confiança não está disponível para o seu contrato, pois o recurso 
foi usado anteriormente e o pagamento não foi realizado. Ele será habilitado novamente 
quando o título que vence após [DATA] for pago.

Para restabelecer o acesso, é necessário regularizar o pagamento pendente. 
Após a confirmação do pagamento no sistema, o serviço será liberado automaticamente.

[DADOS DE PAGAMENTO]"
```

---

## ⏱️ Tempos Padronizados

| Ação | Tempo | Justificativa |
|------|-------|---------------|
| Desligar roteador | **60 segundos** | Capacitor descarregar + alinhamento OLT |
| Aguardar sincronização | **1 minuto** | Cliente executar + equipamento sincronizar |
| Aguardar PON piscar | **2-3 minutos** | Sinal fraco estabilizar |
| Timeout resposta (1ª) | **1:30** | Primeira tentativa de contato |
| Timeout resposta (2ª) | **5 minutos** | Segunda tentativa de contato |
| Timeout resposta (3ª) | **15 minutos** | Fechar interação por falta de contato |

---

## 🔄 Hierarquia de Ações (Luan)

1. **Consulta TX/RX** - Diagnóstico do sinal
2. **Reboot MANUAL** - 60 segundos desligado
3. **Manipulação Fibra** - Reconectar conector verde
4. **Abertura de Atendimento** - Escalação para equipe

---

## 🎯 Cenários de Diagnóstico

### Cenário A: TX/RX 0.00/0.00

**Diagnóstico:** Sem energia ou LOS (Loss of Signal)

**Frase Luan:**
```
"Detectei que o sinal óptico está zerado (TX/RX: 0.00). 
Isso indica que o equipamento pode estar desligado ou com problema no sinal da fibra.

Por favor, verifique:
1️⃣ O equipamento está ligado na tomada?
2️⃣ A fonte de energia está conectada?
3️⃣ O botão Power está ligado?

Após confirmar, me avise."
```

**Se energia OK:**
```
"Agora verifique se há uma LUZ VERMELHA chamada 'LOS' ou 'PON' piscando no equipamento.

Tem essa luz vermelha?"
```

**Se luz vermelha piscando:**
```
"Essa luz indica problema no sinal da fibra óptica. 
Vou te enviar as instruções para tentar resolver:

[VÍDEO/IMAGEM]

⚠️ ATENÇÃO:
- Segure o conector pela BASE (não pelo cabo)
- Retire com cuidado (não force)
- Não dobre o cabo
- Reconecte firmemente até ouvir 'click'

Aguarde 1 minuto após reconectar para o equipamento sincronizar.

Veja se a LUZ VERMELHA parou de PISCAR e agora está VERDE FIXA.

Me avise quando terminar."
```

**Escalação:** Abrir atendimento IXC → **Transferir para LOGÍSTICA**

---

### Cenário B: TX/RX NORMAL (-20 / +0.5)

**Diagnóstico:** Equipamento travado (sinal OK, mas não navega)

**Contexto:** Cloé JÁ tentou reboot remoto antes

**Frase Luan:**
```
"Verifiquei o sinal da sua ONU e está dentro dos padrões (RX: -20 dBm / TX: +0.5 dBm).
Isso indica que o equipamento pode estar travado.

Vamos fazer o seguinte:
1️⃣ DESLIGUE o roteador da tomada
2️⃣ AGUARDE 60 segundos (1 minuto completo)
3️⃣ LIGUE novamente

Aguarde 1 minuto para o equipamento sincronizar com a rede.

Me avise quando ligar."
```

**Após cliente ligar:**
```
"Perfeito! Agora aguarde mais 1 minuto para o equipamento sincronizar 
e tente navegar.

Veja se voltou a funcionar?"
```

**Se não voltou:**
```
"Vamos tentar uma última ação antes de abrir o chamado técnico.

Por favor, retire com cuidado o CONECTOR VERDE (cabo de fibra óptica) 
do equipamento e reconecte novamente.

[VÍDEO/IMAGEM]

⚠️ Cuidado: segure pela base, não force, não dobre.

Aguarde 1 minuto, veja se a LUZ VERMELHA parou de PISCAR e ficou VERDE FIXA, e me avise."
```

**Escalação:** Abrir atendimento IXC → **Transferir para LOGÍSTICA**

---

### Cenário C: TX/RX FRACO (-27 / -2)

**Diagnóstico:** Sinal fraco/instável

**Frase Luan:**
```
"Detectei que o sinal da fibra está FRACO (RX: -27 dBm).
Isso pode causar instabilidade na conexão.

Verifique se a luz 'PON' ou 'LOS' está PISCANDO (não fixa).

Está piscando?"
```

**Se piscando:**
```
"Ok, luz PON piscando indica sinal óptico fora do padrão.
Às vezes vai navegar, outras vezes não.

Aguarde mais 2-3 minutos e teste a conexão.

Voltou?"
```

**Se não voltou:**
```
"Vamos tentar reconectar o cabo de fibra.

[VÍDEO/IMAGEM]

Aguarde 1 minuto após reconectar."
```

**Escalação:** Abrir atendimento IXC → **Transferir para SUPORTE**

---

### Cenário D: TX/RX CRÍTICO (-32 / -5)

**Diagnóstico:** Problema grave de rede (não tenta reboot)

**Frase Luan:**
```
"Detectei um PROBLEMA CRÍTICO no sinal da fibra (RX: -32 dBm).
Isso requer inspeção urgente da nossa equipe técnica.

Vou abrir o atendimento prioritário agora.

Protocolo IXC: [número]

Você será transferido imediatamente para nossa equipe técnica 
que vai agendar a visita com urgência."
```

**Escalação:** Abrir atendimento IXC IMEDIATAMENTE → **Transferir para SUPORTE**

---

## 📞 Casos Especiais

### Cliente recusa procedimento manual
```
"Entendo, [Nome]. Vou transferir você para um atendente humano do suporte 
que pode avaliar outras opções."
```
→ **Transferir para SUPORTE HUMANO**

### Cliente já fez reboot antes
Luan executa apenas procedimentos que NÃO precisam do cliente (consulta TX/RX, verificações)

### Cliente diz "já tentei tudo"
```
"Entendo sua frustração, [Nome]. Vou conectar você com nossa equipe 
especializada para uma análise mais profunda."
```
→ **Transferir para SUPORTE HUMANO**

---

## ⏱️ Gestão de Timeout

### Lógica de Tentativas:
- Cliente não responde em **1:30** → Perguntar novamente
- Cliente não responde em **5 minutos** → Perguntar novamente
- Após **15 minutos** sem resposta → Fechar interação

**Mensagem de fechamento:**
```
"Fechando interação por falta de contato. Quando precisar é só chamar novamente!"
```

---

## ✅ Confirmação de Sucesso

Luan confirma que o problema foi resolvido quando:
- ✅ Serviço volta ONLINE (sistema detecta automaticamente)
- ✅ Cliente responde "feito" ou "voltou"

---

## 📝 Mídia de Suporte

**Vídeo/Imagem do conector verde:**
- Local de upload: `src/assets/` ou `public/videos/`
- Aplicável para: qualquer modelo de ONU
- Conteúdo: Demonstração de como segurar, remover e reconectar o conector verde

---

**Fim do Documento**
