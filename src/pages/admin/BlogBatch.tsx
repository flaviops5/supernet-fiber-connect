import React, { useState } from "react";
import { SEO } from "@/components/seo/SEO";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface BatchConfig {
  quantidade: number;
  temaGeral: string;
  publicoAlvo: string;
  tom: string;
}

interface SinglePostConfig {
  tema: string;
  palavraChavePrincipal: string;
  publicoAlvo: string;
  tom: string;
  tamanho: string;
  generatedPrompt: string;
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
  const [singleConfig, setSingleConfig] = useState<SinglePostConfig>({
    tema: "",
    palavraChavePrincipal: "",
    publicoAlvo: "",
    tom: "profissional",
    tamanho: "médio",
    generatedPrompt: ""
  });
  const [singlePost, setSinglePost] = useState<GeneratedPost>({
    slug: "",
    title: "",
    category: "Tecnologia",
    excerpt: "",
    content: "",
    author: "Equipe Supernet Fibra",
    featured: false,
    featured_image: "",
    read_time: 5
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
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

    // Create abort controller with 3-minute timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);

    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-batch', {
        body: {
          quantidade: config.quantidade,
          temaGeral: config.temaGeral,
          publicoAlvo: config.publicoAlvo,
          tom: config.tom
        }
      });

      clearTimeout(timeoutId);

      if (error) throw error;

