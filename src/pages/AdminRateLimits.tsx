import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/BackButton';
import { Shield, Clock, Ban, Activity } from 'lucide-react';

const rateLimitConfigs = [
  {
    action: 'Login',
    type: 'login',
    maxAttempts: 5,
    windowMinutes: 15,
    blockMinutes: 60,
    severity: 'critical',
    description: 'Previne ataques de força bruta em autenticação',
  },
  {
    action: 'Busca de CPF',
    type: 'cpf_search',
    maxAttempts: 10,
    windowMinutes: 15,
    blockMinutes: 30,
    severity: 'high',
    description: 'Protege contra scraping massivo de dados sensíveis',
  },
  {
    action: 'Upload de Arquivo',
    type: 'file_upload',
    maxAttempts: 3,
    windowMinutes: 10,
    blockMinutes: 60,
    severity: 'medium',
    description: 'Previne abuse de recursos de armazenamento',
  },
  {
    action: 'Reset de Senha',
    type: 'password_reset',
    maxAttempts: 3,
    windowMinutes: 60,
    blockMinutes: 120,
    severity: 'high',
    description: 'Previne abuse do sistema de recuperação',
  },
];

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'bg-red-500 text-white';
    case 'high': return 'bg-orange-500 text-white';
    case 'medium': return 'bg-yellow-500 text-black';
    default: return 'bg-blue-500 text-white';
  }
};

export default function AdminRateLimits() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <BackButton />
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          Rate Limiting Unificado
        </h1>
        <p className="text-muted-foreground">
          Configurações de controle de taxa para endpoints críticos
        </p>
        <div className="mt-4">
          <Button variant="outline" asChild>
            <a href="/admin/whitelist">
              <Shield className="w-4 h-4 mr-2" />
              Gerenciar Whitelist de IPs
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">Sistema Ativo</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Rate limiting implementado com controle duplo: por usuário autenticado (user_id) e por IP para requisições anônimas.
              </p>
              <div className="flex gap-2">
                <Badge variant="default">✅ Middleware ativo</Badge>
                <Badge variant="default">✅ Cleanup automático</Badge>
                <Badge variant="default">✅ Logs de segurança</Badge>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rateLimitConfigs.map((config) => (
            <Card key={config.type} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">{config.action}</h3>
                  <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {config.type}
                  </code>
                </div>
                <Badge className={getSeverityColor(config.severity)}>
                  {config.severity.toUpperCase()}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                {config.description}
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium">Tentativas</span>
                  </div>
                  <p className="text-lg font-bold">{config.maxAttempts}</p>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium">Janela</span>
                  </div>
                  <p className="text-lg font-bold">{config.windowMinutes}min</p>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Ban className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium">Bloqueio</span>
                  </div>
                  <p className="text-lg font-bold">{config.blockMinutes}min</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Como Funciona</h2>
          <div className="space-y-4 text-sm">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                1
              </div>
              <div>
                <p className="font-semibold mb-1">Identificação</p>
                <p className="text-muted-foreground">
                  Sistema identifica o cliente por <code>user_id</code> (se autenticado) ou <code>IP</code> (se anônimo).
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                2
              </div>
              <div>
                <p className="font-semibold mb-1">Contagem de Tentativas</p>
                <p className="text-muted-foreground">
                  Cada requisição incrementa o contador dentro da janela de tempo configurada.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                3
              </div>
              <div>
                <p className="font-semibold mb-1">Bloqueio Automático</p>
                <p className="text-muted-foreground">
                  Ao atingir o limite, o cliente é bloqueado pelo período configurado. Resposta HTTP 429 (Too Many Requests).
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                4
              </div>
              <div>
                <p className="font-semibold mb-1">Cleanup e Reset</p>
                <p className="text-muted-foreground">
                  Registros expirados são automaticamente limpos após 24h. Janela de contagem reseta após o período configurado.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-orange-500/20 bg-orange-500/5">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            Headers de Resposta
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Todas as respostas incluem headers informativos:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm font-mono">
            <div className="p-3 bg-muted rounded">
              <code className="text-primary">X-RateLimit-Limit</code>
              <p className="text-muted-foreground text-xs mt-1">Número máximo de tentativas permitidas</p>
            </div>
            <div className="p-3 bg-muted rounded">
              <code className="text-primary">X-RateLimit-Remaining</code>
              <p className="text-muted-foreground text-xs mt-1">Tentativas restantes na janela atual</p>
            </div>
            <div className="p-3 bg-muted rounded">
              <code className="text-primary">X-RateLimit-Reset</code>
              <p className="text-muted-foreground text-xs mt-1">Timestamp quando o limite será resetado</p>
            </div>
            <div className="p-3 bg-muted rounded">
              <code className="text-primary">Retry-After</code>
              <p className="text-muted-foreground text-xs mt-1">Segundos até poder tentar novamente (quando bloqueado)</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
