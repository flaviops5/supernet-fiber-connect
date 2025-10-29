# PR-24 — Roteiros de Áudio (narrações curtas)

## 🎙️ Instruções Gerais
- Voz clara e pausada
- Tom amigável e profissional
- Evitar ruídos de fundo
- Formato: MP3, bitrate mínimo 128kbps
- Normalizar áudio para -16 LUFS

---

## Áudio A — Energia/LOS
**Código:** `audio_onu_power_check`  
**Duração alvo:** 15–20s  
**Arquivo:** `audio_onu_power_check.mp3`

### Script:
"Vamos verificar a energia da sua caixinha da internet. Se a luz LOS vermelha estiver piscando, é sinal da fibra. Me diga como está aí."

### Pausas:
- Pausa de 0.5s após "caixinha da internet"
- Pausa de 0.3s após "sinal da fibra"

---

## Áudio B — Conector verde
**Código:** `audio_fiber_reconnect`  
**Duração alvo:** 20–25s  
**Arquivo:** `audio_fiber_reconnect.mp3`

### Script:
"Segure o conector verde pela base, retire devagar e reconecte até o 'click'. Aguarde um minuto e me conte se a luz vermelha parou de piscar."

### Pausas:
- Pausa de 0.5s após "pela base"
- Pausa de 0.3s após "'click'"
- Pausa de 0.5s após "um minuto"

---

## Áudio C — Reiniciar roteador
**Código:** `audio_reboot_router`  
**Duração alvo:** 15–20s  
**Arquivo:** `audio_reboot_router.mp3`

### Script:
"Desligue o roteador da tomada, aguarde sessenta segundos e ligue novamente. Depois teste a navegação."

### Pausas:
- Pausa de 0.5s após "da tomada"
- Pausa de 0.3s após "sessenta segundos"
- Pausa de 0.3s após "ligue novamente"

---

## 📥 Upload no Supabase Storage

Após gravação, fazer upload em:
```
Bucket: campaign-media
Path: media/
Files:
  - audio_onu_power_check.mp3
  - audio_fiber_reconnect.mp3
  - audio_reboot_router.mp3
```

## 🎛️ Configurações de Gravação Recomendadas
- Microfone: condensador ou dinâmico com pop filter
- Sample rate: 44.1kHz ou 48kHz
- Bit depth: 16-bit ou 24-bit
- Ambiente: silencioso, sem eco
- Pós-produção: compressão suave, EQ para clareza vocal
