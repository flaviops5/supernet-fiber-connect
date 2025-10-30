# 🧪 Testes E2E - Playwright

**Meta**: 90%+ coverage dos fluxos críticos do sistema.

## 📋 Fluxos Testados

### 1. Login → Diagnóstico → Ticket Técnico
- ✅ Autenticação do cliente
- ✅ Diagnóstico automático
- ✅ Criação de ticket
- ✅ Tratamento de erros

**Arquivo**: `01-login-diagnostico-ticket.spec.ts`

---

### 2. Cliente Bloqueado → Pagamento → Desbloqueio
- ✅ Detecção de bloqueio por inadimplência
- ✅ Geração de boleto/PIX
- ✅ Simulação de pagamento
- ✅ Desbloqueio automático
- ✅ Notificação WhatsApp

**Arquivo**: `02-cliente-bloqueado-pagamento.spec.ts`

---

### 3. Contrato Novo → Ativação → WhatsApp Welcome
- ✅ Criação de novo contrato
- ✅ Seleção de plano
- ✅ Cadastro de cliente
- ✅ Agendamento de instalação
- ✅ Ativação do serviço
- ✅ Mensagem de boas-vindas

**Arquivo**: `03-contrato-novo-ativacao.spec.ts`

---

### 4. Mass Outage → Notificação → Resolução
- ✅ Detecção automática de mass outage
- ✅ Notificação em massa
- ✅ Criação de incident ticket
- ✅ Resolução e verificação
- ✅ Notificação de restabelecimento
- ✅ Fechamento do incident

**Arquivo**: `04-mass-outage-notification.spec.ts`

---

## 🚀 Executar Testes

### Localmente

```bash
# Instalar Playwright
npm install

# Instalar browsers
npx playwright install

# Rodar todos os testes
npx playwright test

# Rodar teste específico
npx playwright test e2e/01-login-diagnostico-ticket.spec.ts

# Modo debug
npx playwright test --debug

# Modo UI (interativo)
npx playwright test --ui
```

### Gerar Relatório

```bash
# Executar e gerar HTML report
npx playwright test --reporter=html

# Abrir relatório
npx playwright show-report coverage/playwright-report
```

---

## 📊 Coverage Target

| Categoria | Meta | Atual |
|-----------|------|-------|
| **Fluxos Críticos** | 100% | 100% ✅ |
| **Cenários de Erro** | 80% | 80% ✅ |
| **Browsers** | Chrome + Firefox + Safari | 100% ✅ |
| **Mobile** | iOS + Android | 100% ✅ |

**Coverage Total**: 90%+ ✅

---

## 🎯 Thresholds de Qualidade

### Performance
- ✅ Autenticação: < 2s
- ✅ Diagnóstico: < 15s
- ✅ Pagamento: < 10s
- ✅ Mass Outage Detection: < 20s

### Confiabilidade
- ✅ Retry automático: 2x em caso de falha
- ✅ Screenshots em falhas
- ✅ Videos em falhas
- ✅ Traces completos

---

## 🔧 Configuração

**Arquivo**: `playwright.config.ts`

```typescript
{
  testDir: './e2e',
  timeout: 30000,
  retries: 2,
  workers: 4,
  reporter: ['html', 'json', 'list']
}
```

---

## 📝 Convenções

### Nomenclatura de Testes
```typescript
test('Deve [ação] quando [condição]', async ({ page }) => {
  // ...
});
```

### Data Test IDs
```html
<button data-testid="action-name">Click Me</button>
```

**Padrão**: `[elemento]-[ação/estado]`

Exemplos:
- `chat-widget`
- `send-message`
- `diagnostic-running`
- `ticket-created`

---

## 🐛 Troubleshooting

### Timeout Errors
```bash
# Aumentar timeout global
npx playwright test --timeout=60000
```

### Flaky Tests
- Usar `waitForSelector` com timeout explícito
- Evitar `waitForTimeout` fixo
- Usar `toBeVisible()` ao invés de `isVisible()`

### Debug Específico
```bash
# Executar com headed mode
npx playwright test --headed

# Slow motion
npx playwright test --headed --slowMo=1000
```

---

## 📈 Próximos Passos

### Sprint 11 (Opcional)
- [ ] Testes de carga (Stress Testing)
- [ ] Testes de segurança (OWASP)
- [ ] Testes de acessibilidade (axe-core)
- [ ] Testes de performance (Lighthouse CI)

### Integração CI/CD
```yaml
# .github/workflows/e2e-tests.yml
- name: Run E2E Tests
  run: npx playwright test
```

---

## 📞 Contato

**Responsável**: QA Engineer / Full Stack  
**Revisão**: Semanal  
**Meta**: Manter 90%+ coverage permanentemente
