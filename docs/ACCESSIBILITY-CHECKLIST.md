# ✅ Checklist de Acessibilidade WCAG 2.1 AA

Use este checklist para validar a acessibilidade de cada componente/página.

---

## 🎨 Visual & Contraste

- [ ] Contraste de texto ≥ 4.5:1 (texto normal)
- [ ] Contraste de texto ≥ 3:1 (texto grande ≥18pt)
- [ ] Contraste de componentes UI ≥ 3:1
- [ ] Cores não são o único meio de transmitir informação
- [ ] Links são visualmente distinguíveis do texto
- [ ] Ícones têm labels ou text alternatives

**Ferramenta**: Chrome DevTools > Lighthouse > Accessibility

---

## ⌨️ Navegação por Teclado

- [ ] Todos os elementos interativos acessíveis via Tab
- [ ] Ordem de foco é lógica e previsível
- [ ] Foco visível em todos os elementos (outline ≥3px)
- [ ] Enter/Space ativam elementos clicáveis
- [ ] Escape fecha modais/dropdowns
- [ ] Sem armadilhas de foco (focus traps em modais OK)
- [ ] Skip link funcional no topo da página

**Teste**: Navegue usando apenas o teclado (Tab, Shift+Tab, Enter, Space, Escape)

---

## 🔊 Screen Readers

- [ ] Todas as imagens têm `alt` text descritivo
- [ ] Imagens decorativas têm `alt=""` ou `aria-hidden="true"`
- [ ] Formulários têm labels associadas
- [ ] Botões têm text ou `aria-label`
- [ ] Links descritivos (evitar "clique aqui")
- [ ] Headings em ordem lógica (h1 → h2 → h3)
- [ ] Landmarks semânticas (`<main>`, `<nav>`, `<header>`)
- [ ] Conteúdo dinâmico usa live regions (`aria-live`)
- [ ] Modais têm `role="dialog"` e `aria-labelledby`
- [ ] Spinners/loaders têm `aria-label="Carregando"`

**Teste**: 
- **Windows**: NVDA (gratuito)
- **macOS**: VoiceOver (Cmd+F5)
- **Mobile**: TalkBack/VoiceOver

---

## 📱 Touch & Mobile

- [ ] Elementos clicáveis ≥ 44x44px
- [ ] Espaçamento entre elementos ≥ 8px
- [ ] Layout responsivo (sem scroll horizontal)
- [ ] Zoom até 200% sem quebrar layout
- [ ] Botões não muito próximos (evitar cliques acidentais)

**Teste**: Visualize em mobile (Chrome DevTools > Device Mode)

---

## 📝 Formulários

- [ ] Cada input tem `<label>` associada
- [ ] Placeholders não substituem labels
- [ ] Mensagens de erro descritivas e visíveis
- [ ] Erros anunciados para screen readers (`aria-describedby`)
- [ ] Campos obrigatórios marcados (`required` + visual)
- [ ] Validação não depende apenas de cor
- [ ] Botões de submit descritivos ("Enviar formulário" > "Enviar")

**Exemplo:**
```tsx
<label htmlFor="email">
  Email <span aria-label="obrigatório">*</span>
</label>
<input 
  id="email" 
  type="email" 
  required 
  aria-required="true"
  aria-describedby="email-error"
/>
<span id="email-error" role="alert">
  {error}
</span>
```

---

## 🎬 Animações & Movimento

- [ ] Animações respeitam `prefers-reduced-motion`
- [ ] Conteúdo em movimento tem controles (pause/stop)
- [ ] Carrosséis têm pausa/play
- [ ] Autoplay pode ser desabilitado
- [ ] Sem flashes > 3 vezes por segundo

**CSS:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 🔗 Links & Navegação

- [ ] Links descritivos (contexto claro)
- [ ] Links externos indicados (`aria-label="abre em nova aba"`)
- [ ] Breadcrumbs com `aria-label="breadcrumb"`
- [ ] Menu ativo marcado (`aria-current="page"`)
- [ ] Submenu acessível via teclado
- [ ] Dropdowns com `aria-expanded`

**Exemplo:**
```tsx
<a 
  href="https://example.com" 
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Visitar site (abre em nova aba)"
>
  Visitar site
</a>
```

---

## 🗂️ Tabelas

