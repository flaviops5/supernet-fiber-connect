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
    const { phone, cpf } = await req.json();
    console.log('📞 Enviando pagamento para:', { phone, cpf });

    if (!phone && !cpf) {
      return new Response(
        JSON.stringify({ success: false, error: 'Telefone ou CPF é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Cabeçalhos para chamadas internas
    const invokeHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    };

    // 1. BUSCAR CLIENTE NO IXC COM MÚLTIPLOS FALLBACKS
    console.log('🔍 Iniciando busca de cliente...');
    let customer = null;
    let customerId = null;
    let customerName = null;
    let customerPhone = null;

    // Preparar valores de busca
    const cpfClean = cpf ? cpf.replace(/\D/g, '') : null;
    const phoneClean = phone ? phone.replace(/\D/g, '') : null;
    
    console.log('📝 Valores para busca:', { cpf, cpfClean, phone, phoneClean });

    // TENTATIVA 1: Buscar por CPF formatado (como está no banco)
    if (cpfClean && cpfClean.length === 11) {
      console.log('🔄 Tentativa 1: Buscar CPF formatado');
      const cpfFormatted = cpfClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      const { data: searchData1 } = await supabase.functions.invoke('ixc-integration', {
        headers: invokeHeaders,
        body: { action: 'searchCustomers', params: { query: cpfFormatted } }
      });
      
      if (searchData1?.success && searchData1.data?.length > 0) {
        customer = searchData1.data[0];
        console.log('✅ Cliente encontrado com CPF formatado');
      }
    }

    // TENTATIVA 2: Buscar por CPF sem formatação
    if (!customer && cpfClean) {
      console.log('🔄 Tentativa 2: Buscar CPF sem formatação');
      const { data: searchData2 } = await supabase.functions.invoke('ixc-integration', {
        headers: invokeHeaders,
        body: { action: 'searchCustomers', params: { query: cpfClean } }
      });
      
      if (searchData2?.success && searchData2.data?.length > 0) {
        customer = searchData2.data[0];
        console.log('✅ Cliente encontrado com CPF limpo');
      }
    }

    // TENTATIVA 3: Buscar por telefone
    if (!customer && phoneClean) {
      console.log('🔄 Tentativa 3: Buscar por telefone');
      const { data: searchData3 } = await supabase.functions.invoke('ixc-integration', {
        headers: invokeHeaders,
        body: { action: 'searchCustomers', params: { query: phoneClean } }
      });
      
      if (searchData3?.success && searchData3.data?.length > 0) {
        customer = searchData3.data[0];
        console.log('✅ Cliente encontrado com telefone');
      }
    }

    // TENTATIVA 4: Carregar lote e filtrar localmente
    if (!customer) {
      console.log('🔄 Tentativa 4: Buscar em lote local');
      const { data: allCustomers } = await supabase.functions.invoke('ixc-integration', {
        headers: invokeHeaders,
        body: { 
          action: 'getCustomers', 
          params: { limit: 500, page: 1 } 
        }
      });
      
      if (allCustomers?.success && allCustomers.data) {
        console.log(`📦 Carregados ${allCustomers.data.length} clientes para filtrar`);
        
        customer = allCustomers.data.find((c: any) => {
          const clientCpf = (c.cnpj_cpf || '').replace(/\D/g, '');
          const clientPhone = (c.telefone_celular || c.fone_celular || '').replace(/\D/g, '');
          
          return (cpfClean && clientCpf === cpfClean) || 
                 (phoneClean && clientPhone === phoneClean);
        });
        
        if (customer) {
          console.log('✅ Cliente encontrado no lote local');
        }
      }
    }

    // Verificar se encontrou o cliente
    if (!customer) {
      console.log('❌ Cliente NÃO encontrado após todas as tentativas');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cliente não encontrado no sistema',
          searchValues: { cpf: cpfClean, phone: phoneClean }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Extrair dados do cliente encontrado
    customerId = customer.id;
    customerName = customer.razao || 'Cliente';
    customerPhone = customer.telefone_celular || customer.fone_celular || phoneClean;
    console.log('✅ Dados do cliente:', { id: customerId, name: customerName, phone: customerPhone });

    // 2. Buscar títulos financeiros pendentes
    console.log('💰 Buscando títulos financeiros...');
    const { data: titlesData } = await supabase.functions.invoke('ixc-integration', {
      headers: invokeHeaders,
      body: {
        action: 'getFinancialTitles',
        params: { customerId }
      }
    });

    const titles = titlesData?.data?.titles || [];
    
    if (titles.length === 0) {
      console.log('⚠️ Nenhum título pendente');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cliente não possui faturas em aberto',
          customerName
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const firstTitle = titles[0];
    console.log('📄 Título encontrado:', { 
      id: firstTitle.id, 
      valor: firstTitle.valor,
      vencimento: firstTitle.data_vencimento 
    });

    // 3. Buscar QR Code PIX
    console.log('💳 Buscando dados PIX...');
    const { data: pixData } = await supabase.functions.invoke('ixc-integration', {
      headers: invokeHeaders,
      body: {
        action: 'getPixQrCode',
        params: { titleId: firstTitle.id }
      }
    });

    const pixCode = pixData?.data?.qrcode || null;
    const pixLink = pixData?.data?.qrcode_link || pixData?.data?.qrcode_original_link_pagamento || null;

    // 4. Formatar mensagem
    let messageText = `Olá ${customerName}! 👋\n\nSegue os dados para pagamento:\n\n`;
    messageText += `💵 *Valor:* R$ ${firstTitle.valor}\n`;
    messageText += `📅 *Vencimento:* ${firstTitle.data_vencimento}\n\n`;

    if (pixCode) {
      messageText += `🏦 *PIX COPIA E COLA:*\n\`\`\`${pixCode}\`\`\`\n\n`;
    }

    if (firstTitle.codbar) {
      messageText += `🔢 *Código de Barras:*\n\`\`\`${firstTitle.codbar}\`\`\`\n\n`;
    }

    if (firstTitle.url_boleto) {
      messageText += `📎 *Link do Boleto:*\n${firstTitle.url_boleto}\n\n`;
    }

    if (pixLink) {
      messageText += `🔗 *Link de Pagamento:*\n${pixLink}\n\n`;
    }

    messageText += `Qualquer dúvida, estamos à disposição! 😊`;

    console.log('📝 Mensagem formatada');

    // 5. Enviar via WhatsApp
    console.log('📤 Enviando via WhatsApp...');
    const targetPhone = customerPhone.replace(/\D/g, '');
    const { data: sendData, error: sendError } = await supabase.functions.invoke('send-whatsapp-message', {
      headers: invokeHeaders,
      body: {
        phone: targetPhone,
        message: messageText,
        instanceName: 'SDR2'
      }
    });

    if (sendError || !sendData?.status) {
      console.error('❌ Erro ao enviar WhatsApp:', sendError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao enviar mensagem WhatsApp',
          details: sendError 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('✅ Mensagem enviada com sucesso!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pagamento enviado com sucesso',
        data: {
          customer: {
            id: customerId,
            name: customerName,
            phone: targetPhone
          },
          payment: {
            valor: firstTitle.valor,
            vencimento: firstTitle.data_vencimento,
            hasPix: !!pixCode,
            hasBoleto: !!firstTitle.url_boleto
          },
          whatsapp: {
            status: sendData.status,
            messageId: sendData.data?.id
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
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
