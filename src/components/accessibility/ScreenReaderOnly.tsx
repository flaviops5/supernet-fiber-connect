import { ReactNode } from 'react';

interface ScreenReaderOnlyProps {
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Screen Reader Only Component
 * Hides content visually but keeps it accessible to screen readers
 * WCAG 2.4.4 - Link Purpose (In Context)
 */
export const ScreenReaderOnly = ({ 
  children, 
  as: Component = 'span' 
}: ScreenReaderOnlyProps) => {
  return (
    <Component className="sr-only">
      {children}
    </Component>
  );
};
