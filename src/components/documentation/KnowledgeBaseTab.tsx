import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Database, Tag, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export const KnowledgeBaseTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: knowledgeItems, isLoading } = useQuery({
    queryKey: ["knowledge-base", searchTerm, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("knowledge_base")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      if (searchTerm) {
        query = query.or(
          `title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const categories = ["all", "suporte", "vendas", "tecnico", "automacao", "telemedicina"];

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Descrição */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 border border-primary/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Base de Conhecimento Vetorizada</h2>
            <p className="text-sm text-muted-foreground">
              Documentos indexados com embeddings para busca semântica por agentes IA
            </p>
          </div>
        </div>
        <div className="flex gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">RAG</Badge>
          <Badge variant="outline">Busca Semântica</Badge>
          <Badge variant="outline">OpenAI Embeddings</Badge>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, conteúdo ou tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
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
      ) : knowledgeItems?.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Nenhum documento encontrado
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {knowledgeItems?.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {item.content?.substring(0, 200)}...
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{item.category}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    {item.tags?.length || 0} tags
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(item.created_at), "dd/MM/yyyy")}
                  </div>
                  {item.metadata && (
                    <Badge variant="outline" className="text-xs">
                      Migrado
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};