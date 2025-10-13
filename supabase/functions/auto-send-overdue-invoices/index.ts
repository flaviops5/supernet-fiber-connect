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

    // 1. Buscar títulos vencidos no IXC (como check-due-invoices)
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
          rp: 1000,
          sortorder: 'asc'
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
            totalTitles: 0,
            clientsFA: 0,
            sent: 0,
            errors: 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Processar títulos e agrupar por cliente (apenas títulos não pagos)
    const clientTitlesMap = new Map<string, any[]>();
    for (const title of titles) {
      // Verificar se o título está pago ou cancelado
      const titleStatus = (title.status || '').toUpperCase();
      if (['PAID', 'CANCELLED', 'CANCELED', 'P', 'C', 'R'].includes(titleStatus)) {
        continue;
      }

      const clientId = String(title.id_cliente || title.cliente_id);
      if (!clientTitlesMap.has(clientId)) {
        clientTitlesMap.set(clientId, []);
      }
      clientTitlesMap.get(clientId)!.push(title);
    }

    console.log(`📊 Total de clientes únicos com títulos vencidos: ${clientTitlesMap.size}`);

    // 3. Para cada cliente, buscar dados completos e verificar status FA
    const clientsToProcess: Array<{id: string, name: string, data: any, overdueTitle: any}> = [];

    for (const [clientId, clientTitles] of clientTitlesMap.entries()) {
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
          console.log(`⚠️ Cliente ${clientId} não encontrado no IXC`);
          continue;
        }

        const clientName = customer.razao || customer.nome_fantasia || 'Cliente';
        
        // Verificar se o cliente está com status FA
        const customerStatus = (customer.status || '').toUpperCase();
        const isFAStatus = ['FA', 'FINANCEIRO EM ATRASO'].includes(customerStatus);
        
        console.log(`👤 Cliente ${clientName} (${clientId}) - Status: ${customerStatus} - É FA? ${isFAStatus}`);
        
        if (!isFAStatus) {
          console.log(`⏭️  Pulando ${clientName} - não está em FA`);
          continue;
        }

        clientsToProcess.push({
          id: clientId,
          name: clientName,
          data: customer,
          overdueTitle: clientTitles[0] // Pegar o primeiro título vencido
        });

      } catch (error) {
        console.error(`❌ Erro ao buscar dados do cliente ${clientId}:`, error);
      }
    }

    console.log(`📊 Total de clientes em FA para processar: ${clientsToProcess.length}`);

    // 4. Filtrar por nome em modo teste
    let finalClientsToProcess = clientsToProcess;
    
    if (testClientName) {
      finalClientsToProcess = clientsToProcess.filter(client => 
        client.name.toLowerCase().includes(testClientName.toLowerCase())
      );
      console.log(`🎯 Clientes filtrados para "${testClientName}": ${finalClientsToProcess.length}`);
    }

    if (finalClientsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: testClientName 
            ? `Nenhum cliente em FA encontrado com nome "${testClientName}"`
            : 'Nenhum cliente em FA com títulos vencidos',
          stats: {
            totalTitles: titles.length,
            clientsFA: 0,
            sent: 0,
            errors: 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Para cada cliente FA, enviar boleto via WhatsApp
    const results = {
      sent: 0,
      errors: 0,
      details: [] as any[]
    };

    for (const client of finalClientsToProcess) {
      const { id: clientId, name: clientName, data: customer, overdueTitle } = client;

      console.log(`\n📋 Processando: ${clientName} (ID: ${clientId})`);

      try {
        const customerPhone = customer.celular || customer.telefone_celular || customer.fone_celular || customer.whatsapp;
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

        console.log(`💰 Título vencido: ${overdueTitle.id} - R$ ${overdueTitle.valor}`);

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
              customer_status: 'FA'
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
            totalTitles: titles.length,
            clientsFA: finalClientsToProcess.length,
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
