# ✅ FASE 2 - RLS Policies Audit

## 🎯 Objetivo da Fase 2
1. Auditar **52 tabelas** com RLS habilitado mas sem policies
2. Implementar policies apropriadas para cada tabela
3. Garantir segurança e LGPD compliance
4. Elevar score de segurança para **95/100**

---

## 📊 Status Atual

**Linter Issues:** 92 total
- ❌ 52 tabelas sem policies (RLS Enabled No Policy)
- ⚠️ 40 outros issues (views SECURITY DEFINER, search_path, etc.)

**Score Atual:** 87/100 (após Fase 1)  
**Score Alvo Fase 2:** 95/100  
**Ganho Esperado:** +8 pontos

---

## 🔴 CRÍTICAS - Prioridade P0 (Dados Sensíveis)

### Grupo 1: Conversações & Mensagens (4 tabelas)
| Tabela | Criticidade | Tipo de Dados | Ação Necessária |
|--------|-------------|---------------|-----------------|
| `conversations` | 🔴 CRÍTICA | CPF, emails, telefones | Admin/Editor only |
| `conversation_messages` | 🔴 CRÍTICA | Conteúdo sensível | Admin/Editor only |
| `conversation_transfers` | 🔴 CRÍTICA | Histórico de escalação | Admin/Editor only |
| `conversation_feedback` | 🔴 CRÍTICA | Feedback de clientes | Admin/Editor only |

**Impacto:** Exposição de dados pessoais (LGPD)  
**Prazo:** Imediato

---

### Grupo 2: Histórico de Ações (6 tabelas)
| Tabela | Criticidade | Tipo de Dados | Ação Necessária |
|--------|-------------|---------------|-----------------|
| `action_log` | 🔴 CRÍTICA | Audit trail completo | Admin only |
| `escalation_history` | 🔴 CRÍTICA | Histórico de escalações | Admin/Editor only |
| `routing_feedback` | 🔴 CRÍTICA | Feedback de routing | Admin only |
| `customer_contact_history` | 🔴 CRÍTICA | CPF, dados de contato | Admin/Editor only |
| `failed_actions` | 🔴 CRÍTICA | Falhas de sistema | Admin only |
| `training_dataset` | 🔴 CRÍTICA | Dados de treino com PII | Admin only |

**Impacto:** Exposição de audit trail e PII  
**Prazo:** Imediato

---

### Grupo 3: Financeiro (4 tabelas)
| Tabela | Criticidade | Tipo de Dados | Ação Necessária |
|--------|-------------|---------------|-----------------|
| `payment_notifications` | 🔴 CRÍTICA | Dados financeiros | Admin/Editor only |
| `nps_responses` | 🔴 CRÍTICA | Feedback com identificação | Admin/Editor only |
| `nps_history` | 🔴 CRÍTICA | Histórico de NPS | Admin only |
| `cash_flow_projections` | 🔴 CRÍTICA | Dados financeiros sensíveis | Admin only |

**Impacto:** Exposição de dados financeiros  
**Prazo:** Imediato

---

## 🟠 ALTAS - Prioridade P1 (Configurações Críticas)

### Grupo 4: Configurações de Sistema (12 tabelas)
| Tabela | Criticidade | Tipo de Dados | Ação Necessária |
|--------|-------------|---------------|-----------------|
| `agent_flow_steps` | 🟠 ALTA | Configuração de fluxos | Admin only |
| `agent_flow_subjects` | 🟠 ALTA | Assuntos dos fluxos | Admin only |
| `agent_flow_scenario_approvals` | 🟠 ALTA | Aprovações de cenários | Admin only |
| `agent_scenarios_versions` | 🟠 ALTA | Versionamento | Admin only |
| `agent_scenarios_rollback_log` | 🟠 ALTA | Log de rollbacks | Admin only |
| `escalation_settings` | 🟠 ALTA | Configuração de escalação | Admin only |
| `alert_config` | 🟠 ALTA | Configuração de alertas | Admin only |
| `alert_history` | 🟠 ALTA | Histórico de alertas | Admin only |
| `auto_reboot_settings` | 🟠 ALTA | Configuração de reboots | Admin only |
| `financial_config` | 🟠 ALTA | Configuração financeira | Admin only |
| `maintenance_settings` | 🟠 ALTA | Configuração de manutenção | Admin only |
| `projection_settings` | 🟠 ALTA | Configuração de projeções | Admin only |

