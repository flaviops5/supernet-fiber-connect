# 🎬 Tutorial em Vídeo #01: Admin Dashboard

**Duração estimada**: 8-10 minutos  
**Público-alvo**: Administradores do sistema  
**Nível**: Intermediário  
**Última atualização**: 31/10/2025

---

## 🎯 Objetivo do Vídeo

Demonstrar o uso completo do painel administrativo, incluindo monitoramento em tempo real, gestão de conversas, análise de métricas e configurações do sistema.

---

## 📝 Roteiro Completo

### [00:00 - 00:30] Abertura e Introdução

**[Tela: Logo Supernet + Título do tutorial]**

**Narração**:
> "Olá! Bem-vindo ao tutorial do Admin Dashboard da Supernet Fibra. Neste vídeo, você vai aprender a monitorar e gerenciar todo o sistema de atendimento omnichannel em tempo real. Sou [Nome], e vamos começar!"

**[Transição para tela do navegador]**

---

### [00:30 - 01:30] Visão Geral do Dashboard

**[Tela: /atendimento]**

**Narração**:
> "Este é o painel principal de atendimento. Aqui você visualiza todas as conversas ativas em tempo real, distribuídas entre nossos agentes inteligentes: Cloé, Luan, Julia e Vicente."

**[Mostrar interface do painel]**

**Ações na tela**:
- Apontar para lista de conversas
- Destacar contadores (conversas ativas, tempo médio)
- Mostrar filtros disponíveis

**Narração**:
> "No topo, temos os principais indicadores: número de conversas ativas, tempo médio de resposta e status dos agentes. Você pode filtrar conversas por agente, status ou tempo de espera."

---

### [01:30 - 03:00] Monitoramento de Conversas

**[Tela: Abrir uma conversa específica]**

**Narração**:
> "Vamos abrir uma conversa para ver o nível de detalhe disponível."

**[Clicar em conversa ativa]**

**Ações na tela**:
- Mostrar histórico completo de mensagens
- Apontar para informações do cliente (nome, status, plano)
- Destacar contexto da conversa

**Narração**:
> "Aqui temos o histórico completo da conversa, informações do cliente como status de conexão e plano contratado, além do contexto atual da interação. Veja que conseguimos identificar até o estado emocional do cliente."

**[Rolar para baixo mostrando mensagens]**

**Narração**:
> "Todas as mensagens são rastreadas, incluindo as ações automáticas executadas pelos agentes, como reboots remotos ou consultas de sinal."

---

### [03:00 - 04:30] Métricas do Sistema

**[Tela: /system-metrics]**

**Narração**:
> "Agora vamos para a seção de métricas. Aqui temos uma visão completa da saúde do sistema."

**[Mostrar dashboard de métricas]**

**Ações na tela**:
- Apontar para gráfico de conversas por dia
- Mostrar gráfico de resolução por agente
- Destacar taxa de satisfação (CSAT)

**Narração**:
> "Temos gráficos de evolução de conversas, taxa de resolução por agente, tempo médio de atendimento e, o mais importante, a satisfação do cliente medida através do CSAT."

**[Clicar em filtros de data]**

**Narração**:
> "Você pode filtrar por período específico para análises pontuais ou comparações mensais."

---

### [04:30 - 06:00] Monitoramento de Rede

**[Tela: /monitoramento]**

**Narração**:
> "Esta é a tela de monitoramento de rede. Aqui identificamos instabilidades em tempo real."

**[Mostrar mapa ou lista de regiões]**

**Ações na tela**:
- Mostrar indicador de mass outage
- Apontar para região afetada
- Destacar número de clientes impactados

**Narração**:
> "Quando há um mass outage, o sistema detecta automaticamente e exibe aqui. Veja: esta região está com instabilidade, afetando 47 clientes. O sistema já notificou todos automaticamente."

**[Clicar em detalhes do outage]**

**Narração**:
> "Você pode ver detalhes como horário de início, previsão de normalização e status da resolução."

---

### [06:00 - 07:30] Configurações do WhatsApp

**[Tela: /admin/whatsapp]**

**Narração**:
> "Uma das integrações mais importantes é com o WhatsApp. Vamos acessar as configurações."

**[Mostrar painel de configuração]**

**Ações na tela**:
- Mostrar instância conectada (SDR2)
- Testar conexão
- Exibir QR Code (se aplicável)

**Narração**:
> "Aqui você gerencia a conexão com a API Evolution. Pode testar a conexão, visualizar o QR Code para reconexão e verificar o status da instância."

**[Clicar em "Testar Conexão"]**

**Narração**:
> "Vamos testar... e pronto! Conexão ativa e funcionando perfeitamente. Em caso de desconexão, você recebe um alerta aqui mesmo."

---

### [07:30 - 08:30] Health Check e Circuit Breaker

