import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Buscar planos ativos
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('*')
      .eq('active', true)
      .order('display_order');

    if (plansError) throw plansError;

    // 2. Buscar FAQs ativas
    const { data: faqs, error: faqsError } = await supabase
      .from('faqs')
      .select('*')
      .eq('active', true)
      .order('display_order');

    if (faqsError) throw faqsError;

    // 3. Buscar configurações do sistema
    const { data: systemSettings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError) console.error('Settings error:', settingsError);

    // 4. Limpar knowledge base existente de vendas e documentação IXC
    await supabase
      .from('knowledge_base')
      .delete()
      .in('category', ['planos', 'vendas', 'empresa', 'faq', 'ixc-api']);

    // 5. Criar conteúdo sobre planos (disponível para sales)
    const plansContent = plans?.map(plan => {
      const features = Array.isArray(plan.features) 
        ? plan.features.map((f: any) => `- ${f.text || f}`).join('\n')
        : '';
      
      return {
        title: `Plano ${plan.name}`,
        category: 'planos',
        content_type: 'plano',
        agent_type: 'sales',
        content: `
PLANO: ${plan.name}
VELOCIDADE: ${plan.speed}
PREÇO: R$ ${plan.price}
${plan.original_price ? `PREÇO ORIGINAL: R$ ${plan.original_price}` : ''}
${plan.description ? `DESCRIÇÃO: ${plan.description}` : ''}

CARACTERÍSTICAS:
${features}

${plan.popular ? 'Este é o plano MAIS POPULAR!' : ''}

CALL TO ACTION: ${plan.cta_text || 'Contratar Agora'}
        `.trim(),
        tags: ['plano', 'vendas', plan.speed.toLowerCase()],
        is_active: true
      };
    }) || [];

    // 6. Criar resumo de vendas (disponível para sales)
    const salesSummary = {
      title: 'Informações de Vendas - SUPERNET FIBRA',
      category: 'vendas',
      content_type: 'processo',
      agent_type: 'sales',
      content: `
PROCESSO DE VENDAS SUPERNET FIBRA

PLANOS DISPONÍVEIS:
${plans?.map(p => `- ${p.name}: ${p.speed} por R$ ${p.price}/mês`).join('\n')}

DIFERENCIAIS:
- 100% Fibra Óptica
- Alta velocidade e estabilidade
- Suporte técnico especializado
- Instalação rápida

CONTATO PARA VENDAS:
WhatsApp: ${systemSettings?.company_whatsapp || '(11) 99999-9999'}
E-mail: ${systemSettings?.company_email || 'contato@supernetfibra.com.br'}
Telefone: ${systemSettings?.company_phone || '(11) 99999-9999'}

PRÓXIMOS PASSOS:
1. Verificar disponibilidade por CEP
2. Escolher o plano ideal
3. Agendar instalação
4. Assinar contrato digital

OBJEÇÕES COMUNS:
- "Muito caro": Temos planos para todos os bolsos, começando em R$ ${Math.min(...(plans?.map(p => Number(p.price)) || [0]))}/mês
- "Já tenho internet": Nossa fibra óptica oferece velocidade e estabilidade superiores
- "Preciso pensar": Sem problema! Podemos verificar a cobertura no seu CEP agora mesmo
      `.trim(),
      tags: ['vendas', 'processo', 'objecoes'],
      is_active: true
    };

    // 7. Criar FAQs no knowledge base (disponível para todos - agent_type null)
    const faqsContent = faqs?.map(faq => ({
      title: faq.question,
      category: 'faq',
      content_type: 'faq',
      agent_type: null, // Disponível para todos os agentes
      content: `PERGUNTA: ${faq.question}\n\nRESPOSTA: ${faq.answer}`,
      tags: ['faq', 'duvida'],
      is_active: true
    })) || [];

    // 8. Informações da empresa (disponível para todos - agent_type null)
    const companyInfo = {
      title: 'Sobre a SUPERNET FIBRA',
      category: 'empresa',
      content_type: 'institucional',
      agent_type: null, // Disponível para todos os agentes
      content: `
SUPERNET FIBRA

${systemSettings?.site_description || 'Internet fibra óptica de alta velocidade e qualidade.'}

DADOS DE CONTATO:
Empresa: ${systemSettings?.company_name || 'SUPERNET FIBRA'}
CNPJ: ${systemSettings?.company_cnpj || '00.000.000/0001-00'}
Endereço: ${systemSettings?.company_address || 'São Paulo, SP'}
WhatsApp: ${systemSettings?.company_whatsapp || '(11) 99999-9999'}
E-mail: ${systemSettings?.company_email || 'contato@supernetfibra.com.br'}
Telefone: ${systemSettings?.company_phone || '(11) 99999-9999'}
      `.trim(),
      tags: ['empresa', 'contato', 'institucional'],
      is_active: true
    };

    // 9. Documentação da API IXC - Criar Atendimento/Ticket (disponível para support_tech)
    const ixcTicketDoc = {
      title: 'IXC API - Criar Atendimento/Ticket (su_ticket)',
      category: 'ixc-api',
      content_type: 'document',
      agent_type: 'support_tech',
      content: `
# Criação de Atendimento/Ticket no IXC

## Endpoint Correto
**POST** https://{{dominio}}/webservice/v1/su_ticket

⚠️ **IMPORTANTE**: Use o endpoint /su_ticket e NÃO /su_oss_chamado

## Formato da Requisição
- Content-Type: application/json (JSON puro, não form-urlencoded)
- Authorization: Basic {{token_base64}}
- Header adicional: ixcsoft: inserir

## Campos Obrigatórios
{
  "tipo": "C",              // C = Cliente (obrigatório)
  "id_cliente": "123",      // ID do cliente (obrigatório)
  "id_assunto": "25",       // ID do assunto (obrigatório) - 25 = Instalação
  "titulo": "Texto",        // Título do ticket (obrigatório)
  "id_ticket_setor": "3",   // ID do setor (obrigatório) - 3 = Instalação
  "prioridade": "B",        // B=Baixa, N=Normal, A=Alta (obrigatório)
  "menssagem": "Texto",     // Mensagem do ticket (obrigatório)
  "su_status": "N"          // N = Normal (obrigatório)
}

## Campos Opcionais Importantes
{
  "id_filial": "1",
  "origem_endereco": "C",
  "data_reservada": "2025-10-03",  // Data de agendamento (formato: YYYY-MM-DD)
  "status": "A"                     // A = Aberto
}

## Observações Críticas
1. ⚠️ A data de agendamento deve ser FUTURA (não pode ser hoje ou no passado)
2. O campo id_ticket_setor deve corresponder ao id_assunto:
   - Assunto 25 (Instalação) → Setor 3
3. Todos os campos não utilizados podem ser enviados como string vazia ""
4. A API retorna JSON com type: "success" ou type: "error"

## Exemplo de Resposta de Sucesso
{
  "type": "success",
  "message": "Registro inserido com sucesso!",
  "id": "12345"
}

## Exemplo de Resposta de Erro
{
  "type": "error",
  "message": "Preencha Setor"
}

## Mapeamento Assunto → Setor
- Assunto 25 (Instalação) → Setor 3
- Outros assuntos devem ter seus setores verificados com o suporte IXC
      `.trim(),
      tags: ['ixc', 'api', 'ticket', 'atendimento', 'instalacao', 'su_ticket'],
      is_active: true
    };

    // 10. Inserir tudo na knowledge base
    const allContent = [
      ...plansContent,
      salesSummary,
      ...faqsContent,
      companyInfo,
      ixcTicketDoc
    ];

    const { error: insertError } = await supabase
      .from('knowledge_base')
      .insert(allContent);

    if (insertError) throw insertError;

    console.log(`Sincronizados ${allContent.length} itens na knowledge base`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${allContent.length} itens sincronizados com sucesso`,
        stats: {
          planos: plansContent.length,
          faqs: faqsContent.length,
          vendas: 1,
          empresa: 1,
          ixc_api: 1
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error syncing chatbot knowledge:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});