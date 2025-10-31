# 🎬 Tutorial em Vídeo #03: Mass Outage Management

**Duração estimada**: 7-9 minutos  
**Público-alvo**: Administradores, operadores NOC e supervisores  
**Nível**: Avançado  
**Última atualização**: 31/10/2025

---

## 🎯 Objetivo do Vídeo

Ensinar a detectar, gerenciar e resolver situações de mass outage (interrupções em massa), utilizando as ferramentas de monitoramento e comunicação automática com clientes afetados.

---

## 📝 Roteiro Completo

### [00:00 - 00:30] Abertura e Definição

**[Tela: Animação de mapa com múltiplos pontos vermelhos]**

**Narração**:
> "Olá! Neste tutorial, vamos abordar um dos cenários mais críticos no provedor de internet: o mass outage, ou interrupção em massa. Você vai aprender a detectar, gerenciar e comunicar esses incidentes de forma eficiente, minimizando impacto e insatisfação. Vamos lá!"

**[Transição para tela real do sistema]**

---

### [00:30 - 01:30] O que é Mass Outage?

**[Tela: Slide com definição + gráfico]**

**Narração**:
> "Mass outage é quando múltiplos clientes ficam offline simultaneamente devido a uma falha na infraestrutura. Pode ser um problema na OLT, rompimento de fibra ou instabilidade na rede core."

**[Mostrar gráfico de linha: clientes online vs tempo]**

**Ações na tela**:
- Gráfico mostra queda brusca de 500 clientes online para 200
- Destacar momento exato da queda

**Narração**:
> "O sistema detecta automaticamente quando há uma queda anormal no número de clientes online em uma região específica. Veja aqui: em menos de 5 minutos, 300 clientes ficaram offline. Isso é um mass outage."

**[Transição para critério de detecção]**

**Narração**:
> "O critério padrão é: 5 ou mais clientes offline na mesma região, dentro de 10 minutos. Esses parâmetros são configuráveis."

---

### [01:30 - 03:00] Detecção Automática

**[Tela: /monitoramento mostrando alerta ativo]**

**Narração**:
> "Quando um mass outage é detectado, o sistema gera um alerta automático. Vamos ver como isso aparece no painel de monitoramento."

**[Mostrar interface de monitoramento]**

**Ações na tela**:
- Alerta vermelho piscando: "Mass Outage Detectado"
- Clicar no alerta para ver detalhes

**[Tela de detalhes do mass outage]**

**Informações exibidas**:
```
🚨 Mass Outage Ativo

Região: Zona Norte - Bairro Jardim das Flores
Clientes afetados: 47
Horário de início: 14:32
Status: EM ANÁLISE
Previsão de normalização: 16:00 (estimativa)
Prioridade: ALTA
```

**Narração**:
> "Aqui temos todas as informações críticas: região afetada, número de clientes, horário de início e status atual. Vamos gerenciar esse incidente."

---

### [03:00 - 04:30] Comunicação Automática com Clientes

**[Tela: Interface de gestão do mass outage]**

**Narração**:
> "O sistema NÃO apenas detecta, ele também comunica automaticamente todos os clientes afetados."

**[Mostrar botão "Notificar Clientes"]**

**Ações na tela**:
- Clicar em "Notificar Clientes"
- Mostrar modal com template de mensagem

**[Template exibido]**

```
Olá [Nome]!

Identificamos uma instabilidade técnica na sua região (Jardim das Flores).

Status: Em análise pela equipe técnica
Clientes afetados: 47
Previsão de normalização: 16:00

Você será notificado assim que resolvermos!

Desculpe o transtorno.
- Equipe Supernet
```

**Narração**:
> "Essa mensagem é enviada automaticamente via WhatsApp para todos os 47 clientes. Isso reduz drasticamente o volume de contatos no suporte, porque os clientes já sabem o que está acontecendo."

**[Confirmar envio]**

**Narração**:
> "Pronto! Todas as mensagens foram enviadas. Agora os clientes estão informados."

---

### [04:30 - 05:30] Gestão do Incidente

**[Tela: Formulário de atualização do mass outage]**

**Narração**:
> "Enquanto a equipe técnica trabalha na resolução, você pode atualizar o status do incidente em tempo real."

**[Mostrar campos do formulário]**

**Ações na tela**:
- Campo "Status": alterar de "EM ANÁLISE" para "EM RESOLUÇÃO"
- Campo "Previsão": atualizar para "15:30"
- Campo "Descrição": adicionar "Identificado problema na OLT. Equipe em campo."

**[Clicar em "Atualizar"]**

**Narração**:
> "Cada atualização pode gerar uma nova notificação automática para os clientes, mantendo-os sempre informados. Isso é transparência e reduz ansiedade."

---

### [05:30 - 06:30] Resolução e Notificação de Normalização

**[Tela: Interface de resolução]**

**Narração**:
> "Quando o problema é resolvido, você marca o mass outage como RESOLVIDO."

**[Mostrar interface]**

**Ações na tela**:
- Alterar status para "RESOLVIDO"
- Adicionar nota: "OLT reiniciada, todos os clientes online novamente"
- Marcar checkbox "Notificar clientes sobre resolução"

**[Clicar em "Finalizar Incidente"]**

**[Mostrar mensagem automática enviada]**

```
Ótimas notícias, [Nome]! 🎉

O problema técnico na sua região foi resolvido!

Sua internet deve voltar ao normal nos próximos 2 minutos.

Se continuar com problemas, é só nos chamar!

- Equipe Supernet
```

**Narração**:
> "Todos os clientes recebem a confirmação de que o problema foi resolvido. Isso gera uma percepção muito positiva de eficiência e cuidado."