**[Tela: Abrir console de desenvolvedor ou endpoint /system-health]**

**Narração**:
> "Para monitoramento técnico avançado, temos o endpoint de health check."

**[Mostrar JSON do health check]**

**Ações na tela**:
- Destacar status do banco de dados
- Apontar para status do circuit breaker
- Mostrar tamanho da DLQ

**Narração**:
> "Este endpoint retorna o status de todos os componentes críticos: banco de dados, circuit breaker, filas de mensagens e integrações externas."

**[Mostrar exemplo de circuit breaker aberto]**

**Narração**:
> "Se o circuit breaker estiver aberto, indicando falhas no IXC, você pode resetá-lo manualmente através do endpoint específico. Isso evita sobrecarga do sistema externo."

---

### [08:30 - 09:30] Gestão de Alertas e DLQ

**[Tela: Voltar para /system-metrics ou painel de alertas]**

**Narração**:
> "Sempre fique de olho na Dead Letter Queue, ou DLQ. Ela acumula mensagens que falharam no processamento."

**[Mostrar contador de DLQ]**

**Ações na tela**:
- Apontar para número de mensagens na DLQ
- Mostrar botão "Processar DLQ"

**Narração**:
> "Quando o número de mensagens cresce, é sinal de que algo está errado. Você pode reprocessá-las manualmente ou investigar a causa raiz."

**[Clicar em "Processar DLQ"]**

**Narração**:
> "Pronto! As mensagens foram reenviadas para processamento. Agora é só acompanhar se são resolvidas com sucesso."

---

### [09:30 - 10:00] Encerramento

**[Tela: Voltar para dashboard principal]**

**Narração**:
> "E é isso! Você agora conhece as principais funcionalidades do Admin Dashboard. Com ele, você monitora conversas, analisa métricas, identifica problemas de rede e gerencia integrações, tudo em tempo real."

**[Transição para tela de encerramento com logos e links]**

**Narração**:
> "Para mais informações, consulte a documentação completa em /docs ou entre em contato com o suporte técnico. Até a próxima!"

**[Música de encerramento]**

---

## 🎬 Notas de Produção

### Equipamentos Recomendados

- **Software de gravação**: OBS Studio (gratuito)
- **Resolução**: 1920x1080 (Full HD)
- **Frame rate**: 30 FPS
- **Microfone**: Qualquer microfone USB de qualidade
- **Editor de vídeo**: DaVinci Resolve (gratuito) ou Adobe Premiere

### Configurações do OBS Studio

```
Configurações de Vídeo:
- Base (Canvas): 1920x1080
- Saída (Escalada): 1920x1080
- FPS: 30

Configurações de Gravação:
- Formato: MP4
- Encoder: x264
- Taxa de bits: 5000 Kbps
- Preset: High Quality
```

### Dicas de Gravação

1. **Limpe o navegador**: Sem favoritos ou abas desnecessárias visíveis
2. **Use cursor destacado**: Facilita acompanhamento
3. **Grave em ambiente silencioso**: Minimize ruídos de fundo
4. **Pratique antes**: Faça pelo menos 1 run de teste
5. **Use zoom**: Aproxime elementos importantes na edição
6. **Adicione legendas**: Acessibilidade é essencial

### Elementos Visuais

- **Intro animada**: 5s com logo Supernet
- **Lower thirds**: Nome do narrador + cargo
- **Call-outs**: Setas e círculos para destacar elementos
- **Transições**: Fade simples entre seções
- **Música de fundo**: Instrumental suave, 20% de volume

---

## 📋 Checklist de Qualidade

Antes de publicar o vídeo:

- [ ] Áudio claro e sem ruídos
- [ ] Todos os elementos da tela visíveis (texto legível)
- [ ] Transições suaves entre seções
- [ ] Tempo total dentro de 8-10 minutos
- [ ] Legendas adicionadas (português)
- [ ] Thumbnail atrativa criada
- [ ] Vídeo testado em diferentes dispositivos
- [ ] Links na descrição do vídeo funcionando

---

## 🔗 Recursos Adicionais

- **Documentação relacionada**: `docs/operational-guide.md`
- **Acesso ao dashboard**: `https://[seu-dominio].com/atendimento`
- **Canal de suporte**: Discord/Slack interno

---

## 📊 Métricas de Sucesso

Acompanhe após publicação:

- **Visualizações**: Meta de 80% dos admins nos primeiros 30 dias
- **Taxa de conclusão**: ≥ 70%
- **Feedback**: CSAT ≥ 4.5/5
- **Dúvidas pós-vídeo**: Redução de 40% em tickets de suporte sobre o tema

---

**Status**: 📝 Roteiro pronto para gravação  
**Responsável**: [Nome do produtor]  
**Prazo**: [Data]
