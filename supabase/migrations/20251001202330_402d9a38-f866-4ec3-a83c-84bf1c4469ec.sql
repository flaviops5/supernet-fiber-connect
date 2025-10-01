-- Criar tabela de templates de notificação
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  days_before_due INTEGER NOT NULL,
  whatsapp_template TEXT NOT NULL,
  email_subject_template TEXT NOT NULL,
  email_body_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Templates são visíveis para todos autenticados"
  ON notification_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins podem gerenciar templates"
  ON notification_templates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editors podem gerenciar templates"
  ON notification_templates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'editor'::user_role));

-- Inserir templates padrão
INSERT INTO notification_templates (name, description, days_before_due, whatsapp_template, email_subject_template, email_body_template) VALUES
(
  'Lembrete 10 dias',
  'Notificação enviada 10 dias antes do vencimento',
  10,
  'Olá {{cliente_nome}}! 🔔

Este é um lembrete de que sua fatura no valor de {{valor}} vencerá em *10 dias* ({{data_vencimento}}).

Para evitar interrupção do serviço, realize o pagamento até a data de vencimento.

*SUPERNET FIBRA* - Internet de qualidade! 🚀',
  'Lembrete: Sua fatura vence em 10 dias - {{data_vencimento}}',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #fb7185 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .alert { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SUPERNET FIBRA</h1>
      <p>Lembrete de Pagamento</p>
    </div>
    <div class="content">
      <p>Olá, <strong>{{cliente_nome}}</strong>!</p>
      
      <div class="alert">
        <p><strong>📅 Sua fatura vencerá em 10 dias</strong></p>
        <p style="font-size: 18px; margin: 10px 0;">Valor: <strong>{{valor}}</strong></p>
        <p>Data de vencimento: <strong>{{data_vencimento}}</strong></p>
      </div>
      
      <p>Este é um lembrete amigável para que você possa se organizar e realizar o pagamento até a data de vencimento.</p>
      
      <p>Caso já tenha efetuado o pagamento, por favor desconsidere este aviso.</p>
      
      <div style="text-align: center;">
        <a href="https://wa.me/5561999999999" class="button">Falar com Suporte no WhatsApp</a>
      </div>
      
      <div class="footer">
        <p>SUPERNET FIBRA - Internet de Alta Velocidade</p>
        <p>📞 (61) 99999-9999 | 📧 contato@supernetfibra.com.br</p>
      </div>
    </div>
  </div>
</body>
</html>'
),
(
  'Alerta 1 dia',
  'Notificação urgente enviada 1 dia antes do vencimento',
  1,
  '⚠️ *Aviso Importante* ⚠️

Olá {{cliente_nome}}!

Sua fatura de {{valor}} vence *AMANHÃ* ({{data_vencimento}}).

⏰ Para evitar a suspensão do serviço, efetue o pagamento hoje!

*SUPERNET FIBRA* - Estamos aqui para você! 💙',
  '⚠️ Última chamada: Fatura vence amanhã - {{data_vencimento}}',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #fb7185 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .alert { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SUPERNET FIBRA</h1>
      <p>⚠️ Aviso Urgente</p>
    </div>
    <div class="content">
      <p>Olá, <strong>{{cliente_nome}}</strong>!</p>
      
      <div class="alert">
        <p><strong>⏰ Sua fatura vence AMANHÃ</strong></p>
        <p style="font-size: 18px; margin: 10px 0;">Valor: <strong>{{valor}}</strong></p>
        <p>Data de vencimento: <strong>{{data_vencimento}}</strong></p>
      </div>
      
      <p>Para evitar a suspensão do seu serviço de internet, realize o pagamento <strong>hoje mesmo</strong>.</p>
      
      <p>Caso já tenha efetuado o pagamento, por favor desconsidere este aviso.</p>
      
      <div style="text-align: center;">
        <a href="https://wa.me/5561999999999" class="button">Falar com Suporte no WhatsApp</a>
      </div>
      
      <div class="footer">
        <p>SUPERNET FIBRA - Internet de Alta Velocidade</p>
        <p>📞 (61) 99999-9999 | 📧 contato@supernetfibra.com.br</p>
      </div>
    </div>
  </div>
</body>
</html>'
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();