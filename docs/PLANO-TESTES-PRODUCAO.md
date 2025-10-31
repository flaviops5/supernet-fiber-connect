# 🧪 Plano de Testes para Produção

Checklist completo para validar o sistema antes do deploy.

---

## ✅ 1. TESTES FUNCIONAIS CRÍTICOS

### 1.1 Autenticação
- [ ] **Login** com email/senha funciona
- [ ] **Logout** funciona e limpa sessão
- [ ] **Senha incorreta** mostra erro apropriado
- [ ] **Usuário não cadastrado** mostra erro apropriado
- [ ] **Redirecionamento** após login funciona (vai para dashboard)
- [ ] **Rotas protegidas** bloqueiam acesso sem login

**Como testar:**
1. Acesse `/login`
2. Tente login com credenciais inválidas
3. Faça login com credenciais válidas
4. Verifique se redireciona para dashboard
5. Faça logout
6. Tente acessar `/admin` sem estar logado

---

### 1.2 Dashboard Administrativo
- [ ] **Dashboard carrega** sem erros
- [ ] **Dados aparecem** (KPIs, gráficos)
- [ ] **Filtros funcionam** (por data, região, etc.)
- [ ] **Navegação** entre seções funciona
- [ ] **Sem console errors** no navegador

**Como testar:**
1. Faça login como admin
2. Acesse `/admin`
3. Verifique se todos os dados carregam
4. Teste filtros e navegação
5. Abra DevTools (F12) e verifique console

---

### 1.3 Sistema de Agentes IA
- [ ] **Chat widget aparece** na página
- [ ] **Mensagens são enviadas** pelo usuário
- [ ] **Respostas são recebidas** do agente
- [ ] **Histórico persiste** (ao recarregar página)
- [ ] **Múltiplas conversas** funcionam

**Como testar:**
1. Acesse página com widget de chat
2. Clique no botão de chat
3. Envie mensagens de teste
4. Verifique respostas
5. Recarregue página e veja se histórico persiste

---

### 1.4 Gestão de Contratos
- [ ] **Criar contrato** funciona
- [ ] **Editar contrato** salva mudanças
- [ ] **Visualizar contrato** mostra dados corretos
- [ ] **Assinar contrato** registra assinatura
- [ ] **Templates** carregam corretamente
- [ ] **Upload de arquivos** funciona (se aplicável)

**Como testar:**
1. Acesse módulo de contratos
2. Crie novo contrato
3. Edite contrato existente
4. Visualize contrato
5. Teste assinatura

---

### 1.5 Notificações
- [ ] **Toast notifications** aparecem
- [ ] **Notificações persistem** no dashboard
- [ ] **Marcar como lida** funciona
- [ ] **Notificações em tempo real** funcionam

**Como testar:**
1. Execute ação que gera notificação
2. Verifique se toast aparece
3. Verifique dashboard de notificações
4. Marque como lida

---

### 1.6 Integração IXC
- [ ] **Busca de clientes** funciona
- [ ] **Dados sincronizam** corretamente
- [ ] **Erro de API** é tratado adequadamente

**Como testar:**
1. Acesse módulo com busca IXC
2. Busque cliente existente
3. Verifique dados retornados
4. Teste com cliente inexistente

---

## 🔒 2. TESTES DE SEGURANÇA

### 2.1 XSS Protection
- [ ] **Script tags bloqueados** em formulários
- [ ] **Event handlers bloqueados** (onclick, onerror)
- [ ] **JavaScript URLs bloqueados** (javascript:)
- [ ] **HTML sanitizado** em previews

**Como testar:**
```
Teste estes inputs em formulários:
1. <script>alert('XSS')</script>
2. <img src=x onerror=alert(1)>
3. <a href="javascript:alert('XSS')">Click</a>
4. <div onclick="alert('XSS')">Click</div>
```

Nenhum deve executar JavaScript!

---

