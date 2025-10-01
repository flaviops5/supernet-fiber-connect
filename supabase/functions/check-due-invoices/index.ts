import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceCheckRequest {
  testMode?: boolean;
  testDate?: string; // Data para simular a verificação
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { testMode = false, testDate } = await req.json() as InvoiceCheckRequest;
    
    console.log('🔍 Iniciando verificação de faturas...', { testMode, testDate });

    // Data de referência (hoje ou data de teste)
    const referenceDate = testDate ? new Date(testDate) : new Date();
    referenceDate.setHours(0, 0, 0, 0);

    // Calcular datas alvo (10 dias e 1 dia antes)
    const date10DaysBefore = new Date(referenceDate);
    date10DaysBefore.setDate(date10DaysBefore.getDate() + 10);
    
    const date1DayBefore = new Date(referenceDate);
    date1DayBefore.setDate(date1DayBefore.getDate() + 1);

    console.log('📅 Datas de vencimento alvo:', {
      reference: referenceDate.toISOString().split('T')[0],
      in10Days: date10DaysBefore.toISOString().split('T')[0],
      in1Day: date1DayBefore.toISOString().split('T')[0]
    });

    // Buscar títulos do IXC
    const { data: ixcResponse, error: ixcError } = await supabase.functions.invoke('ixc-integration', {
      body: {
        action: 'getFinancialTitles',
        params: {
          qtype: 'fn_areceber.data_vencimento',
          oper: '>=',
          query: referenceDate.toISOString().split('T')[0],
          page: 1,
          rp: 1000,
          sortorder: 'asc'
        }
      }
    });

    if (ixcError) {
      console.error('❌ Erro ao buscar títulos no IXC:', ixcError);
      throw new Error(`Erro IXC: ${ixcError.message}`);
    }

    const titles = ixcResponse?.registros || [];
    console.log(`📊 Total de títulos encontrados: ${titles.length}`);

    const notificationsToCreate = [];
    const results = {
      processed: 0,
      created10Days: 0,
      created1Day: 0,
      skipped: 0,
      errors: 0
    };

    for (const title of titles) {
      try {
        results.processed++;

        // Verificar se o título está pago ou cancelado
        if (title.status && ['paid', 'cancelled', 'canceled'].includes(title.status.toLowerCase())) {
          results.skipped++;
          continue;
        }

        const dueDate = new Date(title.data_vencimento);
        dueDate.setHours(0, 0, 0, 0);
        
        const dueDateStr = dueDate.toISOString().split('T')[0];
        const date10Str = date10DaysBefore.toISOString().split('T')[0];
        const date1Str = date1DayBefore.toISOString().split('T')[0];

        // Verificar se vence em 10 ou 1 dia
        let daysBeforeDue = null;
        if (dueDateStr === date10Str) {
          daysBeforeDue = 10;
        } else if (dueDateStr === date1Str) {
          daysBeforeDue = 1;
        }

        if (!daysBeforeDue) {
          continue; // Não é uma data alvo
        }

        // Verificar se já existe notificação para este título e prazo
        const { data: existing } = await supabase
          .from('payment_notifications')
          .select('id, status')
          .eq('ixc_title_id', title.id || title.idtitulo)
          .eq('days_before_due', daysBeforeDue)
          .single();

        if (existing) {
          console.log(`⏭️  Notificação já existe: Título ${title.id}, ${daysBeforeDue} dias (${existing.status})`);
          results.skipped++;
          continue;
        }

        // Buscar dados do cliente
        const { data: customerData } = await supabase.functions.invoke('ixc-integration', {
          body: {
            action: 'getCustomer',
            params: { id: title.id_cliente || title.cliente_id }
          }
        });

        const customer = customerData?.registros?.[0];
        
        notificationsToCreate.push({
          ixc_title_id: String(title.id || title.idtitulo),
          ixc_client_id: String(title.id_cliente || title.cliente_id),
          customer_name: customer?.razao || title.cliente_nome || 'Cliente',
          customer_phone: customer?.celular || customer?.telefone || null,
          due_date: dueDateStr,
          amount: parseFloat(title.valor || title.valor_total || 0),
          days_before_due: daysBeforeDue,
          notification_type: 'whatsapp',
          status: testMode ? 'pending' : 'pending',
          metadata: {
            title_number: title.numero || title.titulo,
            barcode: title.codigo_barras || null,
            testMode
          }
        });

        if (daysBeforeDue === 10) {
          results.created10Days++;
        } else {
          results.created1Day++;
        }

        console.log(`✅ Notificação criada: ${customer?.razao || 'Cliente'} - Vence em ${daysBeforeDue} dias`);

      } catch (error) {
        console.error('❌ Erro ao processar título:', error);
        results.errors++;
      }
    }

    // Inserir notificações em lote
    if (notificationsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('payment_notifications')
        .insert(notificationsToCreate);

      if (insertError) {
        console.error('❌ Erro ao inserir notificações:', insertError);
        throw insertError;
      }
    }

    const response = {
      success: true,
      testMode,
      referenceDate: referenceDate.toISOString().split('T')[0],
      results,
      notificationsCreated: notificationsToCreate.length,
      message: testMode 
        ? `Modo de teste: ${notificationsToCreate.length} notificações criadas (não enviadas)`
        : `${notificationsToCreate.length} notificações criadas com sucesso`
    };

    console.log('✨ Verificação concluída:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro na função check-due-invoices:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
