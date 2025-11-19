import React, { useState } from "react";
import { SEO } from "@/components/seo/SEO";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface BatchConfig {
  quantidade: number;
  temaGeral: string;
  publicoAlvo: string;
  tom: string;
}

interface GeneratedPost {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  author: string;
  featured: boolean;
  featured_image: string;
  read_time: number;
}

export default function BlogBatchPage(): JSX.Element {
  const { toast } = useToast();
  const [config, setConfig] = useState<BatchConfig>({
    quantidade: 5,
    temaGeral: "Internet fibra óptica e telecomunicações",
    publicoAlvo: "Consumidores residenciais e pequenas empresas interessadas em internet de qualidade",
    tom: "profissional"
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);

  async function handleGenerate(): Promise<void> {
    if (!config.temaGeral || !config.publicoAlvo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o tema geral e público alvo",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedPosts([]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-batch', {
        body: {
          quantidade: config.quantidade,
          temaGeral: config.temaGeral,
          publicoAlvo: config.publicoAlvo,
          tom: config.tom
        }
      });

      if (error) throw error;

      if (data?.posts) {
        setGeneratedPosts(data.posts);
        toast({
          title: "Posts gerados!",
          description: `${data.posts.length} posts foram gerados com sucesso.`
        });
      }
    } catch (error) {
      console.error('Error generating batch:', error);
      toast({
        title: "Erro ao gerar posts",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSavePosts(): Promise<void> {
    if (generatedPosts.length === 0) {
      toast({
        title: "Nenhum post para salvar",
        description: "Gere os posts primeiro",
        variant: "destructive"
      });
      return;
    }

    try {
      const postsToInsert = generatedPosts.map(post => ({
        slug: post.slug,
        title: post.title,
        category: post.category || "Tecnologia",
        excerpt: post.excerpt,
        content: post.content,
        author: post.author,
        featured: post.featured || false,
        featured_image: post.featured_image || "",
        published: true,
        read_time: post.read_time || 5
      }));

      const { error } = await supabase
        .from('blog_posts')
        .insert(postsToInsert);

      if (error) throw error;

      toast({
        title: "Posts salvos!",
        description: `${postsToInsert.length} posts foram salvos no banco de dados.`
      });

      setGeneratedPosts([]);
    } catch (error) {
      console.error('Error saving posts:', error);
      toast({
        title: "Erro ao salvar posts",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  }

  return (
    <>
      <SEO
        title="Geração em Lote - Blog"
        description="Admin - geração em lote de posts de blog com IA"
        canonical="/admin/blog/batch"
        ogImage="/images/og-blogue.jpg"
        noindex
      />
      <main className="container mx-auto py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Geração em Lote de Posts (IA)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade de posts</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min={1}
                  max={10}
                  value={config.quantidade}
                  onChange={(e) => setConfig({ ...config, quantidade: parseInt(e.target.value) || 1 })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tom">Tom</Label>
                <Input
                  id="tom"
                  placeholder="profissional, didático, descontraído"
                  value={config.tom}
                  onChange={(e) => setConfig({ ...config, tom: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tema">Tema Geral</Label>
              <Input
                id="tema"
                placeholder="Ex: Internet fibra óptica e telecomunicações"
                value={config.temaGeral}
                onChange={(e) => setConfig({ ...config, temaGeral: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publico">Público Alvo</Label>
              <Textarea
                id="publico"
                placeholder="Ex: Consumidores residenciais e pequenas empresas"
                value={config.publicoAlvo}
                onChange={(e) => setConfig({ ...config, publicoAlvo: e.target.value })}
                rows={3}
              />
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando posts...
                </>
              ) : (
                `Gerar ${config.quantidade} Posts com IA`
              )}
            </Button>
          </CardContent>
        </Card>

        {generatedPosts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Posts Gerados ({generatedPosts.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {generatedPosts.map((post, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-2">
                    <h3 className="font-semibold">{post.title}</h3>
                    <p className="text-sm text-muted-foreground">{post.slug}</p>
                    <p className="text-sm">{post.excerpt}</p>
                    <div className="text-xs text-muted-foreground">
                      Categoria: {post.category} • {post.read_time} min de leitura
                    </div>
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleSavePosts}
                className="w-full"
                variant="default"
              >
                Salvar Todos os Posts no Banco
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
