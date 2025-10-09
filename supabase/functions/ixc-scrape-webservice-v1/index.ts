// Scrapes IXC public pages to find any references to /webservice/v1/
// Returns a structured list of endpoints found with optional inferred HTTP methods

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EndpointHit {
  path: string;                // normalized, starts with /webservice/v1/
  fullUrls: string[];          // pages where it was referenced (absolute page URLs)
  occurrences: number;         // total matches across pages
  methods: string[];           // inferred HTTP methods near the match
  snippets: string[];          // small content snippets around the match
}

interface ScrapeRequest {
  startUrls?: string[];        // seeds to start crawling
  maxPages?: number;           // limit total pages to visit
  sameHostOnly?: boolean;      // restrict crawling to the same host(s)
}

function absoluteUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function extractLinks(html: string, pageUrl: string): string[] {
  const links = new Set<string>();
  const hrefRegex = /href=["']([^"'#]+)["']/gi;
  let m;
  while ((m = hrefRegex.exec(html)) !== null) {
    const abs = absoluteUrl(m[1], pageUrl);
    if (abs) links.add(abs);
  }
  // Also catch window.location or fetch('...') patterns
  const urlLikeRegex = /(https?:\/\/[^\s"'<>]+)|(['"])\/(?!\/)([^'"<>\s]+)\1?/gi;
  while ((m = urlLikeRegex.exec(html)) !== null) {
    const raw = m[0].replace(/^["']|["']$/g, '');
    const abs = absoluteUrl(raw, pageUrl);
    if (abs) links.add(abs);
  }
  return Array.from(links);
}

function extractEndpoints(content: string): { path: string; method?: string; snippet: string }[] {
  const results: { path: string; method?: string; snippet: string }[] = [];

  // Full URLs containing /webservice/v1/
  const fullUrlRe = /https?:\/\/[^\s"'<>]+(\/webservice\/v1\/[a-zA-Z0-9_\/-]+)/g;
  let mf;
  while ((mf = fullUrlRe.exec(content)) !== null) {
    const path = mf[1];
    const start = Math.max(0, mf.index - 80);
    const end = Math.min(content.length, mf.index + (mf[0].length) + 80);
    const snippet = content.slice(start, end).replace(/\s+/g, ' ').trim();
    const before = content.slice(Math.max(0, mf.index - 40), mf.index).toUpperCase();
    const methodMatch = before.match(/\b(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\b/);
    results.push({ path, method: methodMatch?.[1], snippet });
  }

  // Relative paths containing /webservice/v1/
  const relRe = /(\/webservice\/v1\/[a-zA-Z0-9_\/-]+)/g;
  let mr;
  while ((mr = relRe.exec(content)) !== null) {
    const path = mr[1];
    const start = Math.max(0, mr.index - 80);
    const end = Math.min(content.length, mr.index + (mr[0].length) + 80);
    const snippet = content.slice(start, end).replace(/\s+/g, ' ').trim();
    const before = content.slice(Math.max(0, mr.index - 40), mr.index).toUpperCase();
    const methodMatch = before.match(/\b(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\b/);
    results.push({ path, method: methodMatch?.[1], snippet });
  }

  return results;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    const { startUrls, maxPages, sameHostOnly }: ScrapeRequest = await req.json().catch(() => ({}));

    const seeds = (startUrls && startUrls.length > 0)
      ? startUrls
      : [
          'https://demo.ixcsoft.com.br/webservice/',
          'https://demo.ixcsoft.com.br/',
        ];

    const pageLimit = Math.min(Math.max(maxPages ?? 120, 1), 500);
    const restrictSameHost = sameHostOnly !== false; // default true

    const allowedHosts = new Set<string>(seeds.map(u => {
      try { return new URL(u).host; } catch { return ''; }
    }).filter(Boolean));

    const queue: string[] = [...new Set(seeds)];
    const visited = new Set<string>();

    // Endpoint aggregation
    const endpointMap = new Map<string, EndpointHit>();

    // Crawl loop (simple BFS)
    while (queue.length > 0 && visited.size < pageLimit) {
      const url = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);

      // Host restriction
      if (restrictSameHost) {
        try {
          const u = new URL(url);
          if (!allowedHosts.has(u.host)) {
            continue;
          }
        } catch {
          continue;
        }
      }

      let res: Response;
      try {
        res = await fetch(url, { redirect: 'follow' });
      } catch (err) {
        // Skip unreachable URLs
        continue;
      }

      const ctype = res.headers.get('content-type') || '';
      if (!ctype.includes('text') && !ctype.includes('json') && !ctype.includes('javascript')) {
        // Skip non-text content
        continue;
      }

      const text = await res.text();

      // Extract endpoints from this page
      const found = extractEndpoints(text);
      for (const f of found) {
        const key = f.path; // normalized path
        const existing = endpointMap.get(key);
        const methods = new Set<string>(existing?.methods || []);
        if (f.method) methods.add(f.method);

        const fullUrls = new Set<string>(existing?.fullUrls || []);
        fullUrls.add(url);

        const snippets = existing?.snippets || [];
        if (snippets.length < 5) {
          snippets.push(f.snippet);
        }

        endpointMap.set(key, {
          path: key,
          fullUrls: Array.from(fullUrls),
          occurrences: (existing?.occurrences || 0) + 1,
          methods: Array.from(methods),
          snippets,
        });
      }

      // Enqueue more links
      const links = extractLinks(text, url);
      for (const link of links) {
        if (!visited.has(link)) {
          // Optional host restriction is handled at visit time
          queue.push(link);
        }
      }
    }

    const endpoints = Array.from(endpointMap.values())
      .sort((a, b) => b.occurrences - a.occurrences || a.path.localeCompare(b.path));

    const finishedAt = Date.now();

    return new Response(
      JSON.stringify({
        ok: true,
        crawled: visited.size,
        pageLimit,
        seeds,
        sameHostOnly: restrictSameHost,
        totalEndpoints: endpoints.length,
        endpoints,
        tookMs: finishedAt - startedAt,
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
