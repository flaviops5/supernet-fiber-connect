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
    const { testClientName } = await req.json().catch(() => ({}));
    
    if (testClientName) {
      console.log(`🎯 Modo TESTE: Processando apenas cliente "${testClientName}"`);
    } else {
      console.log('🤖 Iniciando envio automático de boletos para clientes em FA...');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const invokeHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    };

    // 1. Buscar clientes com status FA no IXC
    console.log('📡 Buscando clientes com status FA no IXC...');
    const { data: customersResp } = await supabase.functions.invoke('ixc-integration', {
      body: JSON.stringify({ 
        action: 'getCustomersByStatus',
        params: { status: 'FINANCEIRO EM ATRASO', page: 1, limit: 500 }
      })
    });

    if (!customersResp?.success || !customersResp.data) {
      throw new Error('Erro ao buscar clientes por status no IXC');
    }

    // Mantemos o nome "contracts" por compatibilidade com o restante do código
    const contracts = customersResp.data;
    console.log(`✅ ${contracts.length} clientes com status FA encontrados`);

    // 2. Filtrar por nome apenas em modo teste
    let contractsFA = contracts;

    if (testClientName) {
      contractsFA = contractsFA.filter((customer: any) => {
        const clientName = (customer.razao || customer.nome_fantasia || '').toLowerCase();
        return clientName.includes(testClientName.toLowerCase());
      });
      console.log(`🎯 Clientes filtrados para "${testClientName}": ${contractsFA.length}`);
    } else {
      console.log(`🔍 ${contractsFA.length} clientes prontos para processamento`);
    }

    if (contractsFA.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Nenhum cliente com status FA encontrado',
          stats: {
            totalContracts: contracts.length,
            contractsFA: 0,
            sent: 0,
            errors: 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Para cada contrato FA, buscar títulos vencidos e enviar
    const results = {
      sent: 0,
      errors: 0,
      details: [] as any[]
    };

    for (const customer of contractsFA) {
      const clientId = customer.id || customer.cliente_id || customer.id_cliente;
      const clientName = customer.razao || customer.nome_fantasia || 'Cliente';
      const statusAcesso = customer.statusInfo?.contracts?.[0]?.status_internet || customer.status || 'FA';

      console.log(`\n📋 Processando: ${clientName} (ID: ${clientId}, Status: ${statusAcesso})`);

      try {
        // Buscar dados completos do cliente
        const { data: clientData } = await supabase.functions.invoke('ixc-integration', {
          body: JSON.stringify({
            action: 'getCustomer',
            params: { id: clientId }
          })
        });

        if (!clientData?.success || !clientData.data) {
          console.log(`⚠️ Cliente ${clientId} não encontrado`);
          results.errors++;
          results.details.push({
            clientId,
            clientName,
            error: 'Cliente não encontrado',
            status: 'error'
          });
          continue;
        }

        const customer = clientData.data;
        const customerPhone = customer.telefone_celular || customer.fone_celular || customer.whatsapp;
        const customerCpf = customer.cnpj_cpf;

        if (!customerPhone) {
          console.log(`⚠️ Cliente ${clientName} sem telefone cadastrado`);
          results.errors++;
          results.details.push({
            clientId,
            clientName,
            error: 'Telefone não cadastrado',
            status: 'error'
          });
          continue;
        }

        // Buscar títulos financeiros
        const { data: titlesData } = await supabase.functions.invoke('ixc-integration', {
          body: JSON.stringify({
            action: 'getFinancialTitles',
            params: { customerId: clientId }
          })
        });

        const titles = titlesData?.data?.registros || [];
        const overdueTitle = titles.find((t: any) => {
          const today = new Date();
          const dueDate = new Date(t.data_vencimento);
          const statusTitulo = (t.status || t.situacao || '').toUpperCase();
          return dueDate < today && (statusTitulo === 'A' || statusTitulo === 'R');
        });

        if (!overdueTitle) {
          console.log(`⚠️ Cliente ${clientName} sem títulos vencidos`);
          results.details.push({
            clientId,
            clientName,
            status: 'no_overdue_titles'
          });
          continue;
        }

        console.log(`💰 Título vencido encontrado: ${overdueTitle.id} - R$ ${overdueTitle.valor}`);

        // Buscar QRCode PIX para o título
        const { data: pixData } = await supabase.functions.invoke('ixc-integration', {
          body: JSON.stringify({
            action: 'getPixQrCode',
            params: { titleId: String(overdueTitle.id) }
          })
        });

        const pixCode = pixData?.data?.qrcode || null;
        const pixLink = pixData?.data?.qrcode_link || pixData?.data?.qrcode_url || null;

        // Montar mensagem
        let messageText = `Olá ${clientName}! 👋\n\nIdentificamos um boleto em aberto e seu acesso está com redução de velocidade. Seguem os dados para pagamento:\n\n`;
        messageText += `💵 Valor: R$ ${overdueTitle.valor}\n`;
        messageText += `📅 Vencimento: ${overdueTitle.data_vencimento}\n`;
        if (overdueTitle.codbar) {
          messageText += `\n🔢 Código de Barras:\n\`\`\`${overdueTitle.codbar}\`\`\`\n`;
        }
        if (overdueTitle.url_boleto) {
          messageText += `\n📎 Link do Boleto:\n${overdueTitle.url_boleto}\n`;
        }
        if (pixCode) {
          messageText += `\n🏦 PIX Copia e Cola:\n\`\`\`${pixCode}\`\`\`\n`;
        }
        if (pixLink) {
          messageText += `\n🔗 Link de Pagamento PIX:\n${pixLink}\n`;
        }
        messageText += `\nApós o pagamento, a normalização é automática. Dúvidas? Estamos à disposição. 😊`;

        // Enviar WhatsApp diretamente
        console.log(`📤 Enviando boleto para ${customerPhone}...`);
        const targetPhone = String(customerPhone).replace(/\D/g, '');
        const { data: sendData, error: sendError } = await supabase.functions.invoke('send-whatsapp-message', {
          headers: invokeHeaders,
          body: {
            phone: targetPhone,
            message: messageText,
            instanceName: 'SDR2'
          }
        });

        if (sendError || !sendData?.status) {
          console.log(`❌ Erro ao enviar para ${clientName}:`, sendError?.message || 'Falha no envio');
          results.errors++;
          results.details.push({
            clientId,
            clientName,
            phone: targetPhone,
            error: sendError?.message || 'Falha no envio WhatsApp',
            status: 'error'
          });
        } else {
          console.log(`✅ Boleto enviado com sucesso para ${clientName}`);
          results.sent++;
          results.details.push({
            clientId,
            clientName,
            phone: targetPhone,
            titleId: overdueTitle.id,
            titleValue: overdueTitle.valor,
            dueDate: overdueTitle.data_vencimento,
            status: 'sent'
          });

          // Registrar no action_log
          await supabase.from('action_log').insert({
            action_type: 'auto_send_overdue_invoice',
            agent_name: 'system_auto',
            client_cpf: customerCpf,
            action_payload: {
              client_id: clientId,
              client_name: clientName,
              phone: targetPhone,
              title_id: overdueTitle.id,
              title_value: overdueTitle.valor,
              due_date: overdueTitle.data_vencimento,
              status_acesso: statusAcesso
            },
            result: {
              success: true,
              message: 'Boleto enviado automaticamente por WhatsApp'
            }
          });
        }

        // Aguardar 2 segundos entre envios para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ Erro ao processar cliente ${clientName}:`, error);
        results.errors++;
        results.details.push({
          clientId,
          clientName,
          error: error.message,
          status: 'error'
        });
      }
    }

    console.log('\n✅ Processamento concluído!');
    console.log(`📊 Resumo: ${results.sent} enviados, ${results.errors} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processamento concluído: ${results.sent} boletos enviados`,
        stats: {
          totalContracts: contracts.length,
          contractsFA: contractsFA.length,
          sent: results.sent,
          errors: results.errors
        },
        details: results.details
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno do servidor'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
