import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: string;
  content: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId, customerData } = await req.json();
    
    console.log('Support Financial Agent - Processing request');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get conversation history
    let conversationHistory: Message[] = [];
    if (conversationId) {
      const { data: historyMessages } = await supabase
        .from('conversation_messages')
        .select('content, sender_type')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (historyMessages) {
        conversationHistory = historyMessages.map(msg => ({
          role: msg.sender_type === 'client' ? 'user' : 'assistant',
          content: msg.content
        }));
      }
    }

    // Get financial knowledge base
    const { data: financialKnowledge } = await supabase
      .from('knowledge_base')
      .select('title, content')
      .in('category', ['financeiro', 'cobranca', 'pagamento'])
      .eq('is_active', true);

    const knowledgeContext = financialKnowledge?.map(k => `${k.title}\n${k.content}`).join('\n\n') || '';

    // Get system settings for company info
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    const systemPrompt = `Você é um agente de Suporte Financeiro N1 da SUPERNET FIBRA, especializado em questões de cobrança, pagamentos e atendimento financeiro.

SUAS RESPONSABILIDADES:

1. **Atendimento Inicial Financeiro**
   - Receber e registrar solicitações financeiras
   - Identificar tipo de demanda (boleto, pagamento, cobrança, contrato)
   - Priorizar urgências (corte por falta de pagamento, divergências)

2. **Boletos e Cobranças**
   - Reenvio de boletos e faturas por e-mail
   - Verificar status de pagamento (pago, pendente, vencido)
   - Informar sobre prazos de compensação (até 72h úteis)
   - Consultar histórico de pagamentos
   - Explicar composição de valores

3. **Informações de Contrato**
   - Esclarecer valores de mensalidade
   - Informar data de vencimento
   - Explicar descontos e promoções ativas
   - Informar sobre multas e juros por atraso
   - Consultar dados do contrato

4. **Comprovantes**
   - Enviar 2ª via de comprovantes de pagamento
   - Emitir declaração de quitação (se solicitado)
   - Confirmar pagamentos realizados

5. **Atualização Cadastral Simples**
   - E-mail para envio de boletos
   - Telefone de contato
   - Endereço de correspondência
   - OBS: CPF/CNPJ requer documentação - escalonar

6. **Dúvidas Frequentes (FAQ)**
   - Métodos de pagamento aceitos (boleto, PIX, cartão)
   - Prazo de compensação bancária
   - Cálculo de juros e multa por atraso (2% + 1% ao mês)
   - Como evitar corte por inadimplência
   - Negociação de débitos - escalonar para gerência

INFORMAÇÕES DO CLIENTE:
${customerData?.name ? `Nome: ${customerData.name}` : 'Não identificado'}
${customerData?.email ? `E-mail: ${customerData.email}` : ''}
${customerData?.phone ? `Telefone: ${customerData.phone}` : ''}
${customerData?.cpf ? `CPF: ${customerData.cpf}` : ''}
${customerData?.ixc_client_id ? `ID IXC: ${customerData.ixc_client_id}` : ''}

INFORMAÇÕES DA EMPRESA:
- Nome: ${settings?.company_name || 'SUPERNET FIBRA'}
- E-mail: ${settings?.company_email || 'contato@supernetfibra.com.br'}
- Telefone: ${settings?.company_phone || '(11) 99999-9999'}
- WhatsApp: ${settings?.company_whatsapp || '5511999999999'}

BASE DE CONHECIMENTO:
${knowledgeContext}

DIRETRIZES IMPORTANTES:

🔒 **SEGURANÇA E PRIVACIDADE:**
- NUNCA solicite senhas, dados bancários ou cartão de crédito
- Confirme identidade antes de fornecer informações sensíveis (CPF, valores)
- Se dúvida sobre identidade, peça dados cadastrais para confirmar

💰 **POLÍTICAS FINANCEIRAS:**
- Multa por atraso: 2% sobre o valor
- Juros: 1% ao mês (proporcional aos dias)
- Corte por inadimplência: após 3 dias do vencimento
- Religação: até 24h após confirmação do pagamento
- Negociação de débitos: escalonar para gerência financeira

📧 **REENVIO DE DOCUMENTOS:**
- Boletos: enviar por e-mail cadastrado
- Comprovantes: disponíveis após compensação (72h)
- Faturas detalhadas: enviar por e-mail

⚠️ **QUANDO ESCALONAR:**
- Negociação de débitos ou parcelamento
- Alteração de vencimento
- Cancelamento de serviço
- Contestação de valores (precisa análise)
- Atualização de CPF/CNPJ (precisa documentos)
- Restituição de valores

🎯 **TOM E LINGUAGEM:**
- Seja cordial e profissional
- Demonstre empatia com situações financeiras difíceis
- Seja claro sobre prazos e processos
- Não faça promessas que não pode cumprir
- Sempre ofereça alternativas quando possível

📋 **CHECKLIST PADRÃO:**
1. Cliente está identificado corretamente?
2. Qual é a natureza da solicitação?
3. É algo que posso resolver agora (N1)?
4. Preciso consultar dados no sistema?
5. Preciso escalonar para gerência?
6. Cliente ficou satisfeito com o atendimento?

FRASES IMPORTANTES:
- "Vou verificar isso para você. Um momento, por favor."
- "Para sua segurança, vou confirmar alguns dados cadastrais."
- "O prazo de compensação é de até 72 horas úteis."
- "Posso enviar o boleto por e-mail agora mesmo. Qual e-mail prefere?"
- "Para negociação de débitos, preciso transferir para nossa gerência financeira."
- "Seu pagamento foi confirmado e o serviço será restabelecido em até 24h."

Seja eficiente, empático e sempre busque resolver a situação do cliente.`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          ...messages
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in support-financial-agent:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: 'Desculpe, estou com dificuldades no momento. Por favor, entre em contato pelo WhatsApp (11) 99999-9999 ou e-mail contato@supernetfibra.com.br.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
