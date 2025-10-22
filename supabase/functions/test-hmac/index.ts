import { createPublicHandler } from '../_shared/base-handler.ts';
import { addHMACHeaders } from '../_shared/hmac.ts';

Deno.serve(createPublicHandler('test-hmac', async (req) => {
    const HMAC_SECRET = Deno.env.get('HMAC_SHARED_SECRET');
    
    if (!HMAC_SECRET) {
      throw new Error('HMAC_SHARED_SECRET não configurado');
    }

    // Teste de assinatura HMAC
    const testPayload = { 
      test: 'Testando HMAC',
      timestamp: Date.now(),
      method: 'GET',
      path: '/test'
    };

    console.log('🔑 Testando assinatura HMAC...');
    console.log('📝 Secret length:', HMAC_SECRET.length);
    console.log('📦 Payload:', testPayload);

    const headers = await addHMACHeaders(testPayload, HMAC_SECRET);
    
    console.log('✅ Headers HMAC gerados:', headers);

    return {
      status: 'success',
      message: 'HMAC funcionando corretamente!',
      secret_configured: true,
      secret_length: HMAC_SECRET.length,
      headers_generated: Object.keys(headers),
      sample_signature: headers['X-HMAC-Signature']?.substring(0, 20) + '...',
      sample_timestamp: headers['X-HMAC-Timestamp']
    };
}));
