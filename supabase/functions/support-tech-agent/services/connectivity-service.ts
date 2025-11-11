/**
 * Connectivity Service
 * Serviço para testar conectividade de equipamentos
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Testar conectividade de forma segura com fallback
 */
export async function safeTestConnectivity(supabaseClient: SupabaseClient, ixcId: string) {
  // 1ª tentativa: API refatorada (ixc_client_id)
  let conn = await supabaseClient.functions.invoke("test-equipment-connectivity", {
    body: { ixc_client_id: ixcId, timeout: 5000 }
  });

  // Fallback: busca IP no IXC e testa por IP
  if (conn?.error || conn?.data?.ok === undefined) {
    const rad = await supabaseClient.functions.invoke("ixc-integration", {
      body: { action: "radusuario_ip", id_cliente: ixcId }
    });
    const ip = rad?.data?.ip || rad?.data?.framedipaddress;
    if (ip) {
      conn = await supabaseClient.functions.invoke("test-equipment-connectivity", {
        body: { ip, timeout: 5000 }
      });
    }
  }
  return conn;
}
