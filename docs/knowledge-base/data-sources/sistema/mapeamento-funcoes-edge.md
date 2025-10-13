# Mapeamento Completo das Edge Functions

## 📋 Visão Geral

O sistema possui **64 Edge Functions** organizadas em `supabase/functions/`, sendo:
- **6 funções de teste** (prefixo `test-*`)
- **58 funções efetivas do sistema**

---

## 🧪 Funções de Teste (6)

### test-hmac
Testa a validação de assinaturas HMAC para comunicação segura entre funções.

### test-evolution-api
Verifica conectividade e funcionalidade da API Evolution (WhatsApp).

### test-equipment-connectivity
Testa conectividade com equipamentos de rede (ONUs, rádios).

### test-whatsapp-webhook
Simula webhooks do WhatsApp para validar fluxo de mensagens.

### test-ixc-connection
Valida conexão e autenticação com a API do IXC Provedor.

### test-all-ixc-functions
Executa bateria completa de testes em todas as integrações IXC.

---

## 🤖 Agentes de IA (6)

### automacao-agent
Agente especializado em automação residencial e dispositivos inteligentes. Responde dúvidas sobre Google Home, Alexa, lâmpadas inteligentes, etc.

### logistics-agent
Coordena agendamentos de instalação. Coleta dados do cliente, valida disponibilidade e cria compromissos no banco.

### routing-agent
Roteador inteligente que analisa mensagens e direciona para o agente especializado correto (vendas, suporte técnico, financeiro, etc.).

### sales-agent
Agente de vendas que apresenta planos, verifica cobertura por CEP e fecha contratos.

### support-financial-agent
Suporte financeiro: consulta faturas, envia segunda via, negocia débitos e processa pagamentos.

### support-tech-agent
Suporte técnico: diagnostica problemas de conexão, analisa ONUs/rádios, abre chamados técnicos no IXC.

---

## 🔗 Integrações IXC (15)

### ixc-proxy
Proxy centralizado para todas as chamadas à API IXC. Implementa cache, rate limiting, circuit breaker e autenticação unificada.

### ixc-integration
Interface principal para operações IXC: buscar cliente, faturas, contratos, criar chamados, etc.

### ixc-evolution-proxy
Proxy específico para Evolution API integrada ao IXC.

### ixc-count-clients
Conta total de clientes ativos no IXC.

### ixc-discover-gpon-endpoints
Descobre automaticamente endpoints GPON disponíveis no IXC.

### ixc-endpoints-health
Verifica saúde (health check) dos endpoints IXC configurados.

### ixc-financial-analytics
Analisa dados financeiros: receitas, inadimplência, projeções.

### ixc-list-contracts
Lista contratos de clientes no IXC.

### ixc-list-plans
Sincroniza e lista planos disponíveis no IXC.

### ixc-list-subjects
Lista assuntos/categorias de atendimento do IXC.

### ixc-pon-status
Monitora status de portas PON (GPON).

### ixc-radio-status
Monitora status de rádios e torres.

### ixc-revenue-stats
Estatísticas detalhadas de receita.

### ixc-sync-plans
Sincroniza planos do IXC para o banco Supabase.

### sync-ixc-documentation
Sincroniza documentação da API IXC para base de conhecimento.

---

## 💬 WhatsApp e Comunicação (4)

### whatsapp-webhook
Recebe webhooks do WhatsApp (Evolution API) e processa mensagens recebidas.

### send-whatsapp-message
Envia mensagens via WhatsApp com suporte a texto, mídia e templates.

### voice-to-text
Converte áudios de WhatsApp em texto usando IA.

### send-locaweb-email
Envia emails via API Locaweb com templates personalizados.

---

## ⚙️ Automação e Tasks (7)

### auto-send-overdue-invoices
Envia automaticamente faturas vencidas via WhatsApp para clientes inadimplentes (status FA no IXC).

