/**
 * Exemplo de uso do MediaGuidedMessage
 * PR #6 - Mídia Guiada
 */

import { MediaGuidedMessage } from './MediaGuidedMessage';
import { formatMediaMessage } from '@/lib/media-helper';

// Exemplo 1: LOS Detectado (Cenário A)
export function ExampleLOSDetected() {
  const conversationId = "conv_12345";
  const agentName = "Luan Aquino";
  
  const mediaMessage = formatMediaMessage(
    'los_detected',
    `Olá! Identifiquei que a luz vermelha LOS está piscando no seu aparelho.

Isso significa que o cabo da fibra pode estar desconectado ou sem energia.

Você pode verificar se as luzes do aparelhinho estão acesas e se o cabo que vem da parede está bem conectado?`,
    agentName
  );
  
  return (
    <MediaGuidedMessage
      mediaAsset={mediaMessage.mediaAsset}
      text={mediaMessage.text}
      conversationId={conversationId}
      agentName={agentName}
      mediaContext="los_detected"
      showFeedback={true}
    />
  );
}

// Exemplo 2: Reconexão de Fibra (Cenário B/C)
export function ExampleFiberReconnect() {
  const conversationId = "conv_67890";
  const agentName = "Luan Aquino";
  
  const mediaMessage = formatMediaMessage(
    'fiber_reconnect',
    `Vou te mostrar como reconectar o cabo da fibra - é bem simples!

1. Localize o conector verde (parte onde a fibra entra no aparelho)
2. Retire-o delicadamente
3. Conecte novamente até ouvir um "clique"
4. Aguarde 1-2 minutos para o sinal voltar

Consegue seguir essas instruções?`,
    agentName
  );
  
  return (
    <MediaGuidedMessage
      mediaAsset={mediaMessage.mediaAsset}
      text={mediaMessage.text}
      conversationId={conversationId}
      agentName={agentName}
      mediaContext="fiber_reconnect"
      showFeedback={true}
    />
  );
}

// Exemplo 3: Visualização do ONU
export function ExampleONUVisual() {
  const conversationId = "conv_abcde";
  const agentName = "Luan Aquino";
  
  const mediaMessage = formatMediaMessage(
    'onu_visual',
    `Na frente do seu aparelho, você verá algumas luzes indicadoras:

- Luz POWER (verde): Aparelho ligado
- Luz PON (verde): Conectado à rede
- Luz LOS (vermelha): Se estiver piscando, indica problema no sinal
- Luz INTERNET (verde): Internet ativa

Qual dessas luzes está diferente aí?`,
    agentName
  );
  
  return (
    <MediaGuidedMessage
      mediaAsset={mediaMessage.mediaAsset}
      text={mediaMessage.text}
      conversationId={conversationId}
      agentName={agentName}
      mediaContext="onu_visual"
      showFeedback={true}
    />
  );
}

// Exemplo 4: Solicitação de CPF (Cloé)
export function ExampleCPFRequest() {
  const conversationId = "conv_fghij";
  const agentName = "Cloé";
  
  const mediaMessage = formatMediaMessage(
    'cpf_request',
    `Olá! Sou a Cloé, assistente virtual da Supernet.

Para localizar seus dados e te ajudar melhor, por favor, informe seu CPF.

Pode ficar tranquilo, suas informações estão protegidas! 🔒`,
    agentName
  );
  
  return (
    <MediaGuidedMessage
      mediaAsset={mediaMessage.mediaAsset}
      text={mediaMessage.text}
      conversationId={conversationId}
      agentName={agentName}
      mediaContext="cpf_request"
      showFeedback={false} // Não mostrar feedback para solicitação de dados
    />
  );
}

// Exemplo 5: Uso dentro do ChatArea
export function ChatAreaIntegrationExample() {
  // No componente ChatArea, você pode usar assim:
  
  /*
  const renderMessage = (message: Message) => {
    // Se a mensagem tem contexto de mídia
    if (message.mediaContext) {
      const mediaMessage = formatMediaMessage(
        message.mediaContext,
        message.content,
        message.agentName
      );
      
      return (
        <MediaGuidedMessage
          mediaAsset={mediaMessage.mediaAsset}
          text={mediaMessage.text}
          conversationId={conversationId}
          agentName={message.agentName}
          mediaContext={message.mediaContext}
          showFeedback={true}
        />
      );
    }
    
    // Mensagem normal sem mídia
    return (
      <div className="message">
        {message.content}
      </div>
    );
  };
  */
  
  return null;
}
