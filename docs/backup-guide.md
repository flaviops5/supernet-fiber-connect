# 🔐 Guia de Backup e Recuperação

**Data**: 13/10/2025  
**Status**: Produção

---

## 📋 Visão Geral

Este documento descreve a estratégia de backup e recuperação de dados para o sistema SUPERNET FIBRA.

---

## 🔄 Backups Automáticos do Supabase

O Supabase oferece backups automáticos nativos para todos os projetos:

### Backup Diário Automático

- **Frequência**: Diário, às 00:00 UTC
- **Retenção**: 7 dias (plano gratuito) / 30 dias (plano Pro)
- **Conteúdo**: Snapshot completo do banco de dados PostgreSQL
- **Localização**: Infraestrutura Supabase (AWS)

### Como Restaurar um Backup

1. Acesse o Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/database/backups
   ```

2. Na seção "Backups", selecione o backup desejado

3. Clique em "Restore" e confirme a operação

⚠️ **IMPORTANTE**: A restauração sobrescreve o banco de dados atual. Sempre confirme a data/hora do backup antes de restaurar.

---

## 📦 Backup Manual

Para criar um backup manual antes de operações críticas:

### Via SQL

```sql
-- Exportar tabela específica
COPY (SELECT * FROM conversations) TO '/tmp/conversations_backup.csv' CSV HEADER;

-- Backup de configurações
COPY (SELECT * FROM agent_configurations) TO '/tmp/agent_configs_backup.json';
```

### Via Supabase CLI

```bash
# Instalar Supabase CLI
npm install -g supabase

# Fazer dump do banco
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🗄️ Itens Incluídos no Backup

### Dados do Banco de Dados
- ✅ Todas as tabelas (`conversations`, `agent_configurations`, etc.)
- ✅ Índices e constraints
- ✅ Funções PostgreSQL
- ✅ Triggers
- ✅ RLS Policies

### Dados de Storage
- ✅ Buckets de storage (`avatars`, `signed-contracts`, etc.)
- ✅ Políticas de acesso de storage

### Não Incluídos no Backup Automático
- ❌ Secrets (gerenciados separadamente via Supabase Dashboard)
- ❌ Edge Functions (versionadas via Git)
- ❌ Configurações de autenticação (gerenciadas via Supabase Dashboard)

---

## 🔐 Estratégia de Recuperação de Desastres

### Cenário 1: Erro de Dados (ex: deleção acidental)

**Tempo de Recuperação**: 5-10 minutos

1. Identificar o timestamp do erro
2. Acessar backups no Supabase Dashboard
3. Selecionar backup anterior ao erro
4. Restaurar backup

### Cenário 2: Corrupção de Tabela Específica

**Tempo de Recuperação**: 10-15 minutos

1. Fazer backup manual da tabela corrompida (se possível)
2. Restaurar backup completo
3. Ou restaurar apenas dados da tabela via SQL dump

### Cenário 3: Perda Total do Projeto

**Tempo de Recuperação**: 30-60 minutos

1. Criar novo projeto Supabase
2. Restaurar último backup disponível
3. Reconfigurar secrets via Dashboard
4. Deploy de edge functions via Git
5. Atualizar variáveis de ambiente no frontend

---

## 📊 Retenção de Dados

### Backups Automáticos
- **Diários**: 30 dias de retenção
- **Semanais**: 3 meses de retenção (plano Enterprise)

### Dados de Auditoria
- **LGPD Audit**: 5 anos (conformidade LGPD Art. 16)
- **Security Logs**: 1 ano
- **Action Log**: 90 dias

### Anonimização Automática
- Conversas com `opt_out_requested=true`: anonimizadas após 90 dias
- Executado via função `anonymize_old_conversations()`

---

## 🧪 Testes de Recuperação

### Teste Trimestral (obrigatório)

1. Criar projeto Supabase de teste
2. Restaurar backup do dia anterior
3. Validar integridade dos dados:
   - Contar registros em tabelas críticas
   - Testar login de usuários
   - Verificar edge functions
4. Documentar tempo de recuperação

### Checklist de Validação

```sql
-- Verificar contagem de conversas
SELECT COUNT(*) FROM conversations;

-- Verificar agentes configurados
SELECT COUNT(*) FROM agent_configurations WHERE is_active = true;

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

---

## 🚨 Alertas de Backup

### Monitoramento Recomendado

- Verificar diariamente se backup foi criado
- Alertar se backup falhar 2 dias consecutivos
- Notificar admins via email/Slack

### Como Verificar Status do Backup

```bash
# Via Supabase API (requer service_role key)
curl -X GET \
  'https://mxdupkbpxjcfxdgrwknp.supabase.co/rest/v1/rpc/get_last_backup' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY"
```

---

## 📞 Contatos de Emergência

**Em caso de necessidade de restauração urgente:**

- **Supabase Support**: https://supabase.com/dashboard/support
- **Discord Lovable**: https://discord.com/channels/1119885301872070706/1280461670979993613
- **Admin Principal**: (definir contato)

---

## 🔄 Próximos Passos

- [ ] Configurar alertas de backup via Edge Function
- [ ] Implementar backup incremental de storage
- [ ] Automatizar testes de recuperação mensais
- [ ] Documentar runbook de disaster recovery

---

**Última atualização**: 13/10/2025
