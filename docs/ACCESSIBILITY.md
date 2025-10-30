# 🌐 Guia de Acessibilidade - WCAG 2.1 AA

## 📋 Status Atual

**Meta**: WCAG 2.1 Level AA (Score ≥ 95)

### ✅ Implementações

#### 1. Contraste de Cores (WCAG 1.4.3)
- ✅ Contraste mínimo 4.5:1 para texto normal
- ✅ Contraste mínimo 3:1 para texto grande
- ✅ Utilitário `getContrastRatio()` para verificação
- ✅ Classes CSS com cores de alto contraste

#### 2. Navegação por Teclado (WCAG 2.1.1)
- ✅ Todos os elementos interativos acessíveis via Tab
- ✅ Focus trap em modais e diálogos
- ✅ Skip links para conteúdo principal
- ✅ Atalhos de teclado configuráveis
- ✅ Ordem de foco lógica

#### 3. Indicadores de Foco (WCAG 2.4.7)
- ✅ Foco visível em todos os elementos interativos
- ✅ Outline de 3px com offset de 2px
- ✅ Suporte a alto contraste
- ✅ Detecção automática de usuário de teclado

#### 4. Screen Readers (WCAG 4.1.2, 4.1.3)
- ✅ ARIA labels em todos os elementos interativos
- ✅ Live regions para conteúdo dinâmico
- ✅ Roles semânticas apropriadas
- ✅ Alt text em todas as imagens
- ✅ Anúncios de status

#### 5. Touch Target Size (WCAG 2.5.5)
- ✅ Mínimo 44x44px para elementos clicáveis
- ✅ Espaçamento adequado entre elementos

#### 6. Movimento Reduzido (WCAG 2.3.3)
- ✅ Suporte a `prefers-reduced-motion`
- ✅ Animações desabilitáveis

---

## 🛠️ Componentes de Acessibilidade

### 1. SkipLink
Permite pular navegação e ir direto ao conteúdo:

```tsx
import { SkipLink } from '@/components/accessibility/SkipLink';

<SkipLink />
```

### 2. ScreenReaderOnly
Oculta conteúdo visualmente mas mantém para screen readers:

```tsx
import { ScreenReaderOnly } from '@/components/accessibility/ScreenReaderOnly';

<ScreenReaderOnly>
  Texto adicional para screen readers
</ScreenReaderOnly>
```

### 3. LiveRegion
Anuncia mudanças dinâmicas para screen readers:

```tsx
import { LiveRegion } from '@/components/accessibility/LiveRegion';

<LiveRegion 
  message="Formulário enviado com sucesso" 
  priority="assertive"
/>
```

### 4. FocusIndicator
Adiciona indicadores visuais de foco:

```tsx
import { FocusIndicator } from '@/components/accessibility/FocusIndicator';

// No componente raiz
<FocusIndicator />
```

---

## 🎣 Hooks de Acessibilidade

### useFocusTrap
Mantém o foco dentro de um container (modais):

```tsx
import { useFocusTrap } from '@/hooks/useFocusTrap';

const Modal = ({ isOpen }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);
  
  return <div ref={modalRef}>...</div>;
};
```

### useKeyboardShortcut
Adiciona atalhos de teclado:

```tsx
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

useKeyboardShortcut({
  key: 's',
  ctrlKey: true,
  callback: () => console.log('Ctrl+S pressionado'),
  description: 'Salvar'
});
```

---

## 📚 Utilitários

### Verificar Contraste

```tsx
import { getContrastRatio, meetsWCAGAA } from '@/lib/accessibility';

const ratio = getContrastRatio('#ffffff', '#000000');
console.log(ratio); // 21

const isAccessible = meetsWCAGAA('#ffffff', '#666666');
console.log(isAccessible); // true or false
```

### Anunciar para Screen Readers

```tsx
import { announceToScreenReader } from '@/lib/accessibility';

announceToScreenReader('Formulário enviado!', 'polite');
```

---

## ✅ Checklist de Implementação

### Perceivable (Perceptível)

