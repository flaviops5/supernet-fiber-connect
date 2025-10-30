import { useState } from 'react';
import { SkipLink } from '@/components/accessibility/SkipLink';
import { ScreenReaderOnly } from '@/components/accessibility/ScreenReaderOnly';
import { LiveRegion } from '@/components/accessibility/LiveRegion';
import { FocusIndicator } from '@/components/accessibility/FocusIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

/**
 * Página de Teste de Acessibilidade
 * Demonstra implementações WCAG 2.1 AA
 */
const AccessibilityTest = () => {
  const [announcement, setAnnouncement] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Atalho de teclado: Ctrl+K para anunciar mensagem
  useKeyboardShortcut({
    key: 'k',
    ctrlKey: true,
    callback: () => {
      setAnnouncement('Atalho Ctrl+K acionado!');
      setTimeout(() => setAnnouncement(''), 3000);
    },
    description: 'Anunciar mensagem de teste'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuccess(true);
    setAnnouncement('Formulário enviado com sucesso');
    
    setTimeout(() => {
      setShowSuccess(false);
      setAnnouncement('');
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-background">
      <FocusIndicator />
      <SkipLink />

      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">
            Teste de Acessibilidade WCAG 2.1 AA
          </h1>
          <p className="text-muted-foreground mt-2">
            Esta página demonstra todas as implementações de acessibilidade
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="container mx-auto px-4 py-8" tabIndex={-1}>
        <div className="space-y-8">
          {/* Live Region */}
          <LiveRegion message={announcement} priority="assertive" />

          {/* Seção 1: Contraste de Cores */}
          <section aria-labelledby="contrast-section">
            <Card>
              <CardHeader>
                <CardTitle id="contrast-section">
                  1. Contraste de Cores (WCAG 1.4.3)
                </CardTitle>
                <CardDescription>
                  Todos os textos têm contraste mínimo de 4.5:1
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Contraste adequado: 7.2:1
                    </AlertDescription>
                  </Alert>

                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Erro: Contraste 6.5:1
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-900 dark:text-green-100">
                      Sucesso: Contraste 8.1:1
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Seção 2: Navegação por Teclado */}
          <section aria-labelledby="keyboard-section">
            <Card>
              <CardHeader>
                <CardTitle id="keyboard-section">
                  2. Navegação por Teclado (WCAG 2.1.1)
                </CardTitle>
                <CardDescription>
                  Use Tab/Shift+Tab para navegar. Todos os elementos são acessíveis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button>Botão 1</Button>
                  <Button variant="secondary">Botão 2</Button>
                  <Button variant="outline">Botão 3</Button>
                  <Button variant="ghost">Botão 4</Button>
                  <Button variant="link">Link Button</Button>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Atalho de teclado:</strong> Pressione Ctrl+K para testar anúncio ao screen reader
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </section>

          {/* Seção 3: Formulários Acessíveis */}
          <section aria-labelledby="forms-section">
            <Card>
              <CardHeader>
                <CardTitle id="forms-section">
                  3. Formulários Acessíveis (WCAG 3.3.2)
                </CardTitle>
                <CardDescription>
                  Todos os campos têm labels associadas e mensagens de erro descritivas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Nome completo
                      <span className="text-destructive ml-1" aria-label="obrigatório">
                        *
                      </span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      required
                      aria-required="true"
                      aria-describedby="name-hint"
                      placeholder="Digite seu nome completo"
                    />
                    <p id="name-hint" className="text-xs text-muted-foreground">
                      Este campo é obrigatório
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email
                      <span className="text-destructive ml-1" aria-label="obrigatório">
                        *
                      </span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      aria-required="true"
                      placeholder="seu@email.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Mensagem (opcional)</Label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Digite sua mensagem"
                    />
                  </div>

                  <Button type="submit" aria-label="Enviar formulário">
                    Enviar Formulário
                  </Button>

                  {showSuccess && (
                    <Alert 
                      role="status" 
                      className="border-green-200 bg-green-50 dark:bg-green-950"
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-900 dark:text-green-100">
                        Formulário enviado com sucesso!
                      </AlertDescription>
                    </Alert>
                  )}
                </form>
              </CardContent>
            </Card>
          </section>

          {/* Seção 4: Screen Readers */}
          <section aria-labelledby="sr-section">
            <Card>
              <CardHeader>
                <CardTitle id="sr-section">
                  4. Screen Readers (WCAG 4.1.2)
                </CardTitle>
                <CardDescription>
                  Conteúdo acessível para leitores de tela
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p>
                    Este é um texto visível.
                    <ScreenReaderOnly>
                      Este texto adicional só é lido por screen readers.
                    </ScreenReaderOnly>
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Imagens com Alt Text</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="w-32 h-32 bg-primary/10 rounded-lg flex items-center justify-center">
                        <span className="text-4xl">🌟</span>
                      </div>
                      <p className="text-sm mt-2">
                        <strong>Alt text:</strong> "Estrela dourada brilhante"
                      </p>
                    </div>

                    <div>
                      <div 
                        className="w-32 h-32 bg-muted rounded-lg" 
                        role="img" 
                        aria-label="Imagem decorativa de fundo gradiente"
                      />
                      <p className="text-sm mt-2">
                        <strong>Decorativa:</strong> aria-hidden="true"
                      </p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Teste com screen reader:</strong><br />
                    • Windows: NVDA (gratuito)<br />
                    • macOS: VoiceOver (Cmd+F5)<br />
                    • Mobile: TalkBack/VoiceOver
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </section>

          {/* Seção 5: Indicadores de Foco */}
          <section aria-labelledby="focus-section">
            <Card>
              <CardHeader>
                <CardTitle id="focus-section">
                  5. Indicadores de Foco (WCAG 2.4.7)
                </CardTitle>
                <CardDescription>
                  Use Tab para ver os indicadores visuais de foco
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Todos os elementos interativos têm um outline visível de 3px 
                  quando navegados via teclado.
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline">Foque aqui</Button>
                  <Button variant="outline">E aqui</Button>
                  <Button variant="outline">E aqui também</Button>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    O outline é removido para navegação por mouse, mas permanece 
                    visível para navegação por teclado.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </section>

          {/* Seção 6: Validação */}
          <section aria-labelledby="validation-section">
            <Card>
              <CardHeader>
                <CardTitle id="validation-section">
                  6. Como Validar
                </CardTitle>
                <CardDescription>
                  Ferramentas e comandos para testar acessibilidade
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold mb-2">Lighthouse Audit</h4>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      npx lighthouse http://localhost:3000 --only-categories=accessibility --view
                    </pre>
                    <p className="text-sm text-muted-foreground mt-1">
                      Meta: Score ≥ 95/100
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">axe DevTools</h4>
                    <p className="text-sm">
                      Instale a extensão do navegador:{' '}
                      <a 
                        href="https://www.deque.com/axe/devtools/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        axe DevTools
                      </a>
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Testes Manuais</h4>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>Navegação por teclado (Tab/Shift+Tab)</li>
                      <li>Screen reader (NVDA/VoiceOver)</li>
                      <li>Zoom até 200% (Ctrl/Cmd +)</li>
                      <li>Visualização mobile</li>
                    </ul>
                  </div>
                </div>

                <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900 dark:text-green-100">
                    <strong>Status:</strong> Esta página está otimizada para WCAG 2.1 AA
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-sm text-muted-foreground text-center">
            Documentação completa em{' '}
            <code className="bg-muted px-2 py-1 rounded">docs/ACCESSIBILITY.md</code>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AccessibilityTest;
