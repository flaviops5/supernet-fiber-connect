import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Search, RefreshCw, Database, FileText, Tag } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DocumentationEntry {
  id: string;
  endpoint: string;
  method: string;
  title: string;
  description?: string;
  parameters?: any[];
  request_body?: any;
  response_example?: any;
  content?: string;
  category: string;
  tags?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const IXCDocumentationManager = () => {
  const { toast } = useToast();
  const [documentation, setDocumentation] = useState<DocumentationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const loadDocumentation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ixc-documentation-sync', {
        body: { action: 'getDocumentation' }
      });

      if (error) throw error;

      if (data.success) {
        setDocumentation(data.data);
        toast({
          title: "Documentação carregada",
          description: `${data.data.length} endpoints encontrados.`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar documentação:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar documentação IXC.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncDocumentation = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ixc-documentation-sync', {
        body: { 
          action: 'syncDocumentation',
          url: 'https://documenter.getpostman.com/view/40255984/2sAYBbe9Ma'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Sincronização concluída",
          description: data.message,
        });
        await loadDocumentation(); // Recarregar após sincronizar
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Erro ao sincronizar documentação:', error);
      toast({
        title: "Erro",
        description: "Falha ao sincronizar documentação IXC.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadDocumentation();
  }, []);

  const filteredDocumentation = documentation.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(documentation.map(doc => doc.category)));

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-green-500';
      case 'POST': return 'bg-blue-500';
      case 'PUT': return 'bg-yellow-500';
      case 'DELETE': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Documentação IXC</h2>
          <p className="text-muted-foreground">
            Gerencie e consulte a documentação da API do IXC ERP
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadDocumentation}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Recarregar
          </Button>
          <Button
            onClick={syncDocumentation}
            disabled={syncing}
          >
            <Database className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Endpoints Disponíveis ({filteredDocumentation.length})
          </CardTitle>
          <CardDescription>
            Documentação completa dos endpoints da API IXC
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar endpoint, título ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">Todas as categorias</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <Tabs defaultValue="list" className="space-y-4">
            <TabsList>
              <TabsTrigger value="list">Lista</TabsTrigger>
              <TabsTrigger value="categories">Por Categoria</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              {filteredDocumentation.map((doc) => (
                <Card key={doc.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${getMethodColor(doc.method)} text-white`}>
                          {doc.method}
                        </Badge>
                        <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                          {doc.endpoint}
                        </code>
                        <Badge variant="outline">{doc.category}</Badge>
                      </div>
                      
                      <h3 className="font-semibold text-lg mb-1">{doc.title}</h3>
                      {doc.description && (
                        <p className="text-muted-foreground mb-3">{doc.description}</p>
                      )}

                      {doc.parameters && doc.parameters.length > 0 && (
                        <div className="mb-3">
                          <h4 className="font-medium mb-2">Parâmetros:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {doc.parameters.map((param, index) => (
                              <div key={index} className="text-sm">
                                <code className="bg-muted px-1 rounded">{param.name}</code>
                                <span className="text-muted-foreground ml-2">
                                  ({param.type}) - {param.description}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {doc.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {doc.request_body && Object.keys(doc.request_body).length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Exemplo de Request:</h4>
                      <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                        {JSON.stringify(doc.request_body, null, 2)}
                      </pre>
                    </div>
                  )}

                  {doc.response_example && Object.keys(doc.response_example).length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Exemplo de Response:</h4>
                      <pre className="bg-muted p-3 rounded text-sm overflow-auto max-h-40">
                        {JSON.stringify(doc.response_example, null, 2)}
                      </pre>
                    </div>
                  )}
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              {categories.map((category) => {
                const categoryDocs = filteredDocumentation.filter(doc => doc.category === category);
                return (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="capitalize">{category}</CardTitle>
                      <CardDescription>{categoryDocs.length} endpoints</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {categoryDocs.map((doc) => (
                          <div key={doc.id} className="flex items-center gap-2 p-2 border rounded">
                            <Badge className={`${getMethodColor(doc.method)} text-white text-xs`}>
                              {doc.method}
                            </Badge>
                            <code className="text-sm">{doc.endpoint}</code>
                            <span className="text-sm">{doc.title}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};