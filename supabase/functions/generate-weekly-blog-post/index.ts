import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  tema?: string;
  palavraChave?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  console.log('generate-weekly-blog-post started', {
    requestId,
    timestamp: new Date().toISOString(),
  });

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body (optional parameters for future use)
    const body: RequestBody = await req.json().catch(() => ({}));
    
    console.log('Request parameters', {
      requestId,
      tema: body.tema || 'default',
      palavraChave: body.palavraChave || 'default',
    });

    // TODO: integrar com serviço de IA (Lovable AI / modelo externo)
    // A função deve montar um prompt semelhante ao usado no painel admin
    // e gerar: slug, title, description, excerpt, content, author, datePublished
    
    // Por enquanto, criar um post de teste
    const testPost = {
      slug: `post-automatico-${Date.now()}`,
      title: "Post Gerado Automaticamente (Teste)",
      description: "Este é um post gerado automaticamente para teste da função.",
      excerpt: "Post de teste criado pela Edge Function generate-weekly-blog-post.",
      content: `# Post Gerado Automaticamente

Este é um conteúdo gerado automaticamente apenas para validar o fluxo da Edge Function.

## Objetivo

Testar a integração entre a Edge Function e a tabela blog_posts.

## Próximos Passos

- Integrar com serviço de IA
- Implementar geração de conteúdo real
- Adicionar agendamento semanal via cron

## Conclusão

Este post será substituído por conteúdo gerado via IA em breve.`,
      author: "Automação Supernet",
      date_published: new Date().toISOString(),
    };

    console.log('Inserting test post', {
      requestId,
      slug: testPost.slug,
    });

    // Insert post into database
    const { data: insertedPost, error: insertError } = await supabaseClient
      .from("blog_posts")
      .insert(testPost)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting post', {
        requestId,
        error: insertError,
      });
      throw insertError;
    }

    const duration = Date.now() - startTime;

    console.log('generate-weekly-blog-post completed', {
      requestId,
      duration,
      postId: insertedPost.id,
      slug: insertedPost.slug,
    });

    return new Response(
      JSON.stringify({
        success: true,
        post: insertedPost,
        duration,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('generate-weekly-blog-post error', {
      requestId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
