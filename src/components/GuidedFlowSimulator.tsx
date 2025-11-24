import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function GuidedFlowSimulator() {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Simulador de Fluxo Desabilitado</h3>
        <p className="text-sm text-muted-foreground">
          Esta funcionalidade requer as tabelas agent_flow_subjects, agent_flow_steps e agent_flow_scenario_approvals no banco de dados.
        </p>
      </CardContent>
    </Card>
  );
}
