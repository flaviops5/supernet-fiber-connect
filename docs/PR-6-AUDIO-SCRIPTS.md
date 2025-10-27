# PR #6 - Scripts para Geração de Áudios

## 🎙️ Áudios a Serem Gerados

Use **Eleven Labs** com voz em português brasileiro (PT-BR) para gerar os seguintes áudios:

---

## 1️⃣ Cloé - Solicitação de CPF

**Arquivo**: `cloe_solicita_cpf_v1.[mp3,ogg,wav]`

**Script**:
```
Olá! Para localizar seus dados e te ajudar melhor, por favor, informe seu CPF. 
Pode ficar tranquilo, suas informações estão protegidas e são tratadas com total segurança.
```

**Tom**: Amigável, profissional, acolhedor  
**Duração**: ~10 segundos

---

## 2️⃣ Luan - LOS Detectado

**Arquivo**: `luan_los_detectado_v1.[mp3,ogg,wav]`

**Script**:
```
Identifiquei que a luz vermelha LOS está piscando no seu aparelho. 
Isso indica que o cabo da fibra pode estar desconectado ou sem energia. 
Veja a imagem acima para localizar essa luz no seu equipamento.
```

**Tom**: Calmo, explicativo, didático  
**Duração**: ~15 segundos

---

## 3️⃣ Luan - Reconectar Fibra

**Arquivo**: `luan_reconectar_fibra_v1.[mp3,ogg,wav]`

**Script**:
```
Vou te mostrar como reconectar o cabo da fibra. É bem simples!
Localize o conector verde - é a parte onde a fibra entra no aparelho.
Retire-o delicadamente, espere 3 segundos, e conecte novamente até ouvir um clique.
Siga o passo a passo da imagem acima.
```

**Tom**: Instrutor, paciente, encorajador  
**Duração**: ~20 segundos

---

## 📋 Instruções de Geração

### Usando Eleven Labs (Recomendado)

1. Acesse: https://elevenlabs.io/
2. Escolha voz em **Português (Brasil)**
3. Recomendações de vozes:
   - **Cloé**: Voz feminina suave e acolhedora
   - **Luan**: Voz masculina calma e profissional
4. Configurações:
   - Stability: 0.7
   - Clarity: 0.8
   - Style Exaggeration: 0.3

### Formatos Necessários

Para cada áudio, gere **3 formatos**:
- `.mp3` - Compatibilidade geral (128kbps)
- `.ogg` - Open source, boa qualidade
- `.wav` - Sem compressão (backup)

### Onde Salvar

Salve os arquivos em:
```
public/campaign-media/support-tech-audio/
├── cloe_solicita_cpf_v1.mp3
├── cloe_solicita_cpf_v1.ogg
├── cloe_solicita_cpf_v1.wav
├── luan_los_detectado_v1.mp3
├── luan_los_detectado_v1.ogg
├── luan_los_detectado_v1.wav
├── luan_reconectar_fibra_v1.mp3
├── luan_reconectar_fibra_v1.ogg
└── luan_reconectar_fibra_v1.wav
```

---

## ✅ Checklist de Qualidade

Antes de publicar, verifique:
- [ ] Tom adequado para cada personagem
- [ ] Pronúncia clara de termos técnicos
- [ ] Ausência de ruídos ou distorções
- [ ] Volume normalizado (-14 LUFS)
- [ ] Duração dentro do esperado
- [ ] Todos os 3 formatos gerados
- [ ] Arquivos nomeados corretamente

---

## 🔊 Alternativas ao Eleven Labs

### Google Cloud Text-to-Speech
```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {"text": "SEU TEXTO AQUI"},
    "voice": {"languageCode": "pt-BR", "name": "pt-BR-Wavenet-A"},
    "audioConfig": {"audioEncoding": "MP3"}
  }' \
  "https://texttospeech.googleapis.com/v1/text:synthesize"
```

### Azure Cognitive Services
```bash
curl -X POST \
  -H "Ocp-Apim-Subscription-Key: YOUR_KEY" \
  -H "Content-Type: application/ssml+xml" \
  -d '<speak version="1.0" xml:lang="pt-BR">
        <voice name="pt-BR-FranciscaNeural">SEU TEXTO</voice>
      </speak>' \
  "https://YOUR_REGION.tts.speech.microsoft.com/cognitiveservices/v1"
```

---

## 📊 Métricas Esperadas

Após implementação, os áudios serão rastreados:
- Quantas vezes foram reproduzidos
- Taxa de ajuda reportada pelos usuários
- Correlação com resolução remota

Acesse as métricas em:
```sql
SELECT * FROM public.media_effectiveness_metrics
WHERE media_type = 'audio';
```
