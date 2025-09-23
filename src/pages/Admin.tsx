import { GoogleReviews } from '@/components/GoogleReviews';
import { InstructionsCard } from '@/components/InstructionsCard';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Users, Settings, BookOpen } from 'lucide-react';

const Admin = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Painel de Administração</h1>
          <p className="text-muted-foreground">
            Gerencie depoimentos e avaliações do seu site
          </p>
        </div>

        <Tabs defaultValue="instructions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="instructions" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Como Usar
            </TabsTrigger>
            <TabsTrigger value="google-reviews" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Google Reviews
            </TabsTrigger>
            <TabsTrigger value="testimonials" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Depoimentos Atuais
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="instructions">
            <InstructionsCard />
          </TabsContent>

          <TabsContent value="google-reviews">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Importar do Google Reviews</h2>
              <p className="text-muted-foreground mb-6">
                Conecte sua conta do Google My Business para importar avaliações automaticamente.
                As avaliações serão sincronizadas e você poderá escolher quais usar no site.
              </p>
              <GoogleReviews />
            </Card>
          </TabsContent>

          <TabsContent value="testimonials">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Depoimentos Atuais</h2>
              <p className="text-muted-foreground mb-4">
                Aqui estão os depoimentos que estão sendo exibidos atualmente no site:
              </p>
              
              <div className="space-y-4">
                <div className="grid gap-4">
                  <Card className="p-4 bg-muted/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">Lucca Cabrera Trazzi</h3>
                        <p className="text-sm text-muted-foreground">Brasília, DF</p>
                        <div className="flex gap-1 my-2">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <p className="text-sm">
                          "Desfruto de uma excelente conexão à internet..."
                        </p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Ativo
                      </span>
                    </div>
                  </Card>
                  
                  <Card className="p-4 bg-muted/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">Thaís Michele</h3>
                        <p className="text-sm text-muted-foreground">Brasília, DF</p>
                        <div className="flex gap-1 my-2">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <p className="text-sm">
                          "Empresa com qualidade, responde rápido..."
                        </p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Ativo
                      </span>
                    </div>
                  </Card>
                </div>
                
                <p className="text-sm text-muted-foreground mt-4">
                  💡 <strong>Dica:</strong> Use a aba "Google Reviews" para importar novas avaliações
                  e copie o código gerado para adicionar aos depoimentos.
                </p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Configurações</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Como usar o Google Reviews</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>Passo 1:</strong> Obtenha uma Google Places API Key</p>
                    <p><strong>Passo 2:</strong> Encontre o Place ID da sua empresa</p>
                    <p><strong>Passo 3:</strong> Configure na aba "Google Reviews"</p>
                    <p><strong>Passo 4:</strong> Clique em "Copiar Código" nas avaliações que desejar</p>
                    <p><strong>Passo 5:</strong> Cole o código no arquivo Testimonials.tsx</p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Próximas Funcionalidades</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Sincronização automática das avaliações</li>
                    <li>• Interface para ativar/desativar depoimentos</li>
                    <li>• Filtros por nota e data</li>
                    <li>• Integração com outras plataformas (Facebook, etc.)</li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;