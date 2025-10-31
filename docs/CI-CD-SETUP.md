# 🚀 CI/CD Setup - GitHub Actions

Configuração completa de testes automatizados no GitHub.

---

## 📋 O que foi configurado?

### 1. `.github/workflows/ci-tests.yml`

**Testes que rodam automaticamente em cada commit:**

✅ **Testes Unitários**
- Roda `npm run test`
- Gera coverage report
- Falha se coverage < 60%

✅ **Code Quality**
- ESLint check
- TypeScript type check
- Verifica padrões de código

✅ **Security Scan**
- npm audit (vulnerabilidades)
- Trivy scanner (container scanning)
- GitHub Security alerts

✅ **Build de Produção**
- Testa se build completa
- Verifica bundle size
- Salva artifacts

✅ **Lighthouse CI**
- Performance test
- Accessibility score
- SEO check
- Best practices

---

### 2. `.github/workflows/ai-code-review.yml`

**Review de código com GPT-4:**

🤖 **AI Code Review**
- Analisa cada PR automaticamente
- Verifica:
  - Segurança (XSS, injection)
  - Performance
  - Acessibilidade
  - TypeScript best practices
  - React anti-patterns
- Comenta no PR com sugestões

---

### 3. `.github/dependabot.yml`

**Dependências sempre atualizadas:**

📦 **Dependabot**
- Atualiza dependências semanalmente
- Auto-merge para patches
- Labels automáticas
- PRs organizados

---

## ⚙️ Como Configurar

### 1. Conectar GitHub ao Lovable

1. Clique em **GitHub** (canto superior direito)
2. Clique em **Connect to GitHub**
3. Autorize o Lovable GitHub App
4. Clique em **Create Repository**

---

### 2. Adicionar Secrets (IMPORTANTE!)

Para usar AI Code Review, adicione secrets:

1. Vá para: **GitHub Repo → Settings → Secrets and variables → Actions**
2. Adicione:

```
OPENAI_API_KEY = sk-...your-key
```

**Opcional (para deploy automático):**
```
SUPABASE_ACCESS_TOKEN = your-token
SUPABASE_PROJECT_ID = mxdupkbpxjcfxdgrwknp
```

---

### 3. Habilitar GitHub Actions

1. Vá para: **GitHub Repo → Actions**
2. Clique em **"I understand my workflows, go ahead and enable them"**

---

## 🎯 Como Usar

### Após cada Push:

```bash
git push origin main
```

**O que acontece:**
1. ✅ Testes unitários rodam
2. ✅ ESLint verifica código
3. ✅ Security scan
4. ✅ Build de produção
5. ✅ Lighthouse CI (performance)

**Resultado:**
- ✅ **Verde**: Tudo passou, pode mergear
- ❌ **Vermelho**: Algo falhou, precisa corrigir

---

### Para Pull Requests:

```bash
git checkout -b feature/nova-funcionalidade
git push origin feature/nova-funcionalidade
# Abra PR no GitHub
```

**O que acontece:**
1. ✅ Todos os testes acima
2. 🤖 **AI Code Review** comenta no PR
3. 💬 Bot posta resumo dos resultados

---

## 📊 Visualizando Resultados

### GitHub Actions Tab
- **Repo → Actions**
- Veja histórico de builds
- Logs detalhados de cada step

### Pull Requests
- Badge de status (✅ ou ❌)
- Comentários automáticos do AI
- Coverage report

### Security Tab
- **Repo → Security → Code scanning alerts**
- Vulnerabilidades encontradas pelo Trivy

---

## 🔧 Customizações

### Ajustar Coverage Threshold

Edite `.github/workflows/ci-tests.yml`:

```yaml
- name: Rodar testes
  run: npm run test:coverage
  env:
    COVERAGE_THRESHOLD: 70  # Mude aqui
```

---

### Mudar modelo AI Review

Edite `.github/workflows/ai-code-review.yml`:

```yaml
with:
  model: gpt-4-turbo  # ou gpt-3.5-turbo para economizar
  temperature: 0.2    # Mais conservador
  max_tokens: 1000    # Reviews mais curtos
```

---

### Adicionar Deploy Automático

Adicione ao final de `ci-tests.yml`:

```yaml
deploy:
  name: 🚀 Deploy para Produção
  runs-on: ubuntu-latest
  needs: [unit-tests, code-quality, build]
  if: github.ref == 'refs/heads/main'
  
  steps:
    - name: Deploy to Vercel/Netlify
      run: |
        # Seu comando de deploy aqui
        npm run deploy
```

---

## 🎯 Benefícios

### Para Você:
- ✅ Menos bugs em produção
- ✅ Code review automático
- ✅ Segurança verificada
- ✅ Performance monitorada

### Para o Time:
- ✅ Padrões de código consistentes
- ✅ Dependências atualizadas
- ✅ Documentação automática
- ✅ Deploy confiável

---

## 🆘 Troubleshooting

### Build falha no GitHub mas funciona local?

**Solução:**
```bash
# Limpe cache e reinstale
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

### AI Code Review não comenta?

**Verifique:**
1. Secret `OPENAI_API_KEY` configurado?
2. GitHub App tem permissão para comentar?
3. Créditos OpenAI válidos?

---

### Lighthouse CI não roda?

**Solução:**
- Lighthouse precisa de servidor local
- Use `npm run preview` após build
- Configure URL correta no workflow

---

## 📚 Recursos

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Dependabot Docs](https://docs.github.com/en/code-security/dependabot)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [ChatGPT Code Review](https://github.com/anc95/ChatGPT-CodeReview)

---

**Criado em:** 31 de Outubro de 2025
**Versão:** 1.0.0
