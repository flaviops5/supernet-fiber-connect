import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  title: string;
  category?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  console.log('generate-featured-image started', {
    requestId,
    timestamp: new Date().toISOString(),
  });

  try {
    const { title, category }: RequestBody = await req.json();

    if (!title) {
      throw new Error('Title is required');
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Generating featured image', {
      requestId,
      title,
      category: category || 'general',
    });

    // Build prompt for image generation optimized for blog featured images
    const imagePrompt = `Create a professional, modern featured image for a blog post titled "${title}"${category ? ` in the ${category} category` : ''}. 
    
Style: Clean, professional, tech-focused, vibrant colors, 16:9 aspect ratio.
Elements: Abstract tech elements, modern design, suitable for a blog header.
Quality: High resolution, eye-catching, suitable for web display.

Do NOT include any text, words, or letters in the image.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: imagePrompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', {
        requestId,
        status: response.status,
        error: errorText,
      });
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (response.status === 402) {
        throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
      }
      
      throw new Error(`AI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('AI response received', {
      requestId,
      hasImages: !!data.choices?.[0]?.message?.images,
      imageCount: data.choices?.[0]?.message?.images?.length || 0,
    });

    // Extract the generated image
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error('No image in response', {
        requestId,
        response: JSON.stringify(data).substring(0, 500),
      });
      throw new Error('No image generated in response');
    }

    const duration = Date.now() - startTime;

    console.log('generate-featured-image completed', {
      requestId,
      duration,
      imageSize: imageUrl.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        duration,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('generate-featured-image error', {
      requestId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
