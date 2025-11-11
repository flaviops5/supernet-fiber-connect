/**
 * RAG Helper - Retrieval-Augmented Generation
 * 
 * Encapsula lógica de busca vetorizada para ser reutilizada por todos os agentes
 */

export interface RAGResult {
  success: boolean;
  documents: Array<{
    title: string;
    content: string;
    category: string;
    similarity: number;
  }>;
  contextText: string;
  searchMethod: 'semantic' | 'fallback' | 'none';
}

/**
 * Busca contexto relevante na base vetorizada
 * @param supabase - Cliente Supabase
 * @param message - Mensagem do usuário para buscar contexto
 * @param openaiApiKey - API key da OpenAI para gerar embedding
 * @param options - Opções de busca (top_k, similarity_threshold, agentTypes)
 */
export async function retrieveKnowledgeContext(
  supabase: any,
  message: string,
  openaiApiKey: string,
  options: {
    top_k?: number;
    similarity_threshold?: number;
    agentTypes?: string[]; // Filtrar por tipo de agente (ex: ['support-tech-agent'])
  } = {}
): Promise<RAGResult> {
  const {
    top_k = 5,
    similarity_threshold = 0.5,
    agentTypes = []
  } = options;

  try {
    // 1. Gerar embedding da mensagem usando OpenAI
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: message.slice(0, 8000) // Limitar tokens
      })
    });

    if (!embeddingResponse.ok) {
      console.error('❌ Erro ao gerar embedding:', await embeddingResponse.text());
      return performFallbackSearch(supabase, message, top_k);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // 2. Busca semântica usando match_knowledge
    const { data: knowledgeBase, error: kbError } = await supabase
      .rpc('match_knowledge', {
        query_embedding: queryEmbedding,
        top_k,
        similarity_threshold
      });

    if (kbError) {
      console.error('❌ Erro na busca vetorizada:', kbError);
      return performFallbackSearch(supabase, message, top_k);
    }

    // Filtrar por agent_types se especificado
    let filteredResults = knowledgeBase || [];
    if (agentTypes.length > 0 && filteredResults.length > 0) {
      filteredResults = filteredResults.filter((doc: any) => {
        const docAgentTypes = doc.metadata?.agent_types || [];
        return agentTypes.some(type => docAgentTypes.includes(type));
      });
    }

    // 3. Se encontrou resultados, formatar contexto
    if (filteredResults.length > 0) {
      console.log(`✅ RAG: ${filteredResults.length} documentos encontrados (semântica)`);
      
      const contextText = filteredResults
        .map((doc: any) => 
          `[${doc.category}] ${doc.title}\n${doc.content}\nRelevância: ${(doc.similarity * 100).toFixed(1)}%`
        )
        .join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');

      return {
        success: true,
        documents: filteredResults,
        contextText: `📚 CONHECIMENTO RELEVANTE DA BASE VETORIZADA:\n\n${contextText}`,
        searchMethod: 'semantic'
      };
    }

    // 4. Fallback: busca por palavras-chave se busca semântica falhou
    console.log('⚠️ Busca semântica sem resultados - tentando fallback');
    return performFallbackSearch(supabase, message, top_k);

  } catch (error) {
    console.error('❌ Erro no RAG:', error);
    return performFallbackSearch(supabase, message, top_k);
  }
}

/**
 * Busca de fallback usando palavras-chave quando busca vetorizada falha
 */
async function performFallbackSearch(
  supabase: any,
  message: string,
  limit: number
): Promise<RAGResult> {
  try {
    const lowerMsg = message.toLowerCase();
    
    // Extrair termos relevantes
    const terms: string[] = [];
    const keywords = ['pon', 'gpon', 'olt', 'onu', 'fibra', 'internet', 'bloqueio', 'pagamento', 'fatura', 'boleto', 'pix'];
    
    keywords.forEach(keyword => {
      if (lowerMsg.includes(keyword)) terms.push(keyword);
    });

    // Usar primeiro token significativo como fallback
    if (terms.length === 0) {
      const firstToken = (lowerMsg.match(/[a-z0-9]{3,}/g) || [])[0];
      if (firstToken) terms.push(firstToken);
    }

    const searchTerm = terms.length > 0 ? terms[0] : 'internet';

    const { data: fallbackDocs, error: fbError } = await supabase
      .from('knowledge_index')
      .select('title, category, content, metadata')
      .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
      .limit(limit);

    if (fbError || !fallbackDocs || fallbackDocs.length === 0) {
      console.log('❌ Fallback sem resultados');
      return {
        success: false,
        documents: [],
        contextText: '',
        searchMethod: 'none'
      };
    }

    console.log(`✅ Fallback: ${fallbackDocs.length} documentos encontrados`);

    const contextText = fallbackDocs
      .map((doc: any) => 
        `[${doc.category}] ${doc.title}\n${doc.content}\n(Busca por palavra-chave: ${searchTerm})`
      )
      .join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');

    return {
      success: true,
      documents: fallbackDocs.map(d => ({ ...d, similarity: 0.35 })),
      contextText: `📚 CONHECIMENTO DA BASE (busca textual):\n\n${contextText}`,
      searchMethod: 'fallback'
    };

  } catch (error) {
    console.error('❌ Erro no fallback:', error);
    return {
      success: false,
      documents: [],
      contextText: '',
      searchMethod: 'none'
    };
  }
}
