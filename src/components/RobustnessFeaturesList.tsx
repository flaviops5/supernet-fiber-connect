import { Card } from '@/components/ui/card';
import { CheckCircle, FileText, Link as LinkIcon } from 'lucide-react';

export function RobustnessFeaturesList() {
  const features = [
    {
      category: '🔄 IXC Proxy',
      items: [
        'Credenciais centralizadas (não expostas)',
        'Cache inteligente (30s para GET)',
        'Retry automático (3x com backoff)',
        'Métricas de performance (duration_ms)',
        'HMAC validation interna'
      ],
      file: 'supabase/functions/ixc-proxy/index.ts'
    },
    {
      category: '⚡ Circuit Breaker',
      items: [
        'Threshold: 5 falhas consecutivas',
        'Estados: CLOSED → OPEN → HALF-OPEN',
        'Timeout: 60s em estado OPEN',
        'Proteção contra falhas cascata',
        'Recovery automático'
      ],
      file: 'supabase/functions/_shared/ixc-client.ts'
    },
    {
      category: '📊 Métricas & Analytics',
      items: [
        'Tabela agent_metrics (por agente/ação)',
        'Dashboard em tempo real (/system-metrics)',
        'KPIs: success_rate, error_rate, avg_duration',
        'Agregações por período (1h/6h/24h)',
        'Alertas automáticos (> 5% erro ou > 5s)'
      ],
      file: 'supabase/functions/metrics-collector/index.ts'
    },
    {
      category: '💚 Health Check',
      items: [
        'Endpoint público: /system-health',
        'Verifica: Database, IXC, Circuit Breaker',
        'Status codes: 200/207/503',
        'Atualiza system_health table',
        'Cron job a cada 1 minuto'
      ],
      file: 'supabase/functions/system-health/index.ts'
    },
    {
      category: '🔄 Dead Letter Queue',
      items: [
        'Tabela failed_actions (status tracking)',
        'Retry automático (até 3x)',
        'Estados: pending → retrying → resolved/abandoned',
        'Alertas quando abandonado',
        'Cron job a cada 5 minutos'
      ],
      file: 'supabase/functions/retry-failed-actions/index.ts'
    },
    {
      category: '🛡️ Rate Limiting',
      items: [
        'Limite: 10 mensagens/minuto por CPF',
        'Janela: 1 minuto rolante',
        'Bloqueio: 5 minutos temporário',
        'Mensagem clara ao usuário',
        'Tabela: rate_limit_tracking'
      ],
      file: 'supabase/functions/_shared/rate-limiter.ts'
    },
    {
      category: '🔐 Segurança HMAC',
      items: [
        'SHA-256 signature validation',
        'Headers: X-HMAC-Signature + Timestamp',
        'Timeout: 5 minutos',
        'Proteção contra replay attacks',
        'Secret: HMAC_SHARED_SECRET'
      ],
      file: 'supabase/functions/_shared/hmac.ts'
    },
    {
      category: '📋 Auditoria',
      items: [
        'Tabela action_log (todas ações IXC)',
        'Registro: antes + depois de cada ação',
        'Campos: agent, cpf, type, payload, result',
        'Luan e Júlia gravam tickets',
        'Rastreabilidade total'
      ],
      file: 'Tabelas: action_log, agent_metrics'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">
          ✅ Features Enterprise Implementadas
        </h2>
        <p className="text-muted-foreground">
          Todos os componentes críticos para sistema de nível 100%
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {features.map((feature) => (
          <Card key={feature.category} className="border-2">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold">{feature.category}</h3>
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
              </div>
              
              <ul className="space-y-2 mb-4">
                {feature.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-green-500 flex-shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-3 border-t">
                <FileText className="w-3 h-3" />
                <code className="bg-muted px-2 py-1 rounded">{feature.file}</code>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Links */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-500/20">
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Links Rápidos
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <a 
              href="/system-metrics" 
              target="_blank"
              className="p-3 bg-card rounded-lg border hover:border-primary transition-colors"
            >
              <div className="font-semibold mb-1">📊 Dashboard</div>
              <div className="text-xs text-muted-foreground">Métricas em tempo real</div>
            </a>
            <a 
              href="https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/system-health" 
              target="_blank"
              className="p-3 bg-card rounded-lg border hover:border-primary transition-colors"
            >
              <div className="font-semibold mb-1">💚 Health Check</div>
              <div className="text-xs text-muted-foreground">Status dos componentes</div>
            </a>
            <a 
              href="https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/functions" 
              target="_blank"
              className="p-3 bg-card rounded-lg border hover:border-primary transition-colors"
            >
              <div className="font-semibold mb-1">🔧 Logs</div>
              <div className="text-xs text-muted-foreground">Edge Functions</div>
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
