import * as React from "react";

import { cn } from "@/lib/utils";
import { stripHTML } from "@/lib/sanitize";

export interface InputProps extends React.ComponentProps<"input"> {
  sanitize?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onChange, sanitize = false, ...props }, ref) => {
    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (sanitize && onChange) {
          const sanitizedValue = stripHTML(e.target.value);
          const sanitizedEvent = {
            ...e,
            target: { ...e.target, value: sanitizedValue },
          };
          onChange(sanitizedEvent as React.ChangeEvent<HTMLInputElement>);
        } else if (onChange) {
          onChange(e);
        }
      },
      [onChange, sanitize]
    );

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
