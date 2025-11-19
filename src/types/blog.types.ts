/**
 * Blog Types
 * Tipos para o sistema de blog dinâmico
 */

// Tipo baseado no schema existente da tabela blog_posts
export interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  featured: boolean;
  featured_image: string;
  published: boolean;
  read_time: number;
  created_at: string;
  updated_at: string;
}

export interface BlogPostDraft {
  tema: string;
  palavraChavePrincipal: string;
  publicoAlvo: string;
  tom: string;
  tamanho: string;
}

export interface GeneratedBlogPost {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  content: string;
  author: string;
  datePublished: string;
}
