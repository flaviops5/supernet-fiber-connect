// PR #21 - Disparo em massa via WhatsApp com rate limiting

import { supabase } from "@/integrations/supabase/client";

const NOTIFY_MESSAGE = `🔧 *Estamos cuidando da sua conexão!*

Detectamos uma instabilidade na sua região e nossa equipe técnica já está atuando para resolver rapidamente.

⏱️ *Previsão inicial:* até 2 horas

Se notar qualquer piora, pode nos chamar aqui mesmo! 😊`;

export type ImpactedCustomer = {
  customer_phone: string;
  customer_name: string;
  last_event: string;
};

export type MassNotifyResult = {
  total: number;
  sent: number;
  failed: number;
  errors: string[];
};

/**
 * Envia mensagens WhatsApp em lote com rate limiting
 * - Batch de 15 por vez
 * - Delay de 2s entre batches
 * - Tratamento de erro individual
 */
export async function massNotifyWhatsApp(
  city: string,
  bairro?: string | null
): Promise<MassNotifyResult> {
  // 1. Buscar clientes afetados
  const { data: customers, error: rpcError } = await supabase.rpc(
    "get_impacted_customers_by_region",
    { 
      region_cidade: city, 
      region_bairro: bairro || null 
    }
  );

  if (rpcError) {
    console.error("❌ Erro ao buscar clientes:", rpcError);
    throw new Error(`Erro ao buscar clientes: ${rpcError.message}`);
  }

  if (!customers || customers.length === 0) {
    return { total: 0, sent: 0, failed: 0, errors: [] };
  }

  const result: MassNotifyResult = {
    total: customers.length,
    sent: 0,
    failed: 0,
    errors: []
  };

  // 2. Dividir em batches de 15
  const BATCH_SIZE = 15;
  const BATCH_DELAY_MS = 2000;
  const batches: ImpactedCustomer[][] = [];
  
  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    batches.push(customers.slice(i, i + BATCH_SIZE));
  }

  console.log(`📤 Processando ${customers.length} clientes em ${batches.length} batches`);

  // 3. Processar cada batch com delay
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    console.log(`📦 Batch ${batchIndex + 1}/${batches.length}: ${batch.length} mensagens`);

    const batchResults = await Promise.allSettled(
      batch.map(async (customer) => {
        try {
          // Enviar via edge function send-whatsapp-message
          const { data, error: sendError } = await supabase.functions.invoke(
            'send-whatsapp-message',
            {
              body: {
                phone: customer.customer_phone,
                message: NOTIFY_MESSAGE,
                instanceName: 'SDR2'
              }
            }
          );

          if (sendError) {
            throw new Error(sendError.message);
          }

          if (!data?.status || data.status !== 'success') {
            throw new Error('Evolution API retornou status não-sucesso');
          }

          // Log de sucesso
          await supabase.from("registros_de_monitoramento").insert({
            acao: "mass_notify_sent",
            fluxo: "gestao-proativa",
            detalhes: {
              cidade: city,
              bairro: bairro || null,
              customer_phone: customer.customer_phone,
              customer_name: customer.customer_name,
              batch_index: batchIndex
            }
          });

          return { success: true, phone: customer.customer_phone };
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
          
          // Log de falha
          await supabase.from("registros_de_monitoramento").insert({
            acao: "mass_notify_failed",
            fluxo: "gestao-proativa",
            detalhes: {
              cidade: city,
              bairro: bairro || null,
              customer_phone: customer.customer_phone,
              error: errorMsg
            }
          });

          return { success: false, phone: customer.customer_phone, error: errorMsg };
        }
      })
    );

    // Contar sucessos e falhas do batch
    batchResults.forEach((res) => {
      if (res.status === 'fulfilled' && res.value.success) {
        result.sent++;
      } else {
        result.failed++;
        const errorMsg = res.status === 'rejected' 
          ? res.reason 
          : res.value.error || 'Erro desconhecido';
        result.errors.push(errorMsg);
      }
    });

    // Delay entre batches (exceto no último)
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(`✅ Finalizado: ${result.sent} enviadas, ${result.failed} falhas`);

  return result;
}
