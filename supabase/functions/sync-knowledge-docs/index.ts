import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Iniciando sincronização dos documentos markdown...');

    // Definir os arquivos markdown com seu conteúdo inline
    const markdownFiles = [
      {
        path: 'docs/knowledge-base/README.md',
        category: 'documentacao',
        agentTypes: ['admin'],
        content: `---
title: "📚 Knowledge Base - SUPERNET FIBRA"
category: "documentacao"
agent_types: ["admin"]
is_active: true
last_updated: "2025-10-09"
author: "Sistema"
version: "1.0"
---

# 📚 Knowledge Base - SUPERNET FIBRA

Sistema centralizado de conhecimento para alimentar os agentes de IA.

## 🎯 Objetivo

Armazenar, versionar e sincronizar todo o conhecimento que os agentes precisam para atender clientes.

## 📁 Estrutura

A base de conhecimento está organizada por categorias:
- **vendas**: Planos, promoções, políticas comerciais
- **suporte_tecnico**: Troubleshooting, procedimentos técnicos
- **suporte_financeiro**: Boletos, negociação, desbloqueio
- **automacao**: Smart home, dispositivos, integrações
- **telemedicina**: Planos de saúde, consultas, especialidades

## 🔄 Sincronização

Use o botão "Sincronizar Docs" para atualizar a base de conhecimento com os arquivos markdown mais recentes.`
      }
    ];

    // Limpar registros antigos de documentação (exceto IXC API)
    console.log('Limpando registros antigos de documentação...');
    const { error: deleteError } = await supabase
      .from('knowledge_base')
      .delete()
      .in('category', ['documentacao']);

    if (deleteError) {
      console.warn('Aviso ao limpar registros:', deleteError);
    }

    const itemsToInsert = [];

    // Processar cada arquivo
    for (const file of markdownFiles) {
      try {
        console.log(`Processando ${file.path}...`);
        
        const { metadata, content: markdownContent } = extractFrontMatter(file.content);

        const item = {
          title: metadata.title || file.path.split('/').pop()?.replace('.md', '') || 'Documento',
          content: markdownContent,
          content_type: 'document',
          category: metadata.category || file.category,
          tags: [metadata.category || file.category, 'docs-sync'],
          agent_types: metadata.agent_types || file.agentTypes,
          is_active: metadata.is_active !== false,
          parent_id: null,
          is_folder: false,
          display_order: 0
        };

        itemsToInsert.push(item);
        console.log(`✓ ${item.title}`);
      } catch (error) {
        console.error(`Erro ao processar ${file.path}:`, error);
      }
    }

    // Inserir todos os itens
    if (itemsToInsert.length > 0) {
      console.log(`\nInserindo ${itemsToInsert.length} itens na knowledge_base...`);
      const { error } = await supabase
        .from('knowledge_base')
        .insert(itemsToInsert);

      if (error) {
        console.error('Erro ao inserir:', error);
        throw error;
      }
    }

    console.log('✅ Sincronização concluída com sucesso!');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Documentos sincronizados com sucesso',
        synced_items: itemsToInsert.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Erro na sincronização:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
