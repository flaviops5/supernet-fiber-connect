import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const LOCAWEB_API_TOKEN = Deno.env.get("LOCAWEB_API_TOKEN");
const LOCAWEB_API_URL = "https://api.locaweb.com.br/v1/messages";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string | string[];
  from: string;
  subject: string;
  body: string;
  cc?: string | string[];
  bcc?: string | string[];
  headers?: Record<string, string>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOCAWEB_API_TOKEN) {
      throw new Error("LOCAWEB_API_TOKEN não configurado");
    }

    const emailData: EmailRequest = await req.json();

    console.log("Enviando email via Locaweb:", {
      to: emailData.to,
      subject: emailData.subject,
    });

    const response = await fetch(LOCAWEB_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOCAWEB_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
        from: emailData.from,
        subject: emailData.subject,
        body: emailData.body,
        ...(emailData.cc && { cc: Array.isArray(emailData.cc) ? emailData.cc : [emailData.cc] }),
        ...(emailData.bcc && { bcc: Array.isArray(emailData.bcc) ? emailData.bcc : [emailData.bcc] }),
        ...(emailData.headers && { headers: emailData.headers }),
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Erro ao enviar email:", responseData);
      throw new Error(`Falha ao enviar email: ${JSON.stringify(responseData)}`);
    }

    console.log("Email enviado com sucesso:", responseData);

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Erro no envio de email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        },
      }
    );
  }
};

serve(handler);
