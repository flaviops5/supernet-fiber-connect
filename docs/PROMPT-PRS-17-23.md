# 🚀 PROMPT ESTRUTURADO - PRs #17 a #23
## Sistema de Requisição de PRs com Alta Precisão

---

## 📋 INSTRUÇÕES GERAIS PARA IA

Quando o usuário solicitar a implementação de **qualquer PR (17-23)**, você DEVE:

1. ✅ **LER ESTE DOCUMENTO COMPLETO** antes de iniciar
2. ✅ **SEGUIR A ESTRUTURA EXATA** de cada PR
3. ✅ **VALIDAR PRÉ-REQUISITOS** antes de implementar
4. ✅ **DOCUMENTAR MUDANÇAS** em arquivo dedicado (ex: `docs/PR-17-IMPLEMENTACAO.md`)
5. ✅ **EXECUTAR CHECKLIST** completo ao final
6. ✅ **CRIAR TESTES** quando aplicável
7. ✅ **ATUALIZAR MÉTRICAS** no sistema de logs

---

## 🎯 TEMPLATE DE EXECUÇÃO (COPIAR PARA CADA PR)

```markdown
# PR #[NÚMERO] - [NOME]
## IMPLEMENTAÇÃO

### 📊 Status
- [ ] Pré-requisitos validados
- [ ] Arquivos lidos e analisados
- [ ] Mudanças implementadas
- [ ] Testes criados
- [ ] Documentação atualizada
- [ ] Checklist completo
- [ ] Métricas configuradas

### 🔍 Pré-requisitos
[Listar arquivos a ler, dependências a verificar]

### 📝 Mudanças Implementadas
[Descrever cada mudança com detalhes]

### 🧪 Testes
[Descrever testes implementados]

### 📈 Métricas de Sucesso
[Definir como medir sucesso desta PR]

### ⚠️ Riscos Identificados
[Listar possíveis problemas e mitigações]

### ✅ Checklist Final
- [ ] Código sem bugs
- [ ] Lógica correta
- [ ] Performance otimizada
- [ ] Segurança validada
- [ ] Documentação completa
```

---

# PR #17 - ACELERAÇÃO DE ATENDIMENTO 🚀
## Objetivo: Reduzir tempo médio de atendimento em 25%

### 📊 Contexto
**Problema:** Tempo médio de atendimento está em 16 minutos  
**Meta:** Reduzir para 12 minutos  
**Método:** Heurísticas de diagnóstico rápido + paralelização

---

### 🔍 PRÉ-REQUISITOS

Antes de implementar, ler:
- [x] `supabase/functions/support-tech-agent/prompts/behavior.md`
- [x] `supabase/functions/support-tech-agent/prompts/variations.md`
- [ ] `supabase/functions/support-tech-agent/index.ts`
- [ ] `supabase/functions/_shared/get-approved-variation.ts`
- [ ] `docs/knowledge-base/data-sources/suporte/politicas-atendimento.md`

Validar existência:
- [ ] Sistema de logs estruturados funcionando
- [ ] Tools `get_onu_signal_status` e `test_equipment_connectivity` operacionais
- [ ] Integração com IXC ativa

---

### 📝 MUDANÇAS A IMPLEMENTAR

#### 1. Diagnóstico Paralelo (Prioridade ALTA)

**Arquivo:** `supabase/functions/support-tech-agent/index.ts`

**O que fazer:**
```typescript
// ANTES (sequencial - lento):
const signalResult = await get_onu_signal_status(cpf);
if (signalResult.ok) {
  const connectivityResult = await test_equipment_connectivity(cpf);
}

// DEPOIS (paralelo - rápido):
const [signalResult, connectivityResult] = await Promise.all([
  get_onu_signal_status(cpf),
  test_equipment_connectivity(cpf)
]);
```

**Validações:**
- ✅ Tratar erros individuais (não deixar Promise.all quebrar)
- ✅ Timeout de 8 segundos para cada tool
- ✅ Fallback se ambos falharem
- ✅ Logar tempo de execução

**Testes obrigatórios:**
- [ ] Ambos tools retornam sucesso
- [ ] Um tool falha, outro sucede
- [ ] Ambos tools falham (fallback ativo)
- [ ] Timeout de 8s respeitado

