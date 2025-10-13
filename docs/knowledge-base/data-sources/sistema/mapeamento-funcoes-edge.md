# Mapeamento Completo das Edge Functions

## 📋 Visão Geral

O sistema possui **64 Edge Functions** organizadas em `supabase/functions/`, sendo:
- **6 funções de teste** (prefixo `test-*`)
- **58 funções efetivas do sistema**

---

## 🤖 Agentes de IA (6)

### routing-agent
**Função:** Roteador inteligente central  
**Responsabilidades:**
- Análise de mensagens do cliente
- Validação de CPF e busca no IXC
- Verificação de quedas em massa (mass_outage_events)
- Roteamento para agente especializado correto
- Rate limiting por CPF

### sales-agent
**Função:** Vendas e novos clientes  
**Responsabilidades:**
- Apresentação de planos disponíveis
- Verificação de cobertura por CEP
- Fechamento de contratos
- Criação de leads no IXC

### support-tech-agent (Luan)
**Função:** Suporte técnico especializado  
**Responsabilidades:**
- Diagnóstico de problemas de conexão
- Análise de ONUs e rádios
- Abertura de chamados técnicos no IXC
- Agendamento de visitas técnicas

### support-financial-agent (Júlia Martins)
**Função:** Suporte financeiro  
**Responsabilidades:**
- Consulta de faturas e débitos
- Envio de segunda via (PIX/Boleto)
- Negociação de débitos
- Processamento de pagamentos

### automacao-agent
**Função:** Automação residencial  
**Responsabilidades:**
- Suporte a dispositivos inteligentes (Google Home, Alexa)
- Orientação sobre câmeras e sensores
- Integração com sistemas de automação

### telemedicina-agent
**Função:** Telemedicina e saúde  
**Responsabilidades:**
- Agendamento de consultas
- Autenticação de pacientes
- Validação de CPF para telemedicina
- Listagem de especialidades

---

## 🔗 Integrações IXC (15)

### ixc-proxy
**Função:** Proxy centralizado para API IXC  
**Features:**
- Autenticação unificada (Basic Auth)
- Cache inteligente (30s TTL)
- Rate limiting
- Circuit breaker pattern
- HMAC signature validation

### ixc-integration
**Função:** Interface principal IXC  
**Endpoints:**
- searchCustomers: Busca cliente por CPF
- getCustomerStatus: Status completo do cliente
- createTicket: Abertura de chamados
- rebootEquipment: Reinício remoto de ONUs

### ixc-count-clients
**Função:** Contabilização de clientes  
**Retorna:** Total de clientes online/offline

### ixc-financial-analytics
**Função:** Análise financeira  
**Métricas:**
- Receita mensal/anual
- Taxa de inadimplência
- Projeções de fluxo de caixa

### ixc-list-contracts
**Função:** Listagem de contratos ativos

### ixc-list-plans
**Função:** Sincronização de planos  
**Features:** Busca todos os planos ativos no IXC e sincroniza com Supabase

### ixc-pon-status
**Função:** Monitoramento PON  
**Monitora:** Status de portas PON (GPON), clientes por porta, nível de sinal

### ixc-radio-status
**Função:** Monitoramento de rádios  
**Monitora:** Torres, rádios, clientes wireless

### ixc-discover-gpon-endpoints
**Função:** Descoberta automática de endpoints GPON

### ixc-endpoints-health
**Função:** Health check de endpoints IXC

### ixc-evolution-proxy
**Função:** Proxy para Evolution API integrado ao IXC

### ixc-revenue-stats
**Função:** Estatísticas detalhadas de receita

### ixc-sync-plans
**Função:** Sincronização automática de planos

### sync-ixc-documentation
**Função:** Sincronização de docs da API IXC para knowledge base

---

## 💬 WhatsApp e Comunicação (4)

### whatsapp-webhook
**Função:** Recebimento de mensagens  
**Events:** messages.upsert, messages.update, message.ack  
**Fluxo:**
1. Recebe webhook do WhatsApp (Evolution API)
2. Valida evento e extrai dados da mensagem
3. Cria/atualiza conversa no Supabase
4. Chama routing-agent para processar
5. Envia resposta via send-whatsapp-message

