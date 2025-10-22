import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Plus } from "lucide-react";
import { useState } from "react";
import { FAQForm } from "@/components/FAQForm";

export default function FAQManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Perguntas Frequentes
            </CardTitle>
            <CardDescription>
              Gerencie as perguntas e respostas do site
            </CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar FAQ
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          Lista de FAQs será exibida aqui
        </div>
      </CardContent>
      
      <FAQForm 
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