---

#### 2. Heurísticas de Diagnóstico Rápido (Prioridade ALTA)

**Arquivo:** `supabase/functions/support-tech-agent/prompts/behavior.md`

**Adicionar seção:**
```markdown
## ⚡ HEURÍSTICAS DE ACELERAÇÃO (PR #17)

### Regra 1: Histórico de Problemas
Se cliente teve problema similar nos últimos 7 dias:
- **Pular diagnóstico completo**
- **Ir direto para solução anterior que funcionou**
- Tool: `check_recent_tickets(cpf, days=7)`

### Regra 2: Mass Outage Recente
Se mass outage foi resolvido há menos de 2 horas:
- **Assumir problema relacionado**
- **Aplicar reboot imediato**
- Reduz 5 minutos de diagnóstico

### Regra 3: Cliente Técnico
Se cliente já informou TX/RX ou ONT serial:
- **Cliente é técnico, simplificar comunicação**
- **Reduzir explicações didáticas**
- Economiza 3 minutos

### Regra 4: Horário de Pico
Se atendimento entre 18h-22h (pico):
- **Priorizar soluções rápidas**
- **Oferecer visita técnica após 8 minutos**
- Evita filas

### Regra 5: Reboot Remoto Proativo
Se RX entre -15 e -22 (bom sinal):
- **Fazer reboot imediato** (não pedir permissão)
- **Informar enquanto executa**: "Estou reiniciando remotamente..."
- Economiza 2 minutos
```

**Implementar tool:**
```typescript
// Adicionar em supabase/functions/support-tech-agent/tools.ts
async function check_recent_tickets(cpf: string, days: number = 7) {
  const { data } = await supabase
    .from('atendimentos')
    .select('*')
    .eq('cpf', cpf)
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });
  
  return {
    has_recent_tickets: data && data.length > 0,
    last_issue: data?.[0]?.issue_type,
    last_solution: data?.[0]?.solution_applied,
    days_ago: data?.[0] ? Math.floor((Date.now() - new Date(data[0].created_at).getTime()) / (24 * 60 * 60 * 1000)) : null
  };
}
```

**Validações:**
- ✅ Não aplicar heurística se dados estiverem desatualizados
- ✅ Registrar quando heurística for aplicada (logs)
- ✅ Fallback para diagnóstico completo se heurística falhar

---

#### 3. Scripts Acelerados (Prioridade MÉDIA)

**Arquivo:** `supabase/functions/support-tech-agent/prompts/variations.md`

**Adicionar variações rápidas:**
```markdown
## ⚡ VARIAÇÕES ACELERADAS (PR #17)

### CENÁRIO B_FAST (RX bom + histórico de travamento)

Script:
```
[Nome], pelo histórico vejo que já tivemos isso antes. Vou reiniciar remotamente agora mesmo, ok?

[Executar reboot sem aguardar resposta]

Pronto, reiniciando! Aguarda 2 minutos enquanto normaliza.
```

### CENÁRIO A_FAST (LOS + mass outage recente)

Script:
```
[Nome], teve um problema na região há pouco tempo. Pode verificar se o cabo verde está bem conectado no aparelhinho?

[Se sim] Ótimo, aguarda 2 minutos para estabilizar.
[Se não] Conecta e aguarda 2 minutos, por favor.
```

### TIMEOUT_FAST (Cliente não responde + sinal OK)

Script:
```
[Nome], como não consegui retorno, vou reiniciar remotamente para adiantar. Qualquer coisa, me chama de volta! 👍
```
```

---

#### 4. Timeouts Reduzidos (Prioridade BAIXA)

**Arquivo:** `supabase/functions/support-tech-agent/prompts/behavior.md`

**Atualizar seção de timeout:**
```diff
| Tempo | Ação | Script |
|-------|------|--------|
- | **1:30** | Primeira chamada | Ver `variations.md` - TIMEOUT_1 |
+ | **1:00** | Primeira chamada | Ver `variations.md` - TIMEOUT_1 |
- | **5:00** | Segunda chamada | Ver `variations.md` - TIMEOUT_2 |
+ | **3:00** | Segunda chamada | Ver `variations.md` - TIMEOUT_2 |
- | **15:00** | Encerramento | Ver `variations.md` - TIMEOUT_3 |
+ | **10:00** | Encerramento | Ver `variations.md` - TIMEOUT_3 |
```

