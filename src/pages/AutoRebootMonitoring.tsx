import { AuthGuard } from "@/components/AuthGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RebootHistory } from "@/components/monitoring/RebootHistory";
import { RebootBlacklist } from "@/components/monitoring/RebootBlacklist";
import { RebootSettings } from "@/components/monitoring/RebootSettings";
import { RebootStats } from "@/components/monitoring/RebootStats";
import { RebootCandidates } from "@/components/monitoring/RebootCandidates";
import { Activity } from "lucide-react";

const AutoRebootMonitoring = () => {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Activity className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Auto Reboot - Monitoramento</h1>
              <p className="text-muted-foreground">
                Gerenciamento de reinicialização automática de equipamentos travados
              </p>
            </div>
          </div>

          {/* Estatísticas */}
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
