import { createPublicHandler } from '../_shared/base-handler.ts';

interface PlanFeature {
  text?: string;
  [key: string]: unknown;
}

Deno.serve(createPublicHandler('sync-chatbot-knowledge', async (req, { supabase }) => {

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

    // 4. Limpar knowledge base existente de vendas, serviços e documentação IXC
    await supabase
      .from('knowledge_base')
      .delete()
      .in('category', ['planos', 'vendas', 'empresa', 'faq', 'ixc-api', 'servicos_adicionais']);

    // 5. Criar conteúdo sobre planos (disponível para sales)
    const plansContent = plans?.map(plan => {
      const features = Array.isArray(plan.features) 
        ? plan.features.map((f: PlanFeature | string) => `- ${typeof f === 'string' ? f : f.text || f}`).join('\n')
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

    // 10. Criar informações sobre Automação Residencial
    const automacaoInfo = {
      title: 'Automação Residencial SUPERNET',
      category: 'servicos_adicionais',
      content_type: 'servico',
      agent_type: null, // Disponível para todos
      content: `
AUTOMAÇÃO RESIDENCIAL - SUPERNET FIBRA

DESCRIÇÃO:
Sistema completo de automação residencial que permite controlar sua casa de forma inteligente através de aplicativo, voz ou automações programadas.

CARACTERÍSTICAS:
- Controle de iluminação (liga/desliga, intensidade, cores)
- Controle de temperatura (ar-condicionado, aquecedores)
- Segurança (câmeras, alarmes, fechaduras inteligentes)
- Entretenimento (TV, som, cortinas motorizadas)
- Eficiência energética (monitoramento de consumo)

REQUISITOS:
- Internet de alta velocidade (recomendado 100Mbps ou superior)
- Rede Wi-Fi estável em toda residência
- Dispositivos compatíveis (lâmpadas smart, tomadas inteligentes, etc.)

PREÇOS:
- Pacote Básico: R$ 499 (3 dispositivos)
- Pacote Intermediário: R$ 899 (8 dispositivos)
- Pacote Completo: R$ 1.499 (15 dispositivos)
- Instalação: R$ 199
- Mensalidade de manutenção: R$ 49/mês (opcional)

BENEFÍCIOS:
- Economia de energia até 30%
- Conforto e praticidade
- Segurança reforçada
- Controle remoto via app
- Integração com assistentes de voz (Alexa, Google)

INSTALAÇÃO:
- Agendamento em até 48h
- Instalação profissional em 4-6 horas
- Treinamento de uso incluído
- Garantia de 12 meses

COMPATIBILIDADE:
Trabalhamos com marcas: Tuya, Sonoff, Philips Hue, Intelbras, Geonav

MAIS INFORMAÇÕES:
Acesse: /automacao-residencial
      `.trim(),
      tags: ['automacao', 'smart-home', 'casa-inteligente', 'servico'],
      is_active: true
    };

    // 11. Criar informações sobre Telemedicina
    const telemedicinaInfo = {
      title: 'Telemedicina SUPERNET',
      category: 'servicos_adicionais',
      content_type: 'servico',
      agent_type: null, // Disponível para todos
      content: `
TELEMEDICINA - SUPERNET FIBRA

DESCRIÇÃO:
Serviço de telemedicina com consultas médicas online, disponível 24h por dia, 7 dias por semana, com médicos credenciados pelo CRM.

MODALIDADES DE ATENDIMENTO:
- Consultas por vídeo (mais comum)
- Consultas por telefone
- Chat médico para dúvidas rápidas

ESPECIALIDADES DISPONÍVEIS:
- Clínico Geral
- Pediatria
- Ginecologia
- Dermatologia
- Psicologia
- Nutrição
- Cardiologia
- E outras especialidades sob demanda

PLANOS DISPONÍVEIS:
- Individual: R$ 49,90/mês (consultas ilimitadas)
- Familiar (até 4 pessoas): R$ 129,90/mês
- Corporativo: Consultar valores

BENEFÍCIOS:
- Atendimento 24h/7 dias
- Sem filas de espera
- Receitas digitais válidas
- Atestados médicos
- Encaminhamentos para especialistas
- Histórico médico digital
- Economia de tempo e dinheiro

REQUISITOS:
- Internet estável (recomendado 10Mbps ou superior)
- Dispositivo com câmera (celular, tablet ou computador)
- Documentos: RG, CPF e Cartão SUS

COMO FUNCIONA:
1. Contrate o plano
2. Baixe o aplicativo ou acesse o site
3. Agende ou solicite consulta imediata
4. Seja atendido por médico credenciado
5. Receba prescrições e orientações

IMPORTANTE:
- Não substitui emergências (ligar 192)
- Médicos credenciados pelo CRM
- Consultas gravadas para segurança
- Privacidade garantida (LGPD)
- Prescrições válidas em todo território nacional

MAIS INFORMAÇÕES:
Acesse: /telemedicina
      `.trim(),
      tags: ['telemedicina', 'saude', 'consulta-online', 'servico'],
      is_active: true
    };

    // 12. Inserir tudo na knowledge base
    const allContent = [
      ...plansContent,
      salesSummary,
      ...faqsContent,
      companyInfo,
      ixcTicketDoc,
      automacaoInfo,
      telemedicinaInfo
    ];

    const { error: insertError } = await supabase
      .from('knowledge_base')
      .insert(allContent);

    if (insertError) throw insertError;

    console.log(`Sincronizados ${allContent.length} itens na knowledge base`);

    return { 
      success: true, 
      message: `${allContent.length} itens sincronizados com sucesso`,
      stats: {
        planos: plansContent.length,
        faqs: faqsContent.length,
        vendas: 1,
        empresa: 1,
        ixc_api: 1,
        servicos_adicionais: 2
      }
    };
}));