**Justificativa:** Clientes que não respondem em 10 minutos provavelmente abandonaram

---

### 🧪 TESTES OBRIGATÓRIOS

Criar arquivo: `supabase/functions/support-tech-agent/tests/pr17-acceleration.test.ts`

```typescript
// Teste 1: Diagnóstico paralelo
test('Diagnóstico paralelo economiza tempo', async () => {
  const start = Date.now();
  const result = await parallelDiagnosis('12345678900');
  const elapsed = Date.now() - start;
  
  expect(elapsed).toBeLessThan(10000); // Menos de 10s
  expect(result.signal).toBeDefined();
  expect(result.connectivity).toBeDefined();
});

// Teste 2: Heurística de histórico
test('Heurística de histórico pula diagnóstico', async () => {
  // Simular cliente com problema recente
  const result = await diagnoseWithHistory('12345678900');
  
  expect(result.heuristic_applied).toBe(true);
  expect(result.heuristic_type).toBe('recent_ticket');
  expect(result.time_saved_seconds).toBeGreaterThan(60);
});

// Teste 3: Reboot proativo
test('Reboot proativo não aguarda resposta', async () => {
  const start = Date.now();
  const result = await proactiveReboot('12345678900');
  const elapsed = Date.now() - start;
  
  expect(elapsed).toBeLessThan(5000); // Menos de 5s
  expect(result.reboot_initiated).toBe(true);
});
```

---

### 📈 MÉTRICAS DE SUCESSO

**Adicionar ao schema de logs:**
```json
{
  "pr17_metrics": {
    "heuristic_applied": "recent_ticket|mass_outage|tech_customer|peak_hours|proactive_reboot|none",
    "time_saved_seconds": 120,
    "parallel_diagnosis_used": true,
    "parallel_diagnosis_time_ms": 7800,
    "timeout_stage_reached": "none|1|2|3",
    "total_handling_time_seconds": 720
  }
}
```

**Dashboards a criar:**
- Tempo médio antes vs depois
- % de atendimentos com heurística aplicada
- % de atendimentos finalizados < 12 min
- Economia de tempo por heurística

---

### ⚠️ RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Cliente se sente apressado | Média | Alto | Manter tom empático nos scripts |
| Heurística errada aplicada | Baixa | Médio | Fallback para diagnóstico completo |
| Reboot proativo falha | Baixa | Baixo | Informar cliente e tentar manual |
| Timeout muito curto | Média | Médio | Monitorar abandono, ajustar se subir |

---

### ✅ CHECKLIST DE IMPLEMENTAÇÃO - PR #17

**Código:**
- [ ] Diagnóstico paralelo implementado
- [ ] Heurísticas implementadas e testadas
- [ ] Tool `check_recent_tickets` criado
- [ ] Scripts acelerados adicionados em `variations.md`
- [ ] Timeouts atualizados em `behavior.md`
- [ ] Tratamento de erros robusto

**Testes:**
- [ ] Testes unitários passando
- [ ] Testes de integração passando
- [ ] Testes de performance (< 12 min)
- [ ] Testes de fallback

**Documentação:**
- [ ] `docs/PR-17-IMPLEMENTACAO.md` criado
- [ ] Changelog atualizado
- [ ] Métricas documentadas

**Qualidade:**
- [ ] Sem bugs identificados
- [ ] Sem lógica incorreta
- [ ] Sem dead code
- [ ] Sem console.log desnecessários
- [ ] Type safety mantida

**Segurança:**
- [ ] Sem exposição de dados sensíveis
- [ ] Rate limiting considerado
- [ ] Timeouts adequados

---

# PR #18 - APRIMORAR USO DE MÍDIA GUIADA 📸
## Objetivo: Aumentar taxa de sucesso remoto para 85%

### 📊 Contexto
**Problema:** Taxa de sucesso remoto em 78%  
**Meta:** Aumentar para 85%+  
**Método:** Mídia guiada mais eficaz + áudios do Luan

---

