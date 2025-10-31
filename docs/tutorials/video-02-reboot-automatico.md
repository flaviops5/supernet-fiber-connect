# 🎬 Tutorial em Vídeo #02: Reboot Automático

**Duração estimada**: 6-8 minutos  
**Público-alvo**: Operadores técnicos e administradores  
**Nível**: Intermediário  
**Última atualização**: 31/10/2025

---

## 🎯 Objetivo do Vídeo

Explicar o funcionamento do sistema de reboot automático híbrido (Cloé + Luan), demonstrando o fluxo completo desde a detecção do problema até a resolução, e como monitorar sua eficácia.

---

## 📝 Roteiro Completo

### [00:00 - 00:30] Abertura e Contexto

**[Tela: Animação mostrando equipamento offline → reboot → online]**

**Narração**:
> "Olá! Neste tutorial, você vai entender como funciona nosso sistema de reboot automático, uma das funcionalidades mais poderosas da Supernet. Esse sistema resolve automaticamente 70-80% dos casos de conexão offline em menos de 2 minutos. Vamos ver como!"

**[Transição para tela real do sistema]**

---

### [00:30 - 01:30] Arquitetura do Sistema Híbrido

**[Tela: Diagrama do fluxo Cloé → Luan]**

**Narração**:
> "O sistema é chamado de 'híbrido' porque envolve dois agentes trabalhando juntos: a Cloé e o Luan."

**[Animação mostrando fluxo]**

**Ações na tela**:
- Mostrar Cloé detectando cliente OFFLINE
- Seta indicando transferência para Luan
- Luan executando reboot em background

**Narração**:
> "A Cloé detecta que o cliente está offline e imediatamente transfere para o Luan, nosso técnico especializado. O diferencial é que o Luan NÃO fica esperando o reboot terminar. Ele responde o cliente instantaneamente e executa o reboot em background."

**[Destacar tempo de resposta: 2 segundos]**

---

### [01:30 - 03:00] Demonstração Prática: Visão do Cliente

**[Tela: Simulação de conversa no WhatsApp]**

**Narração**:
> "Vamos ver como isso funciona do ponto de vista do cliente."

**[Mostrar chat simulado]**

**Ações na tela**:
1. Cliente envia: "Minha internet caiu"
2. Cloé responde: "Oi João! Vi que seu equipamento está offline. Vou te passar para o Luan!"
3. Luan responde (imediato): "Oi João! Já iniciei um diagnóstico completo do seu equipamento!"
4. [66 segundos depois] Luan atualiza: "✅ Pronto! Reiniciei seu equipamento remotamente."

**Narração**:
> "Veja: o cliente recebe resposta em 2 segundos, mesmo que o reboot demore 66 segundos para completar. Isso elimina a sensação de espera e melhora drasticamente a experiência."

---

### [03:00 - 04:30] Demonstração Técnica: Nos Bastidores

**[Tela: Console ou logs do sistema]**

**Narração**:
> "Agora vamos ver o que acontece nos bastidores durante esse processo."

**[Mostrar logs em tempo real]**

**Ações na tela**:
1. Log: `[Cloé] Detectado cliente OFFLINE: clientId=12345`
2. Log: `[Cloé] Transferindo para Luan com suggestAutoReboot=true`
3. Log: `[Luan] Recebido com flag de auto-reboot, respondendo imediatamente`
4. Log: `[Luan] Iniciando reboot em background via ixc-reboot-device`
5. Log: `[IXC API] Comando enviado, aguardando resposta (66s)`
6. Log: `[Luan] Reboot concluído com sucesso, atualizando cliente`

**Narração**:
> "Veja que o Luan NÃO espera a resposta da API do IXC para responder o cliente. Ele executa em paralelo, otimizando o tempo de atendimento."

---

### [04:30 - 05:30] Monitoramento e Resultados

**[Tela: Tabela `equipment_reboots` no banco de dados]**

**Narração**:
> "Todos os reboots são registrados na tabela `equipment_reboots`. Vamos consultar os últimos executados."

**[Mostrar query SQL]**

```sql
SELECT 
  client_id,
  status,
  created_at,
  completed_at,
  EXTRACT(EPOCH FROM (completed_at - created_at)) as duration_seconds
FROM equipment_reboots
ORDER BY created_at DESC
LIMIT 10;
```

**[Mostrar resultado]**

**Ações na tela**:
- Destacar coluna `status` (success/failed)
- Apontar para `duration_seconds` (~66s)
- Mostrar taxa de sucesso

**Narração**:
> "Veja que a maioria dos reboots leva cerca de 66 segundos e tem alta taxa de sucesso. Quando falha, o sistema automaticamente escala para investigação manual."

---

### [05:30 - 06:30] Taxa de Resolução e Impacto

**[Tela: Dashboard de métricas mostrando taxa de resolução]**

**Narração**:
> "O impacto desse sistema é imenso. Vamos ver os números."

**[Mostrar gráficos]**

**Ações na tela**:
- Gráfico: Taxa de resolução do Luan: 80%+
- Gráfico: Tempo médio de diagnóstico: 68s (antes: 5min)
- Gráfico: CSAT do Luan: 4.7/5

**Narração**:
> "Antes do sistema híbrido, o tempo médio de diagnóstico era de 5 minutos. Agora é de apenas 68 segundos, uma redução de 86%. E o mais importante: a satisfação do cliente aumentou significativamente."

---

### [06:30 - 07:30] Casos Especiais e Escalação

**[Tela: Exemplo de reboot falhado]**

**Narração**:
> "E quando o reboot falha? O sistema não para por aí."

**[Mostrar fluxo de escalação]**

**Ações na tela**:
- Log: `[Luan] Reboot falhou após 3 tentativas`
- Log: `[Luan] Consultando sinal ONU para diagnóstico avançado`
- Log: `[Luan] Sinal crítico detectado: RX -29.2 dBm`
- Log: `[Luan] Abrindo ticket IXC urgente`

**Narração**:
> "Quando o reboot não resolve, o Luan automaticamente avança para o próximo passo: consulta de sinal ONU. Se detectar problema físico, abre um ticket para a equipe de campo. Tudo automático, sem intervenção humana."

---

### [07:30 - 08:00] Encerramento e Recursos

**[Tela: Documentação relacionada]**

**Narração**:
> "Recapitulando: o sistema de reboot automático híbrido combina rapidez na resposta com eficiência na resolução. Cliente satisfeito, problema resolvido, time técnico focado apenas em casos complexos."

**[Mostrar links]**

**Narração**:
> "Para saber mais, consulte a documentação completa do sistema híbrido, o guia do Luan ou o guia operacional. Até a próxima!"

**[Música de encerramento]**

---

## 🎬 Notas de Produção

### Equipamentos e Configurações

- **Software de gravação**: OBS Studio
- **Resolução**: 1920x1080 (Full HD)
- **Frame rate**: 30 FPS
- **Duração ideal**: 6-8 minutos
- **Formato**: MP4 (H.264)

### Elementos Visuais Necessários

1. **Animações**:
   - Fluxo Cloé → Luan (diagrama animado)
   - Linha do tempo do reboot (0s → 66s → conclusão)
   - Gráficos de taxa de sucesso

2. **Telas a gravar**:
   - Simulação de chat WhatsApp
   - Console com logs em tempo real
   - Query no banco de dados (Supabase)
   - Dashboard de métricas

3. **Elementos de texto**:
   - Lower third: "Sistema Híbrido: Cloé + Luan"
   - Call-outs: "66s de execução", "Taxa de sucesso: 80%"
   - Código SQL formatado

---

## 🎨 Storyboard Visual

```
┌─────────────────────┐
│  00:00 - Intro      │
│  [Logo + Animação]  │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  01:30 - Chat Demo  │
│  [WhatsApp mockup]  │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  03:00 - Logs       │
│  [Terminal/Console] │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  05:30 - Métricas   │
│  [Dashboard]        │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  07:30 - Encerra.   │
│  [Docs + Links]     │
└─────────────────────┘
```

---

## 📋 Checklist de Gravação

Antes de gravar:

- [ ] Preparar ambiente de teste funcional
- [ ] Popular banco com dados de exemplo
- [ ] Ter logs simulados prontos
- [ ] Criar mockup do WhatsApp (Figma ou similar)
- [ ] Preparar dashboard com dados reais
- [ ] Testar áudio e iluminação

Durante a gravação:

- [ ] Falar de forma clara e pausada
- [ ] Destacar elementos importantes (zoom, setas)
- [ ] Respeitar tempos do roteiro
- [ ] Gravar takes extras de seções complexas

Pós-produção:

- [ ] Adicionar animações nos momentos-chave
- [ ] Inserir música de fundo (instrumental)
- [ ] Adicionar legendas em português
- [ ] Criar thumbnail atrativa
- [ ] Exportar em qualidade Full HD

---

## 📊 Métricas de Sucesso

Após publicação, acompanhar:

- **Visualizações**: Meta de 90% da equipe técnica em 15 dias
- **Taxa de conclusão**: ≥ 75%
- **Feedback**: CSAT ≥ 4.6/5
- **Redução de dúvidas**: 50% menos perguntas sobre "como funciona o reboot"

---

## 🔗 Recursos Relacionados

- **Documentação técnica**: `docs/reboot-hibrido-implementacao.md`
- **Guia do Luan**: `docs/guides/luan-aquino-guide.md`
- **Guia operacional**: `docs/operational-guide.md`
- **Tabela no banco**: `equipment_reboots`

---

**Status**: 📝 Roteiro pronto para gravação  
**Responsável**: [Nome do produtor]  
**Prazo**: [Data]  
**Plataforma de publicação**: YouTube interno / LMS da empresa