      if (data?.posts) {
        setGeneratedPosts(data.posts);
        toast({
          title: "Posts gerados!",
          description: `${data.posts.length} posts foram gerados com sucesso${data.posts.filter((p: any) => p.featured_image).length > 0 ? ` (${data.posts.filter((p: any) => p.featured_image).length} com imagens)` : ''}.`
        });
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error generating batch:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message.includes('fetch') || error.message.includes('network')
          ? "Timeout: A geração está demorando muito. Tente com menos posts ou aguarde alguns minutos."
          : error.message
        : "Erro desconhecido";
      
      toast({
        title: "Erro ao gerar posts",
        description: errorMessage,
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

  function buildSinglePrompt(): void {
    const prompt = `
Você é o assistente oficial de conteúdo da Supernet Fibra. Gere um post de blog no formato abaixo, otimizando para SEO e AEO.

TEMA: ${singleConfig.tema}
PALAVRA-CHAVE PRINCIPAL: ${singleConfig.palavraChavePrincipal}
PÚBLICO ALVO: ${singleConfig.publicoAlvo}
TOM: ${singleConfig.tom}
TAMANHO: ${singleConfig.tamanho}

O post deve:
- Ter título forte
- Ter introdução curta
- Ter seções com H2 e H3
- Incluir perguntas frequentes (FAQ)
- Incluir resumos curtos "Resumo para IA" em algumas seções
- Ser factual, direto e útil

Retorne EXCLUSIVAMENTE um JSON no formato:

{
  "slug": "...",
  "title": "...",
  "category": "...",
  "excerpt": "...",
  "content": "...",
  "author": "Equipe Supernet Fibra",
  "featured": false,
  "featured_image": "",
  "read_time": 5
}
`.trim();

    setSingleConfig((prev) => ({
      ...prev,
      generatedPrompt: prompt
    }));
  }

  async function handleSaveSinglePost(): Promise<void> {
    if (!singlePost.title || !singlePost.slug || !singlePost.content) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha título, slug e conteúdo",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('blog_posts')
        .insert({
          slug: singlePost.slug,
          title: singlePost.title,
          category: singlePost.category,
          excerpt: singlePost.excerpt,
          content: singlePost.content,
          author: singlePost.author,
          featured: singlePost.featured,
          featured_image: singlePost.featured_image,
          published: true,
          read_time: singlePost.read_time
        });

      if (error) throw error;

      toast({
        title: "Post salvo!",
        description: "O post foi salvo no banco de dados."
      });

      // Reset form
      setSinglePost({
        slug: "",
        title: "",
        category: "Tecnologia",
        excerpt: "",
        content: "",
        author: "Equipe Supernet Fibra",
        featured: false,
        featured_image: "",
        read_time: 5
      });
      setSingleConfig({
        tema: "",
        palavraChavePrincipal: "",
        publicoAlvo: "",
        tom: "profissional",
        tamanho: "médio",
        generatedPrompt: ""
      });
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        title: "Erro ao salvar post",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  }

  async function handleGenerateFeaturedImage(): Promise<void> {
    if (!singlePost.title) {
      toast({
        title: "Título necessário",
        description: "Digite um título para gerar a imagem",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingImage(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-featured-image', {
        body: {
          title: singlePost.title,
          category: singlePost.category
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setSinglePost({ ...singlePost, featured_image: data.imageUrl });
        toast({
          title: "Imagem gerada!",
          description: "A imagem foi gerada com sucesso."
        });
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: "Erro ao gerar imagem",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingImage(false);
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
        <Tabs defaultValue="batch" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="batch">Geração em Lote</TabsTrigger>
            <TabsTrigger value="single">Post Individual</TabsTrigger>
          </TabsList>

          <TabsContent value="batch" className="space-y-6">
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

            <div className="space-y-2">
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando posts e imagens...
                  </>
                ) : (
                  `Gerar ${config.quantidade} Posts com IA + Imagens`
                )}
              </Button>
              {isGenerating && (
                <p className="text-xs text-center text-muted-foreground">
                  Isso pode levar alguns minutos. Gerando textos e imagens...
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {generatedPosts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Posts Gerados ({generatedPosts.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {generatedPosts.map((post, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex gap-4">
                      {post.featured_image && (
                        <div className="flex-shrink-0 w-32 h-20 bg-muted rounded-md overflow-hidden">
                          <img
                            src={post.featured_image}
                            alt={post.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold">{post.title}</h3>
                        <p className="text-sm text-muted-foreground">{post.slug}</p>
                        <p className="text-sm">{post.excerpt}</p>
                        <div className="text-xs text-muted-foreground">
                          Categoria: {post.category} • {post.read_time} min de leitura
                          {post.featured_image && " • Com imagem ✓"}
                        </div>
                      </div>
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
          </TabsContent>

          <TabsContent value="single" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Criar Post Individual (IA Assistida)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="single-tema">Tema do post</Label>
                    <Input
                      id="single-tema"
                      placeholder="Ex: Fibra óptica vs internet a cabo"
                      value={singleConfig.tema}
                      onChange={(e) => setSingleConfig({ ...singleConfig, tema: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="single-palavra-chave">Palavra-chave principal</Label>
                    <Input
                      id="single-palavra-chave"
                      placeholder="Ex: fibra óptica"
                      value={singleConfig.palavraChavePrincipal}
                      onChange={(e) => setSingleConfig({ ...singleConfig, palavraChavePrincipal: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="single-publico">Público alvo</Label>
                    <Input
                      id="single-publico"
                      placeholder="Ex: Empresas, residências, gamers"
                      value={singleConfig.publicoAlvo}
                      onChange={(e) => setSingleConfig({ ...singleConfig, publicoAlvo: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="single-tom">Tom</Label>
                    <Input
                      id="single-tom"
                      placeholder="profissional, técnico, leve..."
                      value={singleConfig.tom}
                      onChange={(e) => setSingleConfig({ ...singleConfig, tom: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="single-tamanho">Tamanho</Label>
                    <Input
                      id="single-tamanho"
                      placeholder="curto, médio, longo"
                      value={singleConfig.tamanho}
                      onChange={(e) => setSingleConfig({ ...singleConfig, tamanho: e.target.value })}
                    />
                  </div>
                </div>

                <Button type="button" onClick={buildSinglePrompt} className="w-full">
                  Gerar Prompt para IA
                </Button>

                {singleConfig.generatedPrompt && (
                  <div className="space-y-2">
                    <Label htmlFor="single-prompt">Prompt gerado (copie e use na IA)</Label>
                    <Textarea
                      id="single-prompt"
                      className="h-48 font-mono text-xs"
                      readOnly
                      value={singleConfig.generatedPrompt}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conteúdo do Post</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Cole aqui o JSON retornado pela IA e edite os campos conforme necessário
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="single-title">Título</Label>
                  <Input
                    id="single-title"
                    placeholder="Título do post"
                    value={singlePost.title}
                    onChange={(e) => setSinglePost({ ...singlePost, title: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="single-slug">Slug</Label>
                  <Input
                    id="single-slug"
                    placeholder="slug-do-post"
                    value={singlePost.slug}
                    onChange={(e) => setSinglePost({ ...singlePost, slug: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="single-category">Categoria</Label>
                  <Input
                    id="single-category"
                    placeholder="Ex: Tecnologia, Internet, Fibra Óptica"
                    value={singlePost.category}
                    onChange={(e) => setSinglePost({ ...singlePost, category: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="single-excerpt">Resumo</Label>
                  <Textarea
                    id="single-excerpt"
                    placeholder="Resumo do post"
                    value={singlePost.excerpt}
                    onChange={(e) => setSinglePost({ ...singlePost, excerpt: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="single-content">Conteúdo (Markdown)</Label>
                  <Textarea
                    id="single-content"
                    className="h-96 font-mono text-sm"
                    placeholder="Conteúdo completo em Markdown"
                    value={singlePost.content}
                    onChange={(e) => setSinglePost({ ...singlePost, content: e.target.value })}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="single-read-time">Tempo de leitura (minutos)</Label>
                    <Input
                      id="single-read-time"
                      type="number"
                      placeholder="5"
                      value={singlePost.read_time}
                      onChange={(e) => setSinglePost({ ...singlePost, read_time: parseInt(e.target.value) || 5 })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="single-featured-image">Imagem destacada</Label>
                    <div className="flex gap-2">
                      <Input
                        id="single-featured-image"
                        placeholder="URL ou base64"
                        value={singlePost.featured_image}
                        onChange={(e) => setSinglePost({ ...singlePost, featured_image: e.target.value })}
                      />
                      <Button
                        type="button"
                        onClick={handleGenerateFeaturedImage}
                        disabled={isGeneratingImage || !singlePost.title}
                        variant="outline"
                      >
                        {isGeneratingImage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Gerar IA"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {singlePost.featured_image && (
                  <div className="space-y-2">
                    <Label>Preview da Imagem</Label>
                    <div className="border rounded-lg p-4 bg-muted">
                      <img
                        src={singlePost.featured_image}
                        alt="Featured preview"
                        className="max-w-full h-auto rounded-md"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = '<p class="text-sm text-muted-foreground">Erro ao carregar imagem</p>';
                        }}
                      />
                    </div>
                  </div>
                )}

                <Button 
                  type="button" 
                  onClick={handleSaveSinglePost}
                  className="w-full"
                >
                  Salvar Post
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