**Impacto:** Alteração não autorizada de configurações críticas  
**Prazo:** 24-48h

---

### Grupo 5: Métricas & Monitoramento (4 tabelas)
| Tabela | Criticidade | Tipo de Dados | Ação Necessária |
|--------|-------------|---------------|-----------------|
| `agent_metrics` | 🟠 ALTA | Métricas de performance | Admin/Editor read |
| `equipment_reboots` | 🟠 ALTA | Log de reboots | Admin/Editor read |
| `outage_notifications` | 🟠 ALTA | Notificações de queda | Admin/Editor read |
| `system_health` | 🟠 ALTA | Health checks | Admin/Editor read |

**Impacto:** Manipulação de métricas  
**Prazo:** 24-48h

---

## 🟡 MÉDIAS - Prioridade P2 (Operacionais)

### Grupo 6: Campanhas & Marketing (4 tabelas)
| Tabela | Criticidade | Tipo de Dados | Ação Necessária |
|--------|-------------|---------------|-----------------|
| `campaigns` | 🟡 MÉDIA | Configuração de campanhas | Admin/Editor only |
| `campaign_content` | 🟡 MÉDIA | Conteúdo de campanhas | Admin/Editor only |
| `campaign_recipients` | 🟡 MÉDIA | Lista de destinatários | Admin/Editor only |
| `campaign_stats` | 🟡 MÉDIA | Estatísticas | Admin/Editor read |

**Impacto:** Envio não autorizado de campanhas  
**Prazo:** 48-72h

---

### Grupo 7: Agente & Departamentos (4 tabelas)
| Tabela | Criticidade | Tipo de Dados | Ação Necessária |
|--------|-------------|---------------|-----------------|
| `agent_department_assignments` | 🟡 MÉDIA | Atribuição de departamentos | Admin only |
| `closure_messages` | 🟡 MÉDIA | Mensagens de encerramento | Admin/Editor only |
| `message_shortcuts` | 🟡 MÉDIA | Atalhos de mensagens | Admin/Editor only |
| `quick_replies` | 🟡 MÉDIA | Respostas rápidas | Admin/Editor only |

**Impacto:** Configuração inadequada de atendimento  
**Prazo:** 48-72h

---

### Grupo 8: Documentos & KB (5 tabelas)
| Tabela | Criticidade | Tipo de Dados | Ação Necessária |
|--------|-------------|---------------|-----------------|
| `documents` | 🟡 MÉDIA | Documentos internos | Role-based access |
| `document_permissions` | 🟡 MÉDIA | Permissões de docs | Admin only |
| `kb_scenarios` | 🟡 MÉDIA | Cenários da KB | Admin/Editor only |
| `media_repository` | 🟡 MÉDIA | Mídia do sistema | Admin/Editor only |
| `unified_documentation` | 🟡 MÉDIA | Documentação unificada | Admin/Editor only |

**Impacto:** Exposição de documentação interna  
**Prazo:** 48-72h

---

## 🟢 BAIXAS - Prioridade P3 (Auxiliares)

### Grupo 9: Infraestrutura & Logs (9 tabelas)
| Tabela | Criticidade | Tipo de Dados | Ação Necessária |
|--------|-------------|---------------|-----------------|
| `kanban_board_members` | 🟢 BAIXA | Membros de boards | Owner/Member read |
| `equipment_reboot_blacklist` | 🟢 BAIXA | Blacklist de reboots | Admin only |
| `maintenance_cron_control` | 🟢 BAIXA | Controle de cron | System only |
| `maintenance_execution_log` | 🟢 BAIXA | Log de execução | Admin read |
| `network_maintenance_tasks` | 🟢 BAIXA | Tarefas de manutenção | Admin/Editor only |
| `notification_targets` | 🟢 BAIXA | Alvos de notificação | Admin only |
| `notification_targets_audit` | 🟢 BAIXA | Audit de notificações | Admin only |
| `nps_stats` | 🟢 BAIXA | Estatísticas NPS (agregadas) | Admin/Editor read |
| `email_settings` | 🟢 BAIXA | Configuração de email | Admin only |

