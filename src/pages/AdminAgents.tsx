import { useNavigate } from 'react-router-dom';
import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import AgentDepartmentManagement from '@/components/admin/AgentDepartmentManagement';

export default function AdminAgents() {
  const navigate = useNavigate();

  return (
    <AuthGuard requiredRoles={['admin']}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center gap-4 px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Admin
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Gerenciar Agentes e Departamentos
            </h1>
          </div>
        </header>

        <main className="container mx-auto p-6 max-w-6xl">
          <AgentDepartmentManagement />
        </main>
      </div>
    </AuthGuard>
  );
}