### 🔍 PRÉ-REQUISITOS

Antes de implementar, ler:
- [x] `supabase/functions/support-tech-agent/prompts/variations.md` (seção PR #6)
- [ ] `src/components/ChatInterface.tsx` (componente de chat)
- [ ] `src/lib/mediaUtils.ts` (se existir)
- [ ] Estrutura de arquivos de mídia no projeto

Validar existência:
- [ ] Pasta `public/support-media/` ou similar
- [ ] Sistema de reprodução de áudio no chat
- [ ] Sistema de exibição de imagens no chat

---

### 📝 MUDANÇAS A IMPLEMENTAR

#### 1. Novos Contextos de Mídia (Prioridade ALTA)

**Criar pasta:** `public/support-media/v2/`

**Mídia a adicionar:**

| Contexto | Tipo | Arquivo | Descrição |
|----------|------|---------|-----------|
| `fiber_check_full` | Vídeo 15s | `fiber-check-tutorial.mp4` | Tutorial completo de verificação |
| `onu_lights_normal` | Imagem | `onu-lights-ok.jpg` | Como devem estar as luzes |
| `onu_lights_problem` | Imagem | `onu-lights-problem.jpg` | Luzes indicando problema |
| `ethernet_reconnect` | Vídeo 10s | `ethernet-cable.mp4` | Como reconectar cabo ethernet |
| `power_cycle_audio` | Áudio 20s | `luan-power-cycle.mp3` | Luan explicando reboot |
| `signal_weak_audio` | Áudio 25s | `luan-signal-weak.mp3` | Luan explicando sinal fraco |
| `success_celebration` | Áudio 5s | `success-sound.mp3` | Som de sucesso ao resolver |

**Implementar:**
```typescript
// src/lib/supportMediaLibrary.ts
export const SUPPORT_MEDIA_V2 = {
  fiber_check_full: {
    type: 'video',
    url: '/support-media/v2/fiber-check-tutorial.mp4',
    duration: 15,
    transcript: 'Vou te mostrar como verificar a fibra...',
    trigger_scenario: 'A' // Cenário sem energia
  },
  onu_lights_normal: {
    type: 'image',
    url: '/support-media/v2/onu-lights-ok.jpg',
    alt: 'Luzes do aparelhinho funcionando normalmente',
    trigger_scenario: 'B' // Cenário travado
  },
  // ... outros
};

export function getMediaForScenario(scenario: 'A'|'B'|'C'|'D', step: string) {
  // Lógica para retornar mídia apropriada
}
```

---

#### 2. Áudios do Luan (Prioridade ALTA)

**Contexto:** Clientes preferem ouvir instruções enquanto executam ações

**Criar scripts de áudio:**

```markdown
## 🎙️ SCRIPTS DE ÁUDIO - LUAN AQUINO

### Áudio 1: Power Cycle (20s)
"Oi! Aqui é o Luan. Vou te ajudar a reiniciar o aparelhinho.
Primeiro, desliga ele da tomada. Aguarda 10 segundos.
Agora conecta de novo e aguarda 2 minutos. Pronto!"

### Áudio 2: Signal Weak (25s)
"Olá! Identifiquei que o sinal está um pouco fraco.
Vou te mostrar como verificar o conector verde.
Ele fica na parte de trás do aparelhinho.
Tira e coloca de volta com cuidado. Vai funcionar!"

### Áudio 3: Fiber Reconnect (30s)
"E aí! Vamos reconectar a fibra juntos.
Você vai ver um cabo verde fino, é a fibra ótica.
Tira com cuidado, limpa a ponta com um paninho,
e coloca de volta até ouvir um click. Tranquilo!"

### Áudio 4: Success (5s)
"Perfeito! Internet restabelecida. 🎉"
```

**Implementar no chat:**
```typescript
// src/components/ChatInterface.tsx
function renderAudioMessage(audioUrl: string, transcript: string) {
  return (
    <div className="audio-message">
      <audio controls src={audioUrl} />
      <button onClick={() => playAudio(audioUrl)}>
        🔊 Ouvir explicação do Luan
      </button>
      <p className="transcript">{transcript}</p>
    </div>
  );
}
```

---

#### 3. Sequenciamento de Mídia (Prioridade MÉDIA)

**Problema:** Às vezes mídia é enviada DEPOIS do texto, reduzindo eficácia

**Solução:** Garantir ordem correta

**Atualizar:** `supabase/functions/support-tech-agent/index.ts`

```typescript
// ANTES (texto antes da mídia):
await sendMessage(chatId, textMessage);
await sendMedia(chatId, mediaUrl);

// DEPOIS (mídia SEMPRE antes):
async function sendSequencedMessage(chatId: string, media: Media, text: string) {
  // 1. Enviar mídia primeiro
  await sendMedia(chatId, media.url, media.type);
  
  // 2. Aguardar 2 segundos (dar tempo do cliente ver)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 3. Enviar texto explicativo
  await sendMessage(chatId, text);
}
```

**Registrar nos logs:**
```json
{
  "media_sent": {
    "type": "video|image|audio",
    "context": "fiber_check_full",
    "scenario": "A",
    "sent_before_text": true,
    "client_interaction": "viewed|skipped|ignored"
  }
}
```

---

#### 4. Feedback de Eficácia (Prioridade BAIXA)

**Adicionar botões após mídia:**

```typescript
// src/components/ChatInterface.tsx
function renderMediaFeedback(mediaContext: string) {
  return (
    <div className="media-feedback">
      <p>O vídeo/áudio ajudou?</p>
      <button onClick={() => logFeedback(mediaContext, 'helpful')}>
        👍 Ajudou muito
      </button>
      <button onClick={() => logFeedback(mediaContext, 'confusing')}>
        🤔 Ficou confuso
      </button>
      <button onClick={() => logFeedback(mediaContext, 'skip')}>
        ⏭️ Prefiro texto
      </button>
    </div>
  );
}
```

---

### 🧪 TESTES OBRIGATÓRIOS

```typescript
// Teste 1: Sequenciamento correto
test('Mídia é enviada antes do texto', async () => {
  const messages = await sendSequencedMessage(
    'chat-123',
    SUPPORT_MEDIA_V2.fiber_check_full,
    'Veja o vídeo acima'
  );
  
  expect(messages[0].type).toBe('media');
  expect(messages[1].type).toBe('text');
});

// Teste 2: Fallback sem mídia
test('Funciona mesmo sem mídia disponível', async () => {
  const result = await handleScenario('A', { mediaAvailable: false });
  
  expect(result.mediaUsed).toBe(false);
  expect(result.textSent).toBe(true);
});

// Teste 3: Áudio reproduzível
test('Áudio é reproduzível no chat', async () => {
  const audioElement = renderAudioMessage(
    '/support-media/v2/luan-power-cycle.mp3',
    'Script do áudio'
  );
  
  expect(audioElement.querySelector('audio')).toBeTruthy();
  expect(audioElement.querySelector('button')).toBeTruthy();
});
```

---

### 📈 MÉTRICAS DE SUCESSO

**Adicionar ao schema de logs:**
```json
{
  "pr18_metrics": {
    "media_contexts_used": ["fiber_check_full", "onu_lights_normal"],
    "audio_played": true,
    "video_watched_percentage": 85,
    "media_feedback": "helpful|confusing|skip|none",
    "resolution_after_media": true,
    "time_to_resolution_seconds": 480
  }
}
```

**Dashboards:**
- Taxa de sucesso com vs sem mídia
- % de clientes que assistem vídeos completos
- Feedback de eficácia por contexto
- Cenários com maior uso de mídia

---

### ✅ CHECKLIST DE IMPLEMENTAÇÃO - PR #18

**Mídia:**
- [ ] 7 novos arquivos de mídia criados
- [ ] Áudios do Luan gravados (ou texto-to-speech)
- [ ] Vídeos/imagens editados e otimizados
- [ ] Pasta `public/support-media/v2/` criada

**Código:**
- [ ] `supportMediaLibrary.ts` criado
- [ ] Sequenciamento implementado
- [ ] Feedback de mídia implementado
- [ ] Fallbacks para mídia indisponível

**Testes:**
- [ ] Sequenciamento testado
- [ ] Fallbacks testados
- [ ] Áudio reproduzível
- [ ] Vídeo carrega corretamente

**Documentação:**
- [ ] Scripts de áudio documentados
- [ ] Guia de quando usar cada mídia

---

# PR #19 - ALERTAS INTELIGENTES + ASSISTENTE NOC 🚨
## Objetivo: Detecção proativa de problemas de rede

### 📊 Contexto
**Problema:** NOC só descobre problemas quando clientes reclamam  
**Meta:** Detectar 80% dos problemas antes do primeiro ticket  
**Método:** Clustering de sinais + alertas automáticos

---

### 🔍 PRÉ-REQUISITOS

Antes de implementar, ler:
- [ ] Schema do banco de dados (tabelas relacionadas a sinais)
- [ ] `supabase/functions/noc-assistant/` (se existir)
- [ ] Integração com sistema de alertas (email, Slack, etc.)

Validar existência:
- [ ] Histórico de sinais de ONU no banco
- [ ] Sistema de notificações configurado
- [ ] Acesso a dados de geolocalização de clientes

---

### 📝 MUDANÇAS A IMPLEMENTAR

#### 1. Detector de Clusters (Prioridade ALTA)

**Criar edge function:** `supabase/functions/cluster-detector/index.ts`

```typescript
/**
 * Detecta clusters de problemas em uma região geográfica
 */

interface SignalAnomaly {
  cpf: string;
  contract_id: number;
  rx_power: number;
  city: string;
  neighborhood: string;
  timestamp: string;
}

async function detectClusters() {
  // 1. Buscar clientes offline nos últimos 15 minutos
  const { data: offlineClients } = await supabase
    .from('radusuarios')
    .select('cpf, contract_id, city, neighborhood')
    .eq('status', 'offline')
    .gte('last_check', new Date(Date.now() - 15 * 60 * 1000).toISOString());
  
  // 2. Agrupar por região
  const clusters = groupByRegion(offlineClients);
  
  // 3. Identificar clusters significativos (≥ 5 clientes na mesma região)
  const significantClusters = clusters.filter(c => c.count >= 5);
  
  // 4. Para cada cluster, verificar sinais
  for (const cluster of significantClusters) {
    const signals = await checkClusterSignals(cluster.clients);
    
    // 5. Se 80%+ tem RX ruim, é problema de infraestrutura
    const badSignalPercentage = signals.filter(s => s.rx_power < -25).length / signals.length;
    
    if (badSignalPercentage >= 0.8) {
      await createMassOutageEvent(cluster);
      await notifyNOC(cluster);
    }
  }
}

function groupByRegion(clients: any[]) {
  const map = new Map<string, any[]>();
  
  for (const client of clients) {
    const key = `${client.city}|${client.neighborhood}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(client);
  }
  
  return Array.from(map.entries()).map(([region, clients]) => ({
    region,
    count: clients.length,
    clients
  }));
}