### send-whatsapp-message
**Função:** Envio de mensagens  
**Suporta:**
- Texto simples
- Mídia (imagens, áudios, vídeos)
- Templates estruturados
- Delay configurável entre mensagens

### voice-to-text
**Função:** Transcrição de áudio  
**Features:**
- Converte áudios do WhatsApp em texto
- Usa API de transcrição (Whisper ou similar)
- Processa automaticamente quando cliente envia áudio

### send-locaweb-email
**Função:** Envio de emails  
**Features:**
- Templates personalizados
- Envio via API Locaweb
- Suporte a HTML e anexos

---

## ⚙️ Automação e Tasks (7)

### auto-send-overdue-invoices
**Função:** Envio automático de faturas vencidas  
**Trigger:** Cron job diário (ou on-demand)  
**Fluxo:**
1. Busca clientes com status FA (fatura aberta) no IXC
2. Gera link de pagamento (PIX/Boleto)
3. Envia via WhatsApp automaticamente

### auto-reboot-frozen-equipment
**Função:** Reboot automático de equipamentos congelados  
**Critérios:**
- Cliente online mas sem tráfego há 30+ minutos
- Equipamento não respondendo a ping
- Não está em período de exclusão (01h-06h)
- Não está em blacklist

### check-due-invoices
**Função:** Verificação de faturas próximas do vencimento  
**Notifica:** Clientes com vencimento em 3, 2 e 1 dia(s)

### check-reboot-candidates
**Função:** Identificação de candidatos a reboot  
**Salva em:** reboot_candidates table

### check-escalation
**Função:** Verificação de escalação de conversas  
**Regras:**
- Tempo de espera excedido
- Palavras-chave de urgência detectadas
- Cliente insatisfeito (sentiment analysis)

### retry-failed-actions
**Função:** Reprocessamento de ações falhadas (DLQ)  
**Retry:** Até 3 tentativas com exponential backoff

### network-maintenance-executor
**Função:** Executor de manutenções programadas  
**Ações:**
- Notifica clientes afetados
- Executa scripts de manutenção
- Registra logs detalhados

---

## 📊 Monitoramento (5)

### detect-mass-outage
**Função:** Detecção de quedas em massa  
**Critérios:**
- PON Port: 5+ clientes offline
- CTO: 3+ clientes offline
- Região: 6+ clientes offline
- Dying Gasp: 3+ eventos (falta de energia)

**Salva em:** mass_outage_events table

### mass-outage-executor
**Função:** Executor de ações para quedas em massa  
**Ações:**
1. Cria ticket no IXC (se configurado)
2. Notifica responsáveis via WhatsApp
3. Envia alertas para dashboard de monitoramento
4. Registra em monitoring_logs

### metrics-collector
**Função:** Coletor de métricas do sistema  
**Métricas:**
- Performance de agentes (duration_ms, success_rate)
- Taxa de erro por endpoint
- Circuit breaker status
- Throughput de mensagens

### system-health
**Função:** Health check endpoint  
**Verifica:**
- Database connectivity
- IXC API status
- Circuit breaker state
- Evolution API status

### reset-circuit-breaker
**Função:** Reset manual de circuit breakers  
**Uso:** Emergências quando IXC normaliza após instabilidade

---

## 📚 Knowledge Base e Documentação (4)

### sync-chatbot-knowledge
**Função:** Sincroniza conhecimento para chatbot de vendas

### sync-github-docs
**Função:** Importa docs do repositório GitHub para knowledge_base

### sync-knowledge-docs
**Função:** Sincroniza documentos markdown para base vetorial

### migrate-knowledge-batch / migrate-knowledge-full
**Função:** Migração de conhecimento para índice vetorial  
**Features:**
- Gera embeddings via OpenAI (text-embedding-3-small)
- Processa em lotes de 25 documentos
- Armazena em knowledge_index com pgvector

---

## 🧠 IA e Análise (5)

### corporate-ai-chat
**Função:** Chat corporativo com RAG  
**Features:**
- Busca vetorial na knowledge_base
- Contexto de até 5 documentos mais relevantes
- Resposta usando Gemini 2.5 Flash

