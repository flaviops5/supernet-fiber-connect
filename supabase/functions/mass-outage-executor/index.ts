// ===============================================================
// ⚡ MASS OUTAGE EXECUTOR
// Detecção de quedas em massa + notificação + abertura de ticket IXC
// ===============================================================

import { createAuthenticatedHandler } from "../_shared/base-handler.ts";
import { callIxcWithRetry } from "../_shared/ixc-client.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ===============================================================
// 🧠 Helper: Envio de WhatsApp via Evolution API (Edge Function existente)
// ===============================================================
async function sendWhatsAppMessage(supabase: SupabaseClient, phone: string, message: string) {
  if (!phone || !message) throw new Error("Telefone ou mensagem ausente");
  try {
    await supabase.functions.invoke("send-whatsapp-message", {
      body: {
        phone,
        message,
        instanceName: Deno.env.get("EVOLUTION_INSTANCE_NAME") || "SDR2",
      },
    });
    console.log('WhatsApp enviado', { phone });
  } catch (err: unknown) {
    console.error('Falha ao enviar WhatsApp', { phone, error: err instanceof Error ? err.message : String(err) });
  }
}

// ===============================================================
// 🧠 Helper: Criar ticket no IXC via função integrada existente
// ===============================================================
async function createIxcTicket(supabase: SupabaseClient, clientId: string, descricao: string) {
  if (!clientId) throw new Error("Cliente não identificado para abertura de ticket");

  try {
    await supabase.functions.invoke("ixc-integration", {
      body: {
        action: "createAtendimento",
        customerId: clientId,
        atendimentoData: {
          tipo: "C",
          id_cliente: clientId,
          id_assunto: "25",
          titulo: descricao,
          id_ticket_setor: "3",
          prioridade: "A",
          menssagem: descricao,
          su_status: "N",
        },
      },
    });
    console.log('Ticket IXC criado', { clientId });
  } catch (err: unknown) {
    console.error('Falha ao criar ticket IXC', { clientId, error: err instanceof Error ? err.message : String(err) });
  }
}

// ===============================================================
// 🚀 Função principal
// ===============================================================
Deno.serve(createAuthenticatedHandler('mass-outage-executor', async (req, { supabase, user }) => {
  // 🔍 Validação inicial de ambiente
  const required = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "IXC_PROXY_URL",
    "EVOLUTION_API_BASE_URL",
    "EVOLUTION_API_KEY",
  ];
  const missing = required.filter((k) => !Deno.env.get(k));
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

  // 🔗 Conexões
  const IXC_PROXY_URL = Deno.env.get("IXC_PROXY_URL")!;
  // 🧾 Buscar eventos ativos de queda em massa
  const { data: events, error: fetchError } = await supabase
    .from("mass_outage_events")
    .select("*")
    .eq("status", "active")
    .eq("notifications_sent", false);

  if (fetchError) throw fetchError;

  if (!events || events.length === 0) {
    console.log('Nenhum evento de queda pendente');
    return { success: true, message: "Nenhum evento de queda pendente" };
  }

  console.log('Eventos de queda encontrados', { count: events.length });

  // 🔍 Buscar responsáveis ativos
  const { data: responsaveis, error: respError } = await supabase
    .from("responsaveis_alerta")
    .select("nome, telefone, funcao, tipo_evento")
    .eq("ativo", true);

  if (respError) throw respError;
  if (!responsaveis?.length) throw new Error("Nenhum responsável cadastrado");

  // ===============================================================
  // 🔁 Processar cada evento de queda
  // ===============================================================
  for (const event of events) {
    const {
      id,
      region_pattern,
      affected_count,
      affected_logins,
      metadata,
    } = event;

    const descricao = `🚨 Queda detectada em ${region_pattern}
💡 ${affected_count} clientes afetados
📍 Tipo: ${metadata?.group_type || "Desconhecido"}
🕒 ${new Date(event.detected_at).toLocaleString("pt-BR")}
${metadata?.power_outage ? "⚡ Possível falta de energia detectada" : ""}
`;

    console.log('Processando evento', { region_pattern, affected_count });

    // 🔍 1. Buscar telefone(s) dos clientes afetados (opcional)
    const clientePhones: string[] = [];
    if (Array.isArray(affected_logins) && affected_logins.length > 0) {
      for (const login of affected_logins.slice(0, 3)) {
        try {
          const clienteResp = await callIxcWithRetry(
            IXC_PROXY_URL,
            "POST",
            "/webservice/v1/cliente",
            {
              qtype: "cliente.login",
              query: login,
              oper: "=",
              page: "1",
              rp: "1",
            }
          );
          const registros = clienteResp?.data?.registros;
          if (registros) {
            const clienteObj = Array.isArray(registros)
              ? registros[0]
              : Object.values(registros)[0];
            if (clienteObj?.celular) clientePhones.push(clienteObj.celular);
          }
        } catch (err: unknown) {
          console.warn('Falha ao buscar cliente', { login, error: err instanceof Error ? err.message : String(err) });
        }
      }
    }

    // 🔍 2. Filtrar responsáveis pelo tipo de evento
    const responsaveisEvento = responsaveis.filter(
      (r) => r.tipo_evento === "mass_outage"
    );

    // 🔔 3. Criar lista de tarefas de notificação
    const tasks: Promise<any>[] = [];

    // 📱 Enviar para responsáveis
    for (const r of responsaveisEvento) {
      const msg = `🚨 [${r.funcao}] ${r.nome}\n${descricao}`;
      tasks.push(sendWhatsAppMessage(supabase, r.telefone, msg));
    }

    // 📱 Enviar para clientes afetados (limite de 3)
    for (const phone of clientePhones) {
      const msg = `Olá! Estamos com uma instabilidade na sua região (${region_pattern}). 
Nossa equipe já foi notificada e está atuando.`;
      tasks.push(sendWhatsAppMessage(supabase, phone, msg));
    }

    // 🎫 Criar ticket principal no IXC (ligado ao primeiro cliente da lista)
    if (clientePhones.length > 0 && metadata?.affected_client_id) {
      tasks.push(createIxcTicket(supabase, metadata.affected_client_id, descricao));
    }

    // ⏳ Executar todas as ações em paralelo
    const results = await Promise.allSettled(tasks);
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.filter((r) => r.status === "rejected").length;

    console.log('Evento processado', { 
      region_pattern, 
      notifications_sent: successCount, 
      failures: failCount 
    });

    // 🧾 Atualizar evento como notificado
    await supabase
      .from("mass_outage_events")
      .update({
        notifications_sent: true,
        updated_at: new Date().toISOString(),
        metadata: {
          ...metadata,
          notification_summary: {
            total_responsaveis: responsaveisEvento.length,
            total_clientes: clientePhones.length,
            success: successCount,
            fail: failCount,
          },
        },
      })
      .eq("id", id);
  }

  console.log('Execução concluída', { processed: events.length });
  return { success: true, processed: events.length };
}));