---

### [06:30 - 07:30] Análise Pós-Incidente

**[Tela: Relatório de mass outage]**

**Narração**:
> "Após resolver, é essencial analisar o incidente para prevenir recorrências."

**[Mostrar relatório]**

**Dados exibidos**:
```
📊 Relatório do Incidente

Duração total: 1h 28min
Clientes afetados: 47
Mensagens enviadas: 94 (notificação + resolução)
Tickets abertos durante: 3 (apenas 6%)
Downtime médio por cliente: 88 minutos
CSAT pós-incidente: 3.8/5 (aceitável considerando o contexto)

Causa raiz: Falha na OLT-03, porta PON 4
Ação preventiva: Agendar manutenção preventiva mensal
```

**Narração**:
> "Veja que apenas 6% dos clientes abriram tickets durante o outage. Isso mostra que a comunicação proativa funcionou. O CSAT de 3.8 é aceitável considerando a gravidade do incidente."

---

### [07:30 - 08:30] Prevenção e Monitoramento Contínuo

**[Tela: Dashboard de saúde da rede]**

**Narração**:
> "Para evitar mass outages, monitore constantemente a saúde da infraestrutura."

**[Mostrar gráficos de monitoramento]**

**Ações na tela**:
- Gráfico de uso das OLTs (% capacidade)
- Gráfico de latência média por região
- Alertas de equipamentos próximos da capacidade

**Narração**:
> "Se uma OLT está com uso acima de 80%, é hora de expandir. Se a latência de uma região está aumentando, investigue antes que vire um outage."

**[Destacar equipamento em alerta]**

**Narração**:
> "Aqui, por exemplo, a OLT-05 está com 85% de uso. Vamos agendar expansão antes que cause problemas."

---

### [08:30 - 09:00] Encerramento

**[Tela: Checklist de boas práticas]**

**Narração**:
> "Recapitulando as boas práticas no gerenciamento de mass outage:"

**[Exibir checklist animado]**

```
✅ Monitore alertas em tempo real
✅ Comunique clientes IMEDIATAMENTE
✅ Atualize status regularmente
✅ Notifique quando resolver
✅ Analise causa raiz pós-incidente
✅ Implemente ações preventivas
```

**Narração**:
> "Seguindo essas práticas, você minimiza o impacto de interrupções e mantém a confiança dos clientes. Para mais informações, consulte a documentação completa. Até a próxima!"

**[Transição para tela de encerramento com links]**

**[Música de encerramento]**

---

## 🎬 Notas de Produção

### Equipamentos e Configurações

- **Software de gravação**: OBS Studio
- **Resolução**: 1920x1080 (Full HD)
- **Frame rate**: 30 FPS
- **Duração ideal**: 7-9 minutos
- **Formato**: MP4 (H.264)

### Elementos Visuais Necessários

1. **Animações**:
   - Mapa com pontos vermelhos representando clientes offline
   - Gráfico de linha mostrando queda brusca de conexões
   - Ícone de notificação pulsando (WhatsApp)

2. **Telas a gravar**:
   - Painel de monitoramento (`/monitoramento`)
   - Interface de gestão de mass outage (admin)
   - Simulação de mensagens WhatsApp
   - Dashboard de métricas pós-incidente

3. **Elementos de texto**:
   - Lower thirds: "Mass Outage: 47 clientes afetados"
   - Call-outs: "Comunicação automática", "6% de tickets abertos"
   - Templates de mensagens

---

## 🎨 Storyboard Visual

```
┌─────────────────────┐
│  00:00 - Intro      │
│  [Mapa animado]     │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  01:30 - Detecção   │
│  [Dashboard alerta] │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  03:00 - Notificar  │
│  [WhatsApp mockup]  │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  05:30 - Resolução  │
│  [Interface admin]  │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  06:30 - Relatório  │
│  [Análise dados]    │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  08:30 - Encerra.   │
│  [Checklist]        │
└─────────────────────┘
```

---

## 📋 Checklist de Gravação

Antes de gravar:

- [ ] Preparar ambiente de staging com mass outage simulado
- [ ] Criar dataset de 47 clientes fictícios
- [ ] Configurar alertas no painel de monitoramento
- [ ] Preparar templates de mensagens
- [ ] Ter relatório pós-incidente pronto

Durante a gravação:

- [ ] Demonstrar detecção em tempo real
- [ ] Simular envio de notificações (com animação)
- [ ] Mostrar atualização de status
- [ ] Exibir resolução completa do incidente
- [ ] Apresentar análise de dados

Pós-produção:

- [ ] Adicionar animações de mapa e gráficos
- [ ] Inserir músicade fundo (tom sério mas esperançoso)
- [ ] Adicionar legendas em português
- [ ] Criar thumbnail: "🚨 MASS OUTAGE: Como Gerenciar"
- [ ] Exportar em qualidade Full HD

---

## 📊 Métricas de Sucesso

Após publicação, acompanhar:

- **Visualizações**: Meta de 100% dos supervisores e NOC em 7 dias
- **Taxa de conclusão**: ≥ 80%
- **Feedback**: CSAT ≥ 4.7/5
- **Aplicação prática**: Redução de 30% no tempo de resposta a mass outages

---

## 🔗 Recursos Relacionados

- **Guia operacional**: `docs/operational-guide.md`
- **Painel de monitoramento**: `/monitoramento`
- **Documentação técnica**: `docs/knowledge-base/data-sources/sistema/mass-outage.md`

---

**Status**: 📝 Roteiro pronto para gravação  
**Responsável**: [Nome do produtor]  
**Prazo**: [Data]  
**Plataforma de publicação**: YouTube interno / Portal de treinamento
