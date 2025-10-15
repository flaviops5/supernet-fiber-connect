import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/structured-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

/**
 * Reboot Client Equipment - Edge Function
 * 
 * Executa reinicialização remota de equipamento do cliente via IXC
 * Aguarda 60s e verifica status pós-reboot
 * 
 * @params {string} ixc_client_id - ID do cliente no IXC
 * @params {string} customer_cpf - CPF do cliente (fallback)
 * @returns {object} resultado do reboot e status pós-reboot
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logger = createLogger("reboot-client-equipment", req);
  
  try {
    const { ixc_client_id, customer_cpf } = await req.json();

    if (!ixc_client_id && !customer_cpf) {
      logger.error("Falta ixc_client_id ou customer_cpf");
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "ixc_client_id ou customer_cpf obrigatório" 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    logger.info("Iniciando reboot remoto", { ixc_client_id, customer_cpf });

    // 1. Se só temos CPF, buscar ixc_client_id
    let clientId = ixc_client_id;
    if (!clientId && customer_cpf) {
      const { data: searchResult } = await supabase.functions.invoke(
        "ixc-integration",
        {
          body: {
            action: "searchCustomers",
            params: { query: customer_cpf },
          },
        }
      );

      if (searchResult?.success && searchResult.data?.registros?.length > 0) {
        clientId = searchResult.data.registros[0].id;
        logger.info("Cliente encontrado via CPF", { clientId });
      } else {
        return new Response(
          JSON.stringify({ 
            ok: false, 
            error: "Cliente não encontrado no IXC" 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Registrar tentativa de reboot
    const { data: rebootRecord } = await supabase
      .from("equipment_reboots")
      .insert({
        client_id: clientId,
        trigger_type: "manual",
        reason: "Agent-initiated reboot via support chat",
        status: "pending"
      })
      .select()
      .single();

    logger.info("Reboot registrado no banco", { reboot_id: rebootRecord?.id });

    // 3. Executar reboot via IXC
    const { data: rebootResult, error: rebootError } = await supabase.functions.invoke(
      "ixc-integration",
      {
        body: {
          action: "restartModem",
          params: { customerId: clientId }, // 🔧 FIX: nome correto do parâmetro
        },
      }
    );

    if (rebootError || !rebootResult?.success) {
      await supabase
        .from("equipment_reboots")
        .update({ 
          status: "failed",
          result_message: rebootResult?.error || "IXC API error"
        })
        .eq("id", rebootRecord?.id);

      logger.error("Falha ao executar reboot no IXC", { 
        error: rebootError?.message || rebootResult?.error 
      });

      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "Falha ao executar reboot no equipamento",
          details: rebootResult?.error || rebootError?.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info("Reboot executado com sucesso, aguardando 60s...");

    // 4. Aguardar 60 segundos (tempo para equipamento reiniciar)
    await new Promise(resolve => setTimeout(resolve, 60000));

    // 5. Verificar status pós-reboot
    const { data: statusResult } = await supabase.functions.invoke(
      "ixc-integration",
      {
        body: {
          action: "getCustomerStatus",
          params: { id: clientId },
        },
      }
    );

    const isOnline = statusResult?.data?.isOnline === true; // 🔧 FIX: campo correto é isOnline (boolean)

    // 6. Atualizar registro de reboot
    await supabase
      .from("equipment_reboots")
      .update({ 
        status: isOnline ? "success" : "completed",
        result_message: `Equipment ${isOnline ? "ONLINE" : "still OFFLINE"} after reboot`,
        completed_at: new Date().toISOString()
      })
      .eq("id", rebootRecord?.id);

    logger.info("Reboot finalizado", { 
      isOnline,
      reboot_id: rebootRecord?.id
    });

    return new Response(
      JSON.stringify({ 
        ok: true,
        reboot_id: rebootRecord?.id,
        client_id: clientId,
        reboot_executed: true,
        wait_time_seconds: 60,
        is_online: isOnline,
        message: isOnline 
          ? "Equipamento religado e ONLINE!" 
          : "Reboot executado, mas equipamento ainda está offline"
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const err = (error as Error)?.message ?? String(error);
    logger.error("Erro crítico no reboot-client-equipment", { error: err });
    
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: "Erro ao processar reboot",
        details: err
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