// Executar a cada 5 minutos
Deno.cron("Cluster Detector", "*/5 * * * *", () => {
  detectClusters();
});
```

---

#### 2. Assistente NOC (Prioridade ALTA)

**Criar edge function:** `supabase/functions/noc-assistant/index.ts`

```typescript
/**
 * Assistente inteligente para equipe NOC
 * Recomenda ações baseado em padrões detectados
 */

interface NOCRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  issue_type: string;
  affected_clients: number;
  region: string;
  recommended_actions: string[];
  estimated_resolution_time: number;
  sla_impact: string;
}

async function analyzeAndRecommend(clusterId: string): Promise<NOCRecommendation> {
  const cluster = await getClusterData(clusterId);
  
  // Análise de padrões
  const patterns = await analyzePatterns(cluster);
  
  // Recomendações baseadas em histórico
  const recommendation: NOCRecommendation = {
    priority: calculatePriority(cluster.affected_clients),
    issue_type: patterns.most_common_issue,
    affected_clients: cluster.affected_clients,
    region: cluster.region,
    recommended_actions: [],
    estimated_resolution_time: 0,
    sla_impact: ''
  };
  
  // Lógica de recomendação
  if (patterns.signal_degradation) {
    recommendation.recommended_actions.push(
      'Verificar OLT da região',
      'Checar cabo backbone',
      'Testar splitter'
    );
    recommendation.estimated_resolution_time = 120; // 2 horas
    recommendation.sla_impact = 'Alto - clientes sem serviço';
  }
  
  if (patterns.intermittent_los) {
    recommendation.recommended_actions.push(
      'Verificar conectores em caixas de emenda',
      'Checar fusões na rota',
      'Testar cabo DROP'
    );
    recommendation.estimated_resolution_time = 180; // 3 horas
    recommendation.sla_impact = 'Médio - intermitência';
  }
  
  return recommendation;
}

