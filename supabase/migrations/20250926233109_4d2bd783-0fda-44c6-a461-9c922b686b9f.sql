-- Criar tabela para templates de contratos
CREATE TABLE public.contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_content TEXT NOT NULL, -- HTML/texto com placeholders
  plan_types JSONB DEFAULT '[]'::jsonb, -- Array de tipos de plano que usam este template
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage contract templates" 
ON public.contract_templates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editors can manage contract templates" 
ON public.contract_templates 
FOR ALL 
USING (has_role(auth.uid(), 'editor'::user_role));

CREATE POLICY "Active templates are publicly readable" 
ON public.contract_templates 
FOR SELECT 
USING (is_active = true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_contract_templates_updated_at
BEFORE UPDATE ON public.contract_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir template padrão como exemplo
INSERT INTO public.contract_templates (name, description, template_content, plan_types) VALUES (
  'Contrato Padrão Internet Fibra',
  'Template padrão para contratos de internet fibra óptica',
  '<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contrato de Prestação de Serviços - {{CONTRACT_NUMBER}}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: white;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .contract-number {
            font-size: 18px;
            font-weight: bold;
            color: #e11d48;
            margin-bottom: 10px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #333;
            border-left: 4px solid #e11d48;
            padding-left: 10px;
        }
        .data-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 20px;
        }
        .data-item {
            padding: 10px;
            background: #f8f9fa;
            border-radius: 5px;
        }
        .data-label {
            font-weight: bold;
            color: #333;
        }
        .terms {
            font-size: 14px;
            line-height: 1.8;
            text-align: justify;
            margin-bottom: 20px;
        }
        .signature-area {
            margin-top: 50px;
            border-top: 1px solid #ddd;
            padding-top: 30px;
        }
        .signature-block {
            margin-top: 40px;
            text-align: center;
        }
        .signature-line {
            border-top: 1px solid #333;
            width: 300px;
            margin: 0 auto 10px;
        }
        .date-location {
            text-align: right;
            margin-bottom: 30px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="contract-number">Contrato Nº {{CONTRACT_NUMBER}}</div>
        <div class="title">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</div>
        <div class="subtitle">SUPERNET FIBRA</div>
    </div>

    <div class="date-location">
        Brasília/DF, {{CURRENT_DATE}}
    </div>

    <div class="section">
        <div class="section-title">DADOS DO CONTRATANTE</div>
        <div class="data-grid">
            <div class="data-item">
                <div class="data-label">Nome Completo:</div>
                <div>{{CUSTOMER_NAME}}</div>
            </div>
            <div class="data-item">
                <div class="data-label">CPF:</div>
                <div>{{CUSTOMER_CPF}}</div>
            </div>
            <div class="data-item">
                <div class="data-label">E-mail:</div>
                <div>{{CUSTOMER_EMAIL}}</div>
            </div>
            <div class="data-item">
                <div class="data-label">Telefone:</div>
                <div>{{CUSTOMER_PHONE}}</div>
            </div>
        </div>
        <div class="data-item">
            <div class="data-label">Endereço de Instalação:</div>
            <div>{{CUSTOMER_ADDRESS}} - CEP: {{CUSTOMER_CEP}}</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">PLANO CONTRATADO</div>
        <div class="data-grid">
            <div class="data-item">
                <div class="data-label">Plano:</div>
                <div>{{PLAN_NAME}}</div>
            </div>
            <div class="data-item">
                <div class="data-label">Velocidade:</div>
                <div>{{PLAN_SPEED}}</div>
            </div>
            <div class="data-item">
                <div class="data-label">Valor Mensal:</div>
                <div>R$ {{PLAN_PRICE}}</div>
            </div>
            <div class="data-item">
                <div class="data-label">Agendamento:</div>
                <div>{{APPOINTMENT_DATE}} - {{APPOINTMENT_PERIOD}}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">TERMOS E CONDIÇÕES</div>
        <div class="terms">
            <p><strong>1. OBJETO:</strong> O presente contrato tem por objeto a prestação de serviços de provimento de acesso à internet banda larga através de fibra óptica, nas condições aqui estabelecidas.</p>
            
            <p><strong>2. PRAZO:</strong> Este contrato tem prazo indeterminado, iniciando-se na data de instalação dos equipamentos e ativação dos serviços.</p>
            
            <p><strong>3. VALOR E PAGAMENTO:</strong> O valor mensal do plano contratado é de R$ {{PLAN_PRICE}} ({{PLAN_PRICE_WORDS}}), devendo ser pago até o dia 10 de cada mês.</p>
            
            <p><strong>4. INSTALAÇÃO:</strong> A instalação será realizada na data agendada: {{APPOINTMENT_DATE}} no período {{APPOINTMENT_PERIOD}}, sem custos adicionais para o contratante.</p>
            
            <p><strong>5. VELOCIDADE:</strong> A velocidade contratada é de {{PLAN_SPEED}}, garantindo no mínimo 80% da velocidade nominal.</p>
            
            <p><strong>6. RESPONSABILIDADES:</strong> A SUPERNET FIBRA compromete-se a fornecer o serviço com qualidade e disponibilidade de 99,5% do tempo, exceto em casos de força maior.</p>
            
            <p><strong>7. RESCISÃO:</strong> Qualquer das partes poderá rescindir este contrato mediante aviso prévio de 30 (trinta) dias.</p>
            
            <p><strong>8. FORO:</strong> Fica eleito o foro da Comarca de Brasília/DF para dirimir quaisquer questões decorrentes deste contrato.</p>
        </div>
    </div>

    <div class="signature-area">
        <div class="signature-block">
            <div class="signature-line"></div>
            <div><strong>SUPERNET FIBRA</strong></div>
            <div>CNPJ: 00.000.000/0001-00</div>
        </div>

        <div class="signature-block">
            <div class="signature-line"></div>
            <div><strong>{{CUSTOMER_NAME}}</strong></div>
            <div>CPF: {{CUSTOMER_CPF}}</div>
            <div>Assinatura Digital</div>
        </div>
    </div>
</body>
</html>',
  '["all"]'::jsonb
);