-- Seed inicial de cenários LLM QA (deduplicado por nome)
WITH seed(category, name, prompt, expected_agent) AS (
  VALUES
    -- Técnico (Luan)
    ('tecnico','CENÁRIO A1: Cliente offline','Minha internet caiu de repente','luan'),
    ('tecnico','CENÁRIO A2: Sem energia','Modem apagado, sem luzes acesas','luan'),
    ('tecnico','CENÁRIO B1: Internet lenta','A internet está muito lenta, vídeos travando','luan'),
    ('tecnico','CENÁRIO B2: Sites não abrem','Os sites ficam carregando infinitamente','luan'),
    ('tecnico','CENÁRIO C1: Quedas intermitentes','Conexão cai toda hora','luan'),
    ('tecnico','CENÁRIO C2: Instável à noite','Toda noite a conexão cai','luan'),
    ('tecnico','CENÁRIO D1: Reboot não resolve','Já reiniciei o roteador e nada','luan'),
    ('tecnico','CENÁRIO D2: TX alto','Sinal muito forte, cliente próximo da CTO','luan'),
    ('tecnico','CENÁRIO E1: RX baixo','Cliente distante da CTO, RX <-30','luan'),
    ('tecnico','CENÁRIO E2: Equipamento travando','Roteador travando mesmo com sinal bom','luan'),

    -- Financeiro (Julia)
    ('financeiro','F1: Boleto','Quero o boleto pra pagar','julia'),
    ('financeiro','F2: PIX','Pode me mandar o PIX da fatura?','julia'),
    ('financeiro','F3: Pagamento feito','Já paguei e continua bloqueado','julia'),
    ('financeiro','F4: Desbloqueio automático','Paguei agora, pode liberar?','julia'),
    ('financeiro','F5: Negociação','Consigo parcelar as pendências?','julia'),
    ('financeiro','F6: Data de vencimento','Qual o vencimento da minha fatura?','julia'),
    ('financeiro','F7: Boleto atrasado','Meu boleto venceu, ainda dá pra pagar?','julia'),
    ('financeiro','F8: Nota fiscal','Preciso da nota da última fatura','julia'),
    ('financeiro','F9: Confirmação de pagamento','Fiz o pagamento, caiu aí?','julia'),
    ('financeiro','F10: Cobrança duplicada','Apareceu duas cobranças, é normal?','julia'),

    -- Comercial (Vicente)
    ('comercial','C1: Cobertura','Vocês atendem aqui na minha rua?','vicente'),
    ('comercial','C2: Novo contrato','Quero colocar internet na minha casa nova','vicente'),
    ('comercial','C3: Upgrade plano','Posso aumentar a velocidade do meu plano?','vicente'),
    ('comercial','C4: Downgrade plano','Quero diminuir o plano, tá caro','vicente'),
    ('comercial','C5: Promoção','Tem alguma promoção hoje?','vicente'),
    ('comercial','C6: Instalação','Quanto tempo pra instalar?','vicente'),
    ('comercial','C7: Mudança de endereço','Vou mudar de casa, transfere o contrato?','vicente'),
    ('comercial','C8: Cancelamento','Quero cancelar meu plano','vicente'),
    ('comercial','C9: Atendimento humano','Posso falar com um atendente?','vicente'),
    ('comercial','C10: Wi-Fi 6 Mesh','Vi que tem Wi-Fi 6, posso contratar?','vicente')
)
INSERT INTO public.kb_scenarios (category, name, prompt, expected_agent, is_active)
SELECT s.category, s.name, s.prompt, s.expected_agent, true
FROM seed s
WHERE NOT EXISTS (
  SELECT 1 FROM public.kb_scenarios k WHERE k.name = s.name
);