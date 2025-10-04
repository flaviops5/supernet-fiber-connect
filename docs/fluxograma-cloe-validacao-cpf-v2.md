# Fluxograma Cloé - Validação de CPF com Histórico de Contatos

```mermaid
graph TD
    Start([Cliente entra em contato]) --> CheckMessage{Mensagem contém<br/>CPF?}
    
    CheckMessage -->|Não| AnalyzeIntent[Cloé analisa intenção<br/>via AI]
    AnalyzeIntent --> NeedsCPF{Intenção requer<br/>validação?}
    NeedsCPF -->|Não - Vendas| Sales[Vicente - Vendas]
    NeedsCPF -->|Sim| AskCPF[Cloé: 'Para verificar sua situação,<br/>preciso do seu CPF']
    AskCPF --> WaitCPF[Aguarda CPF do cliente]
    WaitCPF --> CheckMessage
    
    CheckMessage -->|Sim| ExtractCPF[Extrair CPF da mensagem]
    
    ExtractCPF --> CheckHistory[🆕 PASSO 1:<br/>Consultar histórico_contatos]
    
    CheckHistory --> HasHistory{Cliente já entrou<br/>em contato antes?}
    HasHistory -->|Sim| LogHistory[📊 Log: Cliente recorrente<br/>Total de contatos anteriores<br/>Última vez encontrado no IXC?]
    HasHistory -->|Não| LogNewContact[📊 Log: Primeiro contato]
    
    LogHistory --> CheckIXC[🆕 PASSO 2:<br/>Buscar CPF no IXC]
    LogNewContact --> CheckIXC
    
    CheckIXC --> FoundIXC{Cliente encontrado<br/>no IXC?}
    
    FoundIXC -->|❌ NÃO| CountAttempts[Incrementar contador<br/>de tentativas]
    CountAttempts --> SaveAttempt[🆕 Registrar tentativa falhada<br/>no histórico_contatos]
    SaveAttempt --> CheckAttemptCount{Quantas<br/>tentativas?}
    
    CheckAttemptCount -->|1ª tentativa| FirstAttempt["❌ Não encontrei cadastro com esse CPF.<br/><br/>Por favor, verifique:<br/>• O CPF está correto?<br/>• O contrato está em seu nome?<br/><br/>Pode confirmar essas informações? 🙂"]
    
    CheckAttemptCount -->|2ª tentativa| SecondAttempt["❌ Não encontrei cadastro com esse CPF.<br/><br/>Vamos tentar de novo. Por favor, confirme:<br/>• Você digitou o CPF corretamente?<br/>• O contrato da SUPERNET está no seu CPF?<br/><br/>Tente informar novamente ou me diga<br/>se o contrato está em outro nome. 🙏"]
    
    CheckAttemptCount -->|3ª tentativa| ThirdAttempt["❌ Não consegui localizar seu cadastro<br/>após várias tentativas.<br/><br/>🆕 Vou transferir você para um de<br/>nossos colaboradores que vai entrar<br/>em contato em breve. 🙏"]
    
    FirstAttempt --> WaitResponse1[Aguarda resposta do cliente]
    SecondAttempt --> WaitResponse2[Aguarda resposta do cliente]
    ThirdAttempt --> TransferHuman[🚨 TRANSFERÊNCIA<br/>PARA HUMANO]
    
    WaitResponse1 --> CheckMessage
    WaitResponse2 --> CheckMessage
    TransferHuman --> End1([FIM - Atendimento Humano])
    
    FoundIXC -->|✅ SIM| SaveSuccess[🆕 Registrar contato bem-sucedido<br/>no histórico_contatos]
    SaveSuccess --> ResetAttempts[Resetar contador de tentativas]
    ResetAttempts --> GetStatus[Obter status do cliente no IXC]
    
    GetStatus --> CheckBlocked{Cliente está<br/>BLOQUEADO ou<br/>em ATRASO?}
    
    CheckBlocked -->|✅ SIM| RouteFinancial["🔴 ROTEAMENTO AUTOMÁTICO<br/><br/>Cloé: 'Perfeito! Transferindo você<br/>para nosso Suporte Financeiro.<br/>Um momento! ⏳<br/><br/>📋 Protocolo: PROT-XXXXX'"]
    
    RouteFinancial --> TransferFinancial[🔄 Julia Martins<br/>Suporte Financeiro]
    TransferFinancial --> FinancialDesbloqueio{Julia tenta<br/>desbloqueio<br/>automático?}
    FinancialDesbloqueio -->|Sucesso| FinancialSuccess["✅ Julia:<br/>'Consegui desbloquear sua conexão!<br/>Seu PIX/QR Code para pagamento:<br/>[dados]'"]
    FinancialDesbloqueio -->|Falha| FinancialManual["⚠️ Julia:<br/>'Identifiquei o problema. Vou te ajudar<br/>a resolver sua pendência financeira.'"]
    FinancialSuccess --> End2([FIM - Resolvido])
    FinancialManual --> End2
    
    CheckBlocked -->|❌ NÃO| CheckOnline{Cliente está<br/>ONLINE?}
    
    CheckOnline -->|❌ NÃO - OFFLINE| RouteSupport["🔴 ROTEAMENTO AUTOMÁTICO<br/><br/>Cloé: 'Perfeito! Transferindo você<br/>para nosso Suporte Técnico.<br/>Um momento! ⏳<br/><br/>📋 Protocolo: PROT-XXXXX'"]
    
    RouteSupport --> CheckMassOutage{Detectada queda<br/>em massa na região?}
    CheckMassOutage -->|Sim| MassOutageAlert["🚨 ALERTA QUEDA EM MASSA<br/><br/>Luan:<br/>'Identifiquei uma interrupção afetando<br/>múltiplos clientes na sua região.<br/>Nossa equipe já está trabalhando<br/>na solução.'"]
    CheckMassOutage -->|Não| TransferSupport[🔄 Luan Silva<br/>Suporte Técnico N1]
    MassOutageAlert --> End3([FIM - Queda em Massa])
    TransferSupport --> SupportAnalysis["Luan analisa problema<br/>e oferece soluções técnicas"]
    SupportAnalysis --> End3
    
    CheckOnline -->|✅ SIM - ONLINE| ConfirmOnline["✅ Cloé:<br/>'Obrigado, [Nome]!<br/>Verifiquei aqui e está tudo certo<br/>com sua conexão.<br/><br/>Como posso ajudá-lo? 😊'"]
    ConfirmOnline --> AnalyzeNextIntent[Aguarda próxima mensagem<br/>e analisa intenção]
    AnalyzeNextIntent --> RouteByIntent{Qual a intenção?}
    RouteByIntent -->|Suporte Técnico| TransferSupport
    RouteByIntent -->|Financeiro| TransferFinancial
    RouteByIntent -->|Vendas| Sales
    RouteByIntent -->|Outro| ConfirmOnline
    
    style Start fill:#e1f5e1
    style End1 fill:#ffe1e1
    style End2 fill:#e1f5e1
    style End3 fill:#e1f5e1
    style CheckHistory fill:#fff4e1
    style SaveSuccess fill:#e1f5e1
    style SaveAttempt fill:#ffe1e1
    style TransferHuman fill:#ff9999
    style ThirdAttempt fill:#ffcccc
    style FirstAttempt fill:#ffffcc
    style SecondAttempt fill:#ffffcc
```

