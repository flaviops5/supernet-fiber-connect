-- Criar tabela de configuração financeira (valores configuráveis)
CREATE TABLE IF NOT EXISTS public.financial_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Multa e Juros
  late_fee_fixed NUMERIC(10,2) NOT NULL DEFAULT 2.58,
  late_fee_daily NUMERIC(10,4) NOT NULL DEFAULT 0.04,
  
  -- Prazos
  min_days_for_negotiation INTEGER NOT NULL DEFAULT 45,
  courtesy_cooldown_months INTEGER NOT NULL DEFAULT 12,
  courtesy_max_debt NUMERIC(10,2) NOT NULL DEFAULT 200.00,
  courtesy_payment_deadline_hours INTEGER NOT NULL DEFAULT 48,
  
  -- Limites de Parcelamento
  min_installment_value NUMERIC(10,2) NOT NULL DEFAULT 30.00,
  min_down_payment_percentage INTEGER NOT NULL DEFAULT 20,
  
  -- Regras de Negociação (3 etapas)
  negotiation_step1_remove_fee BOOLEAN NOT NULL DEFAULT true,
  negotiation_step1_remove_interest BOOLEAN NOT NULL DEFAULT true,
  negotiation_step1_installments INTEGER NOT NULL DEFAULT 1,
  
  negotiation_step2_remove_fee BOOLEAN NOT NULL DEFAULT true,
  negotiation_step2_interest_discount_percent INTEGER NOT NULL DEFAULT 80,
  negotiation_step2_installments INTEGER NOT NULL DEFAULT 2,
  
  negotiation_step3_remove_fee BOOLEAN NOT NULL DEFAULT true,
  negotiation_step3_interest_discount_percent INTEGER NOT NULL DEFAULT 30,
  negotiation_step3_installments INTEGER NOT NULL DEFAULT 3,
  
  -- Metadados
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT
);

-- RLS para financial_config
ALTER TABLE public.financial_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar configurações financeiras"
  ON public.financial_config FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Editores podem visualizar configurações financeiras"
  ON public.financial_config FOR SELECT
  USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

-- Inserir configuração padrão
INSERT INTO public.financial_config (
  late_fee_fixed,
  late_fee_daily,
  min_days_for_negotiation,
  notes
) VALUES (
  2.58,
  0.04,
  45,
  'Configuração padrão baseada no CDC - Código de Defesa do Consumidor'
);

-- Criar subject "segunda_via" se não existir
INSERT INTO public.agent_flow_subjects (
  agent_type,
  subject_key,
  subject_name,
  icon,
  description,
  display_order,
  is_active
) VALUES (
  'support-financial-agent',
  'segunda_via',
  'Segunda Via de Fatura',
  '📄',
  'Envio de segunda via de boleto, PIX e código de barras',
  1,
  true
) ON CONFLICT (agent_type, subject_key) DO NOTHING;

-- Criar subject "renegociacao" se não existir
INSERT INTO public.agent_flow_subjects (
  agent_type,
  subject_key,
  subject_name,
  icon,
  description,
  display_order,
  is_active
) VALUES (
  'support-financial-agent',
  'renegociacao',
  'Renegociação de Débitos',
  '💰',
  'Negociação de faturas em atraso com descontos progressivos',
  2,
  true
) ON CONFLICT (agent_type, subject_key) DO NOTHING;