### 2.2 Autenticação e Autorização
- [ ] **Rotas protegidas** requerem login
- [ ] **Admin routes** bloqueiam usuários normais
- [ ] **RLS Policies** impedem acesso cross-user
- [ ] **Tokens expiram** após logout

**Como testar:**
1. Logout e tente acessar `/admin` → deve redirecionar
2. Login como usuário normal, tente acessar `/admin/users` → deve bloquear
3. Abra DevTools → Application → Local Storage → limpe tokens → tente ação → deve falhar

---

### 2.3 Validação de Inputs
- [ ] **Campos obrigatórios** não aceitam vazio
- [ ] **Email validation** funciona
- [ ] **Limites de caracteres** respeitados
- [ ] **Caracteres especiais** tratados (emojis, acentos)

**Como testar:**
```
Teste inputs:
1. Campo vazio (deve dar erro)
2. Email inválido: "teste@" (deve dar erro)
3. String muito longa: [1000+ caracteres] (deve limitar)
4. Caracteres especiais: "João ñ café 🎉" (deve aceitar)
```

---

## ⚡ 3. TESTES DE PERFORMANCE

### 3.1 Tempo de Carregamento
- [ ] **Página inicial** carrega em < 3 segundos
- [ ] **Dashboard** carrega em < 2 segundos
- [ ] **Navegação** entre páginas é instantânea (< 500ms)
- [ ] **Imagens** carregam com lazy loading

**Como testar:**
1. Abra DevTools (F12) → Network tab
2. Recarregue página (Ctrl+R)
3. Verifique tempo total de carregamento
4. Role página e veja imagens carregando sob demanda

---

### 3.2 Bundle Size
- [ ] **Bundle total** < 500kb (gzipped)
- [ ] **Code splitting** ativo (chunks separados)

**Como testar:**
```bash
npm run build
# Verifique output do build - deve mostrar tamanhos
```

---

## ♿ 4. TESTES DE ACESSIBILIDADE

### 4.1 Navegação por Teclado
- [ ] **Tab** navega entre elementos interativos
- [ ] **Enter** ativa botões e links
- [ ] **Esc** fecha modais
- [ ] **Focus indicators** visíveis (outline azul)

**Como testar:**
1. Clique na página
2. Pressione Tab repetidamente
3. Todos os botões/links devem ter outline visível
4. Enter deve ativar elemento focado

---

### 4.2 Contraste de Cores
- [ ] **Textos têm contraste 7:1** (WCAG AAA)
- [ ] **Botões distinguíveis** do fundo
- [ ] **Links destacados** em parágrafos

**Como testar:**
1. Visualize página
2. Todos os textos devem ser legíveis
3. Use ferramenta: https://webaim.org/resources/contrastchecker/

---

### 4.3 ARIA Labels
- [ ] **Botões** têm aria-label
- [ ] **Ícones** têm descrições
- [ ] **Formulários** têm labels associados

**Como testar:**
1. Inspecione elementos (F12)
2. Verifique presença de aria-label
3. Use screen reader (se disponível)

---

## 📱 5. TESTES RESPONSIVOS

Use o botão de dispositivos (📱) acima do preview.

### 5.1 Mobile (320px - 768px)
- [ ] **Menu hamburger** funciona
- [ ] **Textos legíveis** (não muito pequenos)
- [ ] **Botões tocáveis** (min 48x48px)
- [ ] **Scroll horizontal** não existe

**Como testar:**
1. Clique no ícone 📱 acima do preview
2. Selecione "Mobile"
3. Navegue pelo site
4. Teste todas as funcionalidades

---

### 5.2 Tablet (768px - 1024px)
- [ ] **Layout adaptado** para telas médias
- [ ] **Sidebar** visível ou colapsável
- [ ] **Cards/grids** ajustam colunas

---

### 5.3 Desktop (>1024px)
- [ ] **Sidebar fixa** visível
- [ ] **Dashboards** usam espaço completo
- [ ] **Modais centralizados**

---

