import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  Package, 
  MessageSquare, 
  Brain, 
  Zap,
  ArrowRight 
} from "lucide-react";

export default function Admin() {
  const navigate = useNavigate();

  const adminSections = [
    {
      title: "Gerenciamento de Planos",
      description: "Visualize e sincronize planos do sistema IXC",
      icon: Package,
      path: "/admin/plans",
      color: "text-blue-500"
    },
    {
      title: "Prompts do Sistema",
      description: "Configure e gerencie prompts de IA",
      icon: MessageSquare,
      path: "/admin/prompts",
      color: "text-purple-500"
    },
    {
      title: "IA Corporativa",
      description: "Sistema de conhecimento e RAG",
      icon: Brain,
      path: "/admin/ia-corporativa",
      color: "text-green-500"
    },
    {
      title: "Teste de Estresse IXC",
      description: "Monitore e teste integrações IXC",
      icon: Zap,
      path: "/admin/ixc-stress-test",
      color: "text-orange-500"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">
              Painel de Administração
            </h1>
            <p className="text-muted-foreground text-lg">
              Gerencie o sistema e suas configurações
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card 
                key={section.path}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => navigate(section.path)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center ${section.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                          {section.title}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {section.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 p-6 bg-muted rounded-lg">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Informações do Sistema</h2>
            <p className="text-sm text-muted-foreground">
              Versão: 2.0.0 | Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
