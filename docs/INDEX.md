# 📚 Índice Central de Documentação — SUPERNET FIBRA

**Versão**: 2.0  
**Última atualização**: 31/10/2025

---

## 🎯 Bem-vindo à Base de Conhecimento

Este é o índice central de toda a documentação do sistema SUPERNET FIBRA. Aqui você encontra guias, manuais, tutoriais e referências técnicas organizadas por categoria.

---

## 📘 Guias dos Agentes

Manuais completos de cada agente, incluindo onboarding, scripts e boas práticas.

| Agente | Função | Documento |
|--------|--------|-----------|
| **Cloé Martins** | Atendente de Suporte Técnico (Nível 1) | [📘 Guia Completo](./guides/cloe-martins-guide.md) |
| **Luan Aquino** | Técnico Especializado (Nível 2) | [📗 Manual Técnico](./guides/luan-aquino-guide.md) |
| **Julia Santos** | Analista de Suporte Financeiro | [📙 Manual Financeiro](./guides/julia-santos-guide.md) |
| **Vicente Almeida** | Consultor Comercial Senior | [📕 Manual Comercial](./guides/vicente-almeida-guide.md) |

---

## 🎬 Tutoriais em Vídeo

Guias visuais passo a passo para operadores e administradores.

| Tutorial | Duração | Público-alvo | Roteiro |
|----------|---------|--------------|---------|
| **#01: Admin Dashboard** | 8-10 min | Administradores | [🎬 Ver Roteiro](./tutorials/video-01-admin-dashboard.md) |
| **#02: Reboot Automático** | 6-8 min | Operadores técnicos | [🎬 Ver Roteiro](./tutorials/video-02-reboot-automatico.md) |
| **#03: Mass Outage Management** | 7-9 min | Supervisores e NOC | [🎬 Ver Roteiro](./tutorials/video-03-mass-outage.md) |

> **Nota**: Os roteiros estão prontos. Os vídeos devem ser gravados com OBS Studio seguindo as especificações em cada documento.

---

## 📖 Guias Operacionais

Documentação para operação diária do sistema.

| Documento | Descrição | Link |
|-----------|-----------|------|
| **Guia Operacional** | Visão geral, problemas comuns e soluções | [📖 Acessar](./operational-guide.md) |
| **Anti-Fuga de Fluxo** | Sistema de prevenção de loops conversacionais | [📖 Acessar](./PR-13-ANTI-FUGA-GUIA-OPERACIONAL.md) |
| **Reboot Híbrido** | Implementação técnica do sistema Cloé + Luan | [📖 Acessar](./reboot-hibrido-implementacao.md) |

---

## 🔧 Documentação Técnica

Arquitetura, APIs e procedimentos técnicos detalhados.

### Arquitetura e Design

| Documento | Descrição |
|-----------|-----------|
| **README Principal** | Visão geral do projeto | [📄 Ver](../README.md) |
| **Arquitetura do Sistema** | Diagramas e componentes | [📄 Ver](./architecture.md) |
| **Acessibilidade (WCAG 2.1 AA)** | Guia de implementação | [📄 Ver](./ACCESSIBILITY.md) |

### Edge Functions e APIs

| Edge Function | Propósito | Documentação |
|---------------|-----------|--------------|
| `ixc-client-status` | Consultar status do cliente no IXC | [📄 Ver](../supabase/functions/ixc-client-status/README.md) |
| `ixc-reboot-device` | Executar reboot remoto de equipamento | [📄 Ver](../supabase/functions/ixc-reboot-device/README.md) |
| `ixc-onu-signal` | Consultar sinal TX/RX da ONU | [📄 Ver](../supabase/functions/ixc-onu-signal/README.md) |
| `ixc-create-ticket` | Abrir chamado técnico no IXC | [📄 Ver](../supabase/functions/ixc-create-ticket/README.md) |
| `support-tech-agent` | Agente Luan Aquino (IA) | [📄 Ver](../supabase/functions/support-tech-agent/README.md) |

---

## 📊 Knowledge Base

Base de conhecimento utilizada pelos agentes de IA.

### Estrutura

```
docs/knowledge-base/
├── README.md                      # Guia da knowledge base
├── data-sources/                  # Fonte canônica de verdade
│   ├── suporte/                   # Conhecimento de suporte
│   │   ├── politicas-atendimento.md
│   │   └── scripts-padrao.md
│   ├── sistema/                   # Conhecimento técnico
│   │   ├── consulta-sinal-onu.md
│   │   └── fluxo-reboot.md
│   ├── financeiro/                # Conhecimento financeiro
│   │   └── politicas.md
│   └── comercial/                 # Conhecimento comercial
│       └── planos.md
└── scripts/
    └── sync-kb-to-supabase.ts     # Script de sincronização
```

