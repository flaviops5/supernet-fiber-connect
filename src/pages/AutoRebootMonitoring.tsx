import { AuthGuard } from "@/components/AuthGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RebootHistory } from "@/components/monitoring/RebootHistory";
import { RebootBlacklist } from "@/components/monitoring/RebootBlacklist";
import { RebootSettings } from "@/components/monitoring/RebootSettings";
import { RebootStats } from "@/components/monitoring/RebootStats";
import { RebootCandidates } from "@/components/monitoring/RebootCandidates";
import { ClientStats } from "@/components/monitoring/ClientStats";
import { Activity, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AutoRebootMonitoring = () => {
  const navigate = useNavigate();

  return (
    <AuthGuard requiredRoles={['admin', 'editor']}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Activity className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Auto Reboot - Monitoramento</h1>
              <p className="text-muted-foreground">
                Gerenciamento de reinicialização automática de equipamentos travados
              </p>
            </div>
          </div>

          {/* Estatísticas de Clientes IXC */}
          <ClientStats />

          {/* Estatísticas de Reboot */}
          <RebootStats />

          {/* Candidatos em Tempo Real */}
          <RebootCandidates />

          {/* Tabs */}
          <Tabs defaultValue="history" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="history">Histórico</TabsTrigger>
              <TabsTrigger value="blacklist">Blacklist</TabsTrigger>
              <TabsTrigger value="settings">Configurações</TabsTrigger>
            </TabsList>

            <TabsContent value="history">
              <RebootHistory />
            </TabsContent>

            <TabsContent value="blacklist">
              <RebootBlacklist />
            </TabsContent>

            <TabsContent value="settings">
              <RebootSettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  );
};

export default AutoRebootMonitoring;
