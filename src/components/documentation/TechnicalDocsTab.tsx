import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Code2, FileText, GitBranch, Plus, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export const TechnicalDocsTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: docs, isLoading, refetch } = useQuery({
    queryKey: ["unified-docs", searchTerm, typeFilter, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("unified_documentation")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (typeFilter !== "all") {
        query = query.eq("doc_type", typeFilter);
      }

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      if (searchTerm) {
        query = query.or(
          `title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const docTypes = ["all", "edge_function", "markdown", "diagram", "config", "guide"];
  const categories = ["all", "backend", "frontend", "infrastructure", "guides"];

  const getDocTypeIcon = (type: string) => {
    switch (type) {
      case "edge_function":
        return <Code2 className="h-4 w-4" />;
      case "markdown":
        return <FileText className="h-4 w-4" />;
      case "diagram":
        return <GitBranch className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getDocTypeColor = (type: string) => {
    switch (type) {
      case "edge_function":
        return "bg-blue-500/10 text-blue-500";
      case "markdown":
        return "bg-green-500/10 text-green-500";
      case "diagram":
        return "bg-purple-500/10 text-purple-500";
      case "config":
        return "bg-yellow-500/10 text-yellow-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Descrição */}
      <div className="bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-lg p-6 border border-blue-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Code2 className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Documentação Técnica</h2>
              <p className="text-sm text-muted-foreground">
                Edge functions, arquivos .md, diagramas e configurações
              </p>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Doc
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Adicionar Documentação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input placeholder="Nome do documento..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="edge_function">Edge Function</SelectItem>
                        <SelectItem value="markdown">Markdown</SelectItem>
                        <SelectItem value="diagram">Diagrama</SelectItem>
                        <SelectItem value="config">Configuração</SelectItem>
                        <SelectItem value="guide">Guia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="backend">Backend</SelectItem>
                        <SelectItem value="frontend">Frontend</SelectItem>
                        <SelectItem value="infrastructure">Infraestrutura</SelectItem>
                        <SelectItem value="guides">Guias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Conteúdo</Label>
                  <Textarea 
                    placeholder="Cole o conteúdo aqui..." 
                    className="min-h-[300px] font-mono text-sm"
                  />
                </div>
                <Button className="w-full">Salvar Documentação</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">Full-Text Search</Badge>
          <Badge variant="outline">Syntax Highlighting</Badge>
          <Badge variant="outline">Versionamento</Badge>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentação técnica..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {docTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type === "all" ? "Todos os tipos" : type.replace("_", " ").toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat === "all" ? "Todas" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Documentos */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : docs?.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-muted-foreground space-y-2">
              <p>Nenhuma documentação técnica encontrada</p>
              <p className="text-sm">Comece adicionando edge functions, arquivos .md ou diagramas</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {docs?.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${getDocTypeColor(doc.doc_type)}`}>
                        {getDocTypeIcon(doc.doc_type)}
                      </div>
                      <CardTitle className="text-lg">{doc.title}</CardTitle>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {doc.content?.substring(0, 200)}...
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{doc.category}</Badge>
                    {doc.language && (
                      <Badge variant="outline">{doc.language}</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {doc.file_path && (
                    <div className="flex items-center gap-1 font-mono text-xs">
                      <FileText className="h-3 w-3" />
                      {doc.file_path}
                    </div>
                  )}
                  <div>v{doc.version}</div>
                  <div>{format(new Date(doc.created_at), "dd/MM/yyyy HH:mm")}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};