import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { scenario_type } = await req.json();

    // Cenários baseados na documentação
    const scenarios = {
      boleto_perdido: {
        title: "Cliente Perdeu o Boleto",
        customer_profile: {
          name: "Maria Silva",
          cpf: "123.456.789-00",
          contract_status: "active",
          has_overdue: true,
          overdue_amount: 99.90,
          due_date: "15/12/2025"
        },
        conversation: [
          {
            role: "customer",
            content: "Oi, perdi o boleto da internet, pode me mandar de novo?"
          },
          {
            role: "agent",
            content: "Olá Maria! 😊 Claro que posso te ajudar!\n\nIdentifiquei sua situação:\n🌐 Status: ONLINE\n🔒 Acesso: LIBERADO\n💰 Situação Financeira: 1 título em aberto\n\nSegue os dados para pagamento:\n\n💵 Valor: R$ 99,90\n📅 Vencimento: 15/12/2025\n\n🏦 PIX COPIA E COLA:\n00020126580014br.gov.bcb.pix2536api.developer.btgpactual.com/v1/5204000053039865802BR5913SUPERNET6009SAO PAULO62410503***63046B8A\n\n🔢 Código de Barras:\n34191234567890123456789012345678901234567890\n\n📎 Link do Boleto: https://supernet.com.br/boleto/12345\n🔗 Link de Pagamento: https://pix.supernet.com.br/qr/abc123\n\nPreferência de pagamento:\n• PIX: Desbloqueio automático em menos de 5 segundos\n• BOLETO: Seu banco pode demorar até 48 horas para confirmar. Se pagar por boleto e quiser desbloqueio rápido, nos envie o comprovante que faremos a baixa manual.\n\nPosso te ajudar com mais alguma coisa?"
          },
          {
            role: "customer",
            content: "Perfeito! Vou pagar por PIX agora mesmo. Obrigada!"
          },
          {
            role: "agent",
            content: "Que ótimo! 🎉 Assim que o pagamento for confirmado, seu acesso será liberado automaticamente em alguns segundos.\n\nQualquer dúvida, estou por aqui! 😊\n\nTenha um ótimo dia!"
          }
        ],
        metadata: {
          resolution_time: "90 seconds",
          customer_satisfaction: 5,
          tools_used: ["buscar_faturas_cliente", "enviar_pix_boleto"],
          outcome: "resolved_successfully"
        }
      },
      
      pagamento_pix: {
        title: "Cliente Quer Pagar por PIX",
        customer_profile: {
          name: "João Santos",
          cpf: "987.654.321-00",
          contract_status: "blocked",
          has_overdue: true,
          overdue_amount: 149.90,
          due_date: "10/12/2025"
        },
        conversation: [
          {
            role: "customer",
            content: "Minha internet tá bloqueada, quero pagar por pix pra liberar rápido"
          },
          {
            role: "agent",
            content: "Olá João! 😊 Já estou verificando sua situação!\n\nIdentifiquei sua situação:\n🌐 Status: OFFLINE\n🔒 Acesso: BLOQUEADO (Financeiro)\n💰 Situação Financeira: 1 título vencido\n\n✅ Boa notícia! Consegui desbloquear sua conexão por cortesia! Teste já sua navegação.\n\nPara regularizar seu pagamento via PIX:\n\n💵 Valor: R$ 149,90\n📅 Vencimento: 10/12/2025 (VENCIDO)\n\n🏦 PIX COPIA E COLA:\n00020126580014br.gov.bcb.pix2536api.developer.btgpactual.com/v1/5204000053039865802BR5913SUPERNET6009SAO PAULO62410503***63047C9B\n\n🔗 Link de Pagamento: https://pix.supernet.com.br/qr/def456\n\nPagamento por PIX tem desbloqueio automático em menos de 5 segundos! ⚡\n\nÉ só copiar o código e colar no seu aplicativo do banco. Posso te ajudar com mais alguma coisa?"
          },
          {
            role: "customer",
            content: "Já voltou a internet! Vou pagar agora, valeu!"
          },
          {
            role: "agent",
            content: "Que bom que já está funcionando! 🎉\n\nAssim que realizar o pagamento pelo PIX, a confirmação é automática e você fica totalmente regularizado.\n\nQualquer coisa, estou por aqui! 😊"
          }
        ],
        metadata: {
          resolution_time: "120 seconds",
          customer_satisfaction: 5,
          tools_used: ["desbloquear_cliente_ixc", "buscar_faturas_cliente", "enviar_pix_boleto"],
          outcome: "resolved_with_unblock"
        }
      },

      email_nao_chegou: {
        title: "Cliente Não Recebeu Email com Boleto",
        customer_profile: {
          name: "Ana Paula Costa",
          cpf: "456.789.123-00",
          contract_status: "active",
          has_overdue: true,
          overdue_amount: 79.90,
          due_date: "20/12/2025"
        },
        conversation: [
          {
            role: "customer",
            content: "O email com o boleto não chegou. Podem reenviar?"
          },
          {
            role: "agent",
            content: "Olá Ana Paula! 😊 Claro, vou te ajudar com isso!\n\nIdentifiquei sua situação:\n🌐 Status: ONLINE\n🔒 Acesso: LIBERADO\n💰 Situação Financeira: 1 título em aberto\n\nSegue todos os dados para pagamento:\n\n💵 Valor: R$ 79,90\n📅 Vencimento: 20/12/2025\n\n🏦 PIX COPIA E COLA:\n00020126580014br.gov.bcb.pix2536api.developer.btgpactual.com/v1/5204000053039865802BR5913SUPERNET6009SAO PAULO62410503***63048D2C\n\n🔢 Código de Barras:\n34191234567890123456789012345678901234567891\n\n📎 Link do Boleto: https://supernet.com.br/boleto/67890\n🔗 Link de Pagamento: https://pix.supernet.com.br/qr/ghi789\n\nVocê pode:\n1. Copiar o código PIX e pagar pelo app do seu banco (mais rápido)\n2. Clicar no link do boleto para imprimir\n3. Usar o código de barras em qualquer banco ou lotérica\n\nPreferência de pagamento:\n• PIX: Confirmação instantânea\n• BOLETO: Até 48h para compensação\n\nVerifique também sua caixa de spam, às vezes o email vai para lá. Posso te ajudar com mais alguma coisa?"
          },
          {
            role: "customer",
            content: "Ah sim, encontrei na pasta de spam! Obrigada pela ajuda!"
          },
          {
            role: "agent",
            content: "Que bom que encontrou! 😊\n\nPara evitar que isso aconteça novamente, adicione nosso email (contato@supernet.com.br) na sua lista de contatos seguros.\n\nQualquer dúvida sobre o pagamento, estou à disposição! 💙"
          }
        ],
        metadata: {
          resolution_time: "110 seconds",
          customer_satisfaction: 5,
          tools_used: ["buscar_faturas_cliente", "enviar_pix_boleto"],
          outcome: "resolved_successfully"
        }
      },

      negociacao_com_boleto: {
        title: "Negociação de Débito com Solicitação de Boleto",
        customer_profile: {
          name: "Carlos Rodrigues",
          cpf: "321.654.987-00",
          contract_status: "blocked",
          has_overdue: true,
          overdue_amount: 299.70,
          overdue_count: 3,
          due_date: "05/12/2025"
        },
        conversation: [
          {
            role: "customer",
            content: "Tô com 3 meses atrasados, quanto fica pra pagar tudo?"
          },
          {
            role: "agent",
            content: "Olá Carlos! 😊 Entendo sua situação e estou aqui para te ajudar!\n\nIdentifiquei sua situação:\n🌐 Status: OFFLINE\n🔒 Acesso: BLOQUEADO (Financeiro)\n💰 Situação Financeira: 3 títulos vencidos\n\nValor total em aberto: R$ 299,70\n\nTenho ótimas opções de pagamento para você:\n\n💰 OPÇÃO 1 - À Vista com Desconto\nValor: R$ 269,73 (10% de desconto)\nForma: PIX ou Boleto\n\n💳 OPÇÃO 2 - Parcelado em 2x\n1ª parcela: R$ 149,85 (PIX)\n2ª parcela: R$ 149,85 (Boleto em 30 dias)\n\n💳 OPÇÃO 3 - Parcelado em 3x\n1ª parcela: R$ 99,90 (PIX)\n2ª parcela: R$ 99,90 (Boleto em 30 dias)\n3ª parcela: R$ 99,90 (Boleto em 60 dias)\n\nQual opção funciona melhor para você? Se escolher à vista ou parcelar, já te envio os dados para pagamento! 😊"
          },
          {
            role: "customer",
            content: "Vou pagar à vista com desconto. Me manda o boleto"
          },
          {
            role: "agent",
            content: "Excelente escolha! 🎉 Com o desconto você economiza R$ 29,97!\n\n✅ Consegui desbloquear sua conexão por cortesia! Teste já sua navegação.\n\nSegue os dados para pagamento:\n\n💵 Valor COM DESCONTO: R$ 269,73\n📅 Vencimento: HOJE (para manter o desconto)\n\n🏦 PIX COPIA E COLA:\n00020126580014br.gov.bcb.pix2536api.developer.btgpactual.com/v1/5204000053039865802BR5913SUPERNET6009SAO PAULO62410503***63049E3D\n\n🔢 Código de Barras:\n34191234567890123456789012345678901234567892\n\n📎 Link do Boleto: https://supernet.com.br/boleto/acordo-12345\n🔗 Link de Pagamento: https://pix.supernet.com.br/qr/acordo-jkl012\n\n⚠️ IMPORTANTE: O desconto é válido apenas para pagamento até hoje. Após essa data, volta ao valor integral de R$ 299,70.\n\nPreferência de pagamento:\n• PIX: Desbloqueio automático e desconto garantido\n• BOLETO: Até 48h para confirmação\n\nPosso te ajudar com mais alguma coisa?"
          },
          {
            role: "customer",
            content: "Perfeito! Vou pagar agora mesmo. Obrigado!"
          },
          {
            role: "agent",
            content: "Por nada! 😊\n\nSua conexão já está liberada e assim que confirmar o pagamento, ficará totalmente regularizado com um belo desconto!\n\nConte sempre com a gente! 💙"
          }
        ],
        metadata: {
          resolution_time: "180 seconds",
          customer_satisfaction: 5,
          tools_used: ["desbloquear_cliente_ixc", "buscar_faturas_cliente", "criar_acordo_ixc", "enviar_pix_boleto"],
          outcome: "resolved_with_negotiation"
        }
      }
    };

    // Selecionar cenário específico ou retornar todos
    if (scenario_type && scenarios[scenario_type]) {
      return new Response(
        JSON.stringify({
          success: true,
          scenario: {
            key: scenario_type,
            ...scenarios[scenario_type]
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Retornar todos os cenários
    const allScenarios = Object.entries(scenarios).map(([key, value]) => ({
      key,
      ...value
    }));

    return new Response(
      JSON.stringify({
        success: true,
        scenarios: allScenarios,
        total: allScenarios.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Erro ao gerar cenários de segunda via:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
