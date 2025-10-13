import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePaths } = await req.json();
    
    if (!filePaths || !Array.isArray(filePaths)) {
      return new Response(
        JSON.stringify({ error: 'filePaths array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: Record<string, { code?: string; error?: string }> = {};

    for (const filePath of filePaths) {
      try {
        // Construir o caminho absoluto baseado no tipo de arquivo
        let absolutePath: string;
        
        if (filePath.startsWith('supabase/functions/')) {
          // Para edge functions
          const currentDir = new URL('.', import.meta.url).pathname;
          const functionsDir = currentDir.replace('/get-omnichannel-code/', '/');
          const relativePath = filePath.replace('supabase/functions/', '');
          absolutePath = `${functionsDir}${relativePath}`;
        } else {
          // Para arquivos frontend, tentar ler do diretório do projeto
          // Nota: Isso pode não funcionar dependendo de onde o Deno executa
          absolutePath = `/${filePath}`;
        }
        
        console.log('Tentando ler arquivo:', absolutePath);
        
        const code = await Deno.readTextFile(absolutePath);
        results[filePath] = { code };
      } catch (fileError) {
        console.error(`Error reading file ${filePath}:`, fileError);
        results[filePath] = { error: `Could not read file: ${fileError.message}` };
      }
    }
    
    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in get-omnichannel-code:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
