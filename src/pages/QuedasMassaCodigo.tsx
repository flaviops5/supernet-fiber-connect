import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, AlertTriangle, Activity, Database, FileText } from "lucide-react";
import { toast } from "sonner";

const QuedasMassaCodigo = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast.success("Código copiado!");
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const detectMassOutageCode = `// ============================================
// DETECT MASS OUTAGE - Edge Function
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { callIxcWithRetry } from '../_shared/ixc-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// THRESHOLDS para detectar queda em massa
const MASS_OUTAGE_THRESHOLDS = {
  PON_PORT: 5,        // 5+ clientes offline na mesma PON = queda em massa
  CTO: 3,             // 3+ clientes offline no mesmo CTO = queda em massa
  REGION: 6,          // 6+ clientes offline na mesma região = queda em massa
  DYING_GASP: 3       // 3+ Dying Gasp no mesmo grupo = queda de energia
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Iniciando detecção de quedas em massa...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const IXC_PROXY_URL = Deno.env.get('IXC_PROXY_URL') || 
      \`\${Deno.env.get('SUPABASE_URL')}/functions/v1/ixc-proxy\`;

    // ========================================
    // PASSO 1: Buscar todos os clientes OFFLINE
    // ========================================
    console.log('📡 Buscando clientes offline...');
    
    const offlineUsers: any[] = [];
    let page = 1;
    const itemsPerPage = 1000;

    while (page <= 10) {
      try {
        const bodyOffline = {
          qtype: 'radusuarios.online',
          query: 'N',
          oper: '=',
          page: String(page),
          rp: String(itemsPerPage),
          sortname: 'radusuarios.id',
          sortorder: 'desc',
        };

        const offlineData = await callIxcWithRetry(
          IXC_PROXY_URL,
          'POST',
          '/webservice/v1/radusuarios',
          bodyOffline
        );

        const registros = Array.isArray(offlineData?.data?.registros)
          ? offlineData.data.registros
          : (offlineData?.data?.registros ? Object.values(offlineData.data.registros) : []);

        if (!registros || registros.length === 0) break;

        offlineUsers.push(...registros);
        console.log(\`📊 Página \${page}: \${registros.length} offline (total: \${offlineUsers.length})\`);

        if (registros.length < itemsPerPage) break;
        page++;
      } catch (error) {
        console.error(\`Erro na página \${page}:\`, error);
        break;
      }
    }

    console.log(\`📊 Total de clientes offline: \${offlineUsers.length}\`);

    if (offlineUsers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum cliente offline detectado',
          mass_outages: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // PASSO 2: Enriquecer dados com equipamento e localização
    // ========================================
    console.log('🔍 Enriquecendo dados dos clientes offline...');
    
    const enrichedUsers: any[] = [];
    
    for (const user of offlineUsers.slice(0, 100)) { // Limitar a 100 para performance
      try {
        // Buscar dados do cliente (para obter bairro)
        const clientData = await callIxcWithRetry(
          IXC_PROXY_URL,
          'GET',
          '/webservice/v1/cliente',
          null,
          \`qtype=cliente.id&query=\${user.id_cliente}\`
        );

        const cliente = clientData?.data?.registros?.[0];

        // Buscar equipamento do cliente (para obter PON/CTO)
        const equipmentData = await callIxcWithRetry(
          IXC_PROXY_URL,
          'GET',
          '/webservice/v1/cliente_equipamento',
          null,
          \`qtype=id_cliente&query=\${user.id_cliente}\`
        );

        const equipment = equipmentData?.data?.registros?.[0];
        
        // Extrair PON Port e CTO
        let ponPort = null;
        let cto = null;

        if (equipment?.identificacao) {
          const match = equipment.identificacao.match(/PON:\\s*([^,]+)/i);
          ponPort = match ? match[1].trim() : null;
          
          const ctoMatch = equipment.identificacao.match(/CTO:\\s*([^,]+)/i);
          cto = ctoMatch ? ctoMatch[1].trim() : null;
        }

        enrichedUsers.push({
          ...user,
          ponPort,
          cto,
          bairro: cliente?.bairro || null
        });

      } catch (error) {
        console.error(\`Erro ao buscar equipamento do cliente \${user.id_cliente}:\`, error);
      }
    }

    console.log(\`📊 Clientes com dados PON: \${enrichedUsers.filter(u => u.ponPort).length}/\${enrichedUsers.length}\`);

    // ========================================
    // PASSO 3: Detectar eventos Dying Gasp (perda de energia)
    // ========================================
    console.log('🔍 Verificando eventos Dying Gasp (perda de energia)...');
    
    const dyingGaspEvents = new Map<string, number>();
    
    try {
      const hoursAgo = 2;
      const dyingGaspData = await callIxcWithRetry(
        IXC_PROXY_URL,
        'GET',
        '/webservice/v1/gpon_evento',
        null,
        \`qtype=evento&query=Dying%20Gasp&hours=\${hoursAgo}\`
      );

      const eventos = Array.isArray(dyingGaspData?.data?.registros)
        ? dyingGaspData.data.registros
        : (dyingGaspData?.data?.registros ? Object.values(dyingGaspData.data.registros) : []);

      for (const evento of eventos) {
        const pon = evento.pon_port || evento.identificacao;
        if (pon) {
          dyingGaspEvents.set(pon, (dyingGaspEvents.get(pon) || 0) + 1);
        }
      }

      console.log(\`⚡ Dying Gasp eventos detectados: \${dyingGaspEvents.size} PONs afetadas\`);
    } catch (error) {
      console.error('Erro ao verificar Dying Gasp:', error);
    }

    // ========================================
    // PASSO 4: Agrupar clientes e detectar quedas em massa
    // ========================================
    console.log('📊 Agrupando clientes para detectar quedas em massa...');

    // Agrupar por PON Port
    const ponGroups = new Map<string, any[]>();
    for (const user of enrichedUsers) {
      if (user.ponPort) {
        if (!ponGroups.has(user.ponPort)) {
          ponGroups.set(user.ponPort, []);
        }
        ponGroups.get(user.ponPort)!.push(user);
      }
    }

    // Agrupar por CTO
    const ctoGroups = new Map<string, any[]>();
    for (const user of enrichedUsers) {
      if (user.cto) {
        if (!ctoGroups.has(user.cto)) {
          ctoGroups.set(user.cto, []);
        }
        ctoGroups.get(user.cto)!.push(user);
      }
    }

    // Agrupar por região (padrão de login)
    const regionGroups = new Map<string, any[]>();
    for (const user of enrichedUsers) {
      const login = String(user.login || '').toLowerCase();
      const regionMatch = login.match(/^([a-z]{2,3}-[a-z]{2,3})/i);
      if (regionMatch) {
        const region = regionMatch[1].toUpperCase();
        if (!regionGroups.has(region)) {
          regionGroups.set(region, []);
        }
        regionGroups.get(region)!.push(user);
      }
    }

    console.log(\`📊 Análise de agrupamentos:\`);
    console.log(\`   - PON Ports: \${ponGroups.size}\`);
    console.log(\`   - CTOs: \${ctoGroups.size}\`);
    console.log(\`   - Regiões: \${regionGroups.size}\`);

    // Detectar quedas em massa
    const massOutages: any[] = [];

    // Verificar PON Ports
    for (const [ponPort, users] of ponGroups) {
      if (users.length >= MASS_OUTAGE_THRESHOLDS.PON_PORT) {
        const dyingGaspCount = dyingGaspEvents.get(ponPort) || 0;
        const isPowerOutage = dyingGaspCount >= MASS_OUTAGE_THRESHOLDS.DYING_GASP;

        console.log(\`🚨 QUEDA EM MASSA detectada (PON): \${ponPort} - \${users.length} clientes afetados - \${isPowerOutage ? '⚡ Queda de energia' : '❓ Causa desconhecida'}\`);
        
        const eventKey = \`PON:\${ponPort}_\${new Date().toISOString().split('T')[0]}\`;
        
        // Criar ou atualizar evento no banco
        const { data: existingEvent } = await supabase
          .from('mass_outage_events')
          .select('*')
          .eq('event_key', eventKey)
          .eq('status', 'active')
          .single();

        if (existingEvent) {
          // Atualizar evento existente
          await supabase
            .from('mass_outage_events')
            .update({
              affected_count: users.length,
              affected_logins: users.map(u => u.login),
              updated_at: new Date().toISOString(),
              metadata: {
                group_type: 'PON_PORT',
                group_id: ponPort,
                is_power_outage: isPowerOutage,
                dying_gasp_count: dyingGaspCount
              }
            })
            .eq('id', existingEvent.id);

          console.log(\`📝 Evento atualizado: \${eventKey}\`);
        } else {
          // Criar novo evento
          await supabase
            .from('mass_outage_events')
            .insert({
              event_key: eventKey,
              region_pattern: ponPort,
              affected_count: users.length,
              affected_logins: users.map(u => u.login),
              status: 'active',
              detected_at: new Date().toISOString(),
              metadata: {
                group_type: 'PON_PORT',
                group_id: ponPort,
                is_power_outage: isPowerOutage,
                dying_gasp_count: dyingGaspCount
              }
            });

          console.log(\`📝 Novo evento criado: \${eventKey}\`);
        }

        massOutages.push({
          type: 'PON_PORT',
          identifier: ponPort,
          affected_count: users.length,
          is_power_outage: isPowerOutage,
          logins: users.map(u => u.login).slice(0, 10)
        });
      }
    }

    // Verificar CTOs
    for (const [cto, users] of ctoGroups) {
      if (users.length >= MASS_OUTAGE_THRESHOLDS.CTO) {
        console.log(\`🚨 QUEDA EM MASSA detectada (CTO): \${cto} - \${users.length} clientes afetados\`);
        
        const eventKey = \`CTO:\${cto}_\${new Date().toISOString().split('T')[0]}\`;
        
        const { data: existingEvent } = await supabase
          .from('mass_outage_events')
          .select('*')
          .eq('event_key', eventKey)
          .eq('status', 'active')
          .single();

        if (!existingEvent) {
          await supabase
            .from('mass_outage_events')
            .insert({
              event_key: eventKey,
              region_pattern: cto,
              affected_count: users.length,
              affected_logins: users.map(u => u.login),
              status: 'active',
              detected_at: new Date().toISOString(),
              metadata: {
                group_type: 'CTO',
                group_id: cto
              }
            });
        }

        massOutages.push({
          type: 'CTO',
          identifier: cto,
          affected_count: users.length,
          logins: users.map(u => u.login).slice(0, 10)
        });
      }
    }

    // Verificar Regiões
    for (const [region, users] of regionGroups) {
      if (users.length >= MASS_OUTAGE_THRESHOLDS.REGION) {
        console.log(\`🚨 QUEDA EM MASSA detectada (Região): \${region} - \${users.length} clientes afetados\`);
        
        const eventKey = \`REGION:\${region}_\${new Date().toISOString().split('T')[0]}\`;
        
        const { data: existingEvent } = await supabase
          .from('mass_outage_events')
          .select('*')
          .eq('event_key', eventKey)
          .eq('status', 'active')
          .single();

        if (!existingEvent) {
          await supabase
            .from('mass_outage_events')
            .insert({
              event_key: eventKey,
              region_pattern: region,
              affected_count: users.length,
              affected_logins: users.map(u => u.login),
              status: 'active',
              detected_at: new Date().toISOString(),
              metadata: {
                group_type: 'REGION',
                group_id: region
              }
            });
        }

        massOutages.push({
          type: 'REGION',
          identifier: region,
          affected_count: users.length,
          logins: users.map(u => u.login).slice(0, 10)
        });
      }
    }

    // ========================================
    // PASSO 5: Resolver eventos que não estão mais ativos
    // ========================================
    console.log('🔍 Verificando eventos para resolver...');

    const { data: activeEvents } = await supabase
      .from('mass_outage_events')
      .select('*')
      .eq('status', 'active');

    for (const event of activeEvents || []) {
      const metadata = event.metadata as any;
      const groupType = metadata?.group_type;
      const groupId = metadata?.group_id;

      let currentCount = 0;
      let threshold = 0;

      if (groupType === 'PON_PORT') {
        currentCount = ponGroups.get(groupId)?.length || 0;
        threshold = MASS_OUTAGE_THRESHOLDS.PON_PORT;
      } else if (groupType === 'CTO') {
        currentCount = ctoGroups.get(groupId)?.length || 0;
        threshold = MASS_OUTAGE_THRESHOLDS.CTO;
      } else if (groupType === 'REGION') {
        currentCount = regionGroups.get(groupId)?.length || 0;
        threshold = MASS_OUTAGE_THRESHOLDS.REGION;
      }

      // Se caiu abaixo do threshold, marcar como resolvido
      if (currentCount < threshold) {
        await supabase
          .from('mass_outage_events')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString()
          })
          .eq('id', event.id);

        console.log(\`✅ Evento resolvido: \${event.event_key} (contagem caiu de \${event.affected_count} para \${currentCount})\`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_offline: offlineUsers.length,
        clients_with_pon: enrichedUsers.filter(u => u.ponPort).length,
        mass_outages: massOutages,
        summary: {
          pon_groups: ponGroups.size,
          cto_groups: ctoGroups.size,
          region_groups: regionGroups.size
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro na detecção de quedas em massa:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});`;

  const massOutageMonitorCode = `// ============================================
// MASS OUTAGE MONITOR - React Component
// ============================================

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Activity, CheckCircle, Clock, Zap } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MassOutageEvent {
  id: string;
  event_key: string;
  region_pattern: string;
  affected_count: number;
  detected_at: string;
  resolved_at?: string;
  status: 'active' | 'resolved';
  metadata?: {
    group_type?: string;
    group_id?: string;
    is_power_outage?: boolean;
    dying_gasp_count?: number;
  };
  affected_logins?: string[];
}

export function MassOutageMonitor() {
  const [events, setEvents] = useState<MassOutageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('mass_outage_events')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      toast.error('Erro ao carregar eventos de queda em massa');
    } finally {
      setLoading(false);
    }
  };

  const detectOutages = async () => {
    setDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-mass-outage');
      
      if (error) throw error;
      
      toast.success(\`Detecção concluída: \${data?.mass_outages?.length || 0} quedas em massa detectadas\`);
      await loadEvents();
    } catch (error) {
      console.error('Erro ao detectar quedas:', error);
      toast.error('Erro ao executar detecção de quedas em massa');
    } finally {
      setDetecting(false);
    }
  };

  useEffect(() => {
    loadEvents();

    // Detecção automática inicial após 5 segundos
    const initialTimer = setTimeout(() => {
      detectOutages();
    }, 5000);

    // Detecção automática a cada 3 minutos
    const interval = setInterval(() => {
      detectOutages();
    }, 3 * 60 * 1000);

    // Real-time updates
    const channel = supabase
      .channel('mass-outage-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mass_outage_events'
        },
        () => {
          loadEvents();
        }
      )
      .subscribe();

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const activeEvents = events.filter(e => e.status === 'active');
  const resolvedEvents = events.filter(e => e.status === 'resolved');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monitor de Quedas em Massa</h2>
          <p className="text-muted-foreground">
            Detecção automática de quedas simultâneas por PON, CTO ou região
          </p>
        </div>
        <Button onClick={detectOutages} disabled={detecting}>
          <Activity className="mr-2 h-4 w-4" />
          {detecting ? 'Detectando...' : 'Detectar Agora'}
        </Button>
      </div>

      {activeEvents.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Quedas em Massa Ativas</AlertTitle>
          <AlertDescription>
            {activeEvents.length} queda(s) em massa detectada(s) - 
            Total de {activeEvents.reduce((sum, e) => sum + e.affected_count, 0)} clientes afetados
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {activeEvents.length > 0 && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Quedas Ativas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeEvents.map((event) => (
                <div key={event.id} className="border-l-4 border-destructive pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {event.metadata?.is_power_outage && (
                        <Zap className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="font-semibold">{event.region_pattern}</span>
                      <Badge variant="destructive">{event.metadata?.group_type}</Badge>
                    </div>
                    <Badge variant="outline">{event.affected_count} clientes</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Detectado: {new Date(event.detected_at).toLocaleString('pt-BR')}
                  </div>
                  {event.metadata?.is_power_outage && (
                    <p className="text-sm text-yellow-600 mt-1">
                      ⚡ Queda de energia detectada ({event.metadata.dying_gasp_count} Dying Gasp)
                    </p>
                  )}
                  {event.affected_logins && event.affected_logins.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-sm cursor-pointer text-muted-foreground">
                        Ver clientes afetados ({event.affected_logins.length})
                      </summary>
                      <div className="mt-2 text-xs text-muted-foreground font-mono">
                        {event.affected_logins.slice(0, 20).join(', ')}
                        {event.affected_logins.length > 20 && '...'}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {resolvedEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Quedas Resolvidas (Últimas 5)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {resolvedEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="border-l-4 border-green-500 pl-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{event.region_pattern}</span>
                    <Badge variant="outline" className="text-green-600">
                      {event.affected_count} clientes
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Resolvido: {event.resolved_at ? new Date(event.resolved_at).toLocaleString('pt-BR') : '-'}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!loading && events.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium">Nenhuma queda em massa detectada</p>
              <p className="text-sm text-muted-foreground">
                A última verificação não encontrou problemas
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}`;

  const databaseSchemaCode = `-- ============================================
-- DATABASE SCHEMA - Mass Outage Events
-- ============================================

-- Tabela de Eventos de Queda em Massa
CREATE TABLE public.mass_outage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  region_pattern TEXT NOT NULL,
  affected_count INTEGER NOT NULL,
  affected_logins TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para performance
CREATE INDEX idx_mass_outage_status ON mass_outage_events(status);
CREATE INDEX idx_mass_outage_detected ON mass_outage_events(detected_at DESC);
CREATE INDEX idx_mass_outage_event_key ON mass_outage_events(event_key);
CREATE INDEX idx_mass_outage_metadata ON mass_outage_events USING GIN(metadata);

-- Enable RLS
ALTER TABLE mass_outage_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage mass outage events"
  ON mass_outage_events FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editors can view mass outage events"
  ON mass_outage_events FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'editor'::user_role)
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE mass_outage_events;

-- Comentários
COMMENT ON TABLE mass_outage_events IS 'Registra eventos de queda em massa detectados automaticamente';
COMMENT ON COLUMN mass_outage_events.event_key IS 'Chave única do evento (ex: PON:1/1/1_2025-01-10)';
COMMENT ON COLUMN mass_outage_events.region_pattern IS 'Padrão de região/PON/CTO afetado';
COMMENT ON COLUMN mass_outage_events.affected_count IS 'Número de clientes afetados';
COMMENT ON COLUMN mass_outage_events.affected_logins IS 'Array com logins dos clientes afetados';
COMMENT ON COLUMN mass_outage_events.metadata IS 'Metadados: group_type, group_id, is_power_outage, dying_gasp_count';

-- Estrutura do metadata:
-- {
--   "group_type": "PON_PORT" | "CTO" | "REGION",
--   "group_id": "identificador do grupo",
--   "is_power_outage": boolean,
--   "dying_gasp_count": number
-- }

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_mass_outage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mass_outage_updated_at
  BEFORE UPDATE ON mass_outage_events
  FOR EACH ROW
  EXECUTE FUNCTION update_mass_outage_updated_at();

-- Configurar Cron Job (pg_cron)
-- Execute no SQL Editor do Supabase:
/*
SELECT cron.schedule(
  'detect-mass-outage-every-3-minutes',
  '*/3 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/detect-mass-outage',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
*/`;

  const integrationCloeCode = `// ============================================
// INTEGRAÇÃO COM CLOÉ - Verificação de Queda em Massa
// ============================================

// Em: supabase/functions/routing-agent/index.ts

async function checkMassOutageForClient(clientLogin: string): Promise<{
  isAffected: boolean;
  event?: any;
}> {
  try {
    console.log(\`🔍 Verificando se cliente \${clientLogin} está em queda em massa...\`);

    // Buscar eventos ativos de queda em massa
    const { data: activeEvents, error } = await supabase
      .from('mass_outage_events')
      .select('*')
      .eq('status', 'active');

    if (error) throw error;

    if (!activeEvents || activeEvents.length === 0) {
      console.log('✅ Nenhum evento de queda em massa ativo');
      return { isAffected: false };
    }

    // Verificar se o login do cliente está em algum evento
    for (const event of activeEvents) {
      const affectedLogins = event.affected_logins || [];
      const normalizedLogin = clientLogin.toLowerCase().trim();
      
      const isInEvent = affectedLogins.some(
        (login: string) => login.toLowerCase().trim() === normalizedLogin
      );

      if (isInEvent) {
        console.log(\`🚨 Cliente está afetado por queda em massa: \${event.event_key}\`);
        return { isAffected: true, event };
      }
    }

    console.log('✅ Cliente não está em nenhuma queda em massa');
    return { isAffected: false };

  } catch (error) {
    console.error('❌ Erro ao verificar queda em massa:', error);
    return { isAffected: false };
  }
}

// Uso no fluxo da Cloé:
const massOutageCheck = await checkMassOutageForClient(customerLogin);

if (massOutageCheck.isAffected) {
  const event = massOutageCheck.event;
  const isPowerOutage = event?.metadata?.is_power_outage;
  
  const message = \`🚨 **QUEDA EM MASSA DETECTADA**

Identificamos que você faz parte de um grupo de **\${event.affected_count} clientes** 
afetados por uma \${isPowerOutage ? 'queda de energia' : 'queda de internet'} na região 
**\${event.region_pattern}**.

Nossa equipe técnica já está ciente e trabalhando na solução do problema.

📊 **Detalhes:**
- Tipo: \${event.metadata?.group_type || 'Desconhecido'}
- Detectado em: \${new Date(event.detected_at).toLocaleString('pt-BR')}
\${isPowerOutage ? '- ⚡ Causa: Queda de energia confirmada' : '- 🔧 Causa: Em investigação'}

Não é necessário abrir chamado individual. Você será notificado quando o serviço 
for restabelecido. 

Obrigado pela compreensão! 🙏\`;

  // Retornar mensagem ao cliente
  return {
    response: message,
    shouldTransfer: false,
    transferTo: null
  };
}

// Se não está em queda em massa, continuar fluxo normal
// e transferir para suporte técnico se necessário...`;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Código Fonte - Quedas em Massa</h1>
          <p className="text-muted-foreground">
            Detecção automática de quedas simultâneas e integração com Cloé
          </p>
        </div>

        <Tabs defaultValue="explanation" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="explanation">
              <FileText className="mr-2 h-4 w-4" />
              Explicação
            </TabsTrigger>
            <TabsTrigger value="detection">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Detecção
            </TabsTrigger>
            <TabsTrigger value="monitor">
              <Activity className="mr-2 h-4 w-4" />
              Monitor
            </TabsTrigger>
            <TabsTrigger value="database">
              <Database className="mr-2 h-4 w-4" />
              Database
            </TabsTrigger>
            <TabsTrigger value="integration">
              <Check className="mr-2 h-4 w-4" />
              Integração Cloé
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explanation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Visão Geral do Sistema de Quedas em Massa</CardTitle>
                <CardDescription>
                  Explicação completa da arquitetura e funcionamento do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                <div className="space-y-6">
                  <section>
                    <p className="text-base">
                      Este conjunto de códigos forma um sistema completo e robusto para{" "}
                      <strong>Detecção, Monitoramento e Resposta Automática a Quedas em Massa</strong>{" "}
                      (Mass Outages) em uma <strong>rede de provedor de internet (ISP)</strong> que utiliza o sistema{" "}
                      <strong>IXC Soft</strong> e a plataforma <strong>Supabase</strong> como backend.
                    </p>
                    <p className="text-muted-foreground">
                      O sistema é dividido em três partes principais: uma Edge Function para detecção, um Componente React 
                      para monitoramento (frontend) e o Esquema de Banco de Dados e uma Integração com um Agente de Roteamento (Cloé).
                    </p>
                  </section>

                  <section className="border-l-4 border-primary pl-4">
                    <h3 className="text-xl font-semibold mb-3">1. Edge Function (DETECT MASS OUTAGE) - Deno/TypeScript</h3>
                    <p>Esta função é o <strong>motor de detecção</strong> e é projetada para ser executada periodicamente (via Cron Job).</p>
                    
                    <h4 className="font-semibold mt-4 mb-2">Ações Principais</h4>
                    <ol className="space-y-3 list-decimal list-inside">
                      <li>
                        <strong>Busca de Clientes Offline (Passo 1):</strong>
                        <ul className="ml-6 mt-1 space-y-1 list-disc list-inside text-muted-foreground">
                          <li>Usa paginação (limite de 10 páginas de 1000 itens) para buscar clientes com status offline do IXC Soft</li>
                          <li>Usa <code>callIxcWithRetry</code> e o endpoint <code>/webservice/v1/radusuarios</code></li>
                          <li>Lida com a estrutura de dados do IXC, que pode retornar um array ou um objeto de registros</li>
                        </ul>
                      </li>
                      <li>
                        <strong>Enriquecimento de Dados (Passo 2):</strong>
                        <ul className="ml-6 mt-1 space-y-1 list-disc list-inside text-muted-foreground">
                          <li>⚡ <strong>OTIMIZAÇÃO:</strong> Limita a análise a 500 clientes mais críticos (ordenados por prioridade)</li>
                          <li>⚡ <strong>OTIMIZAÇÃO:</strong> Processa em chunks paralelos de 20 clientes (10x mais rápido)</li>
                          <li>Para cada cliente, executa 2 chamadas IXC <strong>simultaneamente</strong>:</li>
                          <li><strong>Localização:</strong> Busca dados do cliente para obter o bairro</li>
                          <li><strong>Equipamento:</strong> Busca dados de equipamento para extrair a PON Port e a CTO usando regex</li>
                        </ul>
                      </li>
                      <li>
                        <strong>Detecção de Dying Gasp (Passo 3):</strong>
                        <ul className="ml-6 mt-1 space-y-1 list-disc list-inside text-muted-foreground">
                          <li>Consulta o IXC para eventos Dying Gasp (sinal de perda de energia) nas últimas 2 horas</li>
                          <li>Agrupa esses eventos por PON para determinar se uma queda foi causada por falta de energia</li>
                        </ul>
                      </li>
                      <li>
                        <strong>Agrupamento e Detecção de Quedas (Passo 4):</strong>
                        <ul className="ml-6 mt-1 space-y-1 list-disc list-inside text-muted-foreground">
                          <li>Agrupa os clientes enriquecidos por PON Port, CTO e Região</li>
                          <li>Compara com os limiares: PON ≥5, CTO ≥3, REGION ≥6 clientes</li>
                          <li>⚠️ <strong>VALIDAÇÃO:</strong> Alerta se PON {'>'} 128 clientes (capacidade máxima)</li>
                          <li>Cria ou atualiza eventos no Supabase com metadados de Dying Gasp</li>
                        </ul>
                      </li>
                      <li>
                        <strong>Resolução de Eventos (Passo 5):</strong>
                        <ul className="ml-6 mt-1 space-y-1 list-disc list-inside text-muted-foreground">
                          <li>Busca todos os eventos ativos no Supabase</li>
                          <li>Verifica a contagem atual de clientes offline no grupo</li>
                          <li>Se a contagem cair abaixo do limiar, o evento é marcado como resolved</li>
                        </ul>
                      </li>
                    </ol>

                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
                      <p className="text-sm">
                        <strong>⚠️ Ponto de Atenção:</strong> O limite de <code>offlineUsers.slice(0, 100)</code> no Passo 2 
                        pode fazer com que quedas em massa que afetem mais de 100 clientes não tenham todos os clientes 
                        analisados com seus detalhes de PON/CTO, impactando a precisão do agrupamento.
                      </p>
                    </div>
                  </section>

                  <section className="border-l-4 border-primary pl-4">
                    <h3 className="text-xl font-semibold mb-3">2. Componente React (MassOutageMonitor)</h3>
                    <p>Este componente é a <strong>interface de monitoramento</strong> (frontend) para a visualização dos eventos.</p>
                    
                    <h4 className="font-semibold mt-4 mb-2">Funcionalidades</h4>
                    <ul className="space-y-2 list-disc list-inside">
                      <li><strong>Carregamento de Eventos:</strong> Busca os 10 eventos mais recentes do Supabase</li>
                      <li><strong>Execução da Detecção:</strong> Permite executar a Edge Function manualmente</li>
                      <li>
                        <strong>Ciclo de Vida (useEffect):</strong>
                        <ul className="ml-6 mt-1 space-y-1 list-disc list-inside text-muted-foreground">
                          <li>Carrega eventos na montagem</li>
                          <li>Agenda a execução automática da detecção a cada 3 minutos</li>
                          <li>Atualização em Tempo Real via supabase.channel</li>
                        </ul>
                      </li>
                      <li><strong>Interface:</strong> Exibe alertas para quedas ativas e listas separadas para quedas ativas e resolvidas</li>
                      <li>Usa ícones e badges para diferenciar o tipo de grupo (PON/CTO/REGION)</li>
                      <li>Indica se é uma queda de energia (ícone Zap)</li>
                    </ul>
                  </section>

                  <section className="border-l-4 border-primary pl-4">
                    <h3 className="text-xl font-semibold mb-3">3. Esquema de Banco de Dados (PostgreSQL/Supabase)</h3>
                    <p>Define a estrutura da tabela <code>mass_outage_events</code> para persistir os eventos.</p>
                    
                    <h4 className="font-semibold mt-4 mb-2">Detalhes do Schema</h4>
                    <ul className="space-y-2 list-disc list-inside">
                      <li><strong>Campos Chave:</strong> event_key (única), region_pattern, affected_count</li>
                      <li><strong>Status:</strong> active ou resolved (com verificação de restrição CHECK)</li>
                      <li><strong>affected_logins:</strong> Armazena um array de logins dos clientes afetados</li>
                      <li>
                        <strong>metadata:</strong> Campo JSONB que armazena detalhes importantes:
                        <ul className="ml-6 mt-1 space-y-1 list-disc list-inside text-muted-foreground">
                          <li>group_type, group_id</li>
                          <li>is_power_outage, dying_gasp_count</li>
                        </ul>
                      </li>
                      <li><strong>Segurança (RLS):</strong> Implementa Row Level Security com políticas baseadas em roles</li>
                      <li><strong>Realtime:</strong> Habilita a tabela para atualizações em tempo real</li>
                      <li><strong>pg_cron:</strong> Configura o agendamento de execução da Edge Function a cada 3 minutos</li>
                    </ul>
                  </section>

                  <section className="border-l-4 border-primary pl-4">
                    <h3 className="text-xl font-semibold mb-3">4. Integração com Cloé (Agente de Roteamento)</h3>
                    <p>Demonstra um caso de uso para o sistema de detecção em um agente de atendimento automático.</p>
                    
                    <h4 className="font-semibold mt-4 mb-2">Lógica</h4>
                    <ul className="space-y-2 list-disc list-inside">
                      <li>A função <code>checkMassOutageForClient</code> verifica se o customerLogin está presente no array affected_logins</li>
                      <li>Se o cliente for afetado, o agente interrompe o fluxo normal de atendimento</li>
                      <li>Retorna uma mensagem informativa padronizada sobre a queda em massa</li>
                      <li>A mensagem utiliza os dados do evento para fornecer uma resposta clara e proativa</li>
                      <li><strong>Objetivo:</strong> Reduzir chamados desnecessários e melhorar a experiência do cliente</li>
                    </ul>
                  </section>

                  <section className="border-l-4 border-blue-500 pl-4 bg-blue-500/5 p-4 rounded">
                    <h3 className="text-xl font-semibold mb-3">Análise Geral do Sistema</h3>
                    <p className="mb-3">
                      O sistema é um <strong>excelente exemplo</strong> de arquitetura de{" "}
                      <strong>monitoramento proativo</strong> em um ISP, utilizando a plataforma{" "}
                      <strong>Serverless/PaaS (Supabase/Deno)</strong> para baixo custo e alta escalabilidade.
                    </p>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-4 py-2 text-left text-sm font-semibold">Aspecto</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Pontos Fortes</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Pontos a Melhorar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr>
                            <td className="px-4 py-2 font-medium">Arquitetura</td>
                            <td className="px-4 py-2 text-sm">Usa Edge Function (Deno) para execução rápida e pg_cron para agendamento confiável</td>
                            <td className="px-4 py-2 text-sm">A dependência do proxy do IXC pode ser um ponto de falha ou lentidão</td>
                          </tr>
                          <tr className="bg-muted/20">
                            <td className="px-4 py-2 font-medium">Detecção</td>
                            <td className="px-4 py-2 text-sm">
                              <div>• Multi-nível de agrupamento (PON, CTO, Região)</div>
                              <div className="text-green-600 dark:text-green-400">✅ Paralelização em chunks (10x mais rápido)</div>
                              <div className="text-green-600 dark:text-green-400">✅ Validação de capacidade PON (128 clientes)</div>
                            </td>
                            <td className="px-4 py-2 text-sm">Limite de 500 clientes enriquecidos (suficiente para detecção, mas pode não capturar todos os afetados em quedas massivas)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-medium">Respostas</td>
                            <td className="px-4 py-2 text-sm">Integração com Dying Gasp para diferenciar queda de energia de falha de fibra/equipamento</td>
                            <td className="px-4 py-2 text-sm">-</td>
                          </tr>
                          <tr className="bg-muted/20">
                            <td className="px-4 py-2 font-medium">UX/Monitoramento</td>
                            <td className="px-4 py-2 text-sm">Componente React limpo, com Realtime e execução manual/automática da detecção</td>
                            <td className="px-4 py-2 text-sm">-</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-medium">Integração</td>
                            <td className="px-4 py-2 text-sm">Exemplo prático de como a detecção pode ser usada para autossuporte (Cloé), aliviando a equipe</td>
                            <td className="px-4 py-2 text-sm">-</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detection" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Edge Function - Detecção de Quedas em Massa</CardTitle>
                <CardDescription>
                  Analisa clientes offline e agrupa por PON, CTO e região para detectar quedas simultâneas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-[600px] overflow-y-auto">
                    <code>{detectMassOutageCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-4 right-4"
                    onClick={() => copyToClipboard(detectMassOutageCode, 'detection')}
                  >
                    {copiedSection === 'detection' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Componente React - Monitor de Quedas</CardTitle>
                <CardDescription>
                  Interface visual para monitorar quedas em massa em tempo real
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-[600px] overflow-y-auto">
                    <code>{massOutageMonitorCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-4 right-4"
                    onClick={() => copyToClipboard(massOutageMonitorCode, 'monitor')}
                  >
                    {copiedSection === 'monitor' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Schema do Banco de Dados</CardTitle>
                <CardDescription>
                  Estrutura da tabela mass_outage_events e configurações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-[600px] overflow-y-auto">
                    <code>{databaseSchemaCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-4 right-4"
                    onClick={() => copyToClipboard(databaseSchemaCode, 'database')}
                  >
                    {copiedSection === 'database' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integration" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Integração com Cloé</CardTitle>
                <CardDescription>
                  Verificação automática e notificação proativa de clientes afetados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-[600px] overflow-y-auto">
                    <code>{integrationCloeCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-4 right-4"
                    onClick={() => copyToClipboard(integrationCloeCode, 'integration')}
                  >
                    {copiedSection === 'integration' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Documentação Adicional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              📄 <strong>Fluxo Completo:</strong> Veja{" "}
              <code className="bg-background px-2 py-1 rounded">docs/mass-outage-logic-explained.md</code>
            </p>
            <p className="text-sm">
              🔄 <strong>Detecção Automática:</strong> Executada a cada 3 minutos via Cron Job
            </p>
            <p className="text-sm">
              ⚡ <strong>Detecção de Energia:</strong> Identifica quedas de energia via eventos "Dying Gasp"
            </p>
            <p className="text-sm">
              🤖 <strong>Integração:</strong> Cloé notifica clientes afetados automaticamente
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuedasMassaCodigo;
