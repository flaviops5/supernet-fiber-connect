-- Cenários DNS (support-tech-agent)
INSERT INTO agent_flow_scenario_approvals (agent_type, subject_key, scenario_key, variation_path, status, notes)
VALUES
  ('support-tech-agent', 'dns', 'dns_correto_funcionando', 'cliente_confirma_dns_correto_sem_problemas', 'approved', 'Cliente confirma que DNS está configurado corretamente e internet funciona normalmente'),
  ('support-tech-agent', 'dns', 'dns_incorreto', 'cliente_relata_sites_nao_abrem_mas_whatsapp_funciona', 'approved', 'Sintoma clássico de DNS incorreto - apps funcionam mas navegação web não'),
  ('support-tech-agent', 'dns', 'cliente_nao_sabe_dns', 'cliente_pergunta_o_que_e_dns', 'approved', 'Cliente não tem conhecimento técnico sobre DNS, precisa de explicação didática'),
  ('support-tech-agent', 'dns', 'dns_configurado_sucesso', 'apos_orientacao_cliente_confirma_funcionamento', 'approved', 'Cliente seguiu instruções, configurou DNS e confirmou que voltou a funcionar'),
  ('support-tech-agent', 'dns', 'dns_problema_persiste', 'cliente_configurou_mas_ainda_nao_funciona', 'approved', 'DNS foi configurado mas problema persiste - pode ser cache ou outro problema');

-- Cenários Segunda Via de Boleto (support-financial-agent)
INSERT INTO agent_flow_scenario_approvals (agent_type, subject_key, scenario_key, variation_path, status, notes)
VALUES
  ('support-financial-agent', 'segunda_via', 'boleto_vencido_encontrado', 'cliente_tem_fatura_vencida_apresentar_primeiro', 'approved', 'Sistema encontrou boleto vencido - deve ser apresentado prioritariamente'),
  ('support-financial-agent', 'segunda_via', 'boleto_a_vencer', 'cliente_em_dia_apresentar_proxima_fatura', 'approved', 'Cliente está em dia, apresentar próxima fatura a vencer'),
  ('support-financial-agent', 'segunda_via', 'multiplos_boletos_vencidos', 'cliente_tem_varios_boletos_atrasados', 'approved', 'Cliente tem múltiplas faturas vencidas - apresentar todas por ordem de vencimento'),
  ('support-financial-agent', 'segunda_via', 'dados_completos_enviados', 'pix_barcode_links_enviados_com_sucesso', 'approved', 'Todos os dados de pagamento foram enviados formatados corretamente'),
  ('support-financial-agent', 'segunda_via', 'cliente_prefere_pix', 'cliente_pede_especificamente_codigo_pix', 'approved', 'Cliente demonstra preferência por PIX - enfatizar código copia-e-cola');

-- Cenários Renegociação de Débitos (support-financial-agent)
INSERT INTO agent_flow_scenario_approvals (agent_type, subject_key, scenario_key, variation_path, status, notes)
VALUES
  ('support-financial-agent', 'renegociacao', 'debito_nao_elegivel', 'debito_menos_45_dias_recusar_negociacao', 'approved', 'Débito tem menos de 45 dias - não elegível para negociação'),
  ('support-financial-agent', 'renegociacao', 'debito_elegivel', 'debito_mais_45_dias_iniciar_negociacao', 'approved', 'Débito tem mais de 45 dias - elegível para as 3 etapas de negociação'),
  ('support-financial-agent', 'renegociacao', 'etapa1_aceita', 'cliente_aceita_pagamento_a_vista_sem_multa_juros', 'approved', 'Cliente aceita Etapa 1: à vista eliminando 100% multa e juros'),
  ('support-financial-agent', 'renegociacao', 'etapa1_recusa', 'cliente_nao_consegue_pagar_a_vista', 'approved', 'Cliente recusa à vista, prosseguir para Etapa 2'),
  ('support-financial-agent', 'renegociacao', 'etapa2_aceita', 'cliente_aceita_2x_com_desconto_80_juros', 'approved', 'Cliente aceita Etapa 2: 2x sem multa + 80% desconto juros'),
  ('support-financial-agent', 'renegociacao', 'etapa2_recusa', 'cliente_precisa_parcelar_mais', 'approved', 'Cliente precisa parcelar mais vezes, prosseguir para Etapa 3'),
  ('support-financial-agent', 'renegociacao', 'etapa3_aceita', 'cliente_aceita_3x_com_desconto_30_juros', 'approved', 'Cliente aceita Etapa 3: 3x sem multa + 30% desconto juros'),
  ('support-financial-agent', 'renegociacao', 'etapa3_recusa_contraproposta', 'cliente_faz_contraproposta_valores_parcelas', 'approved', 'Cliente recusa todas etapas e faz contraproposta - transferir para humano'),
  ('support-financial-agent', 'renegociacao', 'multiplas_faturas_vencidas', 'cliente_tem_2_ou_mais_faturas_calcular_separado', 'approved', 'Cliente tem múltiplas faturas - calcular multa e juros de cada uma separadamente'),
  ('support-financial-agent', 'renegociacao', 'valores_informados', 'agente_apresenta_calculo_multa_juros_total', 'approved', 'Agente informa valores: original + multa R$2,58 + juros R$0,04/dia');