import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { createLogger } from "../_shared/structured-logger.ts";

// ============================================
// 🔧 Validação de Variáveis de Ambiente
// ============================================
const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'EVOLUTION_API_KEY',
  'EVOLUTION_API_BASE_URL',
  'IXC_API_BASE_URL'
];

const missing = required.filter(k => !Deno.env.get(k));
if (missing.length > 0) {
  throw new Error(`❌ Missing environment variables: ${missing.join(', ')}`);
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVOLUTION_INSTANCE_NAME = Deno.env.get('EVOLUTION_INSTANCE_NAME') || 'SDR2';

// ============================================
// ⚙️ Inicialização Supabase Client
// ============================================
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================
// 🔒 CORS Headers
// ============================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// 📱 Envio de mensagens via Evolution API (reutiliza função existente)
// ============================================
async function sendWhatsAppMessage(phone: string, message: string, logger: any) {
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
      body: {
        phone,
        message,
        instanceName: EVOLUTION_INSTANCE_NAME,
      }
    });

    if (error) {
      logger.error('Falha ao enviar WhatsApp', error);
      throw error;
    }

    logger.info(`WhatsApp enviado para ${phone}`);
    return data;
  } catch (err) {
    logger.error('Erro ao invocar send-whatsapp-message', err);
    throw err;
  }
}

// ============================================
// 🎟️ Abertura de Ticket no IXC (reutiliza função existente)
// ============================================
async function createIxcTicket(event: any, logger: any) {
  try {
    if (!event.metadata?.affected_client_id) {
      logger.warn('Cliente não identificado, pulando criação de ticket');
      return null;
    }

    const title = `Queda detectada automaticamente em ${event.region_pattern}`;
    
    const ticketData = {
      tipo: "C",
      id_cliente: event.metadata.affected_client_id,
      id_assunto: Deno.env.get('IXC_OUTAGE_SUBJECT_ID') || "25",
      titulo: title,
      id_ticket_setor: Deno.env.get('IXC_TICKET_SECTOR_ID') || "3",
      prioridade: "N",
      menssagem: `${title}\n\nDetecção automática: ${event.affected_count} clientes afetados\nChave do evento: ${event.event_key}`,
      su_status: "N",
      id_filial: "1",
      origem_endereco: "C",
      status: "A",
    };

    const { data, error } = await supabase.functions.invoke('ixc-integration', {
      body: {
        action: 'createAtendimento',
        customerId: event.metadata.affected_client_id,
        atendimentoData: ticketData
      }
    });

    if (error) {
      logger.error('Falha ao criar ticket IXC', error);
      throw error;
    }

    logger.info(`Ticket IXC criado para cliente ${event.metadata.affected_client_id}`);
    return data;
  } catch (err) {
    logger.error('Erro ao invocar ixc-integration', err);
    throw err;
  }
}

// ============================================
// 📞 Buscar telefone do cliente no IXC
// ============================================
async function getClientPhone(clientId: string, logger: any): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ixc-integration', {
      body: {
        action: 'getClient',
        customerId: clientId
      }
    });

    if (error) {
      logger.warn(`Não foi possível buscar telefone do cliente ${clientId}`, error);
      return null;
    }

    return data?.telefone_celular || data?.telefone || null;
  } catch (err) {
    logger.warn(`Erro ao buscar telefone do cliente ${clientId}`, err);
    return null;
  }
}

