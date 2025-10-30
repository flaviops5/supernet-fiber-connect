import { useState } from 'react';
import { Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const plans = [
  { id: '300mega', name: '300 Mega', speed: '300 Mbps', price: 'R$ 99,90' },
  { id: '500mega', name: '500 Mega', speed: '500 Mbps', price: 'R$ 129,90' },
  { id: '1giga', name: '1 Giga', speed: '1 Gbps', price: 'R$ 159,90' }
];

export const PlansList = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div data-testid="plans-list" className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            data-testid="plan-item"
            className={`cursor-pointer transition-all ${
              selectedPlan === plan.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name}
                {selectedPlan === plan.id && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Badge variant="secondary">{plan.speed}</Badge>
              <p className="text-2xl font-bold">{plan.price}</p>
              <p className="text-xs text-muted-foreground">por mês</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedPlan && (
        <div data-testid="selected-plan" className="p-4 bg-primary/10 rounded-lg">
          <p className="font-medium">Plano selecionado: {plans.find(p => p.id === selectedPlan)?.name}</p>
        </div>
      )}

      {selectedPlan && (
        <Button data-testid="continue-to-signup" className="w-full">
          Continuar para Cadastro
        </Button>
      )}
    </div>
  );
};
