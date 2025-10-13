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

    // 1. Buscar todos os contratos do IXC
    console.log('📡 Buscando contratos ativos no IXC...');
    const { data: contractsData } = await supabase.functions.invoke('ixc-integration', {
      body: JSON.stringify({ 
        action: 'getContracts',
        params: { page: 1, limit: 500 }
      })
    });

    if (!contractsData?.success || !contractsData.data) {
      throw new Error('Erro ao buscar contratos do IXC');
    }

    const contracts = contractsData.data;
    console.log(`✅ ${contracts.length} contratos encontrados`);

    // 2. Filtrar apenas contratos com status FA (Financeiro em Atraso)
    let contractsFA = contracts.filter((contract: any) => {
      const statusAcesso = contract.status_acesso || contract.situacao_financeira || '';
      return statusAcesso === 'FA' || statusAcesso.toLowerCase().includes('financeiro');
    });

    // Se modo teste, filtrar apenas o cliente específico
    if (testClientName) {
      contractsFA = contractsFA.filter((contract: any) => {
        const clientName = (contract.cliente || contract.razao || '').toLowerCase();
        return clientName.includes(testClientName.toLowerCase());
      });
      console.log(`🎯 Contratos filtrados para "${testClientName}": ${contractsFA.length}`);
    } else {
      console.log(`🔍 ${contractsFA.length} contratos com status FA encontrados`);
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

    for (const contract of contractsFA) {
      const clientId = contract.id_cliente || contract.cliente_id;
      const clientName = contract.cliente || contract.razao || 'Cliente';
      const statusAcesso = contract.status_acesso || contract.situacao_financeira;

      console.log(`\n📋 Processando: ${clientName} (ID: ${clientId}, Status: ${statusAcesso})`);

      try {
        // Buscar dados completos do cliente
        const { data: clientData } = await supabase.functions.invoke('ixc-integration', {
          body: JSON.stringify({
            action: 'getCustomer',
            params: { customerId: clientId }
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

        const titles = titlesData?.data?.titles || [];
        const overdueTitle = titles.find((t: any) => {
          const today = new Date();
          const dueDate = new Date(t.data_vencimento);
          return dueDate < today && (t.status === 'A' || t.status === 'R');
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

        // Enviar boleto via WhatsApp
        console.log(`📤 Enviando boleto para ${customerPhone}...`);
        const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-payment-to-customer', {
          headers: invokeHeaders,
          body: {
            phone: customerPhone,
            cpf: customerCpf
          }
        });

        if (sendError || !sendResult?.success) {
          console.log(`❌ Erro ao enviar para ${clientName}:`, sendError?.message || sendResult?.error);
          results.errors++;
          results.details.push({
            clientId,
            clientName,
            phone: customerPhone,
            error: sendError?.message || sendResult?.error,
            status: 'error'
          });
        } else {
          console.log(`✅ Boleto enviado com sucesso para ${clientName}`);
          results.sent++;
          results.details.push({
            clientId,
            clientName,
            phone: customerPhone,
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
              phone: customerPhone,
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
