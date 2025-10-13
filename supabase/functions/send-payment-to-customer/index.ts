import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCachedOrFetch, setCache } from "../_shared/cache-helper.ts";
import { getCircuitBreakerStatus } from "../_shared/ixc-client.ts";

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

    // 🔍 Verificar circuit breaker antes de iniciar
    const circuitStatus = getCircuitBreakerStatus();
    if (circuitStatus.state === 'open') {
      console.warn('⚠️ Circuit breaker ABERTO - aguardando recuperação');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Sistema temporariamente indisponível. Tente novamente em alguns instantes.',
          circuitBreaker: circuitStatus
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
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

    // TENTATIVA 1: Buscar no CACHE primeiro
    const cacheKey = cpfClean ? `customer:cpf:${cpfClean}` : phoneClean ? `customer:phone:${phoneClean}` : null;
    
    if (cacheKey) {
      console.log('🔍 Verificando cache:', cacheKey);
      try {
        const { data: cacheData } = await supabase
          .from('ixc_cache')
          .select('value, expires_at')
          .eq('key', cacheKey)
          .maybeSingle();
        
        if (cacheData && new Date(cacheData.expires_at) > new Date()) {
          customer = cacheData.value;
          console.log('✅ Cliente encontrado no CACHE');
        } else {
          console.log('❌ Cache vazio ou expirado');
        }
      } catch (error) {
        console.log('⚠️ Erro ao verificar cache:', error.message);
      }
    }

    // TENTATIVA 2: Buscar por CPF formatado (como está no banco)
    if (!customer && cpfClean && cpfClean.length === 11) {
      const cpfFormatted = cpfClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      console.log('🔍 Tentativa 2: CPF formatado:', cpfFormatted);
      
      const { data: searchData1 } = await supabase.functions.invoke('ixc-integration', {
        body: JSON.stringify({ action: 'searchCustomers', params: { query: cpfFormatted } })
      });
      
      console.log('📊 Resultado tentativa 2:', {
        success: searchData1?.success,
        totalResultados: searchData1?.data?.length || 0,
        primeiroCliente: searchData1?.data?.[0] ? {
          id: searchData1.data[0].id,
          nome: searchData1.data[0].razao,
          cpf: searchData1.data[0].cnpj_cpf
        } : null
      });
      
      if (searchData1?.success && searchData1.data?.length > 0) {
        customer = searchData1.data[0];
        console.log('✅ Cliente encontrado com CPF formatado');
        
        // Salvar no cache
        if (cacheKey) {
          await setCache(supabase, cacheKey, customer, 5 * 60);
          console.log('💾 Cliente salvo no cache');
        }
      }
    }

    // TENTATIVA 3: Buscar por CPF sem formatação
    if (!customer && cpfClean) {
      console.log('🔍 Tentativa 3: CPF limpo:', cpfClean);
      
      const { data: searchData2 } = await supabase.functions.invoke('ixc-integration', {
        body: JSON.stringify({ action: 'searchCustomers', params: { query: cpfClean } })
      });
      
      console.log('📊 Resultado tentativa 3:', {
        success: searchData2?.success,
        totalResultados: searchData2?.data?.length || 0,
        primeiroCliente: searchData2?.data?.[0] ? {
          id: searchData2.data[0].id,
          nome: searchData2.data[0].razao,
          cpf: searchData2.data[0].cnpj_cpf
        } : null
      });
      
      if (searchData2?.success && searchData2.data?.length > 0) {
        customer = searchData2.data[0];
        console.log('✅ Cliente encontrado com CPF limpo');
        
        // Salvar no cache
        if (cacheKey) {
          await setCache(supabase, cacheKey, customer, 5 * 60);
          console.log('💾 Cliente salvo no cache');
        }
      }
    }

    // TENTATIVA 4: Buscar por telefone
    if (!customer && phoneClean) {
      console.log('🔍 Tentativa 4: Telefone:', phoneClean);
      
      const { data: searchData3 } = await supabase.functions.invoke('ixc-integration', {
        body: JSON.stringify({ action: 'searchCustomers', params: { query: phoneClean } })
      });
      
      console.log('📊 Resultado tentativa 4:', {
        success: searchData3?.success,
        totalResultados: searchData3?.data?.length || 0,
        primeiroCliente: searchData3?.data?.[0] ? {
          id: searchData3.data[0].id,
          nome: searchData3.data[0].razao,
          telefones: {
            celular: searchData3.data[0].telefone_celular,
            whatsapp: searchData3.data[0].whatsapp,
            comercial: searchData3.data[0].telefone_comercial
          }
        } : null
      });
      
      if (searchData3?.success && searchData3.data?.length > 0) {
        customer = searchData3.data[0];
        console.log('✅ Cliente encontrado com telefone');
        
        // Salvar no cache
        if (cacheKey) {
          await setCache(supabase, cacheKey, customer, 5 * 60);
          console.log('💾 Cliente salvo no cache');
        }
      }
    }

    // TENTATIVA 5: Carregar lote e filtrar localmente (REDUZIDO PARA 200)
    if (!customer) {
      console.log('🔍 Tentativa 5: Busca local em lote de 200 clientes');
      console.log('🔎 Critérios:', { cpfClean, phoneClean });
      
      // Tentar usar cache de lista de clientes
      const allCustomers = await getCachedOrFetch(
        supabase,
        'customers:batch:200',
        async () => {
          console.log('📡 Buscando clientes do IXC (sem cache)');
          const { data } = await supabase.functions.invoke('ixc-integration', {
            body: JSON.stringify({ 
              action: 'getCustomers', 
              params: { limit: 200, page: 1 } 
            })
          });
          return data;
        },
        3 * 60 // Cache por 3 minutos
      );
      
      if (allCustomers?.success && allCustomers.data) {
        const customerList = allCustomers.data;
        console.log(`📦 ${customerList.length} clientes carregados`);
        
        // Amostra dos 3 primeiros clientes para debug
        console.log('📝 Amostra (3 primeiros):', customerList.slice(0, 3).map((c: any) => ({
          id: c.id,
          nome: c.razao,
          cpf: c.cnpj_cpf,
          telefones: {
            celular: c.telefone_celular,
            fone: c.fone_celular,
            whatsapp: c.whatsapp,
            comercial: c.telefone_comercial
          }
        })));
        
        customer = customerList.find((c: any) => {
          const clientCpf = (c.cnpj_cpf || '').replace(/\D/g, '');
          const phonesRaw = [c.telefone_celular, c.fone_celular, c.whatsapp, c.telefone_comercial].filter(Boolean);
          const phones = phonesRaw.map((p: string) => String(p).replace(/\D/g, ''));

          const cpfMatch = cpfClean && clientCpf === cpfClean;
          const phoneMatch = phoneClean && phones.some((p: string) => p === phoneClean || p.endsWith(phoneClean) || p.includes(phoneClean));
          
          // Log detalhado apenas para matches parciais (últimos 4 dígitos)
          if (cpfMatch || (phoneClean && phones.some(p => p.includes(phoneClean.slice(-4))))) {
            console.log('🔍 Comparação:', {
              clienteId: c.id,
              nome: c.razao,
              cpfCliente: clientCpf,
              cpfBusca: cpfClean,
              cpfMatch,
              telefonesCliente: phones,
              telefoneBusca: phoneClean,
              phoneMatch
            });
          }
          
          return Boolean(cpfMatch || phoneMatch);
        });
        
        if (customer) {
          console.log('✅ Cliente encontrado no lote:', {
            id: customer.id,
            nome: customer.razao,
            cpf: customer.cnpj_cpf
          });
          
          // Salvar no cache
          if (cacheKey) {
            await setCache(supabase, cacheKey, customer, 5 * 60);
            console.log('💾 Cliente salvo no cache');
          }
        } else {
          console.log('❌ Nenhum cliente encontrado no lote');
          console.log('📋 Valores buscados:', { cpfClean, phoneClean });
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
      body: JSON.stringify({
        action: 'getFinancialTitles',
        params: { customerId }
      })
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
      body: JSON.stringify({
        action: 'getPixQrCode',
        params: { titleId: firstTitle.id }
      })
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
