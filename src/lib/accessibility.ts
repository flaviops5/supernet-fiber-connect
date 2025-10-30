/**
 * Accessibility Utilities
 * Helper functions for WCAG 2.1 AA compliance
 */

/**
 * Calculate contrast ratio between two colors
 * @param color1 - First color in hex format
 * @param color2 - Second color in hex format
 * @returns Contrast ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get relative luminance of a color
 * @param hex - Color in hex format
 * @returns Relative luminance
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  const [r, g, b] = rgb.map((val) => {
    const sRGB = val / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB
 * @param hex - Color in hex format
 * @returns RGB array
 */
function hexToRgb(hex: string): number[] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
}

/**
 * Check if contrast meets WCAG AA standard (4.5:1)
 * @param color1 - First color
 * @param color2 - Second color
 * @returns true if contrast is sufficient
 */
export function meetsWCAGAA(color1: string, color2: string): boolean {
  return getContrastRatio(color1, color2) >= 4.5;
}

/**
 * Check if contrast meets WCAG AAA standard (7:1)
 * @param color1 - First color
 * @param color2 - Second color
 * @returns true if contrast is sufficient
 */
export function meetsWCAGAAA(color1: string, color2: string): boolean {
  return getContrastRatio(color1, color2) >= 7;
}

/**
 * Announce message to screen readers
 * @param message - Message to announce
 * @param priority - Priority level (polite or assertive)
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Trap focus within a container (for modals, dialogs)
 * @param container - Container element
 * @returns Cleanup function
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  };
  
  container.addEventListener('keydown', handleKeyDown);
  firstElement.focus();
  
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Generate unique ID for ARIA labels
 * @param prefix - Prefix for the ID
 * @returns Unique ID
 */
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if element is keyboard focusable
 * @param element - Element to check
 * @returns true if element is focusable
 */
export function isKeyboardFocusable(element: HTMLElement): boolean {
  const tabindex = element.getAttribute('tabindex');
  if (tabindex === '-1') return false;
  
  const focusableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
  if (focusableTags.includes(element.tagName)) {
    return !element.hasAttribute('disabled');
  }
  
  return tabindex !== null;
}

/**
 * Skip to main content (for skip links)
 * @param targetId - ID of main content element
 */
export function skipToMainContent(targetId: string = 'main-content') {
  const target = document.getElementById(targetId);
  if (target) {
    target.focus();
    target.scrollIntoView({ behavior: 'smooth' });
  }
}
