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
    const { functionName } = await req.json();
    
    if (!functionName) {
      return new Response(
        JSON.stringify({ error: 'functionName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construir o caminho absoluto para a função
    const currentDir = new URL('.', import.meta.url).pathname;
    const functionsDir = currentDir.replace('/get-function-code/', '/');
    const filePath = `${functionsDir}${functionName}/index.ts`;
    
    console.log('Tentando ler arquivo:', filePath);
    
    try {
      const code = await Deno.readTextFile(filePath);
      
      return new Response(
        JSON.stringify({ code, functionName }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (fileError) {
      console.error('Error reading file:', fileError);
      return new Response(
        JSON.stringify({ error: `Function file not found: ${functionName}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    console.error('Error in get-function-code:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
