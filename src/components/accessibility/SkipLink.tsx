import { Button } from '@/components/ui/button';

/**
 * Skip Link Component
 * Allows keyboard users to skip navigation and jump to main content
 * WCAG 2.4.1 - Bypass Blocks
 */
export const SkipLink = () => {
  const handleSkip = () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Button
      onClick={handleSkip}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2"
      aria-label="Pular para o conteúdo principal"
    >
      Pular para o conteúdo principal
    </Button>
  );
};
