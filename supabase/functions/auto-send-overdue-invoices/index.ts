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

    // 1. Buscar títulos vencidos no IXC
    console.log('📡 Buscando títulos vencidos no IXC...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const { data: titlesResp, error: ixcError } = await supabase.functions.invoke('ixc-integration', {
      body: {
        action: 'getFinancialTitles',
        params: {
          qtype: 'fn_areceber.data_vencimento',
          oper: '<',
          query: todayStr,
          page: 1,
          rp: 1000
        }
      }
    });

    if (ixcError) {
      throw new Error(`Erro ao invocar ixc-integration: ${ixcError.message}`);
    }

    const titles = titlesResp?.data?.registros || titlesResp?.registros || [];
    console.log(`📊 Total de títulos vencidos encontrados: ${titles.length}`);

    if (titles.length === 0) {
      console.log('⚠️ Nenhum título vencido encontrado');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Nenhum título vencido encontrado',
          stats: {
            totalContracts: 0,
            contractsFA: 0,
            sent: 0,
            errors: 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Processar títulos e agrupar por cliente
    const clientTitles = new Map<string, any[]>();
    for (const title of titles) {
      // Verificar se o título está pago ou cancelado
      const status = (title.status || '').toUpperCase();
      if (['PAID', 'CANCELLED', 'CANCELED', 'P', 'C'].includes(status)) {
        continue;
      }

      const clientId = String(title.id_cliente || title.cliente_id);
      if (!clientTitles.has(clientId)) {
        clientTitles.set(clientId, []);
      }
      clientTitles.get(clientId)!.push(title);
    }

    console.log(`📊 Total de clientes com títulos vencidos: ${clientTitles.size}`);

    // 3. Filtrar por nome do cliente em modo teste
    let processClients = Array.from(clientTitles.keys());

    if (testClientName) {
      // Em modo teste, filtrar por nome
      const filteredClients: string[] = [];
      for (const clientId of processClients) {
        const titles = clientTitles.get(clientId)!;
        const firstTitle = titles[0];
        const clientName = (firstTitle.cliente_nome || '').toLowerCase();
        if (clientName.includes(testClientName.toLowerCase())) {
          filteredClients.push(clientId);
        }
      }
      processClients = filteredClients;
      console.log(`🎯 Clientes filtrados para "${testClientName}": ${processClients.length}`);
    }

    if (processClients.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: testClientName 
            ? `Nenhum cliente encontrado com nome "${testClientName}"`
            : 'Nenhum cliente com títulos vencidos',
          stats: {
            totalContracts: titles.length,
            contractsFA: 0,
            sent: 0,
            errors: 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Para cada cliente, buscar dados e enviar
    const results = {
      sent: 0,
      errors: 0,
      details: [] as any[]
    };

    for (const clientId of processClients) {
      const titlesForClient = clientTitles.get(clientId)!;
      const overdueTitle = titlesForClient[0]; // Pegar o primeiro título vencido

      console.log(`\n📋 Processando cliente ID: ${clientId}`);

      try {
        // Buscar dados completos do cliente
        const { data: clientData } = await supabase.functions.invoke('ixc-integration', {
          body: {
            action: 'getCustomer',
            params: { id: clientId }
          }
        });

        const customer = clientData?.data?.registros?.[0] || clientData?.registros?.[0];
        
        if (!customer) {
          console.log(`⚠️ Cliente ${clientId} não encontrado`);
          results.errors++;
          results.details.push({
            clientId,
            error: 'Cliente não encontrado',
            status: 'error'
          });
          continue;
        }

        const clientName = customer.razao || customer.nome_fantasia || 'Cliente';
        const customerPhone = customer.celular || customer.telefone_celular || customer.fone_celular || customer.whatsapp;
        const customerCpf = customer.cnpj_cpf;
        
        // Verificar se o cliente está com status FA
        const statusCliente = (customer.status || '').toUpperCase();
        if (!['FA', 'FINANCEIRO EM ATRASO'].includes(statusCliente)) {
          console.log(`⏭️  Cliente ${clientName} não está em FA (status: ${statusCliente})`);
          results.details.push({
            clientId,
            clientName,
            status: 'not_fa'
          });
          continue;
        }

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

        console.log(`💰 Cliente ${clientName} - Título vencido: ${overdueTitle.id} - R$ ${overdueTitle.valor}`);

        // Buscar QRCode PIX para o título
        const { data: pixData } = await supabase.functions.invoke('ixc-integration', {
          body: {
            action: 'getPixQrCode',
            params: { id: String(overdueTitle.id) }
          }
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
            totalContracts: titles.length,
            contractsFA: processClients.length,
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