-- Steps para SEGUNDA VIA
INSERT INTO public.agent_flow_steps (
  agent_type,
  subject_key,
  step_key,
  step_order,
  question,
  instruction,
  awaits_response,
  tool_calls,
  response_options,
  next_step_map,
  is_active
) VALUES 
-- Step 1: Identificar necessidade
(
  'support-financial-agent',
  'segunda_via',
  'segunda_via_inicio',
  1,
  'Cliente solicitou segunda via de fatura, boleto ou código de barras?',
  'Cliente está pedindo segunda via. VOCÊ JÁ TEM OS DADOS NO CONTEXTO DO SISTEMA. NÃO pergunte "qual mês" ou "qual vencimento". FORNEÇA IMEDIATAMENTE seguindo a REGRA CRÍTICA: Apresente o que está VENCIDO primeiro. Se não houver vencido, apresente o próximo a vencer. Use a data atual do contexto para comparar com data_vencimento.',
  true,
  '[]'::jsonb,
  '[
    {"value": "tem_dados", "label": "Tenho dados de pagamento no contexto"},
    {"value": "buscar_dados", "label": "Preciso buscar dados"}
  ]'::jsonb,
  '{
    "tem_dados": "segunda_via_apresentar",
    "buscar_dados": "segunda_via_buscar"
  }'::jsonb,
  true
),
-- Step 2: Apresentar dados (quando já tem)
(
  'support-financial-agent',
  'segunda_via',
  'segunda_via_apresentar',
  2,
  'Apresente os dados de pagamento completos ao cliente',
  'FORMATO OBRIGATÓRIO:
  
  📄 DADOS PARA PAGAMENTO:
  
  💵 Valor: R$ [valor]
  📅 Vencimento: [data_vencimento]
  
  🏦 PIX COPIA E COLA:
  [codigoPix completo - só o código, sem link https]
  
  🔢 Código de Barras:
  [codbar completo]
  
  📎 Link do Boleto: [url_boleto]
  🔗 Link de Pagamento: [qrcode_link]
  
  ATENÇÃO: NÃO mande APENAS link https. SEMPRE envie o código PIX completo e código de barras. Links são COMPLEMENTARES.',
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb,
  true
),
-- Step 3: Buscar dados (quando não tem)
(
  'support-financial-agent',
  'segunda_via',
  'segunda_via_buscar',
  3,
  'Busque os dados de pagamento do cliente no IXC',
  'Use a ferramenta getFinancialTitles do IXC para buscar títulos pendentes. Após obter, vá para segunda_via_apresentar.',
  false,
  '[{"tool": "getFinancialTitles", "params": ["customerId"]}]'::jsonb,
  '[]'::jsonb,
  '{"success": "segunda_via_apresentar"}'::jsonb,
  true
);

