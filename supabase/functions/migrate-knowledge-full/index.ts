import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Buscar TODOS os documentos não migrados
    const { data: allDocs, error: fetchError } = await supabase
      .from('knowledge_base')
      .select('*')
      .is('migrated_at', null)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    if (!allDocs || allDocs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Todos os documentos já foram migrados!',
          migrated: 0,
          remaining: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Iniciando migração completa de ${allDocs.length} documentos...`);

    const migratedIds: string[] = [];
    const errors: Array<{ id: string; title: string; error: string }> = [];
    let processed = 0;

    // Processar todos os documentos com delay entre cada um (rate limit)
    for (const doc of allDocs) {
      processed++;
      
      try {
        // Preparar texto para embedding
        const text = `${doc.title || ''}\n\n${doc.content || ''}`.trim();
        
        if (!text || text.length < 10) {
          console.warn(`[${processed}/${allDocs.length}] Documento ${doc.id} ignorado: conteúdo muito curto`);
          continue;
        }

        console.log(`[${processed}/${allDocs.length}] Migrando: ${doc.title}`);

        // Gerar embedding via OpenAI API
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: text.slice(0, 8000)
          })
        });

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          throw new Error(`Embedding API error: ${embeddingResponse.status} - ${errorText}`);
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;

        if (!embedding || !Array.isArray(embedding) || embedding.length !== 1536) {
          throw new Error(`Invalid embedding: expected 1536 dimensions, got ${embedding?.length}`);
        }

        // Inserir na knowledge_index
        const { error: upsertError } = await supabase
          .from('knowledge_index')
          .upsert({
            source_table: 'knowledge_base',
            source_id: doc.id,
            title: doc.title,
            content: doc.content,
            summary: doc.summary,
            category: doc.category,
            content_type: doc.content_type,
            tags: doc.tags || [],
            agent_types: doc.agent_types || [],
            metadata: {
              migrated_from: 'knowledge_base',
              original_id: doc.id,
              migrated_at: new Date().toISOString()
            },
            embedding
          }, { 
            onConflict: 'source_table,source_id' 
          });

        if (upsertError) throw upsertError;

        // Marcar como migrado
        const { error: updateError } = await supabase
          .from('knowledge_base')
          .update({ migrated_at: new Date().toISOString() })
          .eq('id', doc.id);

        if (updateError) throw updateError;

        migratedIds.push(doc.id);
        console.log(`✓ [${processed}/${allDocs.length}] Migrado: ${doc.title}`);

        // Delay de 100ms entre requests para respeitar rate limits
        await delay(100);

      } catch (error) {
        const err: any = error;
        const errorMsg = typeof err?.message === 'string' ? err.message : String(err);
        console.error(`✗ [${processed}/${allDocs.length}] Erro migrando ${doc.title}:`, errorMsg);
        errors.push({ 
          id: doc.id, 
          title: doc.title,
          error: errorMsg 
        });
        
        // Continuar mesmo com erro
        await delay(100);
      }
    }

    // Estatísticas finais
    const { data: stats } = await supabase.rpc('get_migration_stats');

    return new Response(
      JSON.stringify({
        success: true,
        migrated: migratedIds.length,
        failed: errors.length,
        total_processed: allDocs.length,
        errors: errors,
        stats: stats?.[0] || null,
        message: `Migração completa! ${migratedIds.length} documentos migrados com sucesso${errors.length > 0 ? `, ${errors.length} com erro` : ''}.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na migração completa:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