function calculatePriority(affectedClients: number): 'critical' | 'high' | 'medium' | 'low' {
  if (affectedClients >= 50) return 'critical';
  if (affectedClients >= 20) return 'high';
  if (affectedClients >= 10) return 'medium';
  return 'low';
}
```

---

#### 3. Dashboard NOC (Prioridade MÉDIA)

**Criar página:** `src/pages/NOCDashboard.tsx`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function NOCDashboard() {
  const { data: activeClusters } = useQuery({
    queryKey: ['active-clusters'],
    queryFn: async () => {
      const { data } = await supabase
        .from('mass_outage_events')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      return data;
    },
    refetchInterval: 30000 // Atualizar a cada 30s
  });
  
  const { data: recommendations } = useQuery({
    queryKey: ['noc-recommendations'],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('noc-assistant', {
        body: { action: 'get_recommendations' }
      });
      return data;
    },
    refetchInterval: 60000 // Atualizar a cada 1 min
  });
  
  return (
    <div className="noc-dashboard">
      <h1>🚨 Central NOC - Monitoramento Inteligente</h1>
      
      {/* Mapa de calor de problemas */}
      <section className="heatmap">
        <h2>Mapa de Incidentes</h2>
        {/* Implementar com Leaflet */}
      </section>
      
      {/* Clusters ativos */}
      <section className="active-clusters">
        <h2>Clusters Detectados ({activeClusters?.length || 0})</h2>
        {activeClusters?.map(cluster => (
          <ClusterCard key={cluster.id} cluster={cluster} />
        ))}
      </section>
      
      {/* Recomendações */}
      <section className="recommendations">
        <h2>Recomendações Inteligentes</h2>
        {recommendations?.map(rec => (
          <RecommendationCard key={rec.id} recommendation={rec} />
        ))}
      </section>
    </div>
  );
}
```

