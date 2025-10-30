import { useEffect, useRef } from 'react';

interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  clearAfter?: number;
}

/**
 * Live Region Component
 * Announces dynamic content changes to screen readers
 * WCAG 4.1.3 - Status Messages
 */
export const LiveRegion = ({ 
  message, 
  priority = 'polite',
  clearAfter = 3000 
}: LiveRegionProps) => {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && regionRef.current) {
      regionRef.current.textContent = message;

      if (clearAfter > 0) {
        const timer = setTimeout(() => {
          if (regionRef.current) {
            regionRef.current.textContent = '';
          }
        }, clearAfter);

        return () => clearTimeout(timer);
      }
    }
  }, [message, clearAfter]);

  return (
    <div
      ref={regionRef}
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    />
  );
};
