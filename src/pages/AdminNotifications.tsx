import { PageHeader } from "@/components/admin";
import NotificationTargetsManager from "@/components/admin/NotificationTargetsManager";

export default function AdminNotifications() {
  console.log("AdminNotifications rendering...");
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Gerenciador de Notificações"
        description="Configure os números que receberão notificações do sistema por WhatsApp"
      />
      <NotificationTargetsManager />
    </div>
  );
}
