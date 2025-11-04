-- Adicionar novos cenários de teste organizados nas categorias existentes

-- Cenários de Mass Outage (categoria: tecnico)
INSERT INTO public.qa_regression_cases (scenario_name, category, prompt, expected_agent) VALUES
('MO1: Pane ativa - cliente afetado', 'tecnico', 'Minha internet caiu, o que está acontecendo?', 'cloe'),
('MO2: Pane ativa - região específica', 'tecnico', 'Internet fora do ar no bairro todo', 'cloe'),
('MO3: Pergunta durante pane', 'tecnico', 'Quando volta? Todo mundo aqui está sem internet', 'cloe');

-- Cenários de Pane e Diagnóstico Técnico Avançado
INSERT INTO public.qa_regression_cases (scenario_name, category, prompt, expected_agent) VALUES
('PANE1: Equipamento desligado', 'tecnico', 'Todas as luzes do roteador estão apagadas', 'luan'),
('PANE2: Luz vermelha ONT', 'tecnico', 'A luz LOS do equipamento está vermelha', 'luan'),
('PANE3: Sinal fraco Wi-Fi', 'tecnico', 'Só pega Wi-Fi perto do roteador', 'luan'),
('PANE4: Corte de fibra', 'tecnico', 'Passou uma obra aqui e cortaram a internet', 'luan'),
('T1: Velocidade abaixo contratada', 'tecnico', 'Contratei 500 mega mas só pega 100', 'luan'),
('T2: Problema específico site', 'tecnico', 'Só não abre o site do banco', 'luan'),
('T3: Gaming com lag', 'tecnico', 'Jogos online com lag e ping alto', 'luan');

-- Variações Comerciais
INSERT INTO public.qa_regression_cases (scenario_name, category, prompt, expected_agent) VALUES
('C7: Mudança de endereço', 'comercial', 'Vou me mudar, posso levar minha internet?', 'vicente'),
('C8: Segunda via contrato', 'comercial', 'Preciso do contrato que assinei', 'vicente'),
('C9: Cancelamento', 'comercial', 'Quero cancelar meu plano', 'vicente'),
('C10: CPF inválido', 'comercial', 'Meu CPF é 111.111.111-11 e quero contratar', 'cloe'),
('C11: Sem CPF', 'comercial', 'Não sei meu CPF, pode me ajudar?', 'cloe');

-- Variações Financeiras
INSERT INTO public.qa_regression_cases (scenario_name, category, prompt, expected_agent) VALUES
('F6: Cobrança indevida', 'financeiro', 'Tem uma cobrança errada na minha fatura', 'julia'),
('F7: Parcelamento débito', 'financeiro', 'Tenho 3 meses atrasados, posso parcelar?', 'julia'),
('F8: Pagamento não compensado', 'financeiro', 'Paguei via PIX mas não liberou', 'julia'),
('F9: Cliente inexistente', 'financeiro', 'Meu CPF é 999.999.999-99 e quero consultar minha fatura', 'cloe');