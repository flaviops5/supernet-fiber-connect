import { createPublicHandler } from '../_shared/base-handler.ts';

Deno.serve(createPublicHandler('generate-omnichannel-zip', async (req, { supabase }) => {
    // 🔒 RBAC: Apenas administradores podem baixar código fonte
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Verificar role de admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!userRole) {
      console.warn('Code download attempted by non-admin user', user.id);
      throw new Error('Admin access required');
    }

    console.log('Code download authorized for admin', user.id);
    console.log('📦 Generating 3 main backend files...');

    // Apenas os 3 arquivos principais solicitados
    const files = [
      {
        path: 'whatsapp-webhook/index.ts',
        localPath: '../whatsapp-webhook/index.ts'
      },
      {
        path: 'routing-agent/index.ts',
        localPath: '../routing-agent/index.ts'
      },
      {
        path: 'send-whatsapp-message/index.ts',
        localPath: '../send-whatsapp-message/index.ts'
      }
    ];

    // Ler conteúdo dos arquivos
    const fileContents = await Promise.all(
      files.map(async (file) => {
        try {
          const content = await Deno.readTextFile(file.localPath);
          return { path: file.path, content };
        } catch (error) {
          console.error(`Error reading ${file.path}:`, error);
          return { path: file.path, content: `// Erro ao ler arquivo: ${error.message}` };
        }
      })
    );

    // Criar arquivo de texto limpo com os 3 códigos completos
    const textBundle = `${'='.repeat(80)}
OMNICHANNEL BACKEND - 3 ARQUIVOS PRINCIPAIS
Gerado em: ${new Date().toISOString()}
${'='.repeat(80)}

INSTRUÇÕES:
- Este arquivo contém os 3 códigos TypeScript completos
- Copie cada seção e cole em arquivos separados seguindo a estrutura indicada
- São Edge Functions do Supabase (deploy via Supabase CLI)

VARIÁVEIS DE AMBIENTE NECESSÁRIAS:
- EVOLUTION_API_KEY: Chave da API Evolution
- EVOLUTION_API_BASE_URL: URL base da API Evolution  
- OPENAI_API_KEY: Chave da API OpenAI
- SUPABASE_URL: URL do projeto Supabase
- SUPABASE_SERVICE_ROLE_KEY: Service role key do Supabase

${'='.repeat(80)}

${fileContents.map(file => `
${'='.repeat(80)}
📄 ARQUIVO: supabase/functions/${file.path}
${'='.repeat(80)}

${file.content}

`).join('\n')}

${'='.repeat(80)}
FIM DOS ARQUIVOS
${'='.repeat(80)}
`;

    return new Response(textBundle, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="omnichannel-3-arquivos.txt"',
      },
    });
}));
