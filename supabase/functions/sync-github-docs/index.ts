import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
  size: number;
}

interface KnowledgeBaseMetadata {
  title?: string;
  category?: string;
  agent_types?: string[];
  is_active?: boolean;
  last_updated?: string;
  author?: string;
  version?: string;
}

/**
 * Determina a categoria baseada no caminho do arquivo
 */
function getCategoryFromPath(filePath: string): string {
  if (filePath.includes('knowledge-base/data-sources/vendas')) return 'vendas';
  if (filePath.includes('knowledge-base/data-sources/suporte')) return 'suporte';
  if (filePath.includes('knowledge-base/data-sources/telemedicina')) return 'telemedicina';
  if (filePath.includes('knowledge-base/data-sources/automacao')) return 'automacao';
  if (filePath.includes('whatsapp')) return 'integracao';
  if (filePath.includes('agent') || filePath.includes('multiagent')) return 'arquitetura';
  if (filePath.includes('tools') || filePath.includes('operational')) return 'documentacao-tecnica';
  if (filePath.includes('system') || filePath.includes('robustness')) return 'sistema';
  return 'geral';
}

/**
 * Extrai metadados YAML do front matter (opcional)
 */
function extractFrontMatter(content: string): {
  metadata: Partial<KnowledgeBaseMetadata>;
  markdownContent: string;
} {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontMatterRegex);

  if (!match) {
    return { metadata: {}, markdownContent: content };
  }

  const [, yamlContent, markdownContent] = match;
  const metadata: Partial<KnowledgeBaseMetadata> = {};

  // Parse YAML simples (linha por linha)
  yamlContent.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value: any = line.substring(colonIndex + 1).trim();

      // Remover aspas
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Parse de arrays simples
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map((v: string) => v.trim().replace(/['"]/g, ''));
      }

      // Parse de booleanos
      if (value === 'true') value = true;
      if (value === 'false') value = false;

      metadata[key as keyof KnowledgeBaseMetadata] = value;
    }
  });

  return { metadata, markdownContent: markdownContent.trim() };
}

/**
 * Busca arquivos .md recursivamente do GitHub
 */
async function fetchMarkdownFiles(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  githubToken?: string
): Promise<GitHubFile[]> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Supabase-Edge-Function'
  };

  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  console.log(`📡 Fetching: ${url}`);

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${errorText}`);
  }

  const items: GitHubFile[] = await response.json();
  const markdownFiles: GitHubFile[] = [];

  for (const item of items) {
    // Ignorar certos arquivos/pastas
    if (item.name === 'node_modules' || item.name === '.git' || item.name === 'README.md') {
      continue;
    }

    if (item.type === 'file' && item.name.endsWith('.md')) {
      markdownFiles.push(item);
    } else if (item.type === 'dir') {
      // Buscar recursivamente
      const subFiles = await fetchMarkdownFiles(owner, repo, item.path, branch, githubToken);
      markdownFiles.push(...subFiles);
    }
  }

  return markdownFiles;
}

/**
 * Busca o conteúdo de um arquivo do GitHub
 */
async function fetchFileContent(downloadUrl: string, githubToken?: string): Promise<string> {
  const headers: Record<string, string> = {
    'User-Agent': 'Supabase-Edge-Function'
  };

  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
  }

  const response = await fetch(downloadUrl, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch file content: ${response.status}`);
  }

  return await response.text();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json().catch(() => ({}));
    
    // Parâmetros configuráveis (com valores padrão)
    // ✅ CONFIGURADO: flaviops5/supernet-fiber-connect
    const owner = requestBody.owner || 'flaviops5';
    const repo = requestBody.repo || 'supernet-fiber-connect';
    const branch = requestBody.branch || 'main';
    const docsPath = requestBody.path || 'docs';

    const githubToken = Deno.env.get('GITHUB_TOKEN');
    
    console.log(`🚀 Iniciando sincronização do GitHub`);
    console.log(`📦 Repositório: ${owner}/${repo} (branch: ${branch})`);

    // Inicializar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar todos os arquivos .md
    const markdownFiles = await fetchMarkdownFiles(owner, repo, docsPath, branch, githubToken);
    console.log(`📄 Encontrados ${markdownFiles.length} arquivos .md`);

    const syncedItems = [];
    const errors = [];

    // Processar cada arquivo
    for (const file of markdownFiles) {
      try {
        console.log(`📖 Processando: ${file.path}`);

        if (!file.download_url) {
          console.warn(`⚠️ Sem download_url: ${file.path}`);
          continue;
        }

        // Buscar conteúdo do arquivo
        const content = await fetchFileContent(file.download_url, githubToken);
        const { metadata, markdownContent } = extractFrontMatter(content);

        // Extrair título do nome do arquivo ou metadata
        const fileName = file.name.replace('.md', '');
        const title = metadata.title || fileName
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        // Determinar categoria
        const category = metadata.category || getCategoryFromPath(file.path);

        // Preparar item para inserção
        const item = {
          title,
          content: markdownContent,
          content_type: 'document',
          category,
          tags: [category, 'github-sync'],
          agent_types: metadata.agent_types || ['geral'],
          is_active: metadata.is_active ?? true,
          parent_id: null,
          is_folder: false,
          display_order: 0,
          source: file.path,
          metadata: {
            github_path: file.path,
            github_size: file.size,
            last_updated: metadata.last_updated || new Date().toISOString(),
            author: metadata.author || 'SUPERNET FIBRA',
            version: metadata.version || '1.0'
          }
        };

        // Upsert no Supabase (por source path)
        const { error } = await supabase
          .from('knowledge_base')
          .upsert(item, {
            onConflict: 'source',
            ignoreDuplicates: false
          });

        if (error) {
          console.error(`❌ Erro ao sincronizar "${title}":`, error);
          errors.push({ file: file.path, error: error.message });
        } else {
          console.log(`✅ Sincronizado: ${title}`);
          syncedItems.push({ file: file.path, title });
        }

      } catch (error: any) {
        console.error(`❌ Erro ao processar ${file.path}:`, error);
        errors.push({ file: file.path, error: error.message });
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log('📊 RESUMO DA SINCRONIZAÇÃO');
    console.log('='.repeat(50));
    console.log(`Total de arquivos: ${markdownFiles.length}`);
    console.log(`✅ Sucesso: ${syncedItems.length}`);
    console.log(`❌ Erros: ${errors.length}`);
    console.log('='.repeat(50));

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sincronizados ${syncedItems.length} de ${markdownFiles.length} documentos`,
        synced_items: syncedItems.length,
        total_files: markdownFiles.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('❌ Erro fatal na sincronização:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        hint: error.message.includes('GitHub API') 
          ? 'Verifique as credenciais do GitHub e se o repositório está correto'
          : 'Erro ao processar os arquivos'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