## 🔍 6. TESTES DE EDGE CASES

### 6.1 Dados Vazios
- [ ] **Lista vazia** mostra "Nenhum item"
- [ ] **Gráfico sem dados** mostra placeholder
- [ ] **Busca sem resultados** mostra mensagem

**Como testar:**
1. Acesse dashboard sem dados
2. Faça busca que não retorna resultados
3. Verifique mensagens apropriadas

---

### 6.2 Conexão Lenta/Offline
- [ ] **Loading states** aparecem
- [ ] **Erro de conexão** mostra mensagem
- [ ] **Retry** funciona após reconectar

**Como testar:**
1. DevTools → Network tab → Throttling → Slow 3G
2. Navegue pelo site
3. Verifique loading states
4. DevTools → Offline → teste comportamento

---

### 6.3 Inputs Extremos
- [ ] **String vazia** tratada
- [ ] **String muito longa** limitada
- [ ] **Números negativos** (se não permitido) bloqueados
- [ ] **HTML malicioso** sanitizado

**Como testar:**
```
Teste inputs:
1. "" (vazio)
2. "A".repeat(10000) (10k caracteres)
3. -999999 (número negativo)
4. <script>alert(1)</script>
```

---

## 🚀 7. BUILD & DEPLOY

### 7.1 Build de Produção
```bash
npm run build
```

**Verificar:**
- [ ] Build completa **sem erros**
- [ ] Build completa **sem warnings críticos**
- [ ] Bundle size **< 500kb**
- [ ] **Sem console.logs** no código

---

### 7.2 Environment Variables
- [ ] **SUPABASE_URL** configurado
- [ ] **SUPABASE_ANON_KEY** configurado
- [ ] **API Keys** de integrações configuradas
- [ ] **Secrets** no Supabase Functions

**Verificar em:**
- Supabase Dashboard → Settings → API
- Supabase Dashboard → Functions → Secrets

---

### 7.3 Database
- [ ] **Backups** configurados
- [ ] **RLS policies** ativas em TODAS as tabelas
- [ ] **Indexes** criados para queries frequentes
- [ ] **Migrations** aplicadas

**Verificar:**
```sql
-- Verifique RLS ativo
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

---

## 📊 8. PÓS-DEPLOY

### 8.1 Monitoramento Inicial (primeiras 24h)

**Supabase Dashboard:**
- [ ] **Auth logs** - verificar logins
- [ ] **Database logs** - verificar errors
- [ ] **Edge Functions logs** - verificar execuções

**Links:**
- Auth: https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/auth/users
- Logs: https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/logs/explorer

---

### 8.2 Teste Smoke (Pós-Deploy)

Após publicar, teste **imediatamente**:
1. [ ] Login funciona
2. [ ] Dashboard carrega
3. [ ] Criar registro funciona
4. [ ] Sem erros no console

Se QUALQUER um falhar → rollback imediato!

---

## ✅ APROVAÇÃO PARA PRODUÇÃO

Para aprovar deploy, TODOS devem estar ✅:

- [ ] ✅ Testes Funcionais (100% críticos passando)
- [ ] ✅ Testes de Segurança (XSS bloqueado, RLS ativo)
- [ ] ✅ Testes de Performance (< 3s carregamento)
- [ ] ✅ Testes de Acessibilidade (navegação por teclado OK)
- [ ] ✅ Testes Responsivos (mobile/tablet/desktop OK)
- [ ] ✅ Build de Produção (sem erros)
- [ ] ✅ Environment configurado (secrets OK)

---

## 🆘 Se Algo Der Errado

### Rollback Rápido
1. Clique no botão **History** (histórico)
2. Selecione versão anterior estável
3. Clique em **Restore**
4. Republique

### Suporte
- Documentação: https://docs.lovable.dev
- Supabase Docs: https://supabase.com/docs

---

**Criado em:** 31 de Outubro de 2025
**Versão:** 4.0.0
**Status:** Pronto para testes