### Links Rápidos

- [📚 README da Knowledge Base](./knowledge-base/README.md)
- [📄 Políticas de Atendimento](./knowledge-base/data-sources/suporte/politicas-atendimento.md)
- [🔧 Consulta de Sinal ONU](./knowledge-base/data-sources/sistema/consulta-sinal-onu.md)

---

## 🧪 Testes e Qualidade

Documentação de testes e auditoria de qualidade.

### E2E Tests (Playwright)

| Documento | Descrição |
|-----------|-----------|
| **README de Implementação** | Guia completo dos testes E2E | [📄 Ver](../e2e/README-IMPLEMENTATION.md) |
| **Testes críticos** | 4 fluxos principais testados | [📄 Ver](../e2e/critical-flows.spec.ts) |

### Auditoria de Qualidade

| PR | Descrição | Status | Documento |
|----|-----------|--------|-----------|
| **PR#06** | Timeouts Health Check | ✅ Concluído | [📄 Ver](../auditoria/PR-06-TIMEOUTS-HEALTH-CHECK.md) |
| **PR#07** | E2E Coverage 90%+ | ✅ Concluído | [📄 Ver](../e2e/README-IMPLEMENTATION.md) |
| **PR#08** | Acessibilidade WCAG 2.1 AA | ✅ Concluído | [📄 Ver](../auditoria/PR-08-ACESSIBILIDADE.md) |
| **PR#09** | Documentação Completa | ✅ Concluído | [📄 Ver](../auditoria/PR-09-DOCUMENTACAO-COMPLETA.md) |
| **PR#13** | Anti-Fuga de Fluxo | ✅ Concluído | [📄 Ver](./PR-13-ANTI-FUGA-GUIA-OPERACIONAL.md) |

---

## 🛠️ Dashboards e Ferramentas

Links diretos para as principais interfaces do sistema.

### Dashboards Principais

| Dashboard | URL | Descrição |
|-----------|-----|-----------|
| **Atendimento Omnichannel** | `/atendimento` | Gerenciar conversas em tempo real |
| **Métricas do Sistema** | `/system-metrics` | KPIs e análises |
| **Monitoramento de Rede** | `/monitoramento` | Detectar mass outages |
| **Configurações WhatsApp** | `/admin/whatsapp` | Gerenciar conexão Evolution API |

### Endpoints de API

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/functions/v1/system-health` | GET | Health check completo |
| `/functions/v1/reset-circuit-breaker` | POST | Resetar circuit breaker |
| `/functions/v1/process-dlq` | POST | Processar Dead Letter Queue |

---

## 📞 Suporte e Contatos

### Suporte Técnico Interno

- **Discord Lovable**: [Acessar canal](https://discord.com/channels/1119885301872070706/1280461670979993613)
- **Supabase Dashboard**: [Acessar](https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp)
- **Logs de Functions**: [Acessar](https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/functions)

### Documentação Externa

- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)
- **Evolution API**: [Documentação oficial](https://doc.evolution-api.com/)
- **IXC Soft**: [Portal de desenvolvedores](https://ixcsoft.com.br/developers)

---

## 🗂️ Estrutura de Arquivos

Visão geral da organização dos arquivos de documentação:

```
docs/
├── INDEX.md                                  # 👈 Você está aqui
├── operational-guide.md                      # Guia operacional geral
├── PR-13-ANTI-FUGA-GUIA-OPERACIONAL.md      # Anti-fuga de fluxo
├── reboot-hibrido-implementacao.md          # Sistema híbrido de reboot
├── ACCESSIBILITY.md                          # Guia de acessibilidade
├── ACCESSIBILITY-CHECKLIST.md               # Checklist WCAG 2.1 AA
│
├── guides/                                   # 📘 Guias dos agentes
│   ├── cloe-martins-guide.md
│   ├── luan-aquino-guide.md
│   ├── julia-santos-guide.md
│   └── vicente-almeida-guide.md
│
├── tutorials/                                # 🎬 Tutoriais em vídeo
│   ├── video-01-admin-dashboard.md
│   ├── video-02-reboot-automatico.md
│   └── video-03-mass-outage.md
│
└── knowledge-base/                           # 📚 Base de conhecimento
    ├── README.md
    ├── data-sources/
    │   ├── suporte/
    │   ├── sistema/
    │   ├── financeiro/
    │   └── comercial/
    └── scripts/
        └── sync-kb-to-supabase.ts
