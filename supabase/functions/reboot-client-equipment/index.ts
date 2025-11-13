import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

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
Deno.serve(createAuthenticatedHandler('reboot-client-equipment', async (req, { supabase, user }) => {
  const { ixc_client_id, customer_cpf } = await req.json();

  if (!ixc_client_id && !customer_cpf) {
    throw new Error("ixc_client_id ou customer_cpf obrigatório");
  }

  console.log("Iniciando reboot remoto", { ixc_client_id, customer_cpf });

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
      console.log("Cliente encontrado via CPF", { clientId });
    } else {
      throw new Error("Cliente não encontrado no IXC");
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

  console.log("Reboot registrado no banco", { reboot_id: rebootRecord?.id });

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

    throw new Error(`Falha ao executar reboot no equipamento: ${rebootResult?.error || rebootError?.message}`);
  }

  console.log("Reboot executado com sucesso, aguardando 60s...");

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

  console.log("Reboot finalizado", { 
    isOnline,
    reboot_id: rebootRecord?.id
  });

  return { 
    ok: true,
    reboot_id: rebootRecord?.id,
    client_id: clientId,
    reboot_executed: true,
    wait_time_seconds: 60,
    is_online: isOnline,
    message: isOnline 
      ? "Equipamento religado e ONLINE!" 
      : "Reboot executado, mas equipamento ainda está offline"
  };
}));