---

#### 4. Notificações Proativas (Prioridade MÉDIA)

**Integrar com:**
- Slack (webhook)
- Email (Resend API)
- WhatsApp NOC (Evolution API)

```typescript
// supabase/functions/_shared/noc-notifications.ts

async function notifyNOC(cluster: Cluster) {
  const message = `
🚨 ALERTA: Cluster detectado
📍 Região: ${cluster.region}
👥 Clientes afetados: ${cluster.affected_clients}
⚠️ Prioridade: ${cluster.priority}
🔧 Ações recomendadas:
${cluster.recommended_actions.map(a => `  • ${a}`).join('\n')}
  `;
  
  // Slack
  await fetch(Deno.env.get('SLACK_WEBHOOK_URL')!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message })
  });
  
  // Email para gerente NOC
  await supabase.functions.invoke('send-email', {
    body: {
      to: 'noc@supernet.com.br',
      subject: `🚨 Cluster ${cluster.priority.toUpperCase()} - ${cluster.region}`,
      text: message
    }
  });
}
```

---

### 🧪 TESTES OBRIGATÓRIOS

```typescript
// Teste 1: Detecção de cluster
test('Detecta cluster com 5+ clientes offline na mesma região', async () => {
  // Simular 7 clientes offline no mesmo bairro
  const result = await detectClusters();
  
  expect(result.clusters).toHaveLength(1);
  expect(result.clusters[0].count).toBeGreaterThanOrEqual(5);
});

// Teste 2: Recomendações corretas
test('Recomenda ações corretas para degradação de sinal', async () => {
  const rec = await analyzeAndRecommend('cluster-123');
  
  expect(rec.priority).toBe('high');
  expect(rec.recommended_actions).toContain('Verificar OLT da região');
});

// Teste 3: Notificações enviadas
test('Envia notificações para NOC', async () => {
  const spy = jest.spyOn(global, 'fetch');
  await notifyNOC(mockCluster);
  
  expect(spy).toHaveBeenCalledWith(
    expect.stringContaining('slack'),
    expect.anything()
  );
});
```

