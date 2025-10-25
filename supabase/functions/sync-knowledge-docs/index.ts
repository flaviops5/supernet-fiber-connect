import { createPublicHandler } from '../_shared/base-handler.ts';

// Função para extrair front matter YAML dos arquivos markdown
function extractFrontMatter(content: string) {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontMatterRegex);
  
  if (!match) {
    return { metadata: {}, content };
  }
  
  const [, yamlContent, markdownContent] = match;
  const metadata: Record<string, any> = {};
  
  // Parse YAML simples (linha por linha)
  yamlContent.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      
      // Remover aspas
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      // Parse de arrays simples
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
      }
      
      // Parse de booleanos
      if (value === 'true') value = true;
      if (value === 'false') value = false;
      
      metadata[key] = value;
    }
  });
  
  return { metadata, content: markdownContent.trim() };
}

Deno.serve(createPublicHandler('sync-knowledge-docs', async (req, { supabase }) => {
    console.log('Iniciando sincronização dos documentos markdown...');

    // Lista de arquivos markdown para sincronizar
    const markdownFiles = [
      // ========== DOCUMENTAÇÃO ARQUITETURA ==========
      {
        path: 'docs/multiagent-architecture.md',
        category: 'arquitetura',
        agentTypes: ['admin', 'routing']
      },
      {
        path: 'docs/agent-personality-guide.md',
        category: 'arquitetura',
        agentTypes: ['admin', 'routing']
      },
      {
        path: 'docs/agent-tools-matrix.md',
        category: 'documentacao-tecnica',
        agentTypes: ['admin']
      },
      
      // ========== DOCUMENTAÇÃO TÉCNICA ==========
      {
        path: 'docs/tools-reference.md',
        category: 'documentacao-tecnica',
        agentTypes: ['admin', 'support_tech']
      },
      {
        path: 'docs/operational-guide.md',
        category: 'documentacao-tecnica',
        agentTypes: ['admin', 'support_tech']
      },
      {
        path: 'docs/whatsapp-integration-guide.md',
        category: 'integracao',
        agentTypes: ['admin']
      },
      
      // ========== SISTEMA E ROBUSTEZ ==========
      {
        path: 'docs/system-complete-description.md',
        category: 'sistema',
        agentTypes: ['admin']
      },
      {
        path: 'docs/system-robustness-100.md',
        category: 'sistema',
        agentTypes: ['admin']
      },
      {
        path: 'docs/conceitos-fundamentais.md',
        category: 'sistema',
        agentTypes: ['admin', 'routing']
      },
      
      // ========== CONHECIMENTO BASE ==========
      {
        path: 'docs/knowledge-base/README.md',
        category: 'documentacao',
        agentTypes: ['admin']
      },
      
      // ========== GOVERNANÇA E AUDITORIA ==========
      {
        path: 'docs/current-routing-map.md',
        category: 'governanca',
        agentTypes: ['admin', 'routing']
      }
    ];

    // Buscar conteúdo dos arquivos do GitHub (requer integração GitHub)
    // Por enquanto, vamos sincronizar apenas os metadados e instruir uso do script
    
    console.log(`📚 Preparando sincronização de ${markdownFiles.length} documentos...`);

    const itemsToInsert = [];

    // Processar cada arquivo
    for (const file of markdownFiles) {
      try {
        console.log(`📄 Registrando: ${file.path}...`);
        
        // Extrair título do nome do arquivo
        const fileName = file.path.split('/').pop()?.replace('.md', '') || 'Documento';
        const title = fileName
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        const item = {
          title,
          content: `📎 **Fonte:** \`${file.path}\`\n\n⚠️ Para sincronizar o conteúdo completo, execute o script:\n\`\`\`bash\ndeno run --allow-net --allow-read --allow-env docs/knowledge-base/scripts/sync-kb-to-supabase.ts\n\`\`\``,
          content_type: 'document',
          category: file.category,
          tags: [file.category, 'docs-sync', 'pending-content'],
          agent_types: file.agentTypes,
          is_active: true,
          parent_id: null,
          is_folder: false,
          display_order: 0
        };

        itemsToInsert.push(item);
        console.log(`✓ ${title}`);
      } catch (error) {
        console.error(`❌ Erro ao processar ${file.path}:`, error);
      }
    }

    // Inserir todos os itens (usando upsert por source path)
    if (itemsToInsert.length > 0) {
      console.log(`\n📥 Inserindo ${itemsToInsert.length} itens na knowledge_base...`);
      
      for (const item of itemsToInsert) {
        const { error } = await supabase
          .from('knowledge_base')
          .upsert(item, { 
            onConflict: 'title,category',
            ignoreDuplicates: false 
          });

        if (error) {
          console.error(`❌ Erro ao inserir "${item.title}":`, error);
        }
      }
    }

    console.log('✅ Sincronização concluída!');
    console.log('📌 Para sincronizar o conteúdo COMPLETO dos arquivos, execute:');
    console.log('   deno run --allow-net --allow-read --allow-env docs/knowledge-base/scripts/sync-kb-to-supabase.ts');

    return { 
      success: true,
      message: `${itemsToInsert.length} documentos registrados. Execute o script Deno para sincronizar conteúdo completo.`,
      synced_items: itemsToInsert.length,
      info: 'Para conteúdo completo: deno run --allow-net --allow-read --allow-env docs/knowledge-base/scripts/sync-kb-to-supabase.ts'
    };
}));