## Legendas

### 🆕 Novidades nesta versão:
- **Histórico de Contatos**: Consulta banco de dados ANTES do IXC para personalizar atendimento
- **Contador de Tentativas**: Registra todas as tentativas de validação de CPF
- **Transferência Humana**: Após 3 tentativas sem sucesso, transfere para atendente humano
- **Mensagens Progressivas**: Mensagens de erro mais detalhadas a cada tentativa
- **Personalização**: Saudações personalizadas para clientes recorrentes

### 🔴 Roteamento Automático:
- **Bloqueado/Atraso**: Julia Martins (Financeiro) com tentativa de desbloqueio automático
- **Offline**: Luan Silva (Técnico) com verificação de queda em massa
- **Online**: Continua com Cloé até identificar intenção específica

### 📊 Banco de Dados:
- Tabela: `customer_contact_history`
- Registra TODOS os contatos, sucesso ou falha
- Campos: CPF, nome, telefone, email, IXC ID, motivo, timestamp, metadata
- Permite análise de padrões de atendimento e clientes recorrentes

### ⚠️ Validação de CPF:
1. **1ª Tentativa**: Pergunta simples (CPF correto? Contrato no seu nome?)
2. **2ª Tentativa**: Pede confirmação e oferece alternativa (outro nome)
3. **3ª Tentativa**: Transfere para atendimento humano (sem mais perguntas)
