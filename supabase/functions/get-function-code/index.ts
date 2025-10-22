import { createPublicHandler } from '../_shared/base-handler.ts';

Deno.serve(createPublicHandler('get-function-code', async (req) => {
    const { functionName } = await req.json();
    
    if (!functionName) {
      throw new Error('functionName is required');
    }

    // Construir o caminho absoluto para a função
    const currentDir = new URL('.', import.meta.url).pathname;
    const functionsDir = currentDir.replace('/get-function-code/', '/');
    const filePath = `${functionsDir}${functionName}/index.ts`;
    
    console.log('Tentando ler arquivo:', filePath);
    
    try {
      const code = await Deno.readTextFile(filePath);
      return { code, functionName };
    } catch (fileError) {
      console.error('Error reading file:', fileError);
      throw new Error(`Function file not found: ${functionName}`);
    }
}));
