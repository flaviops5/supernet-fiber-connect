import { AuthGuard } from "@/components/AuthGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaintenanceTasks } from "@/components/maintenance/MaintenanceTasks";
import { MaintenanceLog } from "@/components/maintenance/MaintenanceLog";
import { MaintenanceSettings } from "@/components/maintenance/MaintenanceSettings";
import { Settings, ListChecks, ScrollText } from "lucide-react";

const NetworkMaintenance = () => {
  return (
    <AuthGuard requiredRoles={['admin']}>
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Sistema de Manutenção Inteligente</h1>
            <p className="text-muted-foreground">
              Gerenciamento automático de tarefas de manutenção com prioridades
            </p>
          </div>

          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                Tarefas
              </TabsTrigger>
              <TabsTrigger value="log" className="flex items-center gap-2">
                <ScrollText className="h-4 w-4" />
                Logs
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="mt-6">
              <MaintenanceTasks />
            </TabsContent>

            <TabsContent value="log" className="mt-6">
              <MaintenanceLog />
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <MaintenanceSettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  );
};

export default NetworkMaintenance;
