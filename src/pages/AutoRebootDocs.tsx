import { AuthGuard } from "@/components/AuthGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Database, FileCode, Settings } from "lucide-react";

const AutoRebootDocs = () => {
  return (
    <AuthGuard requiredRoles={['admin']}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <FileCode className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Auto Reboot - Documentação Completa</h1>
              <p className="text-muted-foreground">
                Código-fonte completo do sistema de reinicialização automática
              </p>
            </div>
          </div>

          {/* Database Schema */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle>Estrutura do Banco de Dados</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* equipment_reboots table */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Tabela: equipment_reboots</h3>
                <ScrollArea className="h-[300px] w-full rounded-md border">
                  <pre className="p-4 text-xs">
{`CREATE TABLE public.equipment_reboots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ixc_client_id text NOT NULL,
  client_name text,
  client_login text,
  client_ip text,
  detection_timestamp timestamp with time zone NOT NULL,
  bandwidth_before_kbps numeric,
  bandwidth_after_kbps numeric,
  status text NOT NULL DEFAULT 'pending',
  verification_count integer DEFAULT 0,
  reboot_timestamp timestamp with time zone,
  reboot_completed_at timestamp with time zone,
  error_message text,
  skip_reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.equipment_reboots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem visualizar reboots"
ON public.equipment_reboots FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins podem gerenciar reboots"
ON public.equipment_reboots FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));`}
                  </pre>
                </ScrollArea>
              </div>

              {/* equipment_reboot_blacklist table */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Tabela: equipment_reboot_blacklist</h3>
                <ScrollArea className="h-[200px] w-full rounded-md border">
                  <pre className="p-4 text-xs">
{`CREATE TABLE public.equipment_reboot_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ixc_client_id text NOT NULL,
  client_name text,
  reason text,
  added_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.equipment_reboot_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar blacklist"
ON public.equipment_reboot_blacklist FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));`}
                  </pre>
                </ScrollArea>
              </div>

              {/* auto_reboot_settings table */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Tabela: auto_reboot_settings</h3>
                <ScrollArea className="h-[250px] w-full rounded-md border">
                  <pre className="p-4 text-xs">
{`CREATE TABLE public.auto_reboot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  bandwidth_threshold_kbps integer NOT NULL DEFAULT 900,
  verification_count integer NOT NULL DEFAULT 3,
  verification_interval_seconds integer NOT NULL DEFAULT 60,
  cooldown_hours integer NOT NULL DEFAULT 24,
  exclude_hours_start integer NOT NULL DEFAULT 1,
  exclude_hours_end integer NOT NULL DEFAULT 6,
  cron_interval_minutes integer NOT NULL DEFAULT 30,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid
);

-- RLS Policies
ALTER TABLE public.auto_reboot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem visualizar configurações de auto-reboot"
ON public.auto_reboot_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins podem gerenciar configurações de auto-reboot"
ON public.auto_reboot_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));`}
                  </pre>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          {/* Edge Function */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                <CardTitle>Edge Function: auto-reboot-frozen-equipment</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] w-full rounded-md border">
                <pre className="p-4 text-xs">
{`import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ixcProxyUrl = Deno.env.get('IXC_PROXY_URL') || 
      'https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/ixc-proxy';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar se está no horário de exclusão (1h às 6h)
    const currentHour = new Date().getHours();
    if (currentHour >= 1 && currentHour < 6) {
      console.log('Verificação pulada - horário de exclusão (1h-6h)');
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        reason: 'Horário de exclusão'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar usuários online
    const onlineUsersResponse = await fetch(\`\${ixcProxyUrl}?path=/webservice/v1/radius_online\`, {
      headers: { 'Authorization': req.headers.get('Authorization') || '' }
    });

    if (!onlineUsersResponse.ok) {
      throw new Error('Erro ao buscar usuários online');
    }

    const onlineUsers = await onlineUsersResponse.json();

    // Buscar blacklist
    const { data: blacklist } = await supabase
      .from('equipment_reboot_blacklist')
      .select('ixc_client_id');

    const blacklistIds = new Set(blacklist?.map(b => b.ixc_client_id) || []);

    // Identificar clientes com banda baixa
    const suspects = onlineUsers
      .filter((user: any) => {
        const downloadKbps = parseFloat(user.rx_bytes_sec || 0) / 1024;
        const uploadKbps = parseFloat(user.tx_bytes_sec || 0) / 1024;
        return (downloadKbps + uploadKbps) < 900 && 
               !blacklistIds.has(user.id_cliente);
      });

    const results = [];

    for (const suspect of suspects) {
      // Verificar se cliente está bloqueado financeiramente
      const clientResponse = await fetch(
        \`\${ixcProxyUrl}?path=/webservice/v1/cliente/\${suspect.id_cliente}\`,
        { headers: { 'Authorization': req.headers.get('Authorization') || '' } }
      );

      if (!clientResponse.ok) continue;

      const clientData = await clientResponse.json();
      if (clientData.bloqueado === 'Sim') {
        results.push({
          client_id: suspect.id_cliente,
          status: 'skipped',
          reason: 'Cliente bloqueado financeiramente'
        });
        continue;
      }

      // Verificar cooldown (24h)
      const { data: recentReboot } = await supabase
        .from('equipment_reboots')
        .select('created_at')
        .eq('ixc_client_id', suspect.id_cliente)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentReboot) {
        results.push({
          client_id: suspect.id_cliente,
          status: 'skipped',
          reason: 'Cooldown ativo (último reboot há menos de 24h)'
        });
        continue;
      }

      // Criar registro inicial
      const { data: rebootRecord } = await supabase
        .from('equipment_reboots')
        .insert({
          ixc_client_id: suspect.id_cliente,
          client_name: suspect.nome || 'N/A',
          client_login: suspect.login,
          client_ip: suspect.ip,
          detection_timestamp: new Date().toISOString(),
          status: 'pending'
        })
        .select()
        .single();

      // Verificações consecutivas
      let consecutiveLow = 0;
      for (let i = 0; i < 3; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, 60000)); // 1 minuto

        const checkResponse = await fetch(
          \`\${ixcProxyUrl}?path=/webservice/v1/radius_online\`,
          { headers: { 'Authorization': req.headers.get('Authorization') || '' } }
        );

        const currentUsers = await checkResponse.json();
        const currentUser = currentUsers.find((u: any) => u.id_cliente === suspect.id_cliente);

        if (currentUser) {
          const downloadKbps = parseFloat(currentUser.rx_bytes_sec || 0) / 1024;
          const uploadKbps = parseFloat(currentUser.tx_bytes_sec || 0) / 1024;
          if ((downloadKbps + uploadKbps) < 900) {
            consecutiveLow++;
          }
        }
      }

      if (consecutiveLow >= 2) {
        // Executar reboot
        const rebootResponse = await fetch(
          \`\${ixcProxyUrl}?path=/webservice/v1/fn_acessos_rebootar\`,
          {
            method: 'POST',
            headers: {
              'Authorization': req.headers.get('Authorization') || '',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: suspect.id_cliente })
          }
        );

        const rebootSuccess = rebootResponse.ok;

        // Aguardar 2 minutos e verificar banda
        await new Promise(r => setTimeout(r, 120000));

        const afterResponse = await fetch(
          \`\${ixcProxyUrl}?path=/webservice/v1/radius_online\`,
          { headers: { 'Authorization': req.headers.get('Authorization') || '' } }
        );

        const afterUsers = await afterResponse.json();
        const afterUser = afterUsers.find((u: any) => u.id_cliente === suspect.id_cliente);
        
        const bandwidthAfter = afterUser 
          ? (parseFloat(afterUser.rx_bytes_sec || 0) + parseFloat(afterUser.tx_bytes_sec || 0)) / 1024
          : 0;

        await supabase
          .from('equipment_reboots')
          .update({
            status: rebootSuccess ? 'success' : 'failed',
            reboot_timestamp: new Date().toISOString(),
            reboot_completed_at: new Date().toISOString(),
            bandwidth_after_kbps: bandwidthAfter,
            verification_count: 3
          })
          .eq('id', rebootRecord.id);

        results.push({
          client_id: suspect.id_cliente,
          status: rebootSuccess ? 'success' : 'failed',
          bandwidth_after: bandwidthAfter
        });
      } else {
        await supabase
          .from('equipment_reboots')
          .update({
            status: 'skipped',
            skip_reason: 'Falso positivo - banda recuperou'
          })
          .eq('id', rebootRecord.id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});`}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* React Components */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <CardTitle>Componentes React</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* RebootStats */}
              <div>
                <h3 className="text-lg font-semibold mb-2">RebootStats.tsx</h3>
                <ScrollArea className="h-[400px] w-full rounded-md border">
                  <pre className="p-4 text-xs">
{`import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

export const RebootStats = () => {
  const { data: stats } = useQuery({
    queryKey: ['reboot-stats'],
    queryFn: async () => {
      const [totalResult, successResult, failedResult, pendingResult, last24hResult] = 
        await Promise.all([
          supabase.from('equipment_reboots').select('id', { count: 'exact', head: true }),
          supabase.from('equipment_reboots').select('id', { count: 'exact', head: true })
            .eq('status', 'success'),
          supabase.from('equipment_reboots').select('id', { count: 'exact', head: true })
            .eq('status', 'failed'),
          supabase.from('equipment_reboots').select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),
          supabase.from('equipment_reboots').select('id', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        ]);

      return {
        total: totalResult.count || 0,
        success: successResult.count || 0,
        failed: failedResult.count || 0,
        pending: pendingResult.count || 0,
        last24h: last24hResult.count || 0
      };
    },
    refetchInterval: 30000
  });

  const statCards = [
    { title: "Total de Reboots", value: stats?.total || 0, icon: Activity, color: "text-blue-500" },
    { title: "Bem-sucedidos", value: stats?.success || 0, icon: CheckCircle, color: "text-green-500" },
    { title: "Falhados", value: stats?.failed || 0, icon: XCircle, color: "text-red-500" },
    { title: "Pendentes", value: stats?.pending || 0, icon: Clock, color: "text-yellow-500" },
    { title: "Últimas 24h", value: stats?.last24h || 0, icon: AlertTriangle, color: "text-orange-500" }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={\`h-4 w-4 \${stat.color}\`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};`}
                  </pre>
                </ScrollArea>
              </div>

              {/* Configuração de Cron */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Configuração de Cron Job</h3>
                <ScrollArea className="h-[200px] w-full rounded-md border">
                  <pre className="p-4 text-xs">
{`-- Criar cron job para executar a cada 30 minutos
SELECT cron.schedule(
  'auto-reboot-frozen-equipment',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url:='https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/auto-reboot-frozen-equipment',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);`}
                  </pre>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          {/* Logic Flow */}
          <Card>
            <CardHeader>
              <CardTitle>Fluxo de Funcionamento - Auto Reboot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <ol className="space-y-2">
                  <li><strong>Verificação Inicial:</strong> Sistema verifica se está fora do horário de exclusão (1h-6h)</li>
                  <li><strong>Identificação:</strong> Busca usuários online com banda &lt; 900 Kbps</li>
                  <li><strong>Filtragem:</strong> Exclui clientes na blacklist e bloqueados financeiramente</li>
                  <li><strong>Cooldown:</strong> Verifica se o cliente já foi reiniciado nas últimas 24h</li>
                  <li><strong>Verificação Consecutiva:</strong> Realiza 3 verificações com 1 minuto de intervalo</li>
                  <li><strong>Decisão:</strong> Se 2+ verificações confirmarem banda baixa, executa reboot</li>
                  <li><strong>Reboot:</strong> Envia comando via API IXC</li>
                  <li><strong>Validação:</strong> Aguarda 2 minutos e verifica se a banda melhorou</li>
                  <li><strong>Registro:</strong> Atualiza status (success/failed) no banco de dados</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Novo Sistema de Manutenção Inteligente */}
          <Card>
            <CardHeader>
              <CardTitle>Sistema de Manutenção Inteligente com Prioridades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <h3 className="text-lg font-semibold">🟥 PRIORIDADE ALTA - Execução Obrigatória</h3>
                <ul>
                  <li>Monitoramento de Disponibilidade (routers, OLT, ONU, PPPoE)</li>
                  <li>Validação de Latência e Perda de Pacotes</li>
                  <li>Correção Automática de Serviços Críticos</li>
                </ul>

                <h3 className="text-lg font-semibold mt-4">🟧 PRIORIDADE MÉDIA - Execução Condicional</h3>
                <ul>
                  <li>Coleta de Métricas de Desempenho</li>
                  <li>Verificação de Versões de Firmware</li>
                  <li>Backup Programado de Configuração</li>
                </ul>

                <h3 className="text-lg font-semibold mt-4">🟩 PRIORIDADE BAIXA - Manutenção Preventiva</h3>
                <ul>
                  <li>Análise Preditiva de Falhas</li>
                  <li>Relatório de Status Diário</li>
                  <li>Limpeza de Logs Antigos</li>
                </ul>

                <h3 className="text-lg font-semibold mt-4">⚡ Lógica de Execução</h3>
                <ol>
                  <li>Executar todas as rotinas de PRIORIDADE ALTA</li>
                  <li>Se falha detectada → interromper demais prioridades</li>
                  <li>Com rede estável, seguir para PRIORIDADE MÉDIA</li>
                  <li>Se houver recursos, executar PRIORIDADE BAIXA</li>
                  <li>Auto-escalação de falhas recorrentes para prioridade alta</li>
                  <li>Repetir ciclo a cada intervalo configurado</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
};

export default AutoRebootDocs;