**Impacto:** Baixo  
**Prazo:** 1 semana

---

## 📋 Checklist de Implementação

### Fase 2.1: Críticas (P0) - 14 tabelas
- [ ] Grupo 1: Conversações (4 tabelas)
- [ ] Grupo 2: Histórico de Ações (6 tabelas)
- [ ] Grupo 3: Financeiro (4 tabelas)

**Estimativa:** 4-6 horas  
**Score Esperado:** 87 → 92 (+5 pontos)

---

### Fase 2.2: Altas (P1) - 16 tabelas
- [ ] Grupo 4: Configurações de Sistema (12 tabelas)
- [ ] Grupo 5: Métricas & Monitoramento (4 tabelas)

**Estimativa:** 4-5 horas  
**Score Esperado:** 92 → 94 (+2 pontos)

---

### Fase 2.3: Médias (P2) - 13 tabelas
- [ ] Grupo 6: Campanhas & Marketing (4 tabelas)
- [ ] Grupo 7: Agente & Departamentos (4 tabelas)
- [ ] Grupo 8: Documentos & KB (5 tabelas)

**Estimativa:** 3-4 horas  
**Score Esperado:** 94 → 95 (+1 ponto)

---

### Fase 2.4: Baixas (P3) - 9 tabelas
- [ ] Grupo 9: Infraestrutura & Logs (9 tabelas)

**Estimativa:** 2-3 horas  
**Score Esperado:** Manutenção em 95/100

---

## 🎯 Padrões de Policies

### 1. Admin Only (Configurações Críticas)
```sql
-- SELECT: Apenas admins
CREATE POLICY "Admins can view [table]"
ON public.[table]
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- INSERT: Apenas admins
CREATE POLICY "Admins can insert [table]"
ON public.[table]
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- UPDATE: Apenas admins
CREATE POLICY "Admins can update [table]"
ON public.[table]
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- DELETE: Bloqueado (audit trail)
-- Sem policy = sem acesso
```

---

### 2. Admin/Editor (Operacional)
```sql
-- SELECT: Admin ou Editor
CREATE POLICY "Admin/Editor can view [table]"
ON public.[table]
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

-- INSERT: Admin ou Editor
CREATE POLICY "Admin/Editor can insert [table]"
ON public.[table]
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);

-- UPDATE: Admin ou Editor
CREATE POLICY "Admin/Editor can update [table]"
ON public.[table]
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'editor')
);
```

---

### 3. User-Owned (Dados Próprios)
```sql
-- SELECT: Apenas próprios dados
CREATE POLICY "Users can view own [table]"
ON public.[table]
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: Apenas com próprio user_id
CREATE POLICY "Users can insert own [table]"
ON public.[table]
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: Apenas próprios dados
CREATE POLICY "Users can update own [table]"
ON public.[table]
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

---

### 4. System Only (Service Role)
```sql
-- Sem policies públicas
-- Acesso apenas via service_role
-- Usado para: logs de sistema, cron jobs, etc.
```

---

## 📊 Impacto Esperado

### Antes da Fase 2
- ❌ 52 tabelas expostas sem policies
- ⚠️ Risco ALTO de exposição de dados
- 📉 Score: 87/100

### Após Fase 2
- ✅ 52 tabelas protegidas com RLS
- 🔒 100% das tabelas críticas seguras
- 📈 Score: 95/100 (+8 pontos)

### Métricas de Sucesso
- **Cobertura RLS:** 0% → 100%
- **Tabelas Críticas Seguras:** 14/14 (100%)
- **Score de Segurança:** 87 → 95 (+8)
- **Tempo de Implementação:** 13-18 horas

---

## 🚀 Próxima Fase

### Fase 3: TypeScript Cleanup (após Fase 2)
- Eliminar 16 instâncias de `any` type
- Melhorar type safety
- Score alvo: 97/100 (+2 pontos)

---

**Status:** 🟡 INICIANDO  
**Data de Início:** 2025-11-16  
**Próxima Ação:** Implementar Fase 2.1 (Grupo 1-3 - 14 tabelas críticas)