- [x] **1.1.1** - Todas as imagens têm alt text
- [x] **1.3.1** - Estrutura semântica (headings, landmarks)
- [x] **1.4.3** - Contraste mínimo 4.5:1
- [x] **1.4.4** - Texto redimensionável até 200%
- [x] **1.4.10** - Layout responsivo sem scroll horizontal
- [x] **1.4.11** - Contraste em componentes de UI

### Operable (Operável)

- [x] **2.1.1** - Funcionalidade via teclado
- [x] **2.1.2** - Sem armadilhas de teclado
- [x] **2.2.1** - Timing ajustável
- [x] **2.2.2** - Pausar, parar, ocultar conteúdo em movimento
- [x] **2.4.1** - Skip links
- [x] **2.4.3** - Ordem de foco lógica
- [x] **2.4.7** - Foco visível
- [x] **2.5.5** - Tamanho mínimo de toque 44x44px

### Understandable (Compreensível)

- [x] **3.1.1** - Idioma da página definido
- [x] **3.2.1** - Foco não causa mudanças de contexto
- [x] **3.2.2** - Input não causa mudanças de contexto
- [x] **3.3.1** - Identificação de erros
- [x] **3.3.2** - Labels ou instruções
- [x] **3.3.3** - Sugestões de erro

### Robust (Robusto)

- [x] **4.1.1** - Parsing correto (HTML válido)
- [x] **4.1.2** - Name, Role, Value (ARIA)
- [x] **4.1.3** - Status messages

---

## 🧪 Testes

### Testes Automatizados

```bash
# Lighthouse Accessibility Audit
npx lighthouse http://localhost:3000 --only-categories=accessibility --view

# axe DevTools (instalar extensão do navegador)
# https://www.deque.com/axe/devtools/
```

### Testes Manuais

#### Navegação por Teclado
1. Use apenas Tab/Shift+Tab para navegar
2. Verifique se todos os elementos interativos são alcançáveis
3. Verifique se a ordem de foco é lógica
4. Teste Enter/Space para ativar elementos

#### Screen Readers
- **Windows**: NVDA (gratuito)
- **macOS**: VoiceOver (nativo)
- **Mobile**: TalkBack (Android), VoiceOver (iOS)

**Comandos básicos:**
- NVDA: `NVDA + Down Arrow` (ler próximo)
- VoiceOver: `VO + Right Arrow` (ler próximo)

#### Verificação de Contraste
Use ferramentas como:
- Chrome DevTools (Lighthouse)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)

---

## 📊 Meta de Score

### Lighthouse Accessibility
- **Meta**: ≥ 95/100
- **Atual**: Verificar com `npx lighthouse`

### Critérios WCAG 2.1 AA
- **Meta**: 100% conformidade
- **Nível A**: Requisitos básicos
- **Nível AA**: Requisitos intermediários (nossa meta)
- **Nível AAA**: Requisitos avançados (opcional)

---

## 🚀 Melhorias Futuras

### Próximos Passos (Nível AAA)
- [ ] Contraste 7:1 para texto (1.4.6)
- [ ] Sem uso de imagens de texto (1.4.9)
- [ ] Ajuda contextual (3.3.5)
- [ ] Prevenção de erros (legal, financeiro) (3.3.6)

### Ferramentas Adicionais
- [ ] Integração com Pa11y CI
- [ ] Testes automatizados de acessibilidade no CI/CD
- [ ] Relatórios de acessibilidade semanais

---

## 📖 Recursos

### Documentação Oficial
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM](https://webaim.org/)

### Ferramentas
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

### Comunidade
- [A11y Project](https://www.a11yproject.com/)
- [WebAIM Discussion List](https://webaim.org/discussion/)

---

## 🎯 Responsabilidades

- **Frontend**: Implementação de ARIA, foco, contraste
- **UX/UI**: Design acessível, contraste, touch targets
- **QA**: Testes com screen readers, teclado
- **DevOps**: Lighthouse CI, relatórios automatizados

---

**Meta Final**: ⭐ WCAG 2.1 Level AA (Score 95+/100)