- [ ] `<table>` para dados tabulares (não layout)
- [ ] `<thead>`, `<tbody>`, `<th>` usados corretamente
- [ ] Headers associados com `scope="col"` ou `scope="row"`
- [ ] Caption ou `aria-label` descrevendo a tabela
- [ ] Tabelas complexas com `headers` e `id`

**Exemplo:**
```tsx
<table aria-label="Lista de clientes">
  <thead>
    <tr>
      <th scope="col">Nome</th>
      <th scope="col">Email</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>João Silva</td>
      <td>joao@example.com</td>
    </tr>
  </tbody>
</table>
```

---

## 🎯 ARIA (Quando Necessário)

### Quando usar ARIA:
- [ ] Componentes customizados (tabs, accordions, tooltips)
- [ ] Conteúdo dinâmico (live regions)
- [ ] Widgets complexos (datepickers, autocomplete)

### ARIA Essencial:
- [ ] `role` apropriado (dialog, menu, tab, etc.)
- [ ] `aria-label` ou `aria-labelledby` para identificação
- [ ] `aria-expanded` para elementos expansíveis
- [ ] `aria-live` para atualizações dinâmicas
- [ ] `aria-current="page"` para item ativo

### Regras ARIA:
1. **Não use ARIA se HTML semântico existe**
   - ✅ `<button>` > `<div role="button">`
2. **ARIA não muda comportamento, apenas semântica**
   - Você ainda precisa de JavaScript para funcionalidade
3. **Não oculte conteúdo interativo**
   - Nunca `aria-hidden="true"` em botões/links

---

## 🧪 Testes Essenciais

### 1. Navegação por Teclado (5min)
```
1. Tab através de toda a página
2. Verifique ordem lógica
3. Todos os elementos clicáveis alcançáveis?
4. Foco sempre visível?
5. Modais podem ser fechados com Escape?
```

### 2. Screen Reader (10min)
```
1. Ligue NVDA/VoiceOver
2. Navegue pela página
3. Todas as informações são lidas?
4. Labels descritivos?
5. Conteúdo dinâmico é anunciado?
```

### 3. Contraste (2min)
```
1. Chrome DevTools > Lighthouse
2. Run Accessibility Audit
3. Corrigir problemas de contraste
```

### 4. Zoom (2min)
```
1. Zoom para 200% (Ctrl/Cmd + +)
2. Layout ainda usável?
3. Sem scroll horizontal?
4. Textos não truncados?
```

### 5. Mobile (5min)
```
1. Abra em mobile/tablet
2. Touch targets ≥ 44px?
3. Espaçamento adequado?
4. Tudo acessível sem mouse?
```

---

## 📊 Score Mínimo

### Lighthouse Accessibility
```bash
npx lighthouse http://localhost:3000 \
  --only-categories=accessibility \
  --view
```

**Meta**: ≥ 95/100

### Problemas Comuns:
- ❌ Contraste insuficiente
- ❌ Botões sem labels
- ❌ Imagens sem alt
- ❌ Formulários sem labels
- ❌ Ordem de heading incorreta

---

## 🚀 Quick Fixes

### Problema: Botão ícone sem label
```tsx
// ❌ Errado
<button><Icon /></button>

// ✅ Correto
<button aria-label="Fechar">
  <Icon />
</button>
```

### Problema: Imagem sem alt
```tsx
// ❌ Errado
<img src="logo.png" />

// ✅ Correto
<img src="logo.png" alt="Logo da empresa" />

// ✅ Decorativa
<img src="decoration.png" alt="" aria-hidden="true" />
```

### Problema: Link não descritivo
```tsx
// ❌ Errado
<a href="/docs">Clique aqui</a>

// ✅ Correto
<a href="/docs">Leia a documentação completa</a>
```

### Problema: Contraste baixo
```tsx
// ❌ Errado (contraste 2.5:1)
<span className="text-gray-400">Texto importante</span>

// ✅ Correto (contraste 7:1)
<span className="text-gray-700 dark:text-gray-200">
  Texto importante
</span>
```

---

## 📚 Recursos Rápidos

- [WCAG Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Examples](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Screen Reader Commands](https://dequeuniversity.com/screenreaders/)

---

**✅ Objetivo: 100% dos itens checados antes de produção**
