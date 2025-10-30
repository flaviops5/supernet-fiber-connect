import { useState } from 'react';
import { AlertTriangle, Bell, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export const AdminMassOutage = () => {
  const [outageDetected, setOutageDetected] = useState(false);
  const [affectedClients, setAffectedClients] = useState(0);
  const [notificationsSent, setNotificationsSent] = useState(false);
  const [incidentCreated, setIncidentCreated] = useState(false);
  const [incidentNumber, setIncidentNumber] = useState('');
  const [status, setStatus] = useState<'open' | 'resolving' | 'resolved' | 'closed'>('open');
  const [connectivityVerified, setConnectivityVerified] = useState(false);
  const [onlineClients, setOnlineClients] = useState(0);
  const [recoveryRate, setRecoveryRate] = useState(0);

  const simulateOutage = () => {
    setOutageDetected(true);
    setAffectedClients(15);
    
    setTimeout(() => {
      setNotificationsSent(true);
    }, 1000);
  };

  const createIncident = () => {
    setIncidentCreated(true);
    setIncidentNumber('INC-123456');
  };

  const resolveIncident = () => {
    setStatus('resolved');
    setTimeout(() => {
      setConnectivityVerified(true);
      setOnlineClients(15);
      setRecoveryRate(100);
    }, 1000);
  };

  const closeIncident = () => {
    setStatus('closed');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Monitoramento de Mass Outage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={simulateOutage}>
            Simular Mass Outage
          </Button>

          {outageDetected && (
            <Alert data-testid="mass-outage-alert" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription data-testid="mass-outage-details">
                Possível Mass Outage Detectada
              </AlertDescription>
            </Alert>
          )}

          {outageDetected && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Clientes Afetados</p>
              <p data-testid="affected-clients-count" className="text-3xl font-bold">
                {affectedClients}
              </p>
            </div>
          )}

          {notificationsSent && (
            <div data-testid="notifications-sent" className="space-y-2">
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                <Bell className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  Notificações enviadas para todos os clientes afetados
                </AlertDescription>
              </Alert>

              <Button
                data-testid="view-notification-log"
                variant="outline"
                size="sm"
              >
                Ver Log de Notificações
              </Button>

              <div data-testid="notification-entry" className="p-3 bg-muted rounded text-sm">
                Enviado para cliente: Identificamos um problema técnico. 
                Nossa equipe já está trabalhando na solução.
              </div>
            </div>
          )}

          {!incidentCreated && notificationsSent && (
            <Button data-testid="create-incident-ticket" onClick={createIncident}>
              Criar Incident Ticket
            </Button>
          )}

          {incidentCreated && (
            <div data-testid="incident-created" className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-muted-foreground">Incident Number</p>
                <p data-testid="incident-number" className="text-xl font-bold text-green-900 dark:text-green-100">
                  {incidentNumber}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="incident-title">Título</Label>
                  <Input
                    data-testid="incident-title"
                    id="incident-title"
                    placeholder="Descrição do incidente"
                  />
                </div>

                <div>
                  <Label htmlFor="incident-description">Descrição</Label>
                  <Textarea
                    data-testid="incident-description"
                    id="incident-description"
                    placeholder="Detalhes do incidente"
                  />
                </div>

                <div>
                  <Label htmlFor="incident-priority">Prioridade</Label>
                  <select
                    data-testid="incident-priority"
                    id="incident-priority"
                    className="w-full p-2 border rounded"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
                </div>

                <Button data-testid="submit-incident">
                  Criar Incident
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <Badge
                    data-testid={`status-${status}`}
                  >
                    {status}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button
                    data-testid="update-incident-status"
                    variant="outline"
                    size="sm"
                  >
                    Atualizar Status
                  </Button>

                  <select data-testid="status-select" className="p-2 border rounded">
                    <option value="open">Aberto</option>
                    <option value="resolving">Em Resolução</option>
                    <option value="resolved">Resolvido</option>
                  </select>

                  <Button
                    data-testid="save-status"
                    size="sm"
                    onClick={resolveIncident}
                  >
                    Salvar
                  </Button>
                </div>

                {status === 'resolved' && (
                  <div>
                    <Label htmlFor="resolution-notes">Notas de Resolução</Label>
                    <Textarea
                      data-testid="resolution-notes"
                      id="resolution-notes"
                      placeholder="Como o problema foi resolvido"
                    />
                  </div>
                )}
              </div>

              {connectivityVerified && (
                <div data-testid="connectivity-verified" className="space-y-3">
                  <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-900 dark:text-green-100">
                      Conectividade verificada e restabelecida
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Clientes Online</p>
                      <p data-testid="online-clients-count" className="text-2xl font-bold">
                        {onlineClients}
                      </p>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Taxa de Recuperação</p>
                      <p data-testid="recovery-rate" className="text-2xl font-bold">
                        {recoveryRate}%
                      </p>
                    </div>
                  </div>

                  <div data-testid="resolution-notifications-sent">
                    <Button
                      data-testid="view-resolution-notifications"
                      variant="outline"
                      size="sm"
                    >
                      Ver Notificações de Restabelecimento
                    </Button>

                    <div data-testid="resolution-notification-entry" className="mt-2 p-3 bg-muted rounded text-sm">
                      Serviço restabelecido. Desculpas pelo transtorno causado.
                    </div>
                  </div>

                  {status !== 'closed' && (
                    <Button
                      data-testid="close-incident"
                      onClick={closeIncident}
                      variant="destructive"
                    >
                      Fechar Incident
                    </Button>
                  )}

                  {status === 'closed' && (
                    <div data-testid="incident-closed">
                      <Alert className="border-gray-200 bg-gray-50 dark:bg-gray-950">
                        <AlertDescription>
                          <span data-testid="incident-final-status">Fechado</span>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
              )}

              <div data-testid="manual-intervention-required" className="hidden">
                Intervenção manual necessária
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