```

---

## 🎓 Trilhas de Aprendizado

### 🆕 Para Novos Administradores

1. **Dia 1**: [📖 Guia Operacional](./operational-guide.md)
2. **Dia 2**: [🎬 Tutorial #01: Admin Dashboard](./tutorials/video-01-admin-dashboard.md)
3. **Dia 3**: [📘 Guia da Cloé](./guides/cloe-martins-guide.md) + [📗 Guia do Luan](./guides/luan-aquino-guide.md)
4. **Dia 4**: [🎬 Tutorial #02: Reboot Automático](./tutorials/video-02-reboot-automatico.md)
5. **Dia 5**: [🎬 Tutorial #03: Mass Outage](./tutorials/video-03-mass-outage.md)

### 🔧 Para Operadores Técnicos

1. [📗 Manual Técnico do Luan](./guides/luan-aquino-guide.md)
2. [🔧 Consulta de Sinal ONU](./knowledge-base/data-sources/sistema/consulta-sinal-onu.md)
3. [🎬 Tutorial #02: Reboot Automático](./tutorials/video-02-reboot-automatico.md)
4. [📖 Guia Operacional - Seção Troubleshooting](./operational-guide.md#problemas-comuns-e-soluções)

### 💼 Para Consultores Comerciais

1. [📕 Manual Comercial do Vicente](./guides/vicente-almeida-guide.md)
2. [📄 Tabela de Planos](./knowledge-base/data-sources/comercial/planos.md)
3. [📄 Políticas Comerciais](./knowledge-base/data-sources/comercial/politicas.md)

### 💰 Para Analistas Financeiros

1. [📙 Manual Financeiro da Julia](./guides/julia-santos-guide.md)
2. [📄 Políticas Financeiras](./knowledge-base/data-sources/financeiro/politicas.md)

---

## 🔄 Atualizações e Manutenção

### Última Atualização: 31/10/2025

**Novidades nesta versão**:
- ✅ Adicionados 4 guias completos dos agentes
- ✅ Criados 3 roteiros de vídeos tutoriais
- ✅ Implementada acessibilidade WCAG 2.1 AA
- ✅ Documentado sistema de reboot híbrido
- ✅ Adicionada cobertura E2E de 90%+

### Como Contribuir

Para sugerir melhorias ou reportar erros na documentação:

1. Abra uma issue no repositório
2. Entre em contato via Discord interno
3. Envie e-mail para [docs@supernet.com.br]

---

## 📊 Estatísticas da Documentação

| Métrica | Valor |
|---------|-------|
| **Total de documentos** | 45+ |
| **Guias de agentes** | 4 |
| **Tutoriais em vídeo (roteiros)** | 3 |
| **Edge Functions documentadas** | 5+ |
| **Cobertura de testes E2E** | 90%+ |
| **Score de acessibilidade** | 95/100 (WCAG 2.1 AA) |

---

## ✨ Recursos Destacados

### 🔥 Mais Acessados

1. [📘 Guia da Cloé Martins](./guides/cloe-martins-guide.md)
2. [📗 Manual Técnico do Luan](./guides/luan-aquino-guide.md)
3. [📖 Guia Operacional](./operational-guide.md)
4. [🎬 Tutorial Admin Dashboard](./tutorials/video-01-admin-dashboard.md)

### 🆕 Recém-Adicionados

1. [📙 Manual Financeiro da Julia](./guides/julia-santos-guide.md)
2. [📕 Manual Comercial do Vicente](./guides/vicente-almeida-guide.md)
3. [🎬 Tutorial Mass Outage](./tutorials/video-03-mass-outage.md)
4. [📄 Guia de Acessibilidade](./ACCESSIBILITY.md)

---

## 🔍 Busca Rápida

**Atalhos por tema**:

- **Problemas de conexão**: [Guia do Luan](./guides/luan-aquino-guide.md) | [Consulta ONU](./knowledge-base/data-sources/sistema/consulta-sinal-onu.md)
- **Questões financeiras**: [Guia da Julia](./guides/julia-santos-guide.md)
- **Vendas e planos**: [Guia do Vicente](./guides/vicente-almeida-guide.md)
- **Primeiro atendimento**: [Guia da Cloé](./guides/cloe-martins-guide.md)
- **Mass outage**: [Tutorial #03](./tutorials/video-03-mass-outage.md) | [Guia Operacional](./operational-guide.md#mass-outage)

---

**🎉 Documentação mantida pela equipe SUPERNET FIBRA**  
**📅 Última revisão**: 31/10/2025  
**📧 Contato**: docs@supernet.com.br
