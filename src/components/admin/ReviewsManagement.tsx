import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2 } from "lucide-react";
import { InstructionsCard } from "@/components/InstructionsCard";
import { GoogleReviews } from "@/components/GoogleReviews";
import { useTestimonials } from "@/contexts/TestimonialsContext";

export default function ReviewsManagement() {
  const { testimonials, removeTestimonial } = useTestimonials();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciar Avaliações</h1>
        <p className="text-muted-foreground">Gerencie depoimentos e avaliações do Google Reviews</p>
      </div>

      <Tabs defaultValue="instructions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="instructions">Como Usar</TabsTrigger>
          <TabsTrigger value="google-reviews">Google Reviews</TabsTrigger>
          <TabsTrigger value="testimonials">Depoimentos Atuais</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="instructions" className="space-y-4">
          <InstructionsCard />
        </TabsContent>

        <TabsContent value="google-reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Importar Avaliações do Google</CardTitle>
              <CardDescription>
                Importe automaticamente as avaliações do seu negócio no Google Reviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GoogleReviews />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testimonials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Depoimentos Gerenciados</CardTitle>
              <CardDescription>
                Gerencie todos os depoimentos exibidos no site
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testimonials.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Nenhum depoimento encontrado</p>
                  <p className="text-sm text-muted-foreground">
                    Use o Google Reviews para importar avaliações automaticamente
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {testimonials.map((testimonial, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">
                            {testimonial.name}
                          </h3>
                          <div className="flex">
                            {Array.from({ length: testimonial.rating }).map((_, i) => (
                              <span key={i} className="text-yellow-400">⭐</span>
                            ))}
                          </div>
                        </div>
                        <p className="text-sm mb-2">
                          {testimonial.text}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {testimonial.location}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeTestimonial(index)}
                        className="ml-4 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Sistema</CardTitle>
              <CardDescription>
                Configure as integrações e preferências do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Google Reviews</h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">
                  Para usar a funcionalidade do Google Reviews, você precisa configurar a integração 
                  com a API do Google Places.
                </p>
                <ul className="text-blue-700 dark:text-blue-300 text-sm space-y-1">
                  <li>• Obtenha uma chave da API do Google Places</li>
                  <li>• Configure as credenciais no sistema</li>
                  <li>• Teste a conexão com seu negócio</li>
                </ul>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Próximas Funcionalidades</h3>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• Moderação automática de comentários</li>
                  <li>• Notificações de novas avaliações</li>
                  <li>• Relatórios de satisfação</li>
                  <li>• Integração com redes sociais</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
