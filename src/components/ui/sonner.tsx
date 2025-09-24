import { Toaster as Sonner, toast } from "sonner";

// Minimal, theme-agnostic Sonner Toaster to avoid external theme dependencies
// You can customize via props where it's used if needed
export type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      duration={4000}
      {...props}
    />
  );
};

export { Toaster, toast };

