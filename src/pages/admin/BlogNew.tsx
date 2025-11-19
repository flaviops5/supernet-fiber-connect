import React, { useState } from "react";
import { SEO } from "@/components/seo/SEO";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { BlogPostDraft } from "@/types/blog.types";

interface DraftState extends BlogPostDraft {
  generatedPrompt: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  featured: boolean;
  featured_image: string;
  read_time: number;
}

export default function NewBlogPostPage(): JSX.Element {
  const [state, setState] = useState<DraftState>({
    tema: "",
    palavraChavePrincipal: "",
    publicoAlvo: "",
    tom: "profissional",
    tamanho: "médio",
    generatedPrompt: "",
    title: "",
    slug: "",
    category: "Tecnologia",
    excerpt: "",
    content: "",
    featured: false,
    featured_image: "",
    read_time: 5
  });

  function buildPrompt(): void {
    const prompt = `
Você é o assistente oficial de conteúdo da Supernet Fibra. Gere um post de blog no formato abaixo, otimizando para SEO e AEO.

TEMA: ${state.tema}
PALAVRA-CHAVE PRINCIPAL: ${state.palavraChavePrincipal}
PÚBLICO ALVO: ${state.publicoAlvo}
TOM: ${state.tom}
TAMANHO: ${state.tamanho}

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

    setState((prev) => ({
      ...prev,
      generatedPrompt: prompt
    }));
  }

  return (
    <>
      <SEO
        title="Novo Post de Blog"
        description="Admin - criação de novo post de blog"
        canonical="/admin/blog/new"
        ogImage="/images/og-blogue.jpg"
        noindex
      />
      <main className="container mx-auto py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Novo Post de Blog (IA Assistida)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tema">Tema do post</Label>
                <Input
                  id="tema"
                  placeholder="Ex: Fibra óptica vs internet a cabo"
                  value={state.tema}
                  onChange={(e) => setState({ ...state, tema: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="palavra-chave">Palavra-chave principal</Label>
                <Input
                  id="palavra-chave"
                  placeholder="Ex: fibra óptica"
                  value={state.palavraChavePrincipal}
                  onChange={(e) =>
                    setState({ ...state, palavraChavePrincipal: e.target.value })
                  }
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="publico">Público alvo</Label>
                <Input
                  id="publico"
                  placeholder="Ex: Empresas, residências, gamers"
                  value={state.publicoAlvo}
                  onChange={(e) =>
                    setState({ ...state, publicoAlvo: e.target.value })
                  }
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tom">Tom</Label>
                <Input
                  id="tom"
                  placeholder="profissional, técnico, leve..."
                  value={state.tom}
                  onChange={(e) => setState({ ...state, tom: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tamanho">Tamanho</Label>
                <Input
                  id="tamanho"
                  placeholder="curto, médio, longo"
                  value={state.tamanho}
                  onChange={(e) =>
                    setState({ ...state, tamanho: e.target.value })
                  }
                />
              </div>
            </div>

            <Button type="button" onClick={buildPrompt} className="w-full">
              Gerar Prompt para IA
            </Button>

            {state.generatedPrompt && (
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt gerado (copie e use na IA)</Label>
                <Textarea
                  id="prompt"
                  className="h-48 font-mono text-xs"
                  readOnly
                  value={state.generatedPrompt}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conteúdo Gerado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cole aqui o JSON retornado pela IA e depois clique em "Salvar Post"
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                placeholder="Título do post"
                value={state.title}
                onChange={(e) => setState({ ...state, title: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="slug-do-post"
                value={state.slug}
                onChange={(e) => setState({ ...state, slug: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                placeholder="Ex: Tecnologia, Internet, Fibra Óptica"
                value={state.category}
                onChange={(e) => setState({ ...state, category: e.target.value })}
              />
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="read_time">Tempo de leitura (minutos)</Label>
                <Input
                  id="read_time"
                  type="number"
                  placeholder="5"
                  value={state.read_time}
                  onChange={(e) => setState({ ...state, read_time: parseInt(e.target.value) || 5 })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="featured_image">Imagem destacada (URL)</Label>
                <Input
                  id="featured_image"
                  placeholder="https://exemplo.com/imagem.jpg"
                  value={state.featured_image}
                  onChange={(e) => setState({ ...state, featured_image: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="excerpt">Resumo</Label>
              <Textarea
                id="excerpt"
                placeholder="Resumo do post"
                value={state.excerpt}
                onChange={(e) => setState({ ...state, excerpt: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo (Markdown)</Label>
              <Textarea
                id="content"
                className="h-96 font-mono text-sm"
                placeholder="Conteúdo completo em Markdown"
                value={state.content}
                onChange={(e) => setState({ ...state, content: e.target.value })}
              />
            </div>

            <Button 
              type="button" 
              className="w-full"
              disabled
            >
              Salvar Post (em breve)
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
