import { createPublicHandler } from "../_shared/base-handler.ts";

const LOCAWEB_API_TOKEN = Deno.env.get("LOCAWEB_API_TOKEN");
const LOCAWEB_API_URL = "https://api.smtplw.com.br/v1/messages";

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

Deno.serve(createPublicHandler('send-locaweb-email', async (req, { supabase }) => {
  if (!LOCAWEB_API_TOKEN) {
    throw new Error("LOCAWEB_API_TOKEN não configurado");
  }

  const emailData: EmailRequest = await req.json();
    
    let finalSubject = emailData.subject || "";
    let finalBody = emailData.body || "";
    let finalFrom = emailData.from;

  // Se não houver 'from', buscar das configurações
  if (!finalFrom) {
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

  return {
    success: true,
    data: responseData,
  };
}));