---

### 📈 MÉTRICAS DE SUCESSO

```json
{
  "pr19_metrics": {
    "clusters_detected": 12,
    "clusters_detected_before_first_ticket": 9,
    "proactive_detection_rate": 0.75,
    "average_time_to_detection_minutes": 8,
    "noc_notifications_sent": 12,
    "recommendations_followed": 10,
    "estimated_downtime_avoided_hours": 24
  }
}
```

---

### ✅ CHECKLIST DE IMPLEMENTAÇÃO - PR #19

**Código:**
- [ ] `cluster-detector` edge function criada
- [ ] `noc-assistant` edge function criada
- [ ] Dashboard NOC implementado
- [ ] Sistema de notificações integrado
- [ ] Cron jobs configurados (5 min)

**Integrações:**
- [ ] Slack webhook configurado
- [ ] Email (Resend) configurado
- [ ] WhatsApp NOC configurado (se aplicável)

**Testes:**
- [ ] Detecção de clusters testada
- [ ] Recomendações validadas
- [ ] Notificações enviadas corretamente

**Documentação:**
- [ ] Manual do NOC Dashboard
- [ ] Guia de resposta a alertas

---

# PR #20 - AUDITORIA & KPIs FASE 2 📊
## Objetivo: Loop fechado de melhoria contínua

[Continua com estrutura similar...]

---

# PR #21 - AUTOMAÇÃO DE VISITA TÉCNICA 🚗
## Objetivo: Priorização inteligente de agendamentos

[Continua com estrutura similar...]

---

# PR #22 - PERFORMANCE + CACHING ⚡
## Objetivo: Reduzir chamadas ao IXC em 60%

[Continua com estrutura similar...]

---

# PR #23 - A/B TESTS AUTOMÁTICOS 🧪
## Objetivo: Testar melhorias em 10% do tráfego

[Continua com estrutura similar...]

---

## 🎯 ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

1. **Sprint 11 (Semana 1-2):**
   - PR #17 (Aceleração) → **FAZER PRIMEIRO**
   - PR #16 (Tom de voz) → Já implementado ✅

2. **Sprint 12 (Semana 3-4):**
   - PR #22 (Performance + Cache) → Base para outras PRs
   - PR #18 (Mídia Guiada) → Melhora UX

3. **Sprint 13 (Semana 5-6):**
   - PR #19 (NOC Assistente) → Complexo, precisa tempo
   - PR #20 (KPIs Fase 2) → Suporta medição de PRs anteriores

4. **Sprint 14 (Semana 7-8):**
   - PR #21 (Automação Visita) → Depende de dados das PRs anteriores
   - **Retrospectiva geral** → Avaliar ROI total

5. **Sprint 15+ (Futuro):**
   - PR #23 (A/B Tests) → Apenas se houver necessidade clara

---

## ⚠️ REGRAS CRÍTICAS PARA IA

Ao implementar QUALQUER PR:

1. ✅ **LER CONTEXTO COMPLETO** antes de escrever código
2. ✅ **VALIDAR PRÉ-REQUISITOS** (arquivos, integrações, etc.)
3. ✅ **TESTAR CADA MUDANÇA** (não assumir que funciona)
4. ✅ **DOCUMENTAR DECISÕES** (por que fez de X forma)
5. ✅ **MEDIR IMPACTO** (adicionar logs e métricas)
6. ✅ **MANTER COMPATIBILIDADE** (não quebrar funcionalidades existentes)
7. ✅ **SEGUIR DESIGN SYSTEM** (usar tokens semânticos)
8. ✅ **VALIDAR SEGURANÇA** (input validation, RLS, etc.)
9. ✅ **CRIAR ROLLBACK PLAN** (como reverter se der errado)
10. ✅ **PEDIR APROVAÇÃO** antes de implementar mudanças grandes

---

**Elaborado por:** AI Solutions Architect  
**Data:** 2025-10-29  
**Versão:** 1.0.0  
**Status:** 📋 PRONTO PARA USO
