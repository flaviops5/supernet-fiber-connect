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

    // 1. Buscar cliente no IXC pelo CPF ou telefone
    console.log('🔍 Buscando cliente no IXC...');
    const searchValue = cpf ? cpf.replace(/\D/g, '') : phone.replace(/\D/g, '');
    
    const { data: searchData } = await supabase.functions.invoke('ixc-integration', {
      headers: invokeHeaders,
      body: {
        action: 'searchCustomers',
        params: { 
          query: searchValue
        }
      }
    });

    if (!searchData?.success || !searchData.data || searchData.data.length === 0) {
      console.log('❌ Cliente não encontrado');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cliente não encontrado no sistema',
          searchValue
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Pega o primeiro resultado da busca
    const customer = searchData.data[0];
    const customerId = customer.id;
    const customerName = customer.razao || 'Cliente';
    const customerPhone = customer.telefone_celular || customer.fone_celular || phone;
    console.log('✅ Cliente encontrado:', { id: customerId, name: customerName, phone: customerPhone });

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