### auto-reboot-frozen-equipment
Reinicia automaticamente equipamentos congelados (sem tráfego) após validações.

### check-due-invoices
Verifica faturas próximas do vencimento e dispara notificações.

### check-reboot-candidates
Identifica equipamentos candidatos a reboot automático.

### check-escalation
Verifica conversas que precisam de escalação para gestores.

### retry-failed-actions
Reprocessa ações que falharam (Dead Letter Queue).

### network-maintenance-executor
Executa manutenções programadas na rede.

---

## 📊 Monitoramento (5)

### detect-mass-outage
Detecta quedas massivas de conexão usando análise de equipamentos offline.

### metrics-collector
Coleta métricas de desempenho do sistema, agentes e integrações.

### system-health
Endpoint de health check para monitoramento de infraestrutura.

### check-lovable-ai-config
Verifica configuração e disponibilidade do Lovable AI Gateway.

### reset-circuit-breaker
Reseta manualmente circuit breakers em estado OPEN.

---

## 📚 Knowledge Base e Documentação (4)

### sync-chatbot-knowledge
Sincroniza conhecimento para chatbot de vendas.

### sync-github-docs
Importa documentação do repositório GitHub.

### sync-knowledge-docs
Sincroniza documentos markdown para base vetorial.

### migrate-knowledge-batch / migrate-knowledge-full
Migram conhecimento para índice vetorial com embeddings OpenAI.

---

## 🧠 IA e Análise (5)

### corporate-ai-chat
Chat corporativo com IA usando RAG (busca vetorial na knowledge base).

### ai-auto-tag
Classifica e adiciona tags automaticamente em conversas usando IA.

### ai-text-review
Revisa textos de agentes antes do envio, sugerindo melhorias.

### ai-suggest-reply
Sugere respostas para agentes humanos baseado no histórico.

### site-analyzer-agent
Analisa sites e extrai informações estruturadas.

---

## 📄 Contratos e Processos (2)

### generate-contract-pdf
Gera PDFs de contratos personalizados com dados do cliente.

### process-contract
Processa assinatura e armazenamento de contratos.

---

## 📍 CEP e Localização (2)

### chatbot-cep-lookup
Verifica cobertura de internet por CEP.

### process-cep-import
Processa importação em lote de CEPs de cobertura.

---

## 💳 Pagamentos (1)

### send-payment-to-customer
Envia informações de pagamento (boleto/PIX) para clientes via WhatsApp.

---

## 🔧 Manutenção (1)

### process-contract
Processa fluxo completo de contratação.

---

## 📈 Projeções e Analytics (1)

### calculate-projections
Calcula projeções de fluxo de caixa baseado em dados históricos.

---

## 📞 NPS (1)

### nps-webhook
Recebe respostas de pesquisas NPS e processa feedback.

---

## ⚙️ Configuração (1)

### check-lovable-ai-config
Valida configuração do Lovable AI Gateway.

---

## 🏥 Telemedicina (2)

### telemedicina-agent
Agente especializado em serviços de telemedicina.

### telemedicina-auth / telemedicina-forgot-password
Autenticação e recuperação de senha para telemedicina.

---

## 🎙️ Voz (1)

### voice-to-text
Transcrição de áudio para texto.

---

## 📋 Arquitetura de Segurança

Todas as funções efetivas implementam:
- ✅ CORS headers padronizados
- ✅ Validação HMAC (quando aplicável)
- ✅ Rate limiting por CPF
- ✅ Circuit breaker pattern
- ✅ Logging estruturado
- ✅ Tratamento de erros robusto

---

## 🔄 Padrões de Comunicação

1. **Cliente → WhatsApp → whatsapp-webhook → routing-agent → [agente específico]**
2. **Agente → ixc-proxy → IXC API**
3. **Agente → send-whatsapp-message → Evolution API → Cliente**
4. **Sistema → auto-send-overdue-invoices → Clientes inadimplentes**

---

**Atualizado em:** 2025-10-13
