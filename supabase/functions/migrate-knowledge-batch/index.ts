import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createPublicHandler } from '../_shared/base-handler.ts';

Deno.serve(createPublicHandler('migrate-knowledge-batch', async (req, { supabase }) => {
    const { batchSize = 25, offset = 0 } = await req.json();

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Buscar documentos não migrados
    const { data: docs, error: fetchError } = await supabase
      .from('knowledge_base')
      .select('*')
      .is('migrated_at', null)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (fetchError) throw fetchError;

    if (!docs || docs.length === 0) {
      return { 
        success: true, 
        message: 'Migração completa! Todos os documentos foram processados.',
        migrated: 0,
        remaining: 0
      };
    }

    console.log(`Processando batch de ${docs.length} documentos...`);

    const migratedIds: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const doc of docs) {
      try {
        // Preparar texto para embedding
        const text = `${doc.title || ''}\n\n${doc.content || ''}`.trim();
        
        if (!text || text.length < 10) {
          console.warn(`Documento ${doc.id} ignorado: conteúdo muito curto`);
          continue;
        }

        // Gerar embedding via OpenAI API
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: text.slice(0, 8000) // Limitar tokens
          })
        });

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          throw new Error(`Embedding API error: ${embeddingResponse.status} - ${errorText}`);
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;

        if (!embedding || !Array.isArray(embedding)) {
          throw new Error(`Invalid embedding payload`);
        }
        console.log(`Embedding length: ${embedding.length}`);
        // Expect 1536 dims for OpenAI text-embedding-3-small
        if (embedding.length !== 1536) {
          console.warn(`Unexpected embedding dimension: ${embedding.length} (expected 1536)`);
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

        // Marcar como migrado na tabela original
        const { error: updateError } = await supabase
          .from('knowledge_base')
          .update({ migrated_at: new Date().toISOString() })
          .eq('id', doc.id);

        if (updateError) throw updateError;

        migratedIds.push(doc.id);
        console.log(`✓ Migrado: ${doc.title} (${doc.id})`);

      } catch (error) {
        const err: any = error;
        const errorMsg = typeof err?.message === 'string' ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
        console.error(`✗ Erro migrando ${doc.id}:`, errorMsg);
        errors.push({ id: doc.id, error: errorMsg });
      }
    }

    // Obter estatísticas atualizadas
    const { data: stats } = await supabase.rpc('get_migration_stats');

    return {
      success: true,
      migrated: migratedIds.length,
      errors: errors.length,
      errorDetails: errors,
      stats: stats?.[0] || null,
      message: `Processados ${migratedIds.length} de ${docs.length} documentos`
    };
}));
