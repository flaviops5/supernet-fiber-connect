import { createPublicHandler } from "../_shared/base-handler.ts";

Deno.serve(createPublicHandler(
  'generate-ai-flow-simulations',
  async (req, { supabase }) => {
    const { agentType, theme, numVariations = 3 } = await req.json();
    
    if (!agentType || !theme) {
      throw new Error('agentType and theme are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Definir contexto do agente
    const agentContexts: Record<string, string> = {
      'support-tech-agent': `Você é Luan, um agente de suporte técnico especializado em resolver problemas de conectividade e internet. 
      
Ferramentas disponíveis:
- test_equipment_connectivity: Testa conectividade de equipamentos
- reboot_client_equipment: Reinicia equipamento do cliente
- get_onu_signal_status: Consulta sinal da ONU
- criar_atendimento_ixc: Cria atendimento no sistema

Seu objetivo é diagnosticar problemas técnicos de forma eficiente, realizar testes quando necessário e resolver o problema do cliente.`,
      
      'support-financial-agent': `Você é um agente financeiro que auxilia clientes com questões de pagamento, faturas e negociação de débitos.
      
Ferramentas disponíveis:
- send_payment_to_customer: Envia boleto/PIX para cliente
- ixc_client_lookup: Busca informações financeiras do cliente

Seu objetivo é resolver questões financeiras de forma empática e eficiente.`,
      
      'sales-agent': `Você é um agente de vendas que apresenta planos de internet e fecha novos contratos.
      
Seu objetivo é identificar necessidades do cliente e oferecer o plano mais adequado.`,
    };

    const agentContext = agentContexts[agentType] || agentContexts['support-tech-agent'];

    const systemPrompt = `${agentContext}

TAREFA: Gere ${numVariations} variações COMPLETAS de conversas realistas baseadas no tema: "${theme}"

Cada conversa deve:
1. Ter entre 3-6 interações (mensagem agente → resposta cliente)
2. Seguir fluxo natural de diagnóstico/resolução
3. Incluir tools quando apropriado (indicar com [TOOL: nome_da_tool])
4. Variar as respostas do cliente (positivas, negativas, dúvidas)
5. Ter conclusão clara (problema resolvido, escalado, etc)

Retorne JSON no formato:
{
  "conversations": [
    {
      "id": "conv_1",
      "scenario_description": "Breve descrição da variação",
      "conversation": [
        {
          "step": 1,
          "agent_message": "Mensagem do agente",
          "user_response": "Resposta do cliente",
          "tools_used": ["nome_tool"] // opcional
        }
      ],
      "quality_score": 85,
      "suggestions": ["Sugestão de melhoria"]
    }
  ]
}`;

    console.log('Generating conversations with Lovable AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Gere as ${numVariations} conversas completas.` }
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices[0].message.content;
    
    console.log('AI Response received:', content.substring(0, 200));

    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', content);
      throw new Error('Invalid JSON response from AI');
    }

    return parsedContent;
  }
));
