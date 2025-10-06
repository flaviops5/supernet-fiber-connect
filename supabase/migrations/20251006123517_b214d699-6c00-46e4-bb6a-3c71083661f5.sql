-- Template de email para recuperação de senha da Telemedicina
INSERT INTO email_templates (
  name,
  slug,
  subject,
  body_html,
  body_plain,
  description,
  category,
  is_active,
  variables
) VALUES (
  'Recuperação de Senha - Telemedicina',
  'telemedicina-password-recovery',
  'Recuperação de Senha - Portal de Telemedicina SUPERNET',
  '<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha - Telemedicina</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #fb7185 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #ef4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 Portal de Telemedicina</h1>
      <p style="margin: 0; opacity: 0.9;">SUPERNET FIBRA</p>
    </div>
    <div class="content">
      <h2>Olá, {{customer_name}}!</h2>
      
      <p>Recebemos uma solicitação de recuperação de senha para o seu acesso ao <strong>Portal de Telemedicina SUPERNET</strong>.</p>
      
      <p>Para redefinir sua senha, clique no botão abaixo:</p>
      
      <div style="text-align: center;">
        <a href="{{recovery_url}}" class="button">🔐 Redefinir Minha Senha</a>
      </div>
      
      <div class="warning">
        <strong>⚠️ Importante:</strong>
        <ul style="margin: 10px 0;">
          <li>Este link é válido por 24 horas</li>
          <li>Caso não tenha solicitado esta recuperação, ignore este e-mail</li>
          <li>Sua senha atual permanecerá ativa até que você complete o processo</li>
        </ul>
      </div>
      
      <p><strong>Seus dados:</strong></p>
      <ul>
        <li><strong>CPF:</strong> {{customer_cpf}}</li>
        <li><strong>Nome:</strong> {{customer_name}}</li>
      </ul>
      
      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <strong>Precisa de ajuda?</strong><br>
        Entre em contato conosco pelo WhatsApp: (61) 99947-5886
      </p>
    </div>
    <div class="footer">
      <p><strong>SUPERNET FIBRA - Telemedicina 24h</strong></p>
      <p>Este é um e-mail automático, não responda.</p>
    </div>
  </div>
</body>
</html>',
  'Olá {{customer_name}},

Recebemos uma solicitação de recuperação de senha para o seu acesso ao Portal de Telemedicina SUPERNET.

Para redefinir sua senha, acesse o link abaixo:
{{recovery_url}}

IMPORTANTE:
- Este link é válido por 24 horas
- Caso não tenha solicitado esta recuperação, ignore este e-mail
- Sua senha atual permanecerá ativa até que você complete o processo

Seus dados:
- CPF: {{customer_cpf}}
- Nome: {{customer_name}}

Precisa de ajuda? Entre em contato pelo WhatsApp: (61) 99947-5886

SUPERNET FIBRA - Telemedicina 24h
Este é um e-mail automático, não responda.',
  'Template de e-mail enviado quando o cliente solicita recuperação de senha no portal de Telemedicina',
  'telemedicina',
  true,
  '["customer_name", "recovery_url", "customer_cpf"]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  body_plain = EXCLUDED.body_plain,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  variables = EXCLUDED.variables,
  updated_at = now();