// ============================================
// 🧠 Função Principal - Executor Inteligente
// ============================================
serve(async (req) => {
  const logger = createLogger('mass-outage-executor', req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { record } = body;

    if (!record || !record.event_key) {
      logger.warn('Evento inválido recebido', { body });
      return new Response(JSON.stringify({ error: 'Invalid event' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    logger.info(`Novo evento de queda detectado: ${record.event_key}`, {
      region: record.region_pattern,
      affected: record.affected_count
    });

    const { event_key, region_pattern, affected_count, metadata } = record;

    // ============================================
    // 🚨 PREPARAR MENSAGENS
    // ============================================
    const managerMessage = `🚨 *ALERTA DE QUEDA EM MASSA*\n\n` +
      `📍 Região: ${region_pattern}\n` +
      `👥 Clientes afetados: ${affected_count}\n` +
      `🔑 Evento: ${event_key}\n` +
      `⚠️ Causa provável: ${metadata?.outage_cause || 'Em análise...'}\n` +
      `🕐 Detectado em: ${new Date().toLocaleString('pt-BR')}`;

    const techMessage = `⚙️ *AÇÃO NECESSÁRIA*\n\n` +
      `📍 Região afetada: ${region_pattern}\n` +
      `👥 ${affected_count} clientes offline\n` +
      `🔧 Verificar: ${metadata?.olt ? `OLT ${metadata.olt}` : 'equipamento de rede'}\n` +
      `${metadata?.pon_port ? `PON: ${metadata.pon_port}` : ''}\n` +
      `${metadata?.cto ? `CTO: ${metadata.cto}` : ''}`;

    // ============================================
    // 📞 BUSCAR NÚMEROS DE TELEFONE
    // ============================================
    const managerPhone = Deno.env.get("GERENTE_REDE_PHONE") || "5561999999999";
    const technicalPhones = (Deno.env.get("SUPORTE_TECNICO_PHONES") || "")
      .split(",")
      .map(p => p.trim())
      .filter(p => p !== "");

    // ============================================
    // 🔄 PROCESSAR TODAS AS NOTIFICAÇÕES EM PARALELO
    // ============================================
    const tasks = [];

    // 1️⃣ Notificar gerente
    tasks.push(
      sendWhatsAppMessage(managerPhone, managerMessage, logger)
        .catch(err => logger.error('Falha ao notificar gerente', err))
    );

    // 2️⃣ Notificar técnicos
    technicalPhones.forEach(tech => {
      tasks.push(
        sendWhatsAppMessage(tech, techMessage, logger)
          .catch(err => logger.error(`Falha ao notificar técnico ${tech}`, err))
      );
    });

    // 3️⃣ Criar ticket no IXC
    tasks.push(
      createIxcTicket(record, logger)
        .catch(err => logger.error('Falha ao criar ticket', err))
    );

    // 4️⃣ (Opcional) Notificar clientes afetados
    if (metadata?.affected_client_id) {
      const clientPhone = await getClientPhone(metadata.affected_client_id, logger);
      if (clientPhone) {
        const clientMessage = `⚠️ Olá! Detectamos uma instabilidade na sua região.\n\n` +
          `Nossa equipe técnica já foi acionada e está trabalhando para resolver o mais rápido possível.\n\n` +
          `Agradecemos sua compreensão! 🙏`;
        
        tasks.push(
          sendWhatsAppMessage(clientPhone, clientMessage, logger)
            .catch(err => logger.error('Falha ao notificar cliente', err))
        );
      }
    }

    // 🚀 Executar todas as tarefas em paralelo
    const results = await Promise.allSettled(tasks);
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;

    logger.info('Processamento concluído', {
      success: successCount,
      failed: failCount,
      total: results.length
    });

    // ============================================
    // ✅ ATUALIZAR EVENTO COMO NOTIFICADO
    // ============================================
    const { error: updateError } = await supabase
      .from("mass_outage_events")
      .update({
        notifications_sent: true,
        updated_at: new Date().toISOString(),
        metadata: {
          ...metadata,
          notifications_summary: {
            sent_at: new Date().toISOString(),
            success_count: successCount,
            fail_count: failCount
          }
        }
      })
      .eq("event_key", event_key);

    if (updateError) {
      logger.error('Erro ao atualizar evento', updateError);
    } else {
      logger.info(`Evento ${event_key} marcado como notificado`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      event_key,
      notifications: {
        sent: successCount,
        failed: failCount
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    logger.error('Erro crítico no Executor Inteligente', err);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
