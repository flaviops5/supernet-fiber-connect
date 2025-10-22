import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Plus } from "lucide-react";
import { useState } from "react";
import { PlanForm } from "@/components/PlanForm";

export default function PlanManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Gerenciamento de Planos
            </CardTitle>
            <CardDescription>
              Configure planos de internet e serviços
            </CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Plano
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          Lista de planos será exibida aqui
        </div>
      </CardContent>
      
      <PlanForm 
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={() => {
          setIsDialogOpen(false);
          setRefresh(prev => prev + 1);
        }}
      />
    </Card>
  );
}