-- Steps para RENEGOCIAÇÃO
INSERT INTO public.agent_flow_steps (
  agent_type,
  subject_key,
  step_key,
  step_order,
  question,
  instruction,
  awaits_response,
  tool_calls,
  response_options,
  next_step_map,
  metadata,
  is_active
) VALUES 
-- Step 1: Validar prazo mínimo
(
  'support-financial-agent',
  'renegociacao',
  'renegociacao_validar_prazo',
  1,
  'Cliente deseja renegociar débito?',
  'REGRA CRÍTICA: Só podemos negociar débitos com MAIS DE 45 DIAS de atraso. Você tem a data atual no contexto. Compare com data_vencimento. Se tiver menos de 46 dias, informe que ainda não é possível negociar, mas pode fornecer os dados de pagamento normal.',
  true,
  '[]'::jsonb,
  '[
    {"value": "elegivel", "label": "Mais de 45 dias - Elegível"},
    {"value": "nao_elegivel", "label": "Menos de 46 dias - Não elegível"}
  ]'::jsonb,
  '{
    "elegivel": "renegociacao_informar_valores",
    "nao_elegivel": "renegociacao_orientar_prazo"
  }'::jsonb,
  '{"rule": "min_45_days"}'::jsonb,
  true
),
-- Step 2: Orientar sobre prazo (se não elegível)
(
  'support-financial-agent',
  'renegociacao',
  'renegociacao_orientar_prazo',
  2,
  'Informe que não é possível negociar ainda',
  'Cliente [Nome], a negociação só está disponível para débitos com mais de 45 dias de atraso. O seu débito ainda não atingiu esse prazo. 

  Mas posso te ajudar com os dados de pagamento! Quer que eu envie o PIX e boleto atualizado?',
  true,
  '[]'::jsonb,
  '[
    {"value": "enviar_dados", "label": "Sim, enviar dados"},
    {"value": "encerrar", "label": "Não, encerrar"}
  ]'::jsonb,
  '{
    "enviar_dados": "segunda_via_apresentar",
    "encerrar": "renegociacao_encerrar"
  }'::jsonb,
  '{"reason": "under_45_days"}'::jsonb,
  true
),
-- Step 3: Informar valores (se elegível)
(
  'support-financial-agent',
  'renegociacao',
  'renegociacao_informar_valores',
  3,
  'Informe valores de multa e juros acumulados',
  'SCRIPT OBRIGATÓRIO:
  
  [Nome], vi que você tem [X] fatura(s) em aberto. Vou calcular o valor atualizado:
  
  📊 VALORES:
  - Valor original: R$ [soma valores]
  - Multa (R$ 2,58): R$ [2,58 × faturas]
  - Juros por atraso (R$ 0,04/dia): R$ [0,04 × dias × faturas]
  
  💰 TOTAL ATUALIZADO: R$ [total]
  
  Agimos em conformidade com o Código de Defesa do Consumidor.
  
  Mas tenho uma ótima notícia! Posso te oferecer um acordo especial. Quer saber?',
  true,
  '[]'::jsonb,
  '[
    {"value": "sim", "label": "Sim, quer acordo"},
    {"value": "nao", "label": "Não quer negociar"}
  ]'::jsonb,
  '{
    "sim": "renegociacao_etapa1",
    "nao": "renegociacao_encerrar"
  }'::jsonb,
  '{"calculation_rules": "fee_2.58 + interest_0.04_per_day"}'::jsonb,
  true
),
-- Step 4: Etapa 1 - Melhor oferta (elimina tudo)
(
  'support-financial-agent',
  'renegociacao',
  'renegociacao_etapa1',
  4,
  'Ofereça a 1ª proposta - pagamento à vista com eliminação total de multa e juros',
  'PROPOSTA 1 (MELHOR):
  
  🎁 OFERTA ESPECIAL À VISTA:
  
  Vou eliminar TODA a multa e TODOS os juros!
  Você paga apenas o valor original: R$ [valor_sem_multa_juros]
  
  Pagamento via PIX (mais rápido) ou boleto.
  
  Consegue fazer esse pagamento à vista? É a melhor condição que posso oferecer! 😊',
  true,
  '[]'::jsonb,
  '[
    {"value": "aceita", "label": "Aceita à vista"},
    {"value": "recusa", "label": "Não consegue à vista"}
  ]'::jsonb,
  '{
    "aceita": "renegociacao_finalizar_acordo",
    "recusa": "renegociacao_etapa2"
  }'::jsonb,
  '{"step": 1, "removes": "all_fees_and_interest", "installments": 1}'::jsonb,
  true
),
-- Step 5: Etapa 2 - 2ª proposta (2x com 80% desc juros)
(
  'support-financial-agent',
  'renegociacao',
  'renegociacao_etapa2',
  5,
  'Ofereça a 2ª proposta - 2x com eliminação de multa e 80% desconto nos juros',
  'PROPOSTA 2:
  
  Entendo! Então vou fazer assim:
  
  ✅ Elimino a multa
  ✅ Desconto de 80% nos juros
  ✅ Parcelado em 2x
  
  📌 VALORES:
  - 1ª parcela (PIX): R$ [valor/2]
  - 2ª parcela (Boleto): R$ [valor/2]
  
  💰 Total: R$ [valor_com_desc_80_juros]
  
  Fechamos assim?',
  true,
  '[]'::jsonb,
  '[
    {"value": "aceita", "label": "Aceita 2x"},
    {"value": "recusa", "label": "Não consegue 2x"}
  ]'::jsonb,
  '{
    "aceita": "renegociacao_finalizar_acordo",
    "recusa": "renegociacao_etapa3"
  }'::jsonb,
  '{"step": 2, "removes_fee": true, "interest_discount": 80, "installments": 2}'::jsonb,
  true
),
-- Step 6: Etapa 3 - 3ª proposta (3x com 30% desc juros)
(
  'support-financial-agent',
  'renegociacao',
  'renegociacao_etapa3',
  6,
  'Ofereça a 3ª proposta - 3x com eliminação de multa e 30% desconto nos juros',
  'PROPOSTA 3 (ÚLTIMA):
  
  Vou fazer uma última condição especial:
  
  ✅ Elimino a multa
  ✅ Desconto de 30% nos juros
  ✅ Parcelado em 3x
  
  📌 VALORES:
  - 1ª parcela (PIX): R$ [valor/3]
  - 2ª parcela (Boleto): R$ [valor/3]
  - 3ª parcela (Boleto): R$ [valor/3]
  
  💰 Total: R$ [valor_com_desc_30_juros]
  
  Essa é a condição máxima que posso oferecer. Consegue?',
  true,
  '[]'::jsonb,
  '[
    {"value": "aceita", "label": "Aceita 3x"},
    {"value": "recusa", "label": "Não consegue"}
  ]'::jsonb,
  '{
    "aceita": "renegociacao_finalizar_acordo",
    "recusa": "renegociacao_contraproposta"
  }'::jsonb,
  '{"step": 3, "removes_fee": true, "interest_discount": 30, "installments": 3}'::jsonb,
  true
),
-- Step 7: Contraproposta do cliente
(
  'support-financial-agent',
  'renegociacao',
  'renegociacao_contraproposta',
  7,
  'Solicite uma contraproposta do cliente',
  'Entendo sua situação, [Nome]. 
  
  Me diz uma coisa: quanto você consegue pagar por mês sem apertar muito? Vou passar sua proposta para aprovação especial, ok?
  
  Aguarde alguns instantes...',
  true,
  '[]'::jsonb,
  '[
    {"value": "tem_proposta", "label": "Cliente fez proposta"}
  ]'::jsonb,
  '{
    "tem_proposta": "renegociacao_transferir_humano"
  }'::jsonb,
  '{"requires_approval": true}'::jsonb,
  true
),
-- Step 8: Transferir para humano (casos especiais)
(
  'support-financial-agent',
  'renegociacao',
  'renegociacao_transferir_humano',
  8,
  'Transfira para especialista humano',
  'Vou transferir você para um especialista que tem mais autonomia para analisar sua situação, ok? Em instantes você será atendido!',
  false,
  '[{"tool": "transferToHuman", "department": "financial"}]'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb,
  '{"escalation_reason": "custom_negotiation"}'::jsonb,
  true
),
-- Step 9: Finalizar acordo
(
  'support-financial-agent',
  'renegociacao',
  'renegociacao_finalizar_acordo',
  9,
  'Confirme o acordo e envie dados de pagamento',
  'Perfeito! Fechamos o acordo então! 🤝
  
  Vou te enviar os dados de pagamento atualizados:
  
  [ENVIAR DADOS COMPLETOS COMO EM segunda_via_apresentar]
  
  ⚠️ IMPORTANTE: O retorno do serviço só acontece após o pagamento da primeira parcela ser confirmado.
  
  Precisa de mais alguma coisa?',
  true,
  '[]'::jsonb,
  '[
    {"value": "nao", "label": "Não precisa"},
    {"value": "sim", "label": "Tem dúvida"}
  ]'::jsonb,
  '{
    "nao": "renegociacao_encerrar",
    "sim": "renegociacao_esclarecer"
  }'::jsonb,
  '{"agreement_confirmed": true}'::jsonb,
  true
),
-- Step 10: Encerrar
(
  'support-financial-agent',
  'renegociacao',
  'renegociacao_encerrar',
  10,
  'Encerre o atendimento',
  'Fico feliz em ter ajudado! Qualquer dúvida, estou à disposição. 

  Tenha um ótimo dia! 😊',
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb,
  '{"close_conversation": true}'::jsonb,
  true
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_financial_config_timestamp
  BEFORE UPDATE ON public.financial_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();