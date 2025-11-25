import { useNavigate } from 'react-router-dom';
import { AuthGuard } from '@/components/AuthGuard';
import DepartmentMetrics from '@/components/atendimento/DepartmentMetrics';

export default function MetricasDepartamentos() {
  const navigate = useNavigate();

  return (
    <AuthGuard requiredRoles={['admin', 'editor']}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/atendimento')}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                ← Voltar ao Atendimento
              </button>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Métricas dos Departamentos
              </h1>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="container mx-auto p-6">
          <DepartmentMetrics />
        </div>
      </div>
    </AuthGuard>
  );
}
