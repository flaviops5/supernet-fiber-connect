-- Adicionar informações do WhatsApp Webhook à base de conhecimento
INSERT INTO knowledge_base (
  title,
  content,
  category,
  content_type,
  tags,
  is_active,
  metadata
) VALUES (
  'WhatsApp Webhook - Integração Evolution API',
  '# WhatsApp Webhook - Código Fonte

## Descrição
Webhook responsável por receber mensagens do WhatsApp via Evolution API, processar através do agente de roteamento (Cloé) e enviar respostas automáticas.

## Fluxo de Funcionamento
1. Evolution API recebe mensagem do WhatsApp
2. Evolution API chama o webhook Supabase
3. Webhook processa a mensagem:
   - Ignora mensagens enviadas por nós mesmos
   - Busca ou cria conversação no banco
   - Salva mensagem do cliente
   - Chama routing-agent (Cloé) para processar
   - Envia resposta via send-whatsapp-message
   - Salva resposta do agente no banco

## Estrutura de Dados
- **Tabelas utilizadas**: conversations, conversation_messages
- **Edge Functions chamadas**: routing-agent, send-whatsapp-message

## Eventos Processados
- **messages.upsert**: Mensagens recebidas ou atualizadas
- Ignora mensagens com `fromMe: true`

## Campos da Mensagem
- customerPhone: Extraído de `key.remoteJid` (remove @s.whatsapp.net)
- customerName: `pushName` ou "Cliente WhatsApp"
- messageContent: `message.conversation` ou `message.extendedTextMessage.text`

## URL do Webhook
https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/whatsapp-webhook

## Configuração no Evolution API
1. Acessar painel do Evolution API
2. Selecionar instância SDR2
3. Configurar webhook com a URL acima
4. Marcar evento: messages.upsert
5. Status: Ativo

## Código do Webhook
Localização: supabase/functions/whatsapp-webhook/index.ts
- Usa CORS headers para permitir requisições externas
- Valida JSON do body da requisição
- Cria/atualiza conversações automaticamente
- Integra com routing-agent para respostas inteligentes',
  'integracao',
  'document',
  ARRAY['whatsapp', 'webhook', 'evolution-api', 'edge-function', 'codigo-fonte', 'integracao'],
  true,
  jsonb_build_object(
    'source', 'system',
    'file_path', 'supabase/functions/whatsapp-webhook/index.ts',
    'version', '1.0',
    'last_updated', now()
  )
);