// ===============================================================
// ⚡ MASS OUTAGE EXECUTOR
// Detecção de quedas em massa + notificação + abertura de ticket IXC
// ===============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { callIxcWithRetry } from "../_shared/ixc-client.ts";
import { createLogger } from "../_shared/structured-logger.ts";

// 🔐 CORS padrão
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ===============================================================
// 🧠 Helper: Envio de WhatsApp via Evolution API (Edge Function existente)
// ===============================================================
async function sendWhatsAppMessage(supabase: any, phone: string, message: string, logger: any) {
  if (!phone || !message) throw new Error("Telefone ou mensagem ausente");
  try {
    await supabase.functions.invoke("send-whatsapp-message", {
      body: {
        phone,
        message,
        instanceName: Deno.env.get("EVOLUTION_INSTANCE_NAME") || "SDR2",
      },
    });
    logger.info('WhatsApp enviado', { phone });
  } catch (err) {
    logger.error('Falha ao enviar WhatsApp', { phone, error: err.message });
  }
}

// ===============================================================
// 🧠 Helper: Criar ticket no IXC via função integrada existente
// ===============================================================
async function createIxcTicket(supabase: any, clientId: string, descricao: string, logger: any) {
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
    logger.info('Ticket IXC criado', { clientId });
  } catch (err) {
    logger.error('Falha ao criar ticket IXC', { clientId, error: err.message });
  }
}

// ===============================================================
// 🚀 Função principal
// ===============================================================
serve(async (req) => {
  const logger = createLogger('mass-outage-executor', req);
  
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    logger.error('Variáveis de ambiente ausentes', { missing });
    return new Response(
      JSON.stringify({ error: `Missing environment variables: ${missing.join(", ")}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 🔗 Conexões
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const IXC_PROXY_URL = Deno.env.get("IXC_PROXY_URL")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 🧾 Buscar eventos ativos de queda em massa
    const { data: events, error: fetchError } = await supabase
      .from("mass_outage_events")
      .select("*")
      .eq("status", "active")
      .eq("notifications_sent", false);

    if (fetchError) throw fetchError;

    if (!events || events.length === 0) {
      logger.info('Nenhum evento de queda pendente');
      return new Response(
        JSON.stringify({ success: true, message: "Nenhum evento de queda pendente" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info('Eventos de queda encontrados', { count: events.length });

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

      logger.info('Processando evento', { region_pattern, affected_count });

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
          } catch (err) {
            logger.warn('Falha ao buscar cliente', { login, error: err.message });
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
        tasks.push(sendWhatsAppMessage(supabase, r.telefone, msg, logger));
      }

      // 📱 Enviar para clientes afetados (limite de 3)
      for (const phone of clientePhones) {
        const msg = `Olá! Estamos com uma instabilidade na sua região (${region_pattern}). 
Nossa equipe já foi notificada e está atuando.`;
        tasks.push(sendWhatsAppMessage(supabase, phone, msg, logger));
      }

      // 🎫 Criar ticket principal no IXC (ligado ao primeiro cliente da lista)
      if (clientePhones.length > 0 && metadata?.affected_client_id) {
        tasks.push(createIxcTicket(supabase, metadata.affected_client_id, descricao, logger));
      }

      // ⏳ Executar todas as ações em paralelo
      const results = await Promise.allSettled(tasks);
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.filter((r) => r.status === "rejected").length;

      logger.info('Evento processado', { 
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

    logger.info('Execução concluída', { processed: events.length });
    return new Response(
      JSON.stringify({ success: true, processed: events.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error('Erro crítico no executor', { error: error.message });
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
