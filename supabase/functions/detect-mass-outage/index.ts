import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RadUser {
  login: string;
  online: string;
  id_cliente?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const IXC_USERNAME = Deno.env.get('IXC_API_USERNAME');
    const IXC_PASSWORD = Deno.env.get('IXC_API_PASSWORD');
    const IXC_API_BASE = Deno.env.get('IXC_API_BASE_URL');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!IXC_USERNAME || !IXC_PASSWORD || !IXC_API_BASE) {
      throw new Error('Credenciais IXC não configuradas');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Credenciais Supabase não configuradas');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Normalizar base URL
    const normalizeBase = (raw: string) => {
      const trimmed = raw.trim();
      const noProtocol = trimmed.replace(/^https?:\/\//i, '');
      const host = noProtocol.split('/')[0];
      return host;
    };
    const IXC_BASE_HOST = normalizeBase(IXC_API_BASE);
    const credentials = btoa(`${IXC_USERNAME}:${IXC_PASSWORD}`);

    console.log('🔍 Iniciando detecção de quedas em massa...');

    // Buscar clientes offline do IXC
    const apiUrlRadusuarios = `https://${IXC_BASE_HOST}/webservice/v1/radusuarios`;
    let page = 1;
    const itemsPerPage = 1000;
    const allRadUsers: RadUser[] = [];

    // Buscar apenas clientes offline
    while (true) {
      const bodyRad = JSON.stringify({
        qtype: 'radusuarios.online',
        query: 'N',
        oper: '=',
        page: String(page),
        rp: String(itemsPerPage),
        sortname: 'radusuarios.id',
        sortorder: 'desc',
      });

      const radResponse = await fetch(apiUrlRadusuarios, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'ixcsoft': 'listar',
        },
        body: bodyRad,
      });

      if (!radResponse.ok) {
        console.error('Erro ao buscar clientes offline:', radResponse.status);
        break;
      }

      const radData = await radResponse.json();
      const radRegistros = Array.isArray(radData?.registros)
        ? radData.registros
        : (radData?.registros ? Object.values(radData.registros) : []);

      if (!radRegistros || radRegistros.length === 0) {
        break;
      }

      allRadUsers.push(...radRegistros);
      console.log(`Página ${page}: ${radRegistros.length} clientes offline`);

      if (radRegistros.length < itemsPerPage) {
        break;
      }
      page++;
    }

    console.log(`📊 Total de clientes offline: ${allRadUsers.length}`);

    // Agrupar por padrão de nomenclatura (local-bloco)
    const regionGroups = new Map<string, RadUser[]>();
    
    for (const user of allRadUsers) {
      const login = String(user.login || '').toUpperCase().trim();
      if (!login) continue;

      // Extrair padrão: SRI-B-102 -> SRI-B (local-bloco)
      const parts = login.split('-');
      if (parts.length >= 2) {
        const regionPattern = `${parts[0]}-${parts[1]}`; // Ex: SRI-B
        
        if (!regionGroups.has(regionPattern)) {
          regionGroups.set(regionPattern, []);
        }
        regionGroups.get(regionPattern)!.push(user);
      }
    }

    // Definir limiar para queda em massa (mínimo 3 clientes da mesma região)
    const MASS_OUTAGE_THRESHOLD = 3;
    const massOutages: any[] = [];

    for (const [regionPattern, users] of regionGroups) {
      if (users.length >= MASS_OUTAGE_THRESHOLD) {
        const eventKey = `${regionPattern}_${new Date().toISOString().split('T')[0]}`;
        const affectedLogins = users.map(u => u.login);

        console.log(`🚨 QUEDA EM MASSA detectada: ${regionPattern} - ${users.length} clientes afetados`);

        // Verificar se já existe evento ativo para esta região hoje
        const { data: existingEvent } = await supabase
          .from('mass_outage_events')
          .select('*')
          .eq('event_key', eventKey)
          .eq('status', 'active')
          .single();

        if (!existingEvent) {
          // Criar novo evento
          const { data: newEvent, error: insertError } = await supabase
            .from('mass_outage_events')
            .insert({
              event_key: eventKey,
              region_pattern: regionPattern,
              affected_count: users.length,
              affected_logins: affectedLogins,
              status: 'active',
              metadata: {
                detection_time: new Date().toISOString(),
                threshold: MASS_OUTAGE_THRESHOLD
              }
            })
            .select()
            .single();

          if (insertError) {
            console.error('Erro ao criar evento:', insertError);
          } else {
            massOutages.push(newEvent);
            console.log(`✅ Evento criado: ${eventKey}`);
          }
        } else {
          // Atualizar evento existente
          const { error: updateError } = await supabase
            .from('mass_outage_events')
            .update({
              affected_count: users.length,
              affected_logins: affectedLogins,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingEvent.id);

          if (updateError) {
            console.error('Erro ao atualizar evento:', updateError);
          } else {
            console.log(`📝 Evento atualizado: ${eventKey}`);
          }
        }
      }
    }

    // Marcar eventos como resolvidos se não há mais clientes offline na região
    const { data: activeEvents } = await supabase
      .from('mass_outage_events')
      .select('*')
      .eq('status', 'active');

    if (activeEvents) {
      for (const event of activeEvents) {
        const stillOffline = regionGroups.get(event.region_pattern);
        if (!stillOffline || stillOffline.length < MASS_OUTAGE_THRESHOLD) {
          await supabase
            .from('mass_outage_events')
            .update({
              status: 'resolved',
              resolved_at: new Date().toISOString()
            })
            .eq('id', event.id);
          
          console.log(`✅ Evento resolvido: ${event.region_pattern}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_offline: allRadUsers.length,
        mass_outages_detected: massOutages.length,
        mass_outages: massOutages,
        regions_analyzed: regionGroups.size
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro ao detectar quedas em massa:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});