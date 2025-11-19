import { useParams, Link } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import { ArticleSchema } from "@/components/seo/schemas/ArticleSchema";
import { getPostBySlug } from "@/utils/getPost";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function BlogPostPage(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return (
      <main className="container mx-auto py-8">
        <p className="text-muted-foreground">Post não encontrado.</p>
      </main>
    );
  }

  const post = getPostBySlug(slug);

  if (!post) {
    return (
      <>
        <SEO
          title="Post não encontrado"
          description="O post que você procura não foi encontrado."
          canonical="/blogue"
          noindex
        />
        <main className="container mx-auto py-8 space-y-4">
          <Button asChild variant="outline">
            <Link to="/blogue">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao blog
            </Link>
          </Button>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Post não encontrado.</p>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <SEO
        title={post.title}
        description={post.description}
        canonical={`/blogue/${post.slug}`}
        ogImage="/images/og-blogue.jpg"
      />

      <ArticleSchema
        title={post.title}
        description={post.description}
        datePublished={post.datePublished}
        author={post.author}
      />

      <main className="container mx-auto py-8 space-y-6">
        <Button asChild variant="outline">
          <Link to="/blogue">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao blog
          </Link>
        </Button>

        <article>
          <Card>
            <CardContent className="space-y-6 pt-6">
              <header className="space-y-4">
                <h1 className="text-3xl font-bold">{post.title}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <time dateTime={post.datePublished}>
                    {new Date(post.datePublished).toLocaleDateString("pt-BR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })}
                  </time>
                  <span>•</span>
                  <span>{post.author}</span>
                </div>
              </header>

              <div className="prose prose-slate max-w-none">
                <p className="text-base leading-relaxed whitespace-pre-line">
                  {post.content}
                </p>
              </div>
            </CardContent>
          </Card>
        </article>
      </main>
    </>
  );
}
