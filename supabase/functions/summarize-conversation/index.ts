import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createPublicHandler } from '../_shared/base-handler.ts';
import { callLovableAI, extractContent } from '../_shared/lovable-client.ts';
import { logLGPDAccess } from '../_shared/lgpd-logger.ts';

Deno.serve(createPublicHandler('summarize-conversation', async (req, { supabase }) => {
  const correlationId = `summary-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const { conversationId } = await req.json();
  
  if (!conversationId) {
    throw new Error('conversationId é obrigatório');
  }

  console.log(`📝 [${correlationId}] Summarize conversation: ${conversationId}`);

    // Sprint 1: LGPD Audit para acesso à conversa
    await logLGPDAccess(
      supabase,
      'read',
      'conversation',
      'legitimate_interest',
      'Summarization AI acessou conversa para criar resumo',
      { conversation_id: conversationId, correlation_id: correlationId }
    );

    // Buscar conversa e mensagens
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;

    const { data: messages, error: msgError } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) throw msgError;

    // Construir contexto para a IA
    const messageHistory = messages.map(m => 
      `[${m.sender_type === 'customer' ? 'Cliente' : 'Agente'}] ${m.sender_name}: ${m.content}`
    ).join('\n');

    const systemPrompt = `Você é um assistente especializado em resumir conversas de atendimento ao cliente.
Analise a conversa e crie um resumo estruturado seguindo exatamente este formato:

**RESUMO:**
[Breve resumo em 1-2 frases do que foi tratado]

**MOTIVO DO CONTATO:**
[Principal razão do cliente entrar em contato]

**RESOLUÇÃO:**
[Como a questão foi tratada/resolvida]

**TAGS SUGERIDAS:**
[Liste 3-5 tags relevantes separadas por vírgula]

**PRÓXIMAS AÇÕES:**
[Se houver alguma ação pendente ou follow-up necessário]

Seja objetivo e profissional.`;

    const prompt = `Dados da conversa:
- Cliente: ${conversation.customer_name}
- Canal: ${conversation.channel}
- Departamento: ${conversation.department || 'N/A'}
- Status: ${conversation.status}

Mensagens:
${messageHistory}`;

    // Sprint 1: Chamar API Lovable com Circuit Breaker
    const aiResponse = await callLovableAI({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: 1000
    }, correlationId);

    const summary = extractContent(aiResponse);

    // Salvar resumo no metadata da conversa
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        metadata: {
          ...conversation.metadata,
          ai_summary: summary,
          summarized_at: new Date().toISOString()
        }
      })
      .eq('id', conversationId);

    if (updateError) throw updateError;

  console.log('Resumo gerado com sucesso para conversa:', conversationId);

  return { summary };
}));