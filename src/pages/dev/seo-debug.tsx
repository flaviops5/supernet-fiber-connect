import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

interface JsonLdSchema {
  type: string;
  content: string;
}

interface AEOApiResponse {
  success: boolean;
  data?: {
    type: string;
    slug: string;
    title: string;
    description: string;
    category: string;
    schemaType: string;
    price?: number;
    metadata: {
      path: string;
      provider: string;
    };
  };
  error?: string;
}

interface DebugResult {
  title: string | null;
  description: string | null;
  canonical: string | null;
  ogTags: MetaTag[];
  twitterTags: MetaTag[];
  jsonLdSchemas: JsonLdSchema[];
  robotsTxt: string | null;
  sitemapInfo: {
    totalUrls: number;
    firstTenUrls: string[];
  } | null;
  aeoApi: AEOApiResponse | null;
  errors: string[];
}

export default function SeoDebugPage(): JSX.Element {
  const [path, setPath] = useState<string>("");
  const [results, setResults] = useState<DebugResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  function extractSlugFromPath(inputPath: string): string | null {
    const trimmed = inputPath.trim();
    
    if (trimmed.startsWith("/planos/")) {
      return trimmed.replace("/planos/", "");
    }
    
    if (trimmed.startsWith("/servicos/")) {
      return trimmed.replace("/servicos/", "");
    }
    
    return null;
  }

  async function fetchRobotsTxt(): Promise<string | null> {
    try {
      const response = await fetch("https://supernetfibra.com.br/robots.txt");
      if (!response.ok) return null;
      return await response.text();
    } catch {
      return null;
    }
  }

  async function fetchSitemapXml(): Promise<{ totalUrls: number; firstTenUrls: string[] } | null> {
    try {
      const response = await fetch("https://supernetfibra.com.br/sitemap.xml");
      if (!response.ok) return null;
      
      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      const urlElements = xmlDoc.getElementsByTagName("loc");
      const urls: string[] = [];
      
      for (let i = 0; i < urlElements.length; i++) {
        const textContent = urlElements[i].textContent;
        if (textContent) {
          urls.push(textContent);
        }
      }
      
      return {
        totalUrls: urls.length,
        firstTenUrls: urls.slice(0, 10)
      };
    } catch {
      return null;
    }
  }

  async function fetchAEOApi(slug: string): Promise<AEOApiResponse> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/content/${slug}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`
        };
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  async function extractPageMetadata(pagePath: string): Promise<{
    title: string | null;
    description: string | null;
    canonical: string | null;
    ogTags: MetaTag[];
    twitterTags: MetaTag[];
    jsonLdSchemas: JsonLdSchema[];
  }> {
    try {
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}${pagePath}`);
      
      if (!response.ok) {
        return {
          title: null,
          description: null,
          canonical: null,
          ogTags: [],
          twitterTags: [],
          jsonLdSchemas: []
        };
      }
      
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      
      // Extract title
      const titleElement = doc.querySelector("title");
      const title = titleElement ? titleElement.textContent : null;
      
      // Extract description
      const descriptionElement = doc.querySelector('meta[name="description"]');
      const description = descriptionElement ? descriptionElement.getAttribute("content") : null;
      
      // Extract canonical
      const canonicalElement = doc.querySelector('link[rel="canonical"]');
      const canonical = canonicalElement ? canonicalElement.getAttribute("href") : null;
      
      // Extract OG tags
      const ogElements = doc.querySelectorAll('meta[property^="og:"]');
      const ogTags: MetaTag[] = [];
      ogElements.forEach((el) => {
        const property = el.getAttribute("property");
        const content = el.getAttribute("content");
        if (property && content) {
          ogTags.push({ property, content });
        }
      });
      
      // Extract Twitter tags
      const twitterElements = doc.querySelectorAll('meta[name^="twitter:"]');
      const twitterTags: MetaTag[] = [];
      twitterElements.forEach((el) => {
        const name = el.getAttribute("name");
        const content = el.getAttribute("content");
        if (name && content) {
          twitterTags.push({ name, content });
        }
      });
      
      // Extract JSON-LD schemas
      const ldElements = doc.querySelectorAll('script[type="application/ld+json"]');
      const jsonLdSchemas: JsonLdSchema[] = [];
      ldElements.forEach((el) => {
        const content = el.textContent;
        if (content) {
          try {
            const parsed = JSON.parse(content);
            const type = parsed["@type"] || "Unknown";
            jsonLdSchemas.push({
              type,
              content
            });
          } catch {
            // Invalid JSON-LD, skip
          }
        }
      });
      
      return {
        title,
        description,
        canonical,
        ogTags,
        twitterTags,
        jsonLdSchemas
      };
    } catch {
      return {
        title: null,
        description: null,
        canonical: null,
        ogTags: [],
        twitterTags: [],
        jsonLdSchemas: []
      };
    }
  }

  async function analyze(): Promise<void> {
    if (!path.trim()) {
      return;
    }

    setIsLoading(true);
    const errors: string[] = [];

    // Extract slug for AEO API
    const slug = extractSlugFromPath(path);
    let aeoApi: AEOApiResponse | null = null;

    if (!slug) {
      errors.push("Rota sem AEO associado (não é /planos/* ou /servicos/*)");
    } else {
      aeoApi = await fetchAEOApi(slug);
    }

    // Fetch robots.txt
    const robotsTxt = await fetchRobotsTxt();
    if (!robotsTxt) {
      errors.push("Não foi possível carregar robots.txt");
    }

    // Fetch sitemap.xml
    const sitemapInfo = await fetchSitemapXml();
    if (!sitemapInfo) {
      errors.push("Não foi possível carregar sitemap.xml");
    }

    // Extract page metadata
    const pageData = await extractPageMetadata(path);

    setResults({
      ...pageData,
      robotsTxt,
      sitemapInfo,
      aeoApi,
      errors
    });

    setIsLoading(false);
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold">SEO & AEO Debugger</h1>
          <p className="text-muted-foreground">
            Ferramenta interna para auditoria de SEO técnico, JSON-LD e API AEO
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Caminho da página</label>
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/planos/residenciais"
              disabled={isLoading}
            />
          </div>

          <Button onClick={analyze} disabled={isLoading || !path.trim()}>
            {isLoading ? "Analisando..." : "Analisar"}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <>
          {results.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {results.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Meta Tags Básicas</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <strong className="text-sm">Title:</strong>
                <p className="text-sm text-muted-foreground mt-1">
                  {results.title || "(não encontrado)"}
                </p>
              </div>

              <Separator />

              <div>
                <strong className="text-sm">Description:</strong>
                <p className="text-sm text-muted-foreground mt-1">
                  {results.description || "(não encontrado)"}
                </p>
              </div>

              <Separator />

              <div>
                <strong className="text-sm">Canonical:</strong>
                <p className="text-sm text-muted-foreground mt-1">
                  {results.canonical || "(não encontrado)"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">OpenGraph Tags</h2>
            </CardHeader>
            <CardContent>
              {results.ogTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma tag OG encontrada</p>
              ) : (
                <div className="space-y-2">
                  {results.ogTags.map((tag, index) => (
                    <div key={index} className="text-sm">
                      <strong>{tag.property}:</strong> {tag.content}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Twitter Card Tags</h2>
            </CardHeader>
            <CardContent>
              {results.twitterTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma tag Twitter encontrada</p>
              ) : (
                <div className="space-y-2">
                  {results.twitterTags.map((tag, index) => (
                    <div key={index} className="text-sm">
                      <strong>{tag.name}:</strong> {tag.content}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">JSON-LD Schemas</h2>
            </CardHeader>
            <CardContent>
              {results.jsonLdSchemas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum schema JSON-LD encontrado</p>
              ) : (
                <div className="space-y-4">
                  {results.jsonLdSchemas.map((schema, index) => (
                    <div key={index}>
                      <strong className="text-sm">Tipo: {schema.type}</strong>
                      <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                        {JSON.stringify(JSON.parse(schema.content), null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">robots.txt</h2>
            </CardHeader>
            <CardContent>
              {results.robotsTxt ? (
                <pre className="text-xs bg-muted p-4 rounded overflow-x-auto whitespace-pre-wrap">
                  {results.robotsTxt}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">Não foi possível carregar robots.txt</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">sitemap.xml</h2>
            </CardHeader>
            <CardContent>
              {results.sitemapInfo ? (
                <div className="space-y-3">
                  <p className="text-sm">
                    <strong>Total de URLs:</strong> {results.sitemapInfo.totalUrls}
                  </p>
                  <Separator />
                  <div>
                    <strong className="text-sm">Primeiras 10 URLs:</strong>
                    <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                      {results.sitemapInfo.firstTenUrls.map((url, index) => (
                        <li key={index}>{url}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Não foi possível carregar sitemap.xml</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">API AEO (/api/content/:slug)</h2>
            </CardHeader>
            <CardContent>
              {results.aeoApi ? (
                results.aeoApi.success && results.aeoApi.data ? (
                  <div className="space-y-2">
                    <div className="text-sm">
                      <strong>Type:</strong> {results.aeoApi.data.type}
                    </div>
                    <div className="text-sm">
                      <strong>Slug:</strong> {results.aeoApi.data.slug}
                    </div>
                    <div className="text-sm">
                      <strong>Title:</strong> {results.aeoApi.data.title}
                    </div>
                    <div className="text-sm">
                      <strong>Description:</strong> {results.aeoApi.data.description}
                    </div>
                    <div className="text-sm">
                      <strong>Category:</strong> {results.aeoApi.data.category}
                    </div>
                    <div className="text-sm">
                      <strong>Schema Type:</strong> {results.aeoApi.data.schemaType}
                    </div>
                    {results.aeoApi.data.price && (
                      <div className="text-sm">
                        <strong>Price:</strong> R$ {results.aeoApi.data.price.toFixed(2)}
                      </div>
                    )}
                    <Separator />
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(results.aeoApi.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Erro na API: {results.aeoApi.error || "Unknown error"}
                    </AlertDescription>
                  </Alert>
                )
              ) : (
                <p className="text-sm text-muted-foreground">API não consultada</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
