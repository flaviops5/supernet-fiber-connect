import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOCAWEB_API_TOKEN = Deno.env.get("LOCAWEB_API_TOKEN");
const LOCAWEB_API_URL = "https://api.smtplw.com.br/v1/messages";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string | string[];
  from?: string;
  subject?: string;
  body?: string;
  cc?: string | string[];
  bcc?: string | string[];
  headers?: Record<string, string>;
  // Suporte para templates
  template_slug?: string;
  template_variables?: Record<string, string>;
}

function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
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
    
    let finalSubject = emailData.subject || "";
    let finalBody = emailData.body || "";
    let finalFrom = emailData.from;

    // Se não houver 'from', buscar das configurações
    if (!finalFrom) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { data: emailSettings } = await supabase
        .from('email_settings')
        .select('default_from_email, default_from_name')
        .single();

      if (emailSettings) {
        finalFrom = `${emailSettings.default_from_name} <${emailSettings.default_from_email}>`;
      } else {
        finalFrom = "noreply@supernet.com.br"; // fallback
      }
    }

    // Se um template foi especificado, buscar e processar
    if (emailData.template_slug) {
      console.log("Buscando template:", emailData.template_slug);
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('slug', emailData.template_slug)
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        throw new Error(`Template não encontrado: ${emailData.template_slug}`);
      }

      // Substituir variáveis no assunto e corpo
      const variables = emailData.template_variables || {};
      finalSubject = replaceVariables(template.subject, variables);
      finalBody = replaceVariables(template.body_html, variables);
      
      console.log("Template processado com sucesso");
    }

    if (!finalSubject || !finalBody || !finalFrom) {
      throw new Error("Assunto, corpo e remetente do email são obrigatórios");
    }

    console.log("Enviando email via Locaweb:", {
      to: emailData.to,
      from: finalFrom,
      subject: finalSubject,
    });

    const response = await fetch(LOCAWEB_API_URL, {
      method: "POST",
      headers: {
        "x-auth-token": LOCAWEB_API_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
        from: finalFrom,
        subject: finalSubject,
        body: finalBody,
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
