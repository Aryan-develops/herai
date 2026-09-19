import { type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-20 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm transition-shadow placeholder:text-neutral-400 focus-visible:border-brand-400 focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
