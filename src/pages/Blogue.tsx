import { SEO } from "@/components/seo/SEO";
import { getAllPosts } from "@/utils/getPost";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function BlogIndexPage(): JSX.Element {
  const posts = getAllPosts();

  return (
    <>
      <SEO
        title="Blog Supernet – Dicas de Internet, Tecnologia e Serviços"
        description="Artigos da Supernet Fibra sobre internet, tecnologia, telemedicina, automação e muito mais."
        canonical="/blogue"
        ogImage="/images/og-blogue.jpg"
      />
      <main className="container mx-auto py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Blog Supernet</h1>
          <p className="text-muted-foreground">
            Conteúdos sobre internet, tecnologia, telemedicina, automação e muito mais.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.slug}>
              <CardHeader>
                <CardTitle>{post.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {new Date(post.datePublished).toLocaleDateString("pt-BR")}
                </p>
                <p className="text-sm">{post.excerpt}</p>
                <Button asChild variant="outline">
                  <Link to={`/blogue/${post.slug}`}>Ler mais</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </>
  );
}
