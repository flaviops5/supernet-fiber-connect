import * as React from "react";

import { cn } from "@/lib/utils";
import { stripHTML } from "@/lib/sanitize";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  sanitize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onChange, sanitize = false, ...props }, ref) => {
    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (sanitize && onChange) {
          const sanitizedValue = stripHTML(e.target.value);
          const sanitizedEvent = {
            ...e,
            target: { ...e.target, value: sanitizedValue },
          };
          onChange(sanitizedEvent as React.ChangeEvent<HTMLTextAreaElement>);
        } else if (onChange) {
          onChange(e);
        }
      },
      [onChange, sanitize]
    );

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
