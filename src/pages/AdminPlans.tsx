import { IXCPlansManager } from "@/components/admin/IXCPlansManager";

export default function AdminPlans() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Planos IXC</h1>
          <p className="text-muted-foreground">
            Visualize e sincronize planos do sistema IXC com o banco de dados local.
          </p>
        </div>
        
        <IXCPlansManager />
      </div>
    </div>
  );
}
