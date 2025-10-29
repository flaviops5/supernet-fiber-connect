# 📝 VARIAÇÕES APROVADAS - SCRIPTS TÉCNICOS

**Sistema de Variações Aprovadas para Luan Aquino**  
Versão 2.1.0 | Support Tech Agent | PR #6 - Mídia Guiada

---

## 🎯 PR #6 - Regras de Mídia Guiada

**SEMPRE usar mídia ANTES do texto quando disponível:**
- ✅ "Conector verde - parte onde a fibra entra" (linguagem simples)
- ✅ "Luz vermelha LOS" (termo conhecido)
- ❌ Evitar: "conector SC/APC", "PON loss of signal" (termos técnicos)

**Contextos de mídia disponíveis:**
- `los_detected` - Imagem da luz LOS + áudio explicativo
- `fiber_reconnect` - Guia visual de reconexão + áudio do Luan
- `onu_visual` - Vista frontal do ONU com luzes
- `cpf_request` - Áudio da Cloé solicitando CPF

**Fallback automático:** Se mídia falhar, continuar com texto normal.

---

## 🔴 CENÁRIO A: SEM_ENERGIA (TX 0.00 / RX 0.00)

### Diagnóstico:
Cliente sem energia na ONU ou cabo desconectado (LOS).

### 🎬 Mídia: `los_detected`
**Exibir imagem da luz LOS + áudio explicativo ANTES do texto**

### Script Inicial:

```
[Nome], pelo que vi aqui, parece que o aparelhinho está sem energia ou o cabo está desconectado.

Você pode verificar se:
1. As luzes do aparelhinho estão acesas?
2. O cabo que vem da parede está bem conectado?
```

### Follow-up 1 - Cliente Confirmou Desconectado:

```
Perfeito! Pode conectar o cabo de volta e aguardar uns 2 minutos para o aparelhinho reiniciar?

Enquanto isso, vou monitorar aqui do meu lado.
```

### Follow-up 2 - Cliente Confirmou Cabo OK:

### 🎬 Mídia: `fiber_reconnect`
**Exibir guia visual de reconexão + áudio do Luan ANTES do texto**

```
Entendi. Nesse caso, vou te mostrar como reconectar o cabo da fibra - é bem simples!

[MÍDIA: Imagem guiada de reconexão]

Consegue seguir essas instruções?
```

**Tool Call**: `criar_atendimento_ixc` (urgência: **MEDIA**)

### Follow-up 3 - Após Reconexão (aguardar 2 min):

```
E aí, [Nome], as luzes voltaram? A internet já está funcionando?
```

**Se SIM → Encerramento de Sucesso**  
**Se NÃO → Escalar para logística**

---

## 🟢 CENÁRIO B: TRAVADO (RX bom entre -15 e -22)

### Diagnóstico:
Sinal excelente, mas cliente offline = equipamento travado.

### Script Inicial:

```
[Nome], pelo que vi aqui, o sinal está perfeito, mas o aparelhinho parece estar travado.

Vou fazer um teste de conectividade rápido, ok?
```

**Tool Call**: `test_equipment_connectivity`

### Follow-up 1 - Equipamento Respondeu:

```
Ótimo! O equipamento respondeu ao teste. Agora vou reiniciá-lo remotamente.

Aguarda uns 2 minutos enquanto ele reinicia, ok?
```

**Tool Call**: `reboot_client_equipment`

### Follow-up 2 - Após Reboot (aguardar 2 min):

```
E aí, [Nome], a internet voltou? Consegue testar pra mim?
```

**Se SIM → Encerramento de Sucesso**  
**Se NÃO → Orientar reconexão manual**

### Follow-up 3 - Orientação Reconexão Manual:

```
Beleza, [Nome]. Vamos tentar desligar e religar o aparelhinho:

1. Desconecta o cabo de energia (o cabo preto redondo)
2. Aguarda 10 segundos
3. Conecta de volta

Consegue fazer isso pra mim?
```

**Se funcionar → Sucesso**  
**Se não funcionar → Escalar**

---

## 🟡 CENÁRIO C: SINAL_FRACO (RX entre -23 e -27)

### Diagnóstico:
Sinal abaixo do ideal, pode causar instabilidade intermitente.

### Script Inicial:

```
[Nome], identifiquei que o sinal está um pouco fraco aqui.

Isso pode ser por conta do conector do cabo ou alguma curvatura na fibra.

Vou pedir para um técnico verificar essa conexão aí, ok? É rapidinho!
```

**Tool Call**: `criar_atendimento_ixc` (urgência: **MEDIA**)

### Follow-up 3 - Tentativa de Estabilização:

### 🎬 Mídia: `fiber_reconnect`
**Exibir guia visual ANTES do texto**

```
Enquanto o técnico não chega, vamos tentar uma coisa:

[MÍDIA: Guia de reconexão]

Consegue fazer essa reconexão do cabo?
```

**Aguardar resposta do cliente**

### Follow-up - Se Melhorar:

```
Ótimo, [Nome]! O sinal melhorou um pouco aqui.

Mesmo assim, vou manter o chamado para o técnico verificar direitinho, ok?
Assim evitamos que aconteça de novo.
```

---

## 🔴 CENÁRIO D: CRITICO (RX -28 ou menor)

### Diagnóstico:
Sinal crítico - problema grave de infraestrutura ou hardware.

### Script Inicial:

```
[Nome], identifiquei um problema mais sério no sinal aqui.

Isso geralmente indica problema no cabo ou no conector, e precisa de uma verificação técnica presencial.

Vou abrir um chamado prioritário para resolver isso hoje mesmo, ok?
```

**Tool Call**: `criar_atendimento_ixc` (urgência: **ALTA**)

