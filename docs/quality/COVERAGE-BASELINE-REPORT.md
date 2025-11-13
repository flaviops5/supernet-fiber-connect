# 📊 Coverage Report - Baseline Inicial

**Data**: 13/11/2025  
**Objetivo**: Mapear cobertura atual e identificar áreas críticas sem testes

---

## 🎯 Como Executar

### Localmente

```bash
# Instalar dependências (se necessário)
npm install

# Executar testes com coverage
npm run test -- --coverage

# Ver relatório HTML
open coverage/index.html  # macOS
start coverage/index.html # Windows
xdg-open coverage/index.html # Linux
```

### Via Script

```bash
# Script automatizado com validação
./scripts/run-coverage.sh
```

## 📈 Métricas Esperadas (Baseline)

Baseado na análise do código, esperamos:

| Métrica | Estimativa | Meta | Gap |
|---------|-----------|------|-----|
| **Statements** | ~60-70% | 85% | -15 a -25% |
| **Branches** | ~50-65% | 80% | -15 a -30% |
| **Functions** | ~65-75% | 85% | -10 a -20% |
| **Lines** | ~60-70% | 85% | -15 a -25% |

## 🔍 Áreas Identificadas para Análise

### 🔴 Alta Prioridade (Críticas - 0-50% coverage estimado)

**Backend/Integrations:**
- [ ] `supabase/functions/ixc-integration/index.ts` - **Principal integração IXC**
- [ ] `supabase/functions/support-tech-agent/index.ts` - **Agente técnico core**
- [ ] `supabase/functions/ixc-stress-test/index.ts` - **Stress testing (novo)**
- [ ] `supabase/functions/coordinated-deploy/index.ts` - **Deploy automation**

**Frontend/Components:**
- [ ] `src/components/chat/` - **Sistema de chat core**
- [ ] `src/hooks/useIXC*.ts` - **Hooks de integração IXC**
- [ ] `src/pages/Atendimento.tsx` - **Página principal de atendimento**

**Utils/Services:**
- [ ] `src/lib/ixc/` - **Lógica de negócio IXC**
- [ ] `src/lib/auth/` - **Autenticação e autorização**

### 🟡 Média Prioridade (50-80% coverage estimado)

**Components:**
- [ ] `src/components/IXC*.tsx` - **Componentes IXC**
- [ ] `src/components/tests/` - **Componentes de teste**
- [ ] `src/pages/Admin*.tsx` - **Páginas admin**

**Hooks:**
- [ ] `src/hooks/use*.ts` - **Hooks customizados**

**Utils:**
- [ ] `src/utils/` - **Funções utilitárias**

### 🟢 Baixa Prioridade (80%+ coverage estimado)

- [x] `src/tests/integration/supabase-connection.test.ts` - **Já tem testes**
- [x] `src/components/ui/` - **Componentes básicos (shadcn)**
- [x] `src/tests/setup.ts` - **Setup de testes**

## 📋 Checklist de Análise

Após executar o coverage, verificar:

### 1. Arquivos Críticos Sem Testes

```bash
# Filtrar arquivos com 0% coverage
grep "0.00%" coverage/lcov-report/index.html
```

### 2. Funções Não Testadas

- Abrir relatório HTML
- Navegar por arquivo
- Linhas vermelhas = não testadas

### 3. Branches Não Cobertos

- If/else sem ambos os caminhos testados
- Switch cases não testados
- Try/catch sem teste de erro

## 🎯 Estratégia de Melhoria

### Fase 1: Quick Wins (70% → 75%)

**Foco:** Adicionar testes simples onde faltam

```typescript
// Exemplo: Testar funções utilitárias
describe('formatCPF', () => {
  it('should format valid CPF', () => {
    expect(formatCPF('12345678900')).toBe('123.456.789-00');
  });

  it('should handle invalid CPF', () => {
    expect(formatCPF('invalid')).toBe('');
  });
});
```

**Arquivos alvo:**
- `src/utils/validators.ts`
- `src/utils/formatters.ts`
- `src/lib/helpers.ts`

### Fase 2: Integrações (75% → 80%)

**Foco:** Testar lógica de integração

```typescript
// Exemplo: Mock de API IXC
describe('IXC Service', () => {
  it('should fetch client data', async () => {
    const mockResponse = { id: '123', name: 'Test' };
    vi.mock('fetch').mockResolvedValue({ json: () => mockResponse });
    
    const data = await ixcService.getClient('123');
    expect(data).toEqual(mockResponse);
  });
});
```

**Arquivos alvo:**
- `src/hooks/useIXC*.ts`
- `src/lib/ixc/client.ts`
- Edge functions (Deno tests)

### Fase 3: Componentes (80% → 85%)

**Foco:** Testar componentes React

```typescript
// Exemplo: Testing Library
describe('ChatComponent', () => {
  it('should render messages', () => {
    const messages = [{ id: 1, text: 'Hello' }];
    render(<ChatComponent messages={messages} />);
    
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should send message', async () => {
    const onSend = vi.fn();
    render(<ChatComponent onSend={onSend} />);
    
    await userEvent.type(screen.getByRole('textbox'), 'Test');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    
    expect(onSend).toHaveBeenCalledWith('Test');
  });
});
```

**Arquivos alvo:**
- `src/components/chat/`
- `src/components/IXC*.tsx`
- `src/pages/Atendimento.tsx`

## 🚨 Red Flags a Observar

### Cobertura Muito Baixa (<30%)

Indica:
- Código legado sem testes
- Lógica complexa não validada
- Alto risco de bugs em produção

**Ação:** Priorizar testes imediatamente

### Branches Não Cobertos (>50% sem cobertura)

Indica:
- If/else com apenas um caminho testado
- Error handling não testado
- Edge cases ignorados

**Ação:** Adicionar testes para todos os caminhos

### Funções Críticas a 0%

Indica:
- Funcionalidade não validada
- Risco alto de regressão

**Ação:** Criar testes antes de qualquer mudança

## 📊 Template de Report

Após executar, preencher:

```markdown
## Coverage Atual

### Métricas Globais
- Statements: ___%
- Branches: ___%
- Functions: ___%
- Lines: ___%

### Top 10 Arquivos Sem Cobertura
1. arquivo1.ts - 0%
2. arquivo2.tsx - 5%
...

### Top 10 Arquivos Críticos
1. ixc-integration - 15% (Meta: 85%)
2. support-tech-agent - 20% (Meta: 85%)
...

### Prioridades Imediatas
- [ ] Arquivo X - adicionar testes unitários
- [ ] Arquivo Y - adicionar testes de integração
- [ ] Arquivo Z - testar error handling
```

## 🎓 Recursos

- [Vitest Coverage Docs](https://vitest.dev/guide/coverage.html)
- [Testing Library React](https://testing-library.com/docs/react-testing-library/intro/)
- [Coverage Guide](./coverage-report-guide.md)

## ⏭️ Próximos Passos

1. ✅ Executar `npm run test -- --coverage`
2. ⬜ Analisar relatório HTML
3. ⬜ Identificar top 5 arquivos críticos
4. ⬜ Criar issues para cada arquivo
5. ⬜ Implementar testes fase 1

---

**Status:** 🟡 Aguardando execução inicial
