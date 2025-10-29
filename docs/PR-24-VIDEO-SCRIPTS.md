# PR-24 — Roteiros de Vídeo (gravação humana)

## 📹 Instruções Gerais
- Tom: calmo, confiante e didático
- Evitar jargões técnicos desnecessários
- Mostrar equipamentos reais durante a gravação
- Usar legendas quando necessário
- Formato: MP4, resolução mínima 720p

---

## Vídeo 1 — Verificar energia da "caixinha da internet" (ONU)
**Código:** `video_onu_power`  
**Duração alvo:** 35–45s  
**Arquivo:** `video_onu_power.mp4`

### Roteiro:

**1) Abertura (5s)**  
"Oi! Vamos conferir sua 'caixinha da internet' rapidinho."

**2) O que olhar (10s)**  
"Veja se ela está ligada na tomada e com o botão power ligado."

**3) LED LOS (10s)**  
"Se a luz LOS vermelha estiver piscando, é problema no sinal da fibra."

**4) Próximo passo (10s)**  
"Se estiver desligada ou sem luz, ligue e me avise aqui no chat. Se a LOS piscar, iremos ao próximo passo."

### Elementos visuais:
- Mostrar ONU real
- Destacar LED LOS piscando em vermelho
- Seta apontando para tomada e botão power

---

## Vídeo 2 — Reconectar o conector verde da fibra
**Código:** `video_fiber_connector`  
**Duração alvo:** 45–60s  
**Arquivo:** `video_fiber_connector.mp4`

### Roteiro:

**1) Aviso de cuidado (10s)**  
"Segure pela base do conector. Não dobre o cabo."

**2) Remover e recolocar (20s)**  
"Puxe com cuidado, reconecte até ouvir 'click'."

**3) Aguarde (10s)**  
"Aguarde 1 minuto e veja se a luz vermelha parou de piscar."

### Elementos visuais:
- Close-up no conector verde SC/APC
- Demonstração de movimento correto (sem dobrar fibra)
- Som do "click" de encaixe

---

## Vídeo 3 — Reiniciar o roteador (NUNCA a ONU)
**Código:** `video_reboot_router` (opcional - áudio pode ser suficiente)  
**Duração alvo:** 30–40s  
**Arquivo:** `video_reboot_router.mp4`

### Roteiro:

**1) Qual equipamento (5s)**  
"Este é o roteador Wi-Fi, não a caixinha da fibra."

**2) Passos (20s)**  
"Desligue da tomada, aguarde 60 segundos, ligue novamente."

**3) Teste (10s)**  
"Espere 1 minuto e teste a internet."

### Elementos visuais:
- Comparação visual ONU vs Roteador
- Timer visual (60 segundos)
- Ícone de Wi-Fi se reconectando

---

## 📥 Upload no Supabase Storage

Após gravação, fazer upload em:
```
Bucket: campaign-media
Path: media/
Files:
  - video_onu_power.mp4
  - video_fiber_connector.mp4
  - audio_reboot_router.mp3
```

Atualizar tabela `official_media_assets` com paths corretos.