### Follow-up - Confirmação:

```
Pronto, [Nome]! Chamado aberto com prioridade alta.

O técnico deve entrar em contato em até [prazo SLA] para agendar a visita.

Você vai receber uma notificação por SMS/WhatsApp, ok?
```

### Não Solicitar Testes:

⚠️ **IMPORTANTE**: Em cenário crítico, **NÃO** pedir para cliente desconectar/reconectar. Ir direto para escalação.

---

## 🟠 CENÁRIO E: ROTEADOR / PORTA WAN / WI-FI (PR #26)

### Diagnóstico:
ONU e sinal óptico OK (RX > -24 dBm), mas cliente sem internet. Possíveis causas: Wi-Fi, porta WAN sem link, PPPoE down.

### scenario_e_check_wifi_led
```
Seu **celular conecta** na rede Wi-Fi mas **não navega**, ou **nem conecta**?
As luzes do **Wi-Fi** no roteador estão **acesas**?
```

### scenario_e_check_wan_cable
```
Vamos conferir o **cabo da porta WAN** (que liga o roteador à caixinha da fibra).
Retire e **reconecte** com firmeza nas duas pontas.
⚠️ **Não** troque para a porta LAN — LAN é rede interna, não dá internet.
```

### scenario_e_router_reboot
```
Reinicie apenas o **roteador Wi-Fi**: desligue da tomada, aguarde **60s** e ligue novamente.
Depois de **1 minuto**, teste a navegação e me avise.
```

### scenario_e_ticket
```
Ainda sem navegação. Vou abrir atendimento para verificar **porta WAN**, **cabo** ou **configuração de Internet** do roteador.
```

**Tool Call**: `criar_atendimento_ixc` (prioridade: **ALTA**)

---

## ⏱️ SCRIPTS DE TIMEOUT

### TIMEOUT_1 (1:30 sem resposta):

```
[Nome], você ainda está por aí?

Se precisar de mais tempo, sem problema! Estou aqui aguardando.
```

---

### TIMEOUT_2 (5:00 sem resposta):

```
[Nome], vou precisar encerrar o atendimento por aqui por conta do tempo.

Mas fique tranquilo, você pode retornar quando quiser que a gente continua de onde paramos, ok?

Até mais! 👋
```

**Action**: Marcar conversa como `timeout_5min`

---

### TIMEOUT_3 (15:00 sem resposta):

**Encerramento Automático Silencioso**

**Action**: 
- Marcar conversa como `timeout_final`
- Registrar no log: `closed_by: "timeout"`, `stage: "15min"`

---

## 🎯 SCRIPTS DE ENCERRAMENTO

### ✅ Encerramento de Sucesso:

```
Que bom que deu certo por aí, [Nome]!

Qualquer coisa, só entrar em contato com a gente! Tenha um ótimo dia! 👋😊
```

**Log**: `resolved: true`, `method: "remote"`

---

### 📋 Encerramento com Chamado Aberto:

```
Pronto, [Nome]! Chamado aberto aqui no sistema.

O técnico vai entrar em contato para agendar a visita. Você vai receber uma notificação, ok?

Obrigado pela paciência! 👋
```

**Log**: `resolved: false`, `method: "escalated"`, `ticket_id: "xxx"`

---

### 😊 Encerramento por Resolução Prévia:

```
Que ótimo que já normalizou por aí, [Nome]!

Às vezes o sistema estabiliza sozinho mesmo. Qualquer coisa, só chamar!

Tenha um ótimo dia! 👋😊
```

**Log**: `resolved: true`, `method: "self_recovery"`

---

## 🔄 HANDOVER - PASSAGEM DE BASTÃO

### Para Financeiro (support-financial-agent):

```
[Nome], pelo que vi aqui, parece ser uma questão financeira.

Vou te transferir para o Daniel Souza, especialista em financeiro da Supernet.

Ele vai te ajudar com isso agora, ok?
```

**Metadata**: `transferred_to: "support-financial-agent"`, `reason: "financial_issue"`

---

### Para Vendas (sales-agent):

```
[Nome], vejo que você tem interesse em nossos planos!

Vou te transferir para a Fernanda Ribeiro, consultora de vendas da Supernet.

Ela vai te apresentar as melhores opções, ok?
```

**Metadata**: `transferred_to: "sales-agent"`, `reason: "sales_interest"`

---

### Para Telemedicina (telemedicina-agent):

```
[Nome], vejo que você quer saber sobre Telemedicina!

Vou te transferir para a Ana Costa, especialista em saúde da Supernet.

Ela vai te explicar tudo sobre esse serviço, ok?
```

**Metadata**: `transferred_to: "telemedicina-agent"`, `reason: "telemedicina_inquiry"`

---

## 📊 SCRIPTS DE FRUSTRAÇÃO

### Cliente Frustrado - Nível 1:

```
Entendo sua frustração, [Nome]. Problema de internet é realmente chato.

Vamos resolver isso juntos agora, ok? Estou aqui para ajudar.
```

---

### Cliente Frustrado - Nível 2:

```
[Nome], eu realmente entendo o quanto isso é frustrante.

Se preferir, posso abrir um chamado prioritário para visita técnica.

O que você acha?
```

---

### Cliente Frustrado - Nível 3 (Extremo):

```
[Nome], entendo perfeitamente sua situação.

Vou abrir um chamado com máxima prioridade e vou pedir para o supervisor acompanhar pessoalmente, ok?

Você vai receber um retorno rápido.
```

**Action**: Escalar para suporte humano + marcar como `escalation_priority_high`

---

**FIM DAS VARIAÇÕES - LUAN AQUINO v2.0.0**