### ai-auto-tag
**Função:** Auto-tagging de conversas  
**Tags:** urgente, financeiro, técnico, vendas, satisfeito, insatisfeito

### ai-text-review
**Função:** Revisão de textos de agentes  
**Sugestões:**
- Tom mais empático
- Correção gramatical
- Clareza e objetividade

### ai-suggest-reply
**Função:** Sugestão de respostas para agentes humanos  
**Baseado em:** Histórico da conversa + knowledge base

### summarize-conversation
**Função:** Resumo de conversas  
**Formato:**
- RESUMO: Breve descrição
- MOTIVO DO CONTATO: Principal razão
- RESOLUÇÃO: Como foi tratado
- TAGS SUGERIDAS: 3-5 tags relevantes
- PRÓXIMAS AÇÕES: Se houver follow-up

---

## 📄 Contratos e Processos (2)

### generate-contract-pdf
**Função:** Geração de PDFs de contratos  
**Template:** Personalizado por tipo de plano

### process-contract
**Função:** Processamento de contratos assinados  
**Fluxo:**
1. Valida assinatura digital
2. Armazena PDF em signed-contracts bucket
3. Registra em signed_contracts table
4. Notifica equipes (vendas + instalação)

---

## 📍 CEP e Localização (2)

### chatbot-cep-lookup
**Função:** Verificação de cobertura por CEP  
**Retorna:** Planos disponíveis para aquela região

### process-cep-import
**Função:** Processamento de importação em lote de CEPs  
**Formato:** CSV com CEP inicial, CEP final, região

---

## 💳 Pagamentos (1)

### send-payment-to-customer
**Função:** Envio de links de pagamento  
**Formatos:** PIX (QR Code) ou Boleto (PDF)

---

## 📈 Projeções e Analytics (1)

### calculate-projections
**Função:** Cálculo de projeções de fluxo de caixa  
**Cenários:**
- Otimista: +10% new clients, -5% churn
- Realista: Manutenção da taxa atual
- Pessimista: -5% new clients, +10% churn

---

## 📞 NPS (1)

### nps-webhook
**Função:** Recebimento de respostas NPS  
**Processa:**
- Classifica em promoter/neutral/detractor
- Calcula NPS score
- Identifica detractors para follow-up

---

## ⚙️ Configuração (1)

### check-lovable-ai-config
**Função:** Validação de configuração do Lovable AI Gateway  
**Verifica:** LOVABLE_API_KEY configurada

---

## 🏥 Telemedicina (2)

### telemedicina-agent
**Função:** Agente especializado em telemedicina

### telemedicina-auth / telemedicina-forgot-password
**Função:** Autenticação e recuperação de senha

---

## 🎙️ Voz (1)

### voice-to-text
**Função:** Transcrição de áudio para texto

---

## 🧪 Funções de Teste (6)

### test-hmac
**Função:** Testa validação de assinaturas HMAC

### test-evolution-api
**Função:** Verifica conectividade com Evolution API

### test-equipment-connectivity
**Função:** Testa conectividade com equipamentos de rede

### test-whatsapp-webhook
**Função:** Simula webhooks do WhatsApp

### test-ixc-connection
**Função:** Valida conexão e autenticação com IXC

### test-all-ixc-functions
**Função:** Bateria completa de testes IXC

---

## 📋 Arquitetura de Segurança

Todas as funções efetivas implementam:
- ✅ CORS headers padronizados
- ✅ Validação HMAC (quando aplicável)
- ✅ Rate limiting por CPF
- ✅ Circuit breaker pattern
- ✅ Logging estruturado (monitoring_logs)
- ✅ Tratamento de erros robusto
- ✅ PII redaction em logs

---

## 🔄 Padrões de Comunicação

1. **Cliente → WhatsApp → whatsapp-webhook → routing-agent → [agente específico]**
2. **Agente → ixc-proxy → IXC API**
3. **Agente → send-whatsapp-message → Evolution API → Cliente**
4. **Sistema → auto-send-overdue-invoices → Clientes inadimplentes**
5. **Cron → detect-mass-outage → mass-outage-executor → Notificações**

---

**Atualizado em:** 2025-10-13  
**Total de Edge Functions:** 64  
**Categorias:** 14  
**Status:** ✅ 100% Documentado
