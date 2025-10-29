# PR-24 — Guia de Integração de Mídias Oficiais

## 🎯 Objetivo
Integrar tutoriais em vídeo/áudio no fluxo de atendimento técnico, renderizando mídia oficial baseada no `waiting_step` atual.

---

## 📦 Componentes Criados

### 1. **MediaGuidedMessage**
Componente que renderiza mídia oficial com loading/error states.

**Localização:** `src/components/chat/MediaGuidedMessage.tsx`

**Props:**
```typescript
interface MediaGuidedMessageProps {
  step: string; // ex: 'scenario_a_check_power'
}
```

**Uso básico:**
```tsx
import { MediaGuidedMessage } from "@/components/chat/MediaGuidedMessage";

<MediaGuidedMessage step={flowState.waiting_step} />
```

---

## 🔗 Integração no Chat

### Opção 1: Chat de Atendimento ao Cliente

**Arquivo:** `src/components/chat/ChatInterface.tsx` (ou similar)

**Onde adicionar:** Logo após a mensagem de texto do Luan quando há `waiting_step`:

```tsx
{message.sender_type === "agent" && flowState?.waiting_step && (
  <>
    <div className="text-sm">{message.content}</div>
    
    {/* PR#24: Mídia oficial guiada */}
    <MediaGuidedMessage step={flowState.waiting_step} />
  </>
)}
```

### Opção 2: Agent Interface (para testes)

**Arquivo:** `src/pages/admin/AgentInterface.tsx`

**Onde adicionar:** Após mensagens do agente no painel:

```tsx
{msg.sender_type === "agent" && conversation.metadata?.flow_state?.waiting_step && (
  <div className="mt-2">
    <MediaGuidedMessage step={conversation.metadata.flow_state.waiting_step} />
  </div>
)}
```

---

## 🗺️ Mapeamento Step → Mídia

Arquivo: `src/types/media.types.ts`

```typescript
export const STEP_MEDIA_MAP: Record<string, string> = {
  'scenario_a_check_power': 'video_onu_power',
  'scenario_a_verify_red_light': 'video_onu_power',
  'scenario_a_reconnect_fiber': 'video_fiber_connector',
  'scenario_c_reconnect_fiber': 'video_fiber_connector',
  'scenario_b_power_cycle_request': 'audio_reboot_router',
  'scenario_b_reboot_router': 'audio_reboot_router'
};
```

**Para adicionar novo step:**
1. Grave o vídeo/áudio seguindo roteiros em `docs/PR-24-VIDEO-SCRIPTS.md`
2. Faça upload no bucket `campaign-media/media/`
3. Insira registro em `official_media_assets`
4. Adicione mapeamento em `STEP_MEDIA_MAP`

---

## 📤 Upload de Mídias

### Via Supabase Dashboard:

1. Acesse Storage → `campaign-media` bucket
2. Navegue até pasta `media/`
3. Upload dos arquivos:
   - `video_onu_power.mp4`
   - `video_fiber_connector.mp4`
   - `audio_reboot_router.mp3`

### Registrar no banco:

```sql
INSERT INTO official_media_assets (kind, code, storage_path, duration_seconds, description)
VALUES ('video', 'video_onu_power', 'campaign-media/media/video_onu_power.mp4', 40, 'Verificar energia da ONU');
```

---

## 🧪 Testando

### 1. Verificar cache:
```typescript
import { preloadCommonMedia } from "@/lib/media-official-helper";

// No App.tsx ou index.tsx:
useEffect(() => {
  preloadCommonMedia();
}, []);
```

### 2. Testar renderização:
- Crie conversa de teste
- Force `waiting_step` para `scenario_a_check_power`
- Verifique se vídeo renderiza corretamente

### 3. Validar error handling:
- Remova temporariamente o arquivo do storage
- Verifique se mostra mensagem de erro adequada

---

## ⚙️ Configurações

### Cache TTL (5 minutos padrão):
```typescript
// src/lib/media-official-helper.ts
const CACHE_TTL = 5 * 60 * 1000; // Ajustar se necessário
```

### Pré-carregamento:
```typescript
const commonCodes = ['video_onu_power', 'video_fiber_connector', 'audio_reboot_router'];
```

---

## 🐛 Troubleshooting

### Mídia não aparece:
1. Verificar console: `[Media Helper] Mídia não encontrada: xxx`
2. Confirmar se código existe em `STEP_MEDIA_MAP`
3. Validar registro em `official_media_assets`

### Erro de CORS:
- Storage path deve estar correto: `campaign-media/media/file.mp4`
- Bucket deve ser público (ou com RLS adequado)

### Performance lenta:
- Verificar tamanho dos arquivos (vídeos < 10MB recomendado)
- Considerar compressão/otimização
- Validar se cache está funcionando

---

## 📊 Métricas

Para monitorar uso das mídias, adicionar logs:

```typescript
// Ao carregar mídia com sucesso:
await supabase.from("media_analytics").insert({
  media_code: code,
  conversation_id,
  timestamp: new Date().toISOString()
});
```

---

## ✅ Checklist de Deploy

- [ ] Vídeos gravados seguindo roteiros
- [ ] Arquivos uploadados no storage
- [ ] Registros criados em `official_media_assets`
- [ ] Mapeamentos adicionados em `STEP_MEDIA_MAP`
- [ ] Componente integrado no chat
- [ ] Testado em dev
- [ ] Validado error states
- [ ] Documentação atualizada
