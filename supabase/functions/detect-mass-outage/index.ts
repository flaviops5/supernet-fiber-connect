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

    // Buscar informações de porta PON para cada cliente offline
    console.log('🔍 Buscando informações de porta PON...');
    const clientsWithPon: Array<{ user: RadUser; ponPort?: string; cto?: string }> = [];
    
    for (const user of allRadUsers) {
      const clientId = user.id_cliente;
      if (!clientId) {
        clientsWithPon.push({ user });
        continue;
      }

      try {
        // Buscar equipamento/ONU do cliente
        const equipUrl = `https://${IXC_BASE_HOST}/webservice/v1/cliente_equipamento`;
        const equipBody = JSON.stringify({
          qtype: 'cliente_equipamento.id_cliente',
          query: clientId,
          oper: '=',
          page: '1',
          rp: '50',
          sortname: 'cliente_equipamento.id',
          sortorder: 'desc',
        });

        const equipResponse = await fetch(equipUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
            'ixcsoft': 'listar',
          },
          body: equipBody,
        });

        if (equipResponse.ok) {
          const equipData = await equipResponse.json();
          const equipamentos = Array.isArray(equipData?.registros)
            ? equipData.registros
            : (equipData?.registros ? Object.values(equipData.registros) : []);

          // Procurar informações de PON/ONU nos equipamentos
          let ponPort = '';
          let cto = '';
          
          for (const equip of equipamentos) {
            // Tentar extrair informações de porta PON
            if (equip.pon_porta) ponPort = String(equip.pon_porta);
            if (equip.pon_slot) ponPort = `${equip.pon_slot}/${ponPort}`;
            if (equip.pon_olt) ponPort = `${equip.pon_olt}/${ponPort}`;
            
            // Extrair CTO
            if (equip.cto) cto = String(equip.cto);
            if (equip.fibra_cto) cto = String(equip.fibra_cto);
            
            if (ponPort) break;
          }

          clientsWithPon.push({ 
            user, 
            ponPort: ponPort || undefined,
            cto: cto || undefined
          });
        } else {
          clientsWithPon.push({ user });
        }
      } catch (error) {
        console.error(`Erro ao buscar equipamento do cliente ${clientId}:`, error);
        clientsWithPon.push({ user });
      }
    }

    console.log(`📊 Clientes com dados PON: ${clientsWithPon.filter(c => c.ponPort).length}/${clientsWithPon.length}`);

    // Agrupar por porta PON (quando disponível) ou por CTO/padrão de login
    const ponGroups = new Map<string, Array<{ user: RadUser; ponPort?: string; cto?: string }>>();
    
    for (const clientData of clientsWithPon) {
      const login = String(clientData.user.login || '').toUpperCase().trim();
      if (!login) continue;

      let groupKey = '';
      
      // Prioridade 1: Agrupar por porta PON completa (mais preciso)
      if (clientData.ponPort) {
        groupKey = `PON:${clientData.ponPort}`;
      }
      // Prioridade 2: Agrupar por CTO
      else if (clientData.cto) {
        groupKey = `CTO:${clientData.cto}`;
      }
      // Prioridade 3: Agrupar por padrão de login (local-bloco)
      else {
        const parts = login.split('-');
        if (parts.length >= 2) {
          groupKey = `REGION:${parts[0]}-${parts[1]}`;
        }
      }

      if (groupKey) {
        if (!ponGroups.has(groupKey)) {
          ponGroups.set(groupKey, []);
        }
        ponGroups.get(groupKey)!.push(clientData);
      }
    }

    // Definir limiar para queda em massa
    // - Porta PON: 3+ clientes (mais preciso, indica problema na OLT/Splitter)
    // - CTO: 4+ clientes (problema em caixa de terminação)
    // - Região: 5+ clientes (menos preciso, pode ser problema maior)
    const massOutages: any[] = [];

    for (const [groupKey, clientsData] of ponGroups) {
      const isPonGroup = groupKey.startsWith('PON:');
      const isCtoGroup = groupKey.startsWith('CTO:');
      const threshold = isPonGroup ? 3 : (isCtoGroup ? 4 : 5);
      
      if (clientsData.length >= threshold) {
        const affectedLogins = clientsData.map(c => c.user.login);
        const eventKey = `${groupKey}_${new Date().toISOString().split('T')[0]}`;
        
        const groupType = isPonGroup ? 'Porta PON' : (isCtoGroup ? 'CTO' : 'Região');
        const groupIdentifier = groupKey.split(':')[1];
        
        console.log(`🚨 QUEDA EM MASSA detectada (${groupType}): ${groupIdentifier} - ${clientsData.length} clientes afetados`);

        // Verificar se já existe evento ativo para este grupo hoje
        const { data: existingEvent } = await supabase
          .from('mass_outage_events')
          .select('*')
          .eq('event_key', eventKey)
          .eq('status', 'active')
          .maybeSingle();

        if (!existingEvent) {
          // Criar novo evento
          const { data: newEvent, error: insertError } = await supabase
            .from('mass_outage_events')
            .insert({
              event_key: eventKey,
              region_pattern: groupKey,
              affected_count: clientsData.length,
              affected_logins: affectedLogins,
              status: 'active',
              metadata: {
                detection_time: new Date().toISOString(),
                threshold,
                group_type: groupType,
                group_identifier: groupIdentifier,
                pon_port: isPonGroup ? groupIdentifier : undefined,
                cto: isCtoGroup ? groupIdentifier : undefined
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
              affected_count: clientsData.length,
              affected_logins: affectedLogins,
              updated_at: new Date().toISOString(),
              metadata: {
                ...existingEvent.metadata,
                last_update: new Date().toISOString(),
                threshold,
                group_type: groupType,
                group_identifier: groupIdentifier
              }
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

    // Marcar eventos como resolvidos se não há mais clientes offline no grupo
    const { data: activeEvents } = await supabase
      .from('mass_outage_events')
      .select('*')
      .eq('status', 'active');

    if (activeEvents) {
      for (const event of activeEvents) {
        const groupKey = event.region_pattern;
        const stillOffline = ponGroups.get(groupKey);
        
        const isPonGroup = groupKey.startsWith('PON:');
        const isCtoGroup = groupKey.startsWith('CTO:');
        const threshold = isPonGroup ? 3 : (isCtoGroup ? 4 : 5);
        
        if (!stillOffline || stillOffline.length < threshold) {
          await supabase
            .from('mass_outage_events')
            .update({
              status: 'resolved',
              resolved_at: new Date().toISOString()
            })
            .eq('id', event.id);
          
          console.log(`✅ Evento resolvido: ${groupKey}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_offline: allRadUsers.length,
        clients_with_pon_data: clientsWithPon.filter(c => c.ponPort).length,
        mass_outages_detected: massOutages.length,
        mass_outages: massOutages,
        groups_analyzed: {
          total: ponGroups.size,
          by_pon_port: Array.from(ponGroups.keys()).filter(k => k.startsWith('PON:')).length,
          by_cto: Array.from(ponGroups.keys()).filter(k => k.startsWith('CTO:')).length,
          by_region: Array.from(ponGroups.keys()).filter(k => k.startsWith('REGION:')).length
        